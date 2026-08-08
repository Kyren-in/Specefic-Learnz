import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path — configurable via DB_PATH env var for persistent disk hosting
// e.g. on Render with persistent disk: DB_PATH=/var/data/database.sqlite
const dbPath = process.env.DB_PATH || path.resolve(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
  }
});

// Helper to run query as promise
export const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

// Helper to get single row
export const getRow = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// Helper to get all rows
export const getAllRows = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export const initDb = () => {
  return new Promise((resolve, reject) => {
    db.serialize(async () => {
      try {
    // 1. Users
    await runQuery(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        mobile TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'student', -- student, admin
        status TEXT NOT NULL DEFAULT 'active', -- active, banned
        ban_reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. OTP Verifications
    await runQuery(`
      CREATE TABLE IF NOT EXISTS otp_verifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        otp TEXT NOT NULL,
        expires_at DATETIME NOT NULL
      )
    `);

    // 3. Courses
    await runQuery(`
      CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        price REAL NOT NULL,
        discount_price REAL,
        thumbnail TEXT,
        category TEXT,
        duration TEXT,
        status TEXT NOT NULL DEFAULT 'draft' -- draft, published, archived
      )
    `);

    // 4. Enrollments
    await runQuery(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        course_id INTEGER NOT NULL,
        payment_id TEXT NOT NULL,
        purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(course_id) REFERENCES courses(id)
      )
    `);

    // 5. Materials
    await runQuery(`
      CREATE TABLE IF NOT EXISTS materials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        file_path TEXT NOT NULL,
        type TEXT NOT NULL, -- pdf, video, note, link
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(course_id) REFERENCES courses(id)
      )
    `);

    // 6. Document Chunks (for RAG)
    await runQuery(`
      CREATE TABLE IF NOT EXISTS document_chunks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        material_id INTEGER NOT NULL,
        course_id INTEGER NOT NULL,
        chunk_index INTEGER NOT NULL,
        content TEXT NOT NULL,
        embedding_json TEXT NOT NULL, -- JSON array of embeddings
        FOREIGN KEY(material_id) REFERENCES materials(id),
        FOREIGN KEY(course_id) REFERENCES courses(id)
      )
    `);

    // 7. Tests
    await runQuery(`
      CREATE TABLE IF NOT EXISTS tests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL,
        total_marks INTEGER NOT NULL,
        negative_marking_percentage REAL DEFAULT 0,
        attempt_limit INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(course_id) REFERENCES courses(id)
      )
    `);

    // 8. Questions
    await runQuery(`
      CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        test_id INTEGER NOT NULL,
        question_text TEXT NOT NULL,
        options_json TEXT NOT NULL, -- JSON array of 4 options
        correct_answer INTEGER NOT NULL, -- index of correct option (0-3)
        marks INTEGER NOT NULL DEFAULT 4,
        FOREIGN KEY(test_id) REFERENCES tests(id)
      )
    `);

    // 9. Test Attempts
    await runQuery(`
      CREATE TABLE IF NOT EXISTS test_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        test_id INTEGER NOT NULL,
        score INTEGER NOT NULL,
        accuracy REAL NOT NULL,
        time_taken_seconds INTEGER NOT NULL,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(test_id) REFERENCES tests(id)
      )
    `);
    // 10. Doubts
    await runQuery(`
      CREATE TABLE IF NOT EXISTS doubts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        image_path TEXT,
        is_pinned INTEGER DEFAULT 0,
        is_locked INTEGER DEFAULT 0,
        helpful_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(course_id) REFERENCES courses(id),
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `);
    // 11. Doubt Replies
    await runQuery(`
      CREATE TABLE IF NOT EXISTS doubt_replies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        doubt_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(doubt_id) REFERENCES doubts(id),
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `);

    // 12. Announcements
    await runQuery(`
      CREATE TABLE IF NOT EXISTS announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL, -- universal, course
        course_id INTEGER, -- nullable
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        priority TEXT DEFAULT 'medium', -- low, medium, high
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(course_id) REFERENCES courses(id)
      )
    `);

    // 13. Feedback
    await runQuery(`
      CREATE TABLE IF NOT EXISTS feedbacks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        course_id INTEGER NOT NULL,
        rating INTEGER NOT NULL,
        responses_json TEXT NOT NULL, -- JSON detailed answers
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(course_id) REFERENCES courses(id)
      )
    `);

    // 14. Universal Content / Resources
    await runQuery(`
      CREATE TABLE IF NOT EXISTS universal_resources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        file_path TEXT,
        type TEXT NOT NULL, -- notice, strategy, info, tip
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed default administrator if not exists
    const adminEmail = 'admin@specificlearnz.com';
    const existingAdmin = await getRow('SELECT * FROM users WHERE email = ?', [adminEmail]);
    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash('AdminPassword123', 10);
      await runQuery(
        'INSERT INTO users (name, email, mobile, password_hash, role) VALUES (?, ?, ?, ?, ?)',
        ['System Admin', adminEmail, '9999999999', passwordHash, 'admin']
      );
      console.log('Seeded default admin user:', adminEmail, 'Password: AdminPassword123');
    }
    resolve();
  } catch (err) {
    reject(err);
  }
});
});
};

export default db;
