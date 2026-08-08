import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { createClient } from '@supabase/supabase-js';
import { runQuery, getRow, getAllRows } from '../config/database.js';
import { authenticateToken, requireAdmin, checkCourseEnrollment } from '../middleware/auth.js';
import { extractTextAndEmbed } from './RAG.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase Storage setup
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bmmtfxjmjygfsmluorqs.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

const BUCKET_NAME = 'course-materials';

// Local upload directory fallback & temp buffer storage
const uploadDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, uploadDir); },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Helper to ensure Supabase bucket exists (creates if not present)
const ensureSupabaseBucket = async () => {
  if (!supabase) return;
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets && buckets.some(b => b.name === BUCKET_NAME);
    if (!exists) {
      await supabase.storage.createBucket(BUCKET_NAME, { public: true });
      console.log(`Created public Supabase Storage bucket: "${BUCKET_NAME}"`);
    }
  } catch (err) {
    console.warn('Supabase bucket check warning:', err.message);
  }
};

// 1. Get Course Materials List (requires enrollment)
router.get('/course/:courseId', authenticateToken, async (req, res) => {
  const { courseId } = req.params;

  const isEnrolled = await checkCourseEnrollment(req.user.id, courseId, req.user.role);
  if (!isEnrolled) {
    return res.status(403).json({ message: 'Access denied. Course enrollment required.' });
  }

  try {
    const materials = await getAllRows(
      'SELECT id, course_id, title, type, created_at FROM materials WHERE course_id = $1 ORDER BY id ASC',
      [courseId]
    );
    res.json(materials);
  } catch (error) {
    console.error('Fetch materials error:', error);
    res.status(500).json({ message: 'Failed to retrieve materials' });
  }
});

// 2. Stream Protected Material with Dynamic Watermarking & Supabase Cloud Storage
router.get('/:id/view', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const material = await getRow('SELECT * FROM materials WHERE id = $1', [id]);
    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    const isEnrolled = await checkCourseEnrollment(req.user.id, material.course_id, req.user.role);
    if (!isEnrolled) {
      return res.status(403).json({ message: 'Access denied. Course enrollment required.' });
    }

    if (material.type === 'link') {
      return res.redirect(material.file_path);
    }

    let fileBuffer = null;
    const localFilePath = path.resolve(uploadDir, path.basename(material.file_path));

    // Try reading local file first
    if (fs.existsSync(localFilePath)) {
      fileBuffer = fs.readFileSync(localFilePath);
    } else if (supabase) {
      // Fetch buffer from Supabase Cloud Storage
      const { data, error } = await supabase.storage.from(BUCKET_NAME).download(material.file_path);
      if (error || !data) {
        console.error('Supabase storage download error:', error);
        return res.status(404).json({ message: 'Physical file not found in cloud or local storage' });
      }
      const arrayBuffer = await data.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } else {
      return res.status(404).json({ message: 'Physical file not found on server' });
    }

    // Video/Media/Note files: Stream directly with proper mime content-type
    if (material.type !== 'pdf') {
      const ext = path.extname(material.file_path).toLowerCase();
      let contentType = 'application/octet-stream';
      if (ext === '.mp4') contentType = 'video/mp4';
      else if (ext === '.webm') contentType = 'video/webm';
      else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.png') contentType = 'image/png';

      res.setHeader('Content-Type', contentType);
      return res.send(fileBuffer);
    }

    // PDF: Load and watermark dynamically in memory
    const pdfDoc = await PDFDocument.load(fileBuffer);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();

    const course = await getRow('SELECT name FROM courses WHERE id = $1', [material.course_id]);
    const courseName = course ? course.name : 'JEE Course — Specific Learnerz';
    const watermarkText = `Licensed to: ${req.user.name} | Email: ${req.user.email} | ID: USR${req.user.id} | Course: ${courseName}`;

    pages.forEach((page) => {
      const { width, height } = page.getSize();
      page.drawText(watermarkText, {
        x: width * 0.08, y: height * 0.35, size: 11,
        font: helveticaFont, color: rgb(0.7, 0.7, 0.7), opacity: 0.18, rotate: degrees(30)
      });
      page.drawText(watermarkText, {
        x: width * 0.08, y: height * 0.7, size: 11,
        font: helveticaFont, color: rgb(0.7, 0.7, 0.7), opacity: 0.18, rotate: degrees(30)
      });
    });

    const watermarkedPdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="study-material.pdf"');
    res.send(Buffer.from(watermarkedPdfBytes));

  } catch (error) {
    console.error('Material view error:', error);
    res.status(500).json({ message: 'Error rendering document' });
  }
});

