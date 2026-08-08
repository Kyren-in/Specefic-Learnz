import express from 'express';
import { runQuery, getRow, getAllRows } from '../config/database.js';
import { authenticateToken, requireAdmin, checkCourseEnrollment } from '../middleware/auth.js';

const router = express.Router();

const checkAccess = async (req, res, courseId) => {
  const isEnrolled = await checkCourseEnrollment(req.user.id, courseId, req.user.role);
  if (!isEnrolled) {
    res.status(403).json({ message: 'Access denied. Course enrollment required.' });
    return false;
  }
  return true;
};

// 1. Get tests in a course
router.get('/course/:courseId', authenticateToken, async (req, res) => {
  const { courseId } = req.params;

  if (!(await checkAccess(req, res, courseId))) return;

  try {
    const tests = await getAllRows(
      `SELECT t.*,
       (SELECT COUNT(*) FROM test_attempts ta WHERE ta.test_id = t.id AND ta.user_id = $1) as attempts_count
       FROM tests t
       WHERE t.course_id = $2 ORDER BY t.id ASC`,
      [req.user.id, courseId]
    );
    res.json(tests);
  } catch (error) {
    console.error('Fetch tests error:', error);
    res.status(500).json({ message: 'Failed to retrieve test series' });
  }
});

// 2. Get questions for a test (without correct answers for students)
router.get('/:testId/questions', authenticateToken, async (req, res) => {
  const { testId } = req.params;

  try {
    const test = await getRow('SELECT * FROM tests WHERE id = $1', [testId]);
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    if (!(await checkAccess(req, res, test.course_id))) return;

    if (req.user.role !== 'admin') {
      const attempts = await getRow(
        'SELECT COUNT(*) as count FROM test_attempts WHERE user_id = $1 AND test_id = $2',
        [req.user.id, testId]
      );
      if (parseInt(attempts.count) >= test.attempt_limit) {
        return res.status(403).json({ message: 'You have reached the maximum attempt limit for this test' });
      }
    }

    const questions = await getAllRows(
      'SELECT id, test_id, question_text, options_json, marks FROM questions WHERE test_id = $1',
      [testId]
    );

    const parsedQuestions = questions.map(q => ({
      ...q,
      options: JSON.parse(q.options_json)
    }));

    res.json({ test, questions: parsedQuestions });
  } catch (error) {
    console.error('Fetch test questions error:', error);
    res.status(500).json({ message: 'Failed to retrieve test questions' });
  }
});

