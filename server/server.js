import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb } from './config/database.js';

// Load environmental variables
dotenv.config();

// Router imports
import authRoutes from './routes/auth.js';
import courseRoutes from './routes/courses.js';
import materialRoutes from './routes/materials.js';
import doubtRoutes from './routes/doubts.js';
import testRoutes from './routes/tests.js';
import ragRoutes from './routes/RAG.js';
import adminRoutes from './routes/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

// CORS: allow localhost in dev, all origins in production (Render manages HTTPS)
const corsOptions = isProduction
  ? { origin: true, credentials: true }
  : {
      origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true
    };

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files (doubt image attachments etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// DB initialization
initDb()
  .then(() => {
    console.log('SQLite Database schemas verified and initialized.');
  })
  .catch((err) => {
    console.error('Failed to migrate database schemas:', err);
  });

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/doubts', doubtRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/rag', ragRoutes);
app.use('/api/admin', adminRoutes);

// --- Production: Serve the built React frontend ---
// dist/ is built into the project root (one level up from server/)
if (isProduction) {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));

  // React Router SPA fallback — all non-API routes serve index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Express Error Handler:', err.stack);
  res.status(500).json({ message: 'An internal server error occurred' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`\n===========================================`);
  console.log(`SPECIFIC LEARNZ Backend Running on Port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`===========================================\n`);
});
