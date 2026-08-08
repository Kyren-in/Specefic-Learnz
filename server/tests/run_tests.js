import { initDb, runQuery, getRow } from '../config/database.js';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';

// Setup Test Server
import authRoutes from '../routes/auth.js';
import courseRoutes from '../routes/courses.js';
import materialRoutes from '../routes/materials.js';
import doubtRoutes from '../routes/doubts.js';
import testRoutes from '../routes/tests.js';
import ragRoutes from '../routes/RAG.js';
import adminRoutes from '../routes/admin.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/doubts', doubtRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/rag', ragRoutes);
app.use('/api/admin', adminRoutes);

const TEST_PORT = 5001;
const BASE_URL = `http://localhost:${TEST_PORT}`;

const runTests = async () => {
  console.log('--- STARTING SPECIFIC LEARNZ INTEGRATION TEST SUITE ---');
  
  // 1. Init Database
  await initDb();
  
  // Clear any existing test records in FK order to keep test idempotent
  const testUser = await getRow("SELECT id FROM users WHERE email = 'student@test.com'");
  if (testUser) {
    await runQuery("DELETE FROM test_attempts WHERE user_id = $1", [testUser.id]);
    await runQuery("DELETE FROM doubt_replies WHERE user_id = $1", [testUser.id]);
    await runQuery("DELETE FROM doubts WHERE user_id = $1", [testUser.id]);
    await runQuery("DELETE FROM enrollments WHERE user_id = $1", [testUser.id]);
    await runQuery("DELETE FROM users WHERE id = $1", [testUser.id]);
  }
  const testCourse = await getRow("SELECT id FROM courses WHERE name = 'Test Physics Course'");
  if (testCourse) {
    await runQuery("DELETE FROM questions WHERE test_id IN (SELECT id FROM tests WHERE course_id = $1)", [testCourse.id]);
    await runQuery("DELETE FROM test_attempts WHERE test_id IN (SELECT id FROM tests WHERE course_id = $1)", [testCourse.id]);
    await runQuery("DELETE FROM tests WHERE course_id = $1", [testCourse.id]);
    await runQuery("DELETE FROM document_chunks WHERE course_id = $1", [testCourse.id]);
    await runQuery("DELETE FROM materials WHERE course_id = $1", [testCourse.id]);
    await runQuery("DELETE FROM doubt_replies WHERE doubt_id IN (SELECT id FROM doubts WHERE course_id = $1)", [testCourse.id]);
    await runQuery("DELETE FROM doubts WHERE course_id = $1", [testCourse.id]);
    await runQuery("DELETE FROM enrollments WHERE course_id = $1", [testCourse.id]);
    await runQuery("DELETE FROM courses WHERE id = $1", [testCourse.id]);
  }
  await runQuery("DELETE FROM otp_verifications WHERE email = 'student@test.com'");
  
  // Start server
  const server = app.listen(TEST_PORT, () => {
    console.log(`Test Express server listening on port ${TEST_PORT}`);
  });

  try {
    let studentToken = '';
    let adminToken = '';
    let courseId = null;
    let testId = null;
    let questionId = null;

    // STEP 1: Student registration OTP request
    console.log('\n[Test 1] Requesting signup OTP...');
    const registerRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'John Doe',
        email: 'student@test.com',
        mobile: '1234567890',
        password: 'Password123'
      })
    });
    const registerData = await registerRes.json();
    if (registerRes.status !== 200) throw new Error(`Registration OTP failed: ${registerData.message}`);
    console.log('✓ OTP requested successfully. Mock OTP:', registerData.mockOtpUsed);

    // STEP 2: Verify OTP
    console.log('\n[Test 2] Verifying OTP and creating student account...');
    const verifyRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'John Doe',
        email: 'student@test.com',
        mobile: '1234567890',
        password: 'Password123',
        otp: '123456'
      })
    });
    const verifyData = await verifyRes.json();
    if (verifyRes.status !== 200) throw new Error(`OTP Verification failed: ${verifyData.message}`);
    studentToken = verifyData.token;
    console.log('✓ Account verified and JWT token acquired.');

    // STEP 3: Admin Login
    console.log('\n[Test 3] Logging in as Administrator...');
    const adminRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrMobile: 'admin@specificlearnz.com',
        password: 'AdminPassword123'
      })
    });
    const adminData = await adminRes.json();
    if (adminRes.status !== 200) throw new Error(`Admin Login failed: ${adminData.message}`);
    adminToken = adminData.token;
    console.log('✓ Admin login successful.');

    // STEP 4: Create Course (Admin)
    console.log('\n[Test 4] Creating a JEE Course as Admin...');
    const courseRes = await fetch(`${BASE_URL}/api/courses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Test Physics Course',
        description: 'Comprehensive physics problems for JEE Advanced 2027.',
        price: 2999,
        discount_price: 1999,
        category: 'Physics',
        duration: '4 Months',
        status: 'published'
      })
    });
    const courseData = await courseRes.json();
    if (courseRes.status !== 201) throw new Error(`Course creation failed: ${courseData.message}`);
    courseId = courseData.courseId;
    console.log('✓ Course created with ID:', courseId);

    // STEP 5: Unauthorized Access Check (Student trying to fetch private data before purchase)
    console.log('\n[Test 5] Verifying access control restriction...');
    const doubtsDeniedRes = await fetch(`${BASE_URL}/api/doubts/course/${courseId}`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    if (doubtsDeniedRes.status !== 403) {
      throw new Error(`Access control failure! Student was able to access course assets without enrollment.`);
    }
    console.log('✓ Access control correctly blocked student doubt access (403 Forbidden).');

    // STEP 6: Initiate Course Purchase (Mock Order)
    console.log('\n[Test 6] Student initiating checkout order...');
    const orderRes = await fetch(`${BASE_URL}/api/courses/purchase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({ courseId })
    });
    const orderData = await orderRes.json();
    if (orderRes.status !== 200) throw new Error(`Purchase order failed: ${orderData.message}`);
    console.log('✓ Order initiated. ID:', orderData.orderId);

    // STEP 7: Verify Payment & Enroll
    console.log('\n[Test 7] Verifying payment simulation and enrolling student...');
    const payRes = await fetch(`${BASE_URL}/api/courses/verify-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        courseId,
        paymentId: 'pay_mock_test_123',
        orderId: orderData.orderId,
        isMock: true
      })
    });
    const payData = await payRes.json();
    if (payRes.status !== 200) throw new Error(`Payment verification failed: ${payData.message}`);
    console.log('✓ Enrollment success and course unlocked.');

    // STEP 8: Access Doubts After Enrollment
    console.log('\n[Test 8] Accessing course doubts after enrollment...');
    const doubtsRes = await fetch(`${BASE_URL}/api/doubts/course/${courseId}`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    if (doubtsRes.status !== 200) throw new Error('Doubt access failed after enrollment');
    const doubtsList = await doubtsRes.json();
    console.log(`✓ Access allowed. doubts listed: ${doubtsList.length}`);

    // STEP 9: Admin creates practice test
    console.log('\n[Test 9] Creating practice test timer as Admin...');
    const testCreateRes = await fetch(`${BASE_URL}/api/tests/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        courseId,
        title: 'Mechanics Mock Test',
        durationMinutes: 45,
        totalMarks: 20,
        negativeMarkingPercentage: 25,
        attemptLimit: 1
      })
    });
    const testCreateData = await testCreateRes.json();
    if (testCreateRes.status !== 201) throw new Error('Test creation failed');
    testId = testCreateData.testId;
    console.log('✓ Practice test created with ID:', testId);

    // STEP 10: Admin attaches MCQ question
    console.log('\n[Test 10] Attaching MCQ question as Admin...');
    const questionRes = await fetch(`${BASE_URL}/api/tests/${testId}/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        questionText: 'What is the SI unit of Force?',
        options: ['Newton', 'Joule', 'Watt', 'Pascal'],
        correctAnswer: 0,
        marks: 4
      })
    });
    if (questionRes.status !== 201) throw new Error('Question attachment failed');
    console.log('✓ Question attached to test.');

    // STEP 11: Student submits answers
    console.log('\n[Test 11] Student submitting quiz attempt...');
    const attemptRes = await fetch(`${BASE_URL}/api/tests/${testId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        answers: {
          '1': 0 // Answers Q1 correctly (index 0 = Newton)
        },
        timeTakenSeconds: 300
      })
    });
    const attemptData = await attemptRes.json();
    if (attemptRes.status !== 200) throw new Error('Test submission failed');
    console.log('✓ Test submitted. Correct answers count:', attemptData.result.correctCount);

    // STEP 12: Predict JEE Percentile
    console.log('\n[Test 12] Evaluating JEE percentile prediction calculations...');
    const predictRes = await fetch(`${BASE_URL}/api/tests/predict-percentile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exam: 'main',
        physics: 90,
        chemistry: 85,
        mathematics: 95
      })
    });
    const predictData = await predictRes.json();
    if (predictRes.status !== 200) throw new Error('Percentile predictor crashed');
    console.log('✓ Prediction evaluated successfully. Estimated Percentile:', predictData.estimatedPercentile);

    console.log('\n======================================================');
    console.log('ALL INTEGRATION TESTS COMPLETED SUCCESSFULLY (12/12)');
    console.log('======================================================');
    server.close();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ TEST SUITE RUN ENCOUNTERED A FAILURE:');
    console.error(error.message);
    server.close();
    process.exit(1);
  }
};

runTests();
