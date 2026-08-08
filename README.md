# 🚀 Specific Learnz — JEE Preparation Platform

A full-stack web platform for JEE Main & Advanced preparation, built with **React + Vite** (frontend) and **Express.js + SQLite** (backend).

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔐 Auth | Email OTP signup, JWT sessions, forgot password |
| 📚 Courses | Browse & purchase courses via Razorpay (or Mock Mode) |
| 📄 Protected PDFs | Dynamically watermarked PDF viewer (blocks print/copy/save) |
| 💬 Doubt Board | Course-specific discussion threads with replies & helpful votes |
| 📝 Test Series | Timed MCQ exams with server-side grading, negative marking, report cards |
| 🤖 AI Search | RAG-powered course content search using Gemini embeddings |
| 📊 JEE Predictor | Percentile & rank estimator for JEE Main and Advanced |
| 📣 Announcements | Platform-wide and course-specific notification banners |
| 🛡️ Admin Panel | Revenue stats, course CRUD, user management, test builder |

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, React Router DOM, Lucide React
- **Backend**: Express.js, SQLite3, JWT, Multer, pdf-lib, pdf-parse
- **AI**: Google Gemini API (`text-embedding-004` + `gemini-1.5-flash`)
- **Payments**: Razorpay
- **Mail**: Brevo (Sendinblue) HTTP API
- **Database**: SQLite (file-based, zero-config)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/specific-learnz.git
cd specific-learnz

# Install root (frontend) dependencies
npm install

# Install backend dependencies
npm --prefix server install
```

### 2. Configure Environment

```bash
cp server/.env.example server/.env
```

Edit `server/.env` with your keys (all optional in Developer Mode):

```env
PORT=5000
JWT_SECRET=your_strong_secret_key_here
GEMINI_API_KEY=          # Optional: AI search
BREVO_API_KEY=           # Optional: Real email OTP
RAZORPAY_KEY_ID=         # Optional: Real payments
RAZORPAY_KEY_SECRET=     # Optional: Real payments
NODE_ENV=development
```

### 3. Run

```bash
npm run dev
```

Opens at **http://localhost:5173**

### Default Admin Account
| Email | Password |
|-------|----------|
| `admin@specificlearnz.com` | `AdminPassword123` |

## 🔧 Developer / Mock Mode

Without API keys, the platform runs fully in **Mock Mode**:

- **OTP**: Any email → enter `123456` to verify
- **Payments**: Browser modal → click "Complete Payment"  
- **AI Search**: Keyword matching (no Gemini key needed)
- **PDF Watermark**: Always active (no key needed)

## 📁 Project Structure

```
specific-learnz/
├── src/                    # React frontend
│   ├── pages/              # Auth, Home, CourseDetails, CourseDashboard, Resources, AdminDashboard
│   ├── components/         # Navigation, ProtectedViewer
│   └── utils/api.js        # JWT-aware fetch wrapper
├── server/
│   ├── config/database.js  # SQLite schema (14 tables)
│   ├── middleware/auth.js  # JWT + role guards
│   ├── routes/             # auth, courses, materials, doubts, tests, RAG, admin
│   ├── uploads/            # User-uploaded files (gitignored)
│   ├── server.js           # Express entry point
│   └── .env.example        # Environment template
├── package.json            # Root: concurrently runs frontend + backend
└── vite.config.js          # Vite + proxy config
```

## 🌐 Deployment

See [Hosting Guide](#hosting) below or the [full walkthrough](DEPLOY.md).

### Recommended: Railway (simplest)
1. Push to GitHub
2. Connect repo on [railway.app](https://railway.app)
3. Set environment variables in Railway dashboard
4. Add your custom domain in Settings → Domains

### Alternative: DigitalOcean Droplet (production)
1. Create Ubuntu 22.04 droplet (~$6/month)
2. Install Node.js 20 + PM2 + Nginx
3. Clone repo, configure `.env`, run `npm run build`
4. Serve frontend via Nginx, run backend via PM2
5. Point your domain's A record to the droplet IP

## 📜 License

MIT
