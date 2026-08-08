import express from 'express';
import { runQuery, getRow, getAllRows } from '../config/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// ----------------- ANNOUNCEMENTS -----------------

// 1. Get announcements (Universal + Course-specific if enrolled)
router.get('/announcements', authenticateToken, async (req, res) => {
  const { courseId } = req.query;

  try {
    let announcements;
    if (req.user.role === 'admin') {
      // Admin sees everything
      announcements = await getAllRows('SELECT * FROM announcements ORDER BY created_at DESC');
    } else if (courseId) {
      // Student: check if enrolled in this course first
      const isEnrolled = await getRow('SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?', [req.user.id, courseId]);
      if (!isEnrolled) {
        return res.status(403).json({ message: 'Enrollment required for course announcements' });
      }
      announcements = await getAllRows(
        `SELECT * FROM announcements 
         WHERE type = 'universal' OR (type = 'course' AND course_id = ?) 
         ORDER BY created_at DESC`,
        [courseId]
      );
    } else {
      // Just universal announcements
      announcements = await getAllRows(
        "SELECT * FROM announcements WHERE type = 'universal' ORDER BY created_at DESC"
      );
    }
    res.json(announcements);
  } catch (error) {
    console.error('Fetch announcements error:', error);
    res.status(500).json({ message: 'Failed to retrieve announcements' });
  }
});

// 2. Admin: Create Announcement
router.post('/announcements', authenticateToken, requireAdmin, async (req, res) => {
  const { type, courseId, title, content, priority } = req.body;

  if (!type || !title || !content) {
    return res.status(400).json({ message: 'Announcement type, title, and content are required' });
  }

  try {
    await runQuery(
      `INSERT INTO announcements (type, course_id, title, content, priority) 
       VALUES (?, ?, ?, ?, ?)`,
      [type, type === 'course' ? courseId : null, title, content, priority || 'medium']
    );
    res.status(201).json({ message: 'Announcement published successfully' });
  } catch (error) {
    console.error('Publish announcement error:', error);
    res.status(500).json({ message: 'Failed to publish announcement' });
  }
});

// 3. Admin: Delete Announcement
router.delete('/announcements/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await runQuery('DELETE FROM announcements WHERE id = ?', [id]);
    res.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete announcement' });
  }
});


// ----------------- UNIVERSAL RESOURCES -----------------

// 1. Get universal content sharing resources (available to all registered users)
router.get('/resources', authenticateToken, async (req, res) => {
  try {
    const resources = await getAllRows('SELECT * FROM universal_resources ORDER BY created_at DESC');
    res.json(resources);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve resources' });
  }
});

// 2. Admin: Add Universal Resource
router.post('/resources', authenticateToken, requireAdmin, async (req, res) => {
  const { title, content, type, filePath } = req.body; // type: notice, strategy, info, tip

  if (!title || !content || !type) {
    return res.status(400).json({ message: 'Title, content, and type are required' });
  }

  try {
    await runQuery(
      'INSERT INTO universal_resources (title, content, file_path, type) VALUES (?, ?, ?, ?)',
      [title, content, filePath || null, type]
    );
    res.status(201).json({ message: 'Resource added successfully' });
  } catch (error) {
    console.error('Add resource error:', error);
    res.status(500).json({ message: 'Failed to add universal resource' });
  }
});

// 3. Admin: Delete Universal Resource
router.delete('/resources/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await runQuery('DELETE FROM universal_resources WHERE id = ?', [id]);
    res.json({ message: 'Resource deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete resource' });
  }
});


// ----------------- USER MANAGEMENT -----------------

// 1. Admin: Search/List Users
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  const { search } = req.query;

  try {
    let sql = `
      SELECT id, name, email, mobile, role, status, ban_reason, created_at,
             (SELECT COUNT(*) FROM enrollments e WHERE e.user_id = u.id) as course_count
      FROM users u
    `;
    const params = [];

    if (search && search.trim().length > 0) {
      sql += ` WHERE name LIKE ? OR email LIKE ? OR mobile LIKE ?`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ` ORDER BY created_at DESC`;

    const users = await getAllRows(sql, params);
    res.json(users);
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ message: 'Failed to retrieve users list' });
  }
});

