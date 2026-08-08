import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, ShieldAlert, Bell, BookOpen, Layers } from 'lucide-react';
import { api } from '../utils/api.js';

const Navigation = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [announcements, setAnnouncements] = useState([]);
  const [showAnnouncementsModal, setShowAnnouncementsModal] = useState(false);

  useEffect(() => {
    if (user) {
      // Fetch universal announcements
      api.get('/api/admin/announcements')
        .then(data => {
          setAnnouncements(data.filter(a => a.type === 'universal'));
        })
        .catch(err => console.error(err));
    }
  }, [user]);

  const handleLogoutClick = () => {
    localStorage.removeItem('token');
    onLogout();
    navigate('/auth');
  };

  return (
    <>
      <nav style={{
        height: '70px',
        background: 'var(--glass-bg)',
        borderBottom: '1px solid var(--glass-border)',
        backdropFilter: 'var(--glass-blur)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              background: 'var(--gradient-main)',
              borderRadius: '8px',
              padding: '6px 12px',
              fontWeight: 800,
              fontSize: '1.2rem',
              color: '#fff'
            }}>SL</span>
            <span style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.03em', color: '#fff' }}>
              Specific<span style={{ color: 'var(--primary)' }}>Learnerz</span>
            </span>
          </Link>

          {user && (
            <div style={{ display: 'flex', gap: '24px' }}>
              <Link 
                to="/" 
                style={{ 
                  color: location.pathname === '/' ? 'var(--primary)' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.95rem'
                }}
              >
                Marketplace
              </Link>
              <Link 
                to="/my-courses" 
                style={{ 
                  color: location.pathname === '/my-courses' ? 'var(--primary)' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.95rem'
                }}
              >
                My Courses
              </Link>
              <Link 
                to="/resources" 
                style={{ 
                  color: location.pathname === '/resources' ? 'var(--primary)' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.95rem'
                }}
              >
                Resources
              </Link>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {user ? (
            <>
              {/* Announcements bell indicator */}
              <button 
                onClick={() => setShowAnnouncementsModal(true)}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '50%',
                  width: '38px',
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  position: 'relative'
                }}
              >
                <Bell size={18} />
                {announcements.length > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    width: '10px',
                    height: '10px',
                    background: 'var(--primary)',
                    borderRadius: '50%',
                    border: '2px solid var(--bg-primary)'
                  }} />
                )}
              </button>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user.name}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                  {user.role}
                </span>
              </div>

              {user.role === 'admin' && (
                <Link to="/admin" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                  <ShieldAlert size={14} /> Admin Panel
                </Link>
              )}

              <button 
                onClick={handleLogoutClick} 
                className="btn btn-secondary" 
                style={{ 
                  padding: '8px 16px', 
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <LogOut size={14} /> Log Out
              </button>
            </>
          ) : (
            <Link to="/auth" className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '0.9rem' }}>
              Sign In
            </Link>
          )}
        </div>
      </nav>

      {/* Announcements Modal */}
      {showAnnouncementsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          backdropFilter: 'blur(8px)'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '550px',
            padding: '30px',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={22} className="gradient-text" /> Platform Announcements
              </h2>
              <button 
                onClick={() => setShowAnnouncementsModal(false)}
                className="btn btn-secondary" 
                style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem' }}
              >
                Close
              </button>
            </div>

            {announcements.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-tertiary)' }}>
                No active announcements at the moment.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {announcements.map((ann, idx) => (
                  <div 
                    key={ann.id || idx} 
                    style={{
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      padding: '16px',
                      background: 'rgba(255, 255, 255, 0.01)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{ann.title}</h4>
                      <span className={`badge ${
                        ann.priority === 'high' ? 'badge-warning' : 'badge-primary'
                      }`}>
                        {ann.priority}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                      {ann.content}
                    </p>
                    <div style={{ marginTop: '10px', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      Published on {new Date(ann.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Navigation;
