import express from 'express';
import fs from 'fs';
import pdfParse from 'pdf-parse';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { runQuery, getAllRows } from '../config/database.js';
import { authenticateToken, checkCourseEnrollment } from '../middleware/auth.js';

const router = express.Router();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

let genAI = null;
if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}

// Chunk text with overlap
const chunkText = (text, maxLength = 800, overlap = 150) => {
  const chunks = [];
  let index = 0;
  while (index < text.length) {
    const end = Math.min(index + maxLength, text.length);
    chunks.push(text.slice(index, end));
    if (end === text.length) break;
    index += maxLength - overlap;
  }
  return chunks.filter(c => c.trim().length > 10);
};

const dotProduct = (a, b) => a.reduce((sum, val, i) => sum + val * (b[i] || 0), 0);
const magnitude = (arr) => Math.sqrt(arr.reduce((sum, val) => sum + val * val, 0));
const cosineSimilarity = (a, b) => {
  const magA = magnitude(a), magB = magnitude(b);
  if (magA === 0 || magB === 0) return 0;
  return dotProduct(a, b) / (magA * magB);
};

// PDF text extraction and embedding pipeline (called from materials.js on upload)
export const extractTextAndEmbed = async (materialId, courseId, filePath) => {
  try {
    console.log(`Starting RAG indexing for Material #${materialId}, File: ${filePath}`);
    const fileBuffer = fs.readFileSync(filePath);
    const parsedData = await pdfParse(fileBuffer);
    const text = parsedData.text;

    if (!text || text.trim().length === 0) {
      console.log(`No text extracted from PDF: ${filePath}`);
      return;
    }

    const chunks = chunkText(text);
    console.log(`Split document into ${chunks.length} chunks.`);

    for (let i = 0; i < chunks.length; i++) {
      const content = chunks[i];
      let embedding = [];

      if (genAI) {
        try {
          const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
          const response = await model.embedContent(content);
          embedding = response.embedding.values;
        } catch (embedError) {
          console.error('Gemini embedding error on chunk:', i, embedError.message);
        }
      }

      await runQuery(
        'INSERT INTO document_chunks (material_id, course_id, chunk_index, content, embedding_json) VALUES ($1, $2, $3, $4, $5)',
        [materialId, courseId, i, content, JSON.stringify(embedding)]
      );
    }
    console.log(`Finished indexing Material #${materialId}`);
  } catch (error) {
    console.error('Failed in extractTextAndEmbed:', error);
  }
};

// AI Course-Specific Search
router.post('/search', authenticateToken, async (req, res) => {
  const { courseId, query } = req.body;

  if (!courseId || !query || query.trim().length === 0) {
    return res.status(400).json({ message: 'Course ID and query text are required' });
  }

  const isEnrolled = await checkCourseEnrollment(req.user.id, courseId, req.user.role);
  if (!isEnrolled) {
    return res.status(403).json({ message: 'Access denied. You must enroll in this course to access the AI brain.' });
  }

  try {
    const chunks = await getAllRows(
      `SELECT dc.id, dc.content, dc.embedding_json, m.title as source_title
       FROM document_chunks dc
       JOIN materials m ON dc.material_id = m.id
       WHERE dc.course_id = $1`,
      [courseId]
    );

    if (chunks.length === 0) {
      return res.json({
        answer: "I couldn't find this information in the course material. (Note: No study materials have been uploaded/processed for this course yet).",
        sources: []
      });
    }

    let topChunks = [];

    if (genAI && GEMINI_API_KEY) {
      const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
      const embedResponse = await model.embedContent(query);
      const queryEmbedding = embedResponse.embedding.values;

      const chunksWithScore = chunks.map(chunk => {
        let chunkEmbedding = [];
        try { chunkEmbedding = JSON.parse(chunk.embedding_json); } catch (e) {}
        const score = chunkEmbedding.length > 0 ? cosineSimilarity(queryEmbedding, chunkEmbedding) : 0;
        return { ...chunk, score };
      });

      chunksWithScore.sort((a, b) => b.score - a.score);
      topChunks = chunksWithScore.slice(0, 3).filter(c => c.score > 0.3);
    }

    // Fallback: keyword search
    if (topChunks.length === 0) {
      const searchTerms = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      const scoredChunks = chunks.map(chunk => {
        const text = chunk.content.toLowerCase();
        const score = searchTerms.reduce((s, term) => s + (text.includes(term) ? 1 : 0), 0);
        return { ...chunk, score };
      });
      scoredChunks.sort((a, b) => b.score - a.score);
      topChunks = scoredChunks.slice(0, 3).filter(c => c.score > 0);
    }

    if (topChunks.length === 0) {
      return res.json({ answer: "I couldn't find this information in the course material.", sources: [] });
    }

    const contextText = topChunks
      .map((c, idx) => `[Source #${idx + 1}: ${c.source_title}]\n${c.content}`)
      .join('\n\n');
    const sourceTitles = Array.from(new Set(topChunks.map(c => c.source_title)));

    if (genAI && GEMINI_API_KEY) {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `You are a helpful educational AI assistant for the course.
Answer the student's question using ONLY the provided course content.
If the answer is not contained in the text, strictly respond: "I couldn't find this information in the course material."
Do not invent or extrapolate beyond the text.

Context:
${contextText}

Question:
${query}

Answer:`;

      const result = await model.generateContent(prompt);
      res.json({ answer: result.response.text().trim(), sources: sourceTitles });
    } else {
      const answerText = `[Developer Mode: Keyword Match]\nBased on the course materials in "${sourceTitles.join(', ')}", here is what I found:\n"${topChunks[0].content.substring(0, 400)}..."`;
      res.json({ answer: answerText, sources: sourceTitles });
    }
  } catch (error) {
    console.error('RAG search error:', error);
    res.status(500).json({ message: 'Error processing AI search request' });
  }
});

export default router;
