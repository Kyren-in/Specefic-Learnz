import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, ShieldCheck, Heart } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer style={{
      background: 'var(--glass-bg)',
      borderTop: '1px solid var(--glass-border)',
      backdropFilter: 'var(--glass-blur)',
      marginTop: 'auto',
      padding: '40px 32px 24px 32px',
      color: 'var(--text-secondary)'
    }}>
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Main Footer Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '40px',
          marginBottom: '32px'
        }}>
          
          {/* Column 1: Brand Info */}
          <div>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <img
                src="/logo.png"
                alt="Specific Learnerz Logo"
                style={{
                  height: '38px',
                  width: 'auto',
                  objectFit: 'contain',
                  borderRadius: '6px',
                  filter: 'drop-shadow(0 2px 8px rgba(99, 102, 241, 0.4))'
                }}
              />
              <span style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.03em', color: '#fff' }}>
                Specific<span style={{ color: 'var(--primary)' }}>Learnerz</span>
              </span>
            </Link>
            <p style={{ fontSize: '0.9rem', lineHeight: '1.6', color: 'var(--text-tertiary)', marginBottom: '16px' }}>
              Premium JEE Main & Advanced preparation platform with course-specific RAG AI search, timed test series, protected study materials, and doubt discussions.
            </p>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)', letterSpacing: '1px' }}>
              #LEARN #FOCUS #GROW #REPEAT
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h4 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}>
              Navigation
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem' }}>
              <li>
                <Link to="/" style={{ color: 'var(--text-secondary)', transition: 'color 0.2s' }}>
                  Marketplace Courses
                </Link>
              </li>
              <li>
                <Link to="/my-courses" style={{ color: 'var(--text-secondary)', transition: 'color 0.2s' }}>
                  My Enrolled Courses
                </Link>
              </li>
              <li>
                <Link to="/resources" style={{ color: 'var(--text-secondary)', transition: 'color 0.2s' }}>
                  Universal Study Resources
                </Link>
              </li>
              <li>
                <Link to="/profile" style={{ color: 'var(--text-secondary)', transition: 'color 0.2s' }}>
                  Student Profile & Account
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Contact & Support */}
          <div>
            <h4 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}>
              Support & Assistance
            </h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
              Have questions or need technical support with your course enrollment? Contact our team:
            </p>
            <a
              href="mailto:support@specificlearnerz.com"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 16px',
                borderRadius: '12px',
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                color: '#a5b4fc',
                fontWeight: 600,
                fontSize: '0.9rem',
                textDecoration: 'none',
                transition: 'all 0.2s'
              }}
            >
              <Mail size={18} />
              support@specificlearnerz.com
            </a>
          </div>

        </div>

        <hr style={{ border: 0, borderTop: '1px solid var(--border-color)', margin: '24px 0' }} />

        {/* Bottom Copyright Row */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          fontSize: '0.85rem',
          color: 'var(--text-tertiary)'
        }}>
          <div>
            © {currentYear} <strong style={{ color: '#fff' }}>Specific Learnerz</strong>. All rights reserved.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={16} color="#10b981" />
            <span>Encrypted & Secured JEE Learning Environment</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