// 3. Admin: Upload/Create Material (saves to Supabase Cloud Storage & triggers background RAG indexing for PDFs)
router.post('/upload', authenticateToken, requireAdmin, upload.single('file'), async (req, res) => {
  const { courseId, title, type, externalUrl } = req.body;

  if (!courseId || !title || !type) {
    return res.status(400).json({ message: 'Course ID, title, and type are required' });
  }

  try {
    let filePath = '';

    if (type === 'pdf' || type === 'video' || type === 'note') {
      if (!req.file) {
        return res.status(400).json({ message: 'File upload is required for this type' });
      }
      filePath = req.file.filename;

      // Upload to Supabase Cloud Storage bucket if configured
      if (supabase) {
        await ensureSupabaseBucket();
        const fileBuffer = fs.readFileSync(req.file.path);
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filePath, fileBuffer, {
            contentType: req.file.mimetype || 'application/octet-stream',
            upsert: true
          });

        if (uploadError) {
          console.error('Supabase Storage upload error:', uploadError.message);
          return res.status(500).json({ 
            message: `Cloud Storage Upload Error: ${uploadError.message}. Make sure SUPABASE_ANON_KEY is set in Render environment.` 
          });
        }
        console.log(`Successfully uploaded file "${filePath}" to Supabase Cloud Storage bucket "${BUCKET_NAME}".`);
      }
    } else if (type === 'link') {
      if (!externalUrl) {
        return res.status(400).json({ message: 'External URL is required' });
      }
      filePath = externalUrl;
    }

    const result = await runQuery(
      'INSERT INTO materials (course_id, title, file_path, type) VALUES ($1, $2, $3, $4) RETURNING id',
      [courseId, title, filePath, type]
    );

    const newMaterialId = result.rows[0].id;

    if (type === 'pdf') {
      const physicalPath = path.resolve(uploadDir, filePath);
      extractTextAndEmbed(newMaterialId, courseId, physicalPath).catch(err => {
        console.error('RAG Indexing background error:', err);
      });
    }

    res.status(201).json({
      message: 'Material uploaded and added to Supabase cloud storage successfully',
      materialId: newMaterialId
    });
  } catch (error) {
    console.error('Material upload error:', error);
    res.status(500).json({ message: 'Failed to upload material' });
  }
});

// 4. Admin: Delete Material
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const material = await getRow('SELECT * FROM materials WHERE id = $1', [id]);
    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    if (material.type !== 'link') {
      const localFilePath = path.resolve(uploadDir, path.basename(material.file_path));
      if (fs.existsSync(localFilePath)) {
        try { fs.unlinkSync(localFilePath); } catch (e) {}
      }

      if (supabase) {
        await supabase.storage.from(BUCKET_NAME).remove([material.file_path]);
      }
    }

    await runQuery('DELETE FROM document_chunks WHERE material_id = $1', [id]);
    await runQuery('DELETE FROM materials WHERE id = $1', [id]);

    res.json({ message: 'Material deleted from cloud and database successfully' });
  } catch (error) {
    console.error('Delete material error:', error);
    res.status(500).json({ message: 'Failed to delete material' });
  }
});

export default router;
