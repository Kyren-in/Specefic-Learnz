import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BookOpen, Award, ArrowRight, BookMarked } from 'lucide-react';
import { api } from '../utils/api.js';

const Home = ({ enrolledOnly = false }) => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    setLoading(true);
    setError('');
    
    const url = enrolledOnly ? '/api/courses/my/purchased' : '/api/courses';
    
    api.get(url)
      .then((data) => {
        setCourses(data);
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch courses');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [enrolledOnly]);

  const categories = ['All', ...Array.from(new Set(courses.map(c => c.category || 'General')))];

  const filteredCourses = selectedCategory === 'All' 
    ? courses 
    : courses.filter(c => (c.category || 'General') === selectedCategory);

  return (
    <div style={{
      padding: '40px 24px',
      maxWidth: '1200px',
      margin: '0 auto',
      width: '100%',
      animation: 'fadeIn 0.4s ease-out'
    }}>
      
      {/* Title Header */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginBottom: '40px',
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>
          {enrolledOnly ? (
            <>📚 My Enrolled <span className="gradient-text">Courses</span></>
          ) : (
            <>🚀 Master the JEE with <span className="gradient-text">Specific Learnerz</span></>
          )}
        </h1>
        <p style={{ maxWidth: '600px', margin: '0 auto' }}>
          {enrolledOnly 
            ? 'Continue your learning journey, access study materials, attempt test series and query the course AI brains.' 
            : 'Access premium curated materials, custom practice test series, peer discussions, and dedicated RAG AI search bots.'
          }
        </p>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          color: '#f87171',
          padding: '16px',
          borderRadius: '12px',
          marginBottom: '30px'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Category Tabs */}
      {courses.length > 0 && (
        <div style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '32px',
          overflowX: 'auto',
          paddingBottom: '8px'
        }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className="btn"
              style={{
                padding: '8px 18px',
                fontSize: '0.85rem',
                borderRadius: '20px',
                background: selectedCategory === cat ? 'var(--gradient-main)' : 'rgba(255,255,255,0.03)',
                color: '#fff',
                border: selectedCategory === cat ? 'none' : '1px solid var(--border-color)'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '24px'
        }}>
          {[1, 2, 3].map((n) => (
            <div key={n} className="glass-panel" style={{ height: '380px', display: 'flex', flexDirection: 'column', padding: '20px', gap: '16px' }}>
              <div style={{ flex: 1.5, background: 'rgba(255,255,255,0.02)', borderRadius: '12px', animation: 'pulse 1.5s infinite' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ height: '24px', width: '70%', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
                <div style={{ height: '16px', width: '90%', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
                <div style={{ height: '36px', marginTop: 'auto', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', animation: 'pulse 1.5s infinite' }} />
              </div>
            </div>
          ))}
          <style>{`
            @keyframes pulse {
              0% { opacity: 0.3; }
              50% { opacity: 0.6; }
              100% { opacity: 0.3; }
            }
          `}</style>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="glass-panel" style={{
          textAlign: 'center',
          padding: '60px 40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}>
          <BookMarked size={48} style={{ color: 'var(--text-tertiary)' }} />
          <h3 style={{ fontSize: '1.25rem' }}>No Courses Found</h3>
          <p style={{ maxWidth: '400px' }}>
            {enrolledOnly 
              ? "You haven't enrolled in any courses yet. Explore our marketplace to buy premium classes!"
              : "No courses are currently available in the marketplace."
            }
          </p>
          {enrolledOnly && (
            <Link to="/" className="btn btn-primary" style={{ marginTop: '10px' }}>
              Browse Courses
            </Link>
          )}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '24px'
        }}>
          {filteredCourses.map((course) => {
            const hasDiscount = course.discount_price !== null && course.discount_price < course.price;
            const discountPercent = hasDiscount 
              ? Math.round(((course.price - course.discount_price) / course.price) * 100) 
              : 0;

            return (
              <div 
                key={course.id} 
                className="glass-panel glass-panel-hover" 
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  height: '100%',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  if (enrolledOnly) {
                    navigate(`/course/${course.id}`);
                  } else {
                    navigate(`/course/${course.id}/details`);
                  }
                }}
              >
                {/* Thumbnail / Header block */}
                <div style={{
                  height: '180px',
                  background: course.thumbnail 
                    ? `url(${course.thumbnail}) center/cover no-repeat` 
                    : 'linear-gradient(135deg, #1e1b4b 0%, #311042 100%)',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderBottom: '1px solid var(--border-color)'
                }}>
                  {!course.thumbnail && (
                    <BookOpen size={48} style={{ opacity: 0.15, color: '#fff' }} />
                  )}
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    <span className="badge badge-primary">
                      {course.category || 'JEE Prep'}
                    </span>
                    {hasDiscount && (
                      <span className="badge badge-success">
                        -{discountPercent}% OFF
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Content */}
                <div style={{
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  gap: '12px'
                }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, lineHeight: 1.3 }}>
                    {course.name}
                  </h3>
                  <p style={{
                    fontSize: '0.88rem',
                    color: 'var(--text-secondary)',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    lineHeight: 1.5,
                    height: '54px'
                  }}>
                    {course.description}
                  </p>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 'auto',
                    paddingTop: '16px',
                    borderTop: '1px solid var(--border-color)'
                  }}>
                    {/* Pricing */}
                    <div>
                      {hasDiscount ? (
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                            ₹{course.discount_price}
                          </span>
                          <span style={{ fontSize: '0.85rem', textDecoration: 'line-through', color: 'var(--text-tertiary)' }}>
                            ₹{course.price}
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                          ₹{course.price}
                        </span>
                      )}
                    </div>

                    <button 
                      className={`btn ${enrolledOnly ? 'btn-secondary' : 'btn-primary'}`} 
                      style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (enrolledOnly) {
                          navigate(`/course/${course.id}`);
                        } else {
                          navigate(`/course/${course.id}/details`);
                        }
                      }}
                    >
                      {enrolledOnly ? (
                        <>Study <ArrowRight size={14} /></>
                      ) : (
                        <>Learn More <ArrowRight size={14} /></>
                      )}
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Home;
