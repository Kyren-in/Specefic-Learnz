import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation.jsx';
import Footer from './components/Footer.jsx';
import Auth from './pages/Auth.jsx';
import Home from './pages/Home.jsx';
import CourseDetails from './pages/CourseDetails.jsx';
import CourseDashboard from './pages/CourseDashboard.jsx';
import Resources from './pages/Resources.jsx';
import Profile from './pages/Profile.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import { api } from './utils/api.js';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Authenticate session on load
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/api/auth/me')
        .then((userData) => {
          setUser(userData);
        })
        .catch((err) => {
          console.error('Session expired or invalid', err);
          localStorage.removeItem('token');
          setUser(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        gap: '16px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid var(--border-color)',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Loading Specific Learnz...</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Guards
  const ProtectedRoute = ({ children }) => {
    return user ? children : <Navigate to="/auth" replace />;
  };

  const AdminRoute = ({ children }) => {
    return user && user.role === 'admin' ? children : <Navigate to="/" replace />;
  };

  return (
    <BrowserRouter>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navigation user={user} onLogout={handleLogout} />
        
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Routes>
            {/* Public/Student Auth */}
            <Route path="/auth" element={!user ? <Auth onLogin={handleLogin} /> : <Navigate to="/" replace />} />
            
            {/* Registered Student Pages */}
            <Route path="/" element={<ProtectedRoute><Home enrolledOnly={false} /></ProtectedRoute>} />
            <Route path="/my-courses" element={<ProtectedRoute><Home enrolledOnly={true} /></ProtectedRoute>} />
            <Route path="/resources" element={<ProtectedRoute><Resources user={user} /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/course/:courseId/details" element={<ProtectedRoute><CourseDetails /></ProtectedRoute>} />
            <Route path="/course/:courseId/*" element={<ProtectedRoute><CourseDashboard user={user} /></ProtectedRoute>} />

            {/* Admin Portal */}
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