// 3. Submit Test & Grade Server-Side
router.post('/:testId/submit', authenticateToken, async (req, res) => {
  const { testId } = req.params;
  const { answers, timeTakenSeconds } = req.body;

  try {
    const test = await getRow('SELECT * FROM tests WHERE id = $1', [testId]);
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    if (!(await checkAccess(req, res, test.course_id))) return;

    const attempts = await getRow(
      'SELECT COUNT(*) as count FROM test_attempts WHERE user_id = $1 AND test_id = $2',
      [req.user.id, testId]
    );
    if (req.user.role !== 'admin' && parseInt(attempts.count) >= test.attempt_limit) {
      return res.status(403).json({ message: 'Maximum attempt limit exceeded' });
    }

    const questions = await getAllRows('SELECT * FROM questions WHERE test_id = $1', [testId]);

    let score = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let unattemptedCount = 0;

    const analysis = questions.map(q => {
      const selected = answers[q.id];
      const correctOption = q.correct_answer;

      let status = 'unattempted';
      let earnedMarks = 0;

      if (selected === undefined || selected === null) {
        unattemptedCount++;
      } else if (parseInt(selected) === correctOption) {
        correctCount++;
        earnedMarks = q.marks;
        score += q.marks;
        status = 'correct';
      } else {
        incorrectCount++;
        const penalty = q.marks * (test.negative_marking_percentage / 100);
        earnedMarks = -penalty;
        score -= penalty;
        status = 'incorrect';
      }

      return {
        questionId: q.id,
        questionText: q.question_text,
        options: JSON.parse(q.options_json),
        selectedOption: selected,
        correctOption,
        earnedMarks,
        status
      };
    });

    const totalAttempted = correctCount + incorrectCount;
    const accuracy = totalAttempted > 0 ? (correctCount / totalAttempted) * 100 : 0;

    await runQuery(
      `INSERT INTO test_attempts (user_id, test_id, score, accuracy, time_taken_seconds)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, testId, Math.round(score), parseFloat(accuracy.toFixed(2)), timeTakenSeconds || 0]
    );

    res.json({
      message: 'Test submitted and graded successfully',
      result: {
        score: Math.round(score),
        totalMarks: test.total_marks,
        correctCount,
        incorrectCount,
        unattemptedCount,
        accuracy: parseFloat(accuracy.toFixed(2)),
        timeTakenSeconds: timeTakenSeconds || 0,
        questionAnalysis: analysis
      }
    });
  } catch (error) {
    console.error('Submit test error:', error);
    res.status(500).json({ message: 'Failed to grade and submit test' });
  }
});

// 4. Student: Get Report Card
router.get('/course/:courseId/report-card', authenticateToken, async (req, res) => {
  const { courseId } = req.params;
  if (!(await checkAccess(req, res, courseId))) return;

  try {
    const attempts = await getAllRows(
      `SELECT ta.*, t.title as test_title, t.total_marks
       FROM test_attempts ta
       JOIN tests t ON ta.test_id = t.id
       WHERE t.course_id = $1 AND ta.user_id = $2
       ORDER BY ta.submitted_at ASC`,
      [courseId, req.user.id]
    );

    if (attempts.length === 0) {
      return res.json({
        hasAttempts: false,
        summary: { attemptsCount: 0, averageScorePercent: 0, highestScore: 0, averageAccuracy: 0 },
        history: []
      });
    }

    const attemptsCount = attempts.length;
    const totalScoreObtained = attempts.reduce((sum, a) => sum + a.score, 0);
    const totalPossibleMarks = attempts.reduce((sum, a) => sum + a.total_marks, 0);
    const averageScorePercent = totalPossibleMarks > 0 ? (totalScoreObtained / totalPossibleMarks) * 100 : 0;
    const highestScore = Math.max(...attempts.map(a => a.score));
    const averageAccuracy = attempts.reduce((sum, a) => sum + parseFloat(a.accuracy), 0) / attemptsCount;

    const history = [];
    for (const attempt of attempts) {
      const testAttempts = await getAllRows(
        `SELECT user_id, MAX(score) as max_score
         FROM test_attempts
         WHERE test_id = $1
         GROUP BY user_id
         ORDER BY max_score DESC`,
        [attempt.test_id]
      );

      const rank = testAttempts.findIndex(ta => parseInt(ta.user_id) === req.user.id) + 1;
      const totalStudents = testAttempts.length;

      history.push({
        attemptId: attempt.id,
        testTitle: attempt.test_title,
        score: attempt.score,
        totalMarks: attempt.total_marks,
        accuracy: attempt.accuracy,
        submittedAt: attempt.submitted_at,
        rank: `${rank}/${totalStudents}`,
        percentile: totalStudents > 1
          ? (((totalStudents - rank) / (totalStudents - 1)) * 100).toFixed(2)
          : '100.00'
      });
    }

    const courseRankings = await getAllRows(
      `SELECT ta.user_id, AVG(ta.score::REAL / t.total_marks) as avg_percent
       FROM test_attempts ta
       JOIN tests t ON ta.test_id = t.id
       WHERE t.course_id = $1
       GROUP BY ta.user_id
       ORDER BY avg_percent DESC`,
      [courseId]
    );

    const overallRank = courseRankings.findIndex(cr => parseInt(cr.user_id) === req.user.id) + 1;
    const overallTotalStudents = courseRankings.length;
    const overallPercentile = overallTotalStudents > 1
      ? (((overallTotalStudents - overallRank) / (overallTotalStudents - 1)) * 100).toFixed(2)
      : '100.00';

    res.json({
      hasAttempts: true,
      summary: {
        attemptsCount,
        averageScorePercent: parseFloat(averageScorePercent.toFixed(2)),
        highestScore,
        averageAccuracy: parseFloat(averageAccuracy.toFixed(2)),
        overallRank: `${overallRank}/${overallTotalStudents}`,
        overallPercentile
      },
      history
    });
  } catch (error) {
    console.error('Report card generation error:', error);
    res.status(500).json({ message: 'Failed to generate report card analytics' });
  }
});

// 5. Admin: Create Test
router.post('/create', authenticateToken, requireAdmin, async (req, res) => {
  const { courseId, title, durationMinutes, totalMarks, negativeMarkingPercentage, attemptLimit } = req.body;

  if (!courseId || !title || !durationMinutes || !totalMarks) {
    return res.status(400).json({ message: 'Course ID, title, duration, and total marks are required' });
  }

  try {
    const result = await runQuery(
      `INSERT INTO tests (course_id, title, duration_minutes, total_marks, negative_marking_percentage, attempt_limit)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [courseId, title, durationMinutes, totalMarks, negativeMarkingPercentage || 0, attemptLimit || 1]
    );

    res.status(201).json({
      message: 'Test created successfully',
      testId: result.rows[0].id
    });
  } catch (error) {
    console.error('Create test error:', error);
    res.status(500).json({ message: 'Failed to create test' });
  }
});

