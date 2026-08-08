import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// PostgreSQL connection pool (Supabase or any Postgres)
// Set DATABASE_URL in server/.env — Supabase provides this under Settings → Database → URI
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/specificlearnz',
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false }  // Required for Supabase/hosted Postgres
    : false                          // No SSL for local Postgres
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

// ── Query Helpers ──────────────────────────────────────────────────
// NOTE: PostgreSQL uses $1, $2, $3... placeholders (not ?)

// Run a query (INSERT / UPDATE / DELETE / CREATE)
export const runQuery = async (sql, params = []) => {
  const res = await pool.query(sql, params);
  return res;
};

// Get a single row — returns the row object or null
export const getRow = async (sql, params = []) => {
  const res = await pool.query(sql, params);
  return res.rows[0] || null;
};

// Get all matching rows — returns array (may be empty)
export const getAllRows = async (sql, params = []) => {
  const res = await pool.query(sql, params);
  return res.rows;
};

// ── Schema Initialization ──────────────────────────────────────────
export const initDb = async () => {
  const client = await pool.connect();
  try {
    console.log('Initializing PostgreSQL schemas...');

    // 1. Users
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        mobile TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'student',
        status TEXT NOT NULL DEFAULT 'active',
        ban_reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 2. OTP Verifications
    await client.query(`
      CREATE TABLE IF NOT EXISTS otp_verifications (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        otp TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL
      )
    `);

    // 3. Courses
    await client.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        price REAL NOT NULL,
        discount_price REAL,
        thumbnail TEXT,
        category TEXT,
        duration TEXT,
        status TEXT NOT NULL DEFAULT 'draft'
      )
    `);

    // 4. Enrollments
    await client.query(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        course_id INTEGER NOT NULL REFERENCES courses(id),
        payment_id TEXT NOT NULL,
        purchased_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 5. Materials
    await client.query(`
      CREATE TABLE IF NOT EXISTS materials (
        id SERIAL PRIMARY KEY,
        course_id INTEGER NOT NULL REFERENCES courses(id),
        title TEXT NOT NULL,
        file_path TEXT NOT NULL,
        type TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 6. Document Chunks (RAG embeddings)
    await client.query(`
      CREATE TABLE IF NOT EXISTS document_chunks (
        id SERIAL PRIMARY KEY,
        material_id INTEGER NOT NULL REFERENCES materials(id),
        course_id INTEGER NOT NULL REFERENCES courses(id),
        chunk_index INTEGER NOT NULL,
        content TEXT NOT NULL,
        embedding_json TEXT NOT NULL
      )
    `);

    // 7. Tests
    await client.query(`
      CREATE TABLE IF NOT EXISTS tests (
        id SERIAL PRIMARY KEY,
        course_id INTEGER NOT NULL REFERENCES courses(id),
        title TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL,
        total_marks INTEGER NOT NULL,
        negative_marking_percentage REAL DEFAULT 0,
        attempt_limit INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 8. Questions
    await client.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id SERIAL PRIMARY KEY,
        test_id INTEGER NOT NULL REFERENCES tests(id),
        question_text TEXT NOT NULL,
        options_json TEXT NOT NULL,
        correct_answer INTEGER NOT NULL,
        marks INTEGER NOT NULL DEFAULT 4
      )
    `);

    // 9. Test Attempts
    await client.query(`
      CREATE TABLE IF NOT EXISTS test_attempts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        test_id INTEGER NOT NULL REFERENCES tests(id),
        score INTEGER NOT NULL,
        accuracy REAL NOT NULL,
        time_taken_seconds INTEGER NOT NULL,
        submitted_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 10. Doubts
    await client.query(`
      CREATE TABLE IF NOT EXISTS doubts (
        id SERIAL PRIMARY KEY,
        course_id INTEGER NOT NULL REFERENCES courses(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        image_path TEXT,
        is_pinned BOOLEAN DEFAULT FALSE,
        is_locked BOOLEAN DEFAULT FALSE,
        helpful_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 11. Doubt Replies
    await client.query(`
      CREATE TABLE IF NOT EXISTS doubt_replies (
        id SERIAL PRIMARY KEY,
        doubt_id INTEGER NOT NULL REFERENCES doubts(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 12. Announcements
    await client.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id SERIAL PRIMARY KEY,
        type TEXT NOT NULL,
        course_id INTEGER REFERENCES courses(id),
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        priority TEXT DEFAULT 'medium',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 13. Feedbacks
    await client.query(`
      CREATE TABLE IF NOT EXISTS feedbacks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        course_id INTEGER NOT NULL REFERENCES courses(id),
        rating INTEGER NOT NULL,
        responses_json TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 14. Universal Resources
    await client.query(`
      CREATE TABLE IF NOT EXISTS universal_resources (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        file_path TEXT,
        type TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Seed default admin if not exists
    const adminEmail = 'admin@specificlearnz.com';
    const existing = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [adminEmail]
    );

    if (existing.rows.length === 0) {
      const passwordHash = await bcrypt.hash('AdminPassword123', 10);
      await client.query(
        'INSERT INTO users (name, email, mobile, password_hash, role) VALUES ($1, $2, $3, $4, $5)',
        ['System Admin', adminEmail, '9999999999', passwordHash, 'admin']
      );
      console.log('Seeded default admin user:', adminEmail, '/ Password: AdminPassword123');
    }

    console.log('PostgreSQL schemas verified and initialized.');
  } finally {
    client.release();
  }
};

export default pool;
