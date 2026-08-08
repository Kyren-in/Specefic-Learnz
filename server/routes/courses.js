import express from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { runQuery, getRow, getAllRows } from '../config/database.js';
import { authenticateToken, requireAdmin, checkCourseEnrollment } from '../middleware/auth.js';

const router = express.Router();

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

let razorpay = null;
if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });
}

// 1. Get all published/marketplace courses
router.get('/', async (req, res) => {
  try {
    const courses = await getAllRows("SELECT * FROM courses WHERE status = 'published'");
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve courses' });
  }
});

// 2. Admin: Get all courses (including drafts/archived)
router.get('/admin', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const courses = await getAllRows('SELECT * FROM courses');
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve courses' });
  }
});

// 3. Student: Get list of purchased courses
router.get('/my/purchased', authenticateToken, async (req, res) => {
  try {
    let courses;
    if (req.user.role === 'admin') {
      courses = await getAllRows("SELECT * FROM courses WHERE status != 'archived'");
    } else {
      courses = await getAllRows(
        `SELECT c.* FROM courses c
         JOIN enrollments e ON c.id = e.course_id
         WHERE e.user_id = $1`,
        [req.user.id]
      );
    }
    res.json(courses);
  } catch (error) {
    console.error('My courses query error:', error);
    res.status(500).json({ message: 'Failed to fetch purchased courses' });
  }
});

// 4. Student: Check if enrolled
router.get('/:courseId/enrolled', authenticateToken, async (req, res) => {
  const { courseId } = req.params;
  const isEnrolled = await checkCourseEnrollment(req.user.id, courseId, req.user.role);
  res.json({ enrolled: isEnrolled });
});

// 5. Get detailed course by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const course = await getRow('SELECT * FROM courses WHERE id = $1', [id]);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve course details' });
  }
});

// 6. Admin: Create Course
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  const { name, description, price, discount_price, thumbnail, category, duration, status } = req.body;
  if (!name || !description || price === undefined) {
    return res.status(400).json({ message: 'Name, description, and price are required' });
  }

  try {
    const result = await runQuery(
      `INSERT INTO courses (name, description, price, discount_price, thumbnail, category, duration, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [name, description, price, discount_price || null, thumbnail || null, category || null, duration || null, status || 'draft']
    );
    res.status(201).json({
      message: 'Course created successfully',
      courseId: result.rows[0].id
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ message: 'Failed to create course' });
  }
});

// 7. Admin: Edit Course
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, description, price, discount_price, thumbnail, category, duration, status } = req.body;

  try {
    const course = await getRow('SELECT * FROM courses WHERE id = $1', [id]);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    await runQuery(
      `UPDATE courses
       SET name = $1, description = $2, price = $3, discount_price = $4,
           thumbnail = $5, category = $6, duration = $7, status = $8
       WHERE id = $9`,
      [
        name || course.name,
        description || course.description,
        price !== undefined ? price : course.price,
        discount_price !== undefined ? discount_price : course.discount_price,
        thumbnail || course.thumbnail,
        category || course.category,
        duration || course.duration,
        status || course.status,
        id
      ]
    );

    res.json({ message: 'Course updated successfully' });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ message: 'Failed to update course' });
  }
});

// 8. Purchase Course - Create Order (Razorpay or Mock)
router.post('/purchase', authenticateToken, async (req, res) => {
  const { courseId } = req.body;
  if (!courseId) {
    return res.status(400).json({ message: 'Course ID is required' });
  }

  try {
    const course = await getRow(
      "SELECT * FROM courses WHERE id = $1 AND status = 'published'",
      [courseId]
    );
    if (!course) {
      return res.status(404).json({ message: 'Course not found or unavailable' });
    }

    const alreadyEnrolled = await checkCourseEnrollment(req.user.id, courseId, req.user.role);
    if (alreadyEnrolled) {
      return res.status(400).json({ message: 'You have already purchased this course' });
    }

    const amount = Math.round((course.discount_price || course.price) * 100);

    if (!razorpay) {
      const mockOrderId = `order_mock_${crypto.randomBytes(8).toString('hex')}`;
      return res.json({
        mock: true,
        orderId: mockOrderId,
        amount,
        currency: 'INR',
        keyId: 'mock_key_id',
        courseName: course.name,
        user: { name: req.user.name, email: req.user.email }
      });
    }

    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `receipt_course_${courseId}_user_${req.user.id}`,
    });

    res.json({
      mock: false,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: RAZORPAY_KEY_ID,
      courseName: course.name,
      user: { name: req.user.name, email: req.user.email }
    });
  } catch (error) {
    console.error('Purchase initiation error:', error);
    res.status(500).json({ message: 'Failed to initiate purchase process' });
  }
});

// 9. Verify Payment & Enroll
router.post('/verify-payment', authenticateToken, async (req, res) => {
  const { courseId, paymentId, orderId, signature, isMock } = req.body;

  if (!courseId || !paymentId || !orderId) {
    return res.status(400).json({ message: 'Missing payment validation parameters' });
  }

  try {
    let isValid = false;

    if (isMock || !razorpay) {
      isValid = true;
    } else {
      const text = `${orderId}|${paymentId}`;
      const generatedSignature = crypto
        .createHmac('sha256', RAZORPAY_KEY_SECRET)
        .update(text)
        .digest('hex');
      isValid = generatedSignature === signature;
    }

    if (!isValid) {
      return res.status(400).json({ message: 'Payment verification failed. Invalid signature.' });
    }

    const alreadyEnrolled = await getRow(
      'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2',
      [req.user.id, courseId]
    );

    if (!alreadyEnrolled) {
      await runQuery(
        'INSERT INTO enrollments (user_id, course_id, payment_id) VALUES ($1, $2, $3)',
        [req.user.id, courseId, paymentId]
      );
    }

    res.json({ message: 'Course purchased and enrolled successfully!', courseId });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ message: 'Internal server error during enrollment verification' });
  }
});

export default router;
