import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { runQuery, getRow, getAllRows } from '../config/database.js';
import { authenticateToken, checkCourseEnrollment } from '../middleware/auth.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer config for doubt images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'doubt-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Helper: check enrollment or throw 403
const checkAccess = async (req, res, courseId) => {
  const isEnrolled = await checkCourseEnrollment(req.user.id, courseId, req.user.role);
  if (!isEnrolled) {
    res.status(403).json({ message: 'Access denied. Course enrollment required.' });
    return false;
  }
  return true;
};

// 1. Get Course Doubts (with replies count and author info)
router.get('/course/:courseId', authenticateToken, async (req, res) => {
  const { courseId } = req.params;
  const { search } = req.query;

  if (!(await checkAccess(req, res, courseId))) return;

  try {
    let sql = `
      SELECT d.*, u.name as author_name, u.role as author_role,
             (SELECT COUNT(*) FROM doubt_replies r WHERE r.doubt_id = d.id) as replies_count
      FROM doubts d
      JOIN users u ON d.user_id = u.id
      WHERE d.course_id = ?
    `;
    const params = [courseId];

    if (search && search.trim().length > 0) {
      sql += ` AND (d.title LIKE ? OR d.description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ` ORDER BY d.is_pinned DESC, d.created_at DESC`;

    const doubts = await getAllRows(sql, params);
    res.json(doubts);
  } catch (error) {
    console.error('Fetch doubts error:', error);
    res.status(500).json({ message: 'Failed to retrieve doubts' });
  }
});

// 2. Get Single Doubt Details with Replies
router.get('/:doubtId', authenticateToken, async (req, res) => {
  const { doubtId } = req.params;

  try {
    const doubt = await getRow(
      `SELECT d.*, u.name as author_name, u.role as author_role 
       FROM doubts d 
       JOIN users u ON d.user_id = u.id 
       WHERE d.id = ?`,
      [doubtId]
    );

    if (!doubt) {
      return res.status(404).json({ message: 'Doubt not found' });
    }

    // Verify course enrollment
    if (!(await checkAccess(req, res, doubt.course_id))) return;

    // Fetch replies
    const replies = await getAllRows(
      `SELECT r.*, u.name as author_name, u.role as author_role 
       FROM doubt_replies r 
       JOIN users u ON r.user_id = u.id 
       WHERE r.doubt_id = ? 
       ORDER BY r.created_at ASC`,
      [doubtId]
    );

    res.json({ doubt, replies });
  } catch (error) {
    console.error('Fetch doubt detail error:', error);
    res.status(500).json({ message: 'Failed to retrieve doubt detail' });
  }
});

// 3. Post a Doubt (with optional image)
router.post('/', authenticateToken, upload.single('image'), async (req, res) => {
  const { courseId, title, description } = req.body;

  if (!courseId || !title || !description) {
    return res.status(400).json({ message: 'Course ID, title, and description are required' });
  }

  if (!(await checkAccess(req, res, courseId))) return;

  try {
    const imagePath = req.file ? req.file.filename : null;
    const result = await runQuery(
      `INSERT INTO doubts (course_id, user_id, title, description, image_path)
       VALUES (?, ?, ?, ?, ?)`,
      [courseId, req.user.id, title, description, imagePath]
    );

    res.status(201).json({
      message: 'Doubt posted successfully',
      doubtId: result.lastID
    });
  } catch (error) {
    console.error('Post doubt error:', error);
    res.status(500).json({ message: 'Failed to post doubt' });
  }
});

// 4. Post Reply to Doubt
router.post('/:doubtId/reply', authenticateToken, async (req, res) => {
  const { doubtId } = req.params;
  const { content } = req.body;

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ message: 'Reply content is required' });
  }

  try {
    const doubt = await getRow('SELECT course_id, is_locked FROM doubts WHERE id = ?', [doubtId]);
    if (!doubt) {
      return res.status(404).json({ message: 'Doubt not found' });
    }

    if (doubt.is_locked) {
      return res.status(403).json({ message: 'This doubt discussion is locked' });
    }

    if (!(await checkAccess(req, res, doubt.course_id))) return;

    await runQuery(
      'INSERT INTO doubt_replies (doubt_id, user_id, content) VALUES (?, ?, ?)',
      [doubtId, req.user.id, content]
    );

    res.status(201).json({ message: 'Reply added successfully' });
  } catch (error) {
    console.error('Post reply error:', error);
    res.status(500).json({ message: 'Failed to add reply' });
  }
});

// 5. Helpfulness toggle (Upvote helpfulness)
router.post('/:doubtId/helpful', authenticateToken, async (req, res) => {
  const { doubtId } = req.params;

  try {
    const doubt = await getRow('SELECT course_id, helpful_count FROM doubts WHERE id = ?', [doubtId]);
    if (!doubt) {
      return res.status(404).json({ message: 'Doubt not found' });
    }

    if (!(await checkAccess(req, res, doubt.course_id))) return;

    const newCount = (doubt.helpful_count || 0) + 1;
    await runQuery('UPDATE doubts SET helpful_count = ? WHERE id = ?', [newCount, doubtId]);

    res.json({ message: 'Marked as helpful', helpfulCount: newCount });
  } catch (error) {
    console.error('Mark helpful error:', error);
    res.status(500).json({ message: 'Failed to process helpful update' });
  }
});

// 6. Admin/Teacher: Pin Doubt
router.put('/:doubtId/pin', authenticateToken, async (req, res) => {
  const { doubtId } = req.params;
  const { isPinned } = req.body; // boolean

  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Requires administrator permissions' });
  }

  try {
    await runQuery('UPDATE doubts SET is_pinned = ? WHERE id = ?', [isPinned ? 1 : 0, doubtId]);
    res.json({ message: isPinned ? 'Doubt pinned' : 'Doubt unpinned' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update pin status' });
  }
});

// 7. Admin/Teacher: Lock Doubt
router.put('/:doubtId/lock', authenticateToken, async (req, res) => {
  const { doubtId } = req.params;
  const { isLocked } = req.body; // boolean

  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Requires administrator permissions' });
  }

  try {
    await runQuery('UPDATE doubts SET is_locked = ? WHERE id = ?', [isLocked ? 1 : 0, doubtId]);
    res.json({ message: isLocked ? 'Doubt locked' : 'Doubt unlocked' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update lock status' });
  }
});

// 8. Admin/Teacher: Delete Doubt
router.delete('/:doubtId', authenticateToken, async (req, res) => {
  const { doubtId } = req.params;

  try {
    const doubt = await getRow('SELECT user_id, image_path FROM doubts WHERE id = ?', [doubtId]);
    if (!doubt) {
      return res.status(404).json({ message: 'Doubt not found' });
    }

    // Allow deleting if it's the author OR admin
    if (req.user.id !== doubt.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Delete image if exists
    if (doubt.image_path) {
      const imgPath = path.resolve(uploadDir, path.basename(doubt.image_path));
      if (fs.existsSync(imgPath)) {
        fs.unlinkSync(imgPath);
      }
    }

    // Delete replies and doubt
    await runQuery('DELETE FROM doubt_replies WHERE doubt_id = ?', [doubtId]);
    await runQuery('DELETE FROM doubts WHERE id = ?', [doubtId]);

    res.json({ message: 'Doubt deleted successfully' });
  } catch (error) {
    console.error('Delete doubt error:', error);
    res.status(500).json({ message: 'Failed to delete doubt' });
  }
});

export default router;