// 2. Admin: Ban / Unban User
router.put('/users/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status, banReason } = req.body; // status: active, banned

  if (!status) {
    return res.status(400).json({ message: 'Status parameter is required' });
  }

  try {
    const user = await getRow('SELECT role FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Administrator accounts cannot be banned' });
    }

    await runQuery(
      'UPDATE users SET status = ?, ban_reason = ? WHERE id = ?',
      [status, status === 'banned' ? banReason : null, id]
    );

    res.json({ message: `User status successfully updated to ${status}` });
  } catch (error) {
    console.error('Ban status change error:', error);
    res.status(500).json({ message: 'Failed to update user status' });
  }
});


// ----------------- FEEDBACK -----------------

// 1. Submit Feedback (requires enrollment)
router.post('/course/:courseId/feedback', authenticateToken, async (req, res) => {
  const { courseId } = req.params;
  const { rating, responses } = req.body; // responses: object containing answers to prompts

  if (rating === undefined || !responses) {
    return res.status(400).json({ message: 'Rating and survey responses are required' });
  }

  // Check enrollment
  const isEnrolled = await getRow('SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?', [req.user.id, courseId]);
  if (!isEnrolled && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Enrollment required to submit feedback' });
  }

  try {
    // Check if feedback already submitted
    const existing = await getRow('SELECT id FROM feedbacks WHERE user_id = ? AND course_id = ?', [req.user.id, courseId]);
    if (existing) {
      await runQuery(
        'UPDATE feedbacks SET rating = ?, responses_json = ? WHERE id = ?',
        [rating, JSON.stringify(responses), existing.id]
      );
      return res.json({ message: 'Feedback updated successfully' });
    }

    await runQuery(
      'INSERT INTO feedbacks (user_id, course_id, rating, responses_json) VALUES (?, ?, ?, ?)',
      [req.user.id, courseId, rating, JSON.stringify(responses)]
    );
    res.status(201).json({ message: 'Feedback submitted successfully' });
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({ message: 'Failed to submit feedback' });
  }
});

// 2. Admin: Get Course Feedback Metrics
router.get('/course/:courseId/feedback', authenticateToken, requireAdmin, async (req, res) => {
  const { courseId } = req.params;

  try {
    const feedbackList = await getAllRows(
      `SELECT f.*, u.name as user_name, u.email as user_email
       FROM feedbacks f
       JOIN users u ON f.user_id = u.id
       WHERE f.course_id = ? 
       ORDER BY f.created_at DESC`,
      [courseId]
    );

    if (feedbackList.length === 0) {
      return res.json({
        averageRating: 0,
        count: 0,
        feedbacks: []
      });
    }

    const avgRating = feedbackList.reduce((sum, f) => sum + f.rating, 0) / feedbackList.length;

    res.json({
      averageRating: parseFloat(avgRating.toFixed(1)),
      count: feedbackList.length,
      feedbacks: feedbackList.map(f => ({
        ...f,
        responses: JSON.parse(f.responses_json)
      }))
    });
  } catch (error) {
    console.error('Fetch feedback error:', error);
    res.status(500).json({ message: 'Failed to fetch course feedback metrics' });
  }
});


// ----------------- ADMIN DASHBOARD STATS -----------------

router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const totalUsers = await getRow('SELECT COUNT(*) as count FROM users');
    const activeUsers = await getRow("SELECT COUNT(*) as count FROM users WHERE status = 'active'");
    const totalCourses = await getRow("SELECT COUNT(*) as count FROM courses WHERE status != 'archived'");
    const totalEnrollments = await getRow('SELECT COUNT(*) as count FROM enrollments');
    const testsAttempted = await getRow('SELECT COUNT(*) as count FROM test_attempts');
    
    // Revenue calculator
    const revenueQuery = await getRow(
      `SELECT SUM(coalesce(c.discount_price, c.price)) as total 
       FROM enrollments e 
       JOIN courses c ON e.course_id = c.id`
    );

    res.json({
      totalUsers: totalUsers.count,
      activeUsers: activeUsers.count,
      totalCourses: totalCourses.count,
      totalEnrollments: totalEnrollments.count,
      testsAttempted: testsAttempted.count,
      revenue: revenueQuery.total || 0
    });
  } catch (error) {
    console.error('Fetch stats error:', error);
    res.status(500).json({ message: 'Failed to compile stats' });
  }
});

export default router;