// 6. Admin: Add Question to Test
router.post('/:testId/questions', authenticateToken, requireAdmin, async (req, res) => {
  const { testId } = req.params;
  const { questionText, options, correctAnswer, marks } = req.body;

  if (!questionText || !options || options.length !== 4 || correctAnswer === undefined || !marks) {
    return res.status(400).json({ message: 'Question details, 4 options, correct answer index, and marks are required' });
  }

  try {
    await runQuery(
      `INSERT INTO questions (test_id, question_text, options_json, correct_answer, marks)
       VALUES ($1, $2, $3, $4, $5)`,
      [testId, questionText, JSON.stringify(options), correctAnswer, marks]
    );

    res.status(201).json({ message: 'Question added successfully' });
  } catch (error) {
    console.error('Add question error:', error);
    res.status(500).json({ message: 'Failed to add question to test' });
  }
});

// 7. JEE Percentile Predictor (no DB queries — pure calculation)
router.post('/predict-percentile', async (req, res) => {
  const { exam, physics, chemistry, mathematics } = req.body;

  if (!exam || physics === undefined || chemistry === undefined || mathematics === undefined) {
    return res.status(400).json({ message: 'Exam type and subject marks are required' });
  }

  const total = parseFloat(physics) + parseFloat(chemistry) + parseFloat(mathematics);
  let estimatedPercentileMin = 0, estimatedPercentileMax = 0, rankMin = 0, rankMax = 0;

  if (exam === 'main') {
    if (total >= 260)      { estimatedPercentileMin = 99.85; estimatedPercentileMax = 100.00; rankMin = 1;      rankMax = 2000; }
    else if (total >= 220) { estimatedPercentileMin = 99.30; estimatedPercentileMax = 99.84;  rankMin = 2001;   rankMax = 8000; }
    else if (total >= 180) { estimatedPercentileMin = 98.20; estimatedPercentileMax = 99.29;  rankMin = 8001;   rankMax = 20000; }
    else if (total >= 150) { estimatedPercentileMin = 96.50; estimatedPercentileMax = 98.19;  rankMin = 20001;  rankMax = 40000; }
    else if (total >= 120) { estimatedPercentileMin = 93.00; estimatedPercentileMax = 96.49;  rankMin = 40001;  rankMax = 80000; }
    else if (total >= 90)  { estimatedPercentileMin = 85.00; estimatedPercentileMax = 92.99;  rankMin = 80001;  rankMax = 180000; }
    else if (total >= 60)  { estimatedPercentileMin = 70.00; estimatedPercentileMax = 84.99;  rankMin = 180001; rankMax = 360000; }
    else { estimatedPercentileMin = Math.max(10.00, (total / 60) * 70); estimatedPercentileMax = estimatedPercentileMin + 5; rankMin = 360001; rankMax = 1000000; }
  } else {
    if (total >= 280)      { estimatedPercentileMin = 99.9; estimatedPercentileMax = 100.0; rankMin = 1;    rankMax = 100; }
    else if (total >= 240) { estimatedPercentileMin = 99.5; estimatedPercentileMax = 99.89; rankMin = 101;  rankMax = 500; }
    else if (total >= 200) { estimatedPercentileMin = 98.5; estimatedPercentileMax = 99.49; rankMin = 501;  rankMax = 1800; }
    else if (total >= 160) { estimatedPercentileMin = 96.5; estimatedPercentileMax = 98.49; rankMin = 1801; rankMax = 5000; }
    else if (total >= 120) { estimatedPercentileMin = 90.0; estimatedPercentileMax = 96.49; rankMin = 5001; rankMax = 12000; }
    else if (total >= 90)  { estimatedPercentileMin = 80.0; estimatedPercentileMax = 89.99; rankMin = 12001; rankMax = 22000; }
    else { estimatedPercentileMin = Math.max(5.00, (total / 90) * 80); estimatedPercentileMax = estimatedPercentileMin + 5; rankMin = 22001; rankMax = 50000; }
  }

  res.json({
    totalScore: total,
    estimatedPercentile: `${estimatedPercentileMin.toFixed(2)} - ${estimatedPercentileMax.toFixed(2)}`,
    estimatedRank: `${rankMin} - ${rankMax}`,
    disclaimer: 'These predictions are estimations based on historical Marks vs Percentile/Rank ratios. Actual results may vary.'
  });
});

export default router;
