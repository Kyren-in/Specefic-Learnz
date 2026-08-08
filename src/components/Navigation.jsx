import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, ShieldAlert, Bell, BookOpen, Layers, User as UserIcon, Menu, X } from 'lucide-react';
import { api } from '../utils/api.js';

const Navigation = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [announcements, setAnnouncements] = useState([]);
  const [showAnnouncementsModal, setShowAnnouncementsModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (user) {
      api.get('/api/admin/announcements')
        .then(data => {
          setAnnouncements(data.filter(a => a.type === 'universal'));
        })
        .catch(err => console.error(err));
    }
  }, [user]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogoutClick = () => {
    localStorage.removeItem('token');
    onLogout();
    navigate('/auth');
  };

  return (
    <>
      <nav className="main-navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img 
              src="/logo.png" 
              alt="SPECIFIC LEARNERZ Logo" 
              style={{
                height: '38px',
                width: 'auto',
                objectFit: 'contain',
                borderRadius: '6px',
                filter: 'drop-shadow(0 2px 8px rgba(99, 102, 241, 0.4))'
              }}
            />
            <span style={{ fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.03em', color: '#fff' }}>
              Specific<span style={{ color: 'var(--primary)' }}>Learnerz</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          {user && (
            <div className="desktop-nav-links">
              <Link 
                to="/" 
                style={{ 
                  color: location.pathname === '/' ? 'var(--primary)' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.9rem'
                }}
              >
                Marketplace
              </Link>
              <Link 
                to="/my-courses" 
                style={{ 
                  color: location.pathname === '/my-courses' ? 'var(--primary)' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.9rem'
                }}
              >
                My Courses
              </Link>
              <Link 
                to="/resources" 
                style={{ 
                  color: location.pathname === '/resources' ? 'var(--primary)' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.9rem'
                }}
              >
                Resources
              </Link>
            </div>
          )}
        </div>

        {/* Desktop Controls */}
        <div className="desktop-nav-controls">
          {user ? (
            <>
              {/* Announcements bell indicator */}
              <button 
                onClick={() => setShowAnnouncementsModal(true)}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  position: 'relative'
                }}
                title="Announcements"
              >
                <Bell size={16} />
                {announcements.length > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    width: '9px',
                    height: '9px',
                    background: 'var(--primary)',
                    borderRadius: '50%',
                    border: '2px solid var(--bg-primary)'
                  }} />
                )}
              </button>

              {/* Profile Link with Avatar */}
              <Link 
                to="/profile" 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  background: location.pathname === '/profile' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  border: location.pathname === '/profile' ? '1px solid var(--primary)' : '1px solid transparent',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}>
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <UserIcon size={16} color="#fff" />
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.8rem', color: '#fff' }}>{user.name}</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                    {user.role}
                  </span>
                </div>
              </Link>

              {user.role === 'admin' && (
                <Link to="/admin" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                  <ShieldAlert size={14} /> Admin
                </Link>
              )}

              <button 
                onClick={handleLogoutClick} 
                className="btn btn-secondary" 
                style={{ 
                  padding: '6px 12px', 
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <LogOut size={14} /> Log Out
              </button>
            </>
          ) : (
            <Link to="/auth" className="btn btn-primary" style={{ padding: '8px 18px', fontSize: '0.85rem' }}>
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button 
          className="mobile-hamburger-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-menu-drawer">
          {user ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '14px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {user.avatar_url ? <img src={user.avatar_url} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <UserIcon size={20} color="#fff" />}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>{user.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>{user.role} Account</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Link to="/" className="mobile-nav-item">Marketplace</Link>
                <Link to="/my-courses" className="mobile-nav-item">My Courses</Link>
                <Link to="/resources" className="mobile-nav-item">Resources</Link>
                <Link to="/profile" className="mobile-nav-item">My Profile Settings</Link>
                {user.role === 'admin' && (
                  <Link to="/admin" className="mobile-nav-item" style={{ color: 'var(--secondary)' }}>🛡️ Admin Panel</Link>
                )}
                <button 
                  onClick={() => setShowAnnouncementsModal(true)} 
                  className="mobile-nav-item"
                  style={{ background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Bell size={16} /> Announcements ({announcements.length})
                </button>
              </div>

              <button 
                onClick={handleLogoutClick} 
                className="btn btn-secondary" 
                style={{ width: '100%', marginTop: 'auto', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <LogOut size={16} /> Log Out Account
              </button>
            </>
          ) : (
            <Link to="/auth" className="btn btn-primary" style={{ width: '100%', padding: '12px', textAlign: 'center' }}>
              Sign In to Platform
            </Link>
          )}
        </div>
      )}

      {/* Announcements Modal */}
      {showAnnouncementsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          backdropFilter: 'blur(8px)',
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '550px',
            padding: '24px',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={20} className="gradient-text" /> Platform Announcements
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
              <p style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-tertiary)' }}>
                No active announcements at the moment.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {announcements.map((ann, idx) => (
                  <div 
                    key={ann.id || idx} 
                    style={{
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      padding: '14px',
                      background: 'rgba(255, 255, 255, 0.01)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>{ann.title}</h4>
                      <span className={`badge ${
                        ann.priority === 'high' ? 'badge-warning' : 'badge-primary'
                      }`}>
                        {ann.priority}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                      {ann.content}
                    </p>
                    <div style={{ marginTop: '8px', fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
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
