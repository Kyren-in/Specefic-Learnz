import jwt from 'jsonwebtoken';
import { getRow } from '../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'JWT_SECRET_SPECIFIC_LEARNZ_LOCAL_KEY';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  // Fallback to query parameter 'token' for direct media/video/iframe streaming
  if (!token && req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ message: 'Access token missing' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Token is invalid or expired' });
    }
    req.user = user;
    next();
  });
};

export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthenticated' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Requires administrator permissions' });
  }
  next();
};

export const checkCourseEnrollment = async (userId, courseId, role) => {
  if (role === 'admin') return true;

  try {
    const enrollment = await getRow(
      'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2',
      [userId, courseId]
    );
    return !!enrollment;
  } catch (error) {
    console.error('Error checking enrollment:', error);
    return false;
  }
};

export const requireEnrollment = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthenticated' });
  }

  const courseId = req.params.courseId || req.body.courseId || req.query.courseId;
  if (!courseId) {
    return res.status(400).json({ message: 'Course ID is required for access check' });
  }

  const isEnrolled = await checkCourseEnrollment(req.user.id, courseId, req.user.role);
  if (!isEnrolled) {
    return res.status(403).json({ message: 'Purchase this course to access these resources' });
  }
  next();
};
