import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  BookOpen, Bot, MessageSquare, FileSpreadsheet, Award, Target, Bell, Star, 
  ArrowLeft, ChevronRight, Send, ThumbsUp, Lock, Pin, AlertCircle, Play, 
  HelpCircle, Timer, Trophy, RefreshCw
} from 'lucide-react';
import { api } from '../utils/api.js';
import ProtectedViewer from '../components/ProtectedViewer.jsx';

const CourseDashboard = ({ user }) => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  
  // Navigation tabs
  const [activeTab, setActiveTab] = useState('overview'); // overview, materials, ai-search, doubts, tests, report, predictor, announcements, feedback
  
  // Data states
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Sidebar tabs mapping
  const tabs = [
    { id: 'overview', label: 'Overview', icon: BookOpen },
    { id: 'materials', label: 'Materials', icon: BookOpen },
    { id: 'ai-search', label: 'AI Search', icon: Bot },
    { id: 'doubts', label: 'Doubt Box', icon: MessageSquare },
    { id: 'tests', label: 'Test Series', icon: FileSpreadsheet },
    { id: 'report', label: 'Report Card', icon: Award },
    { id: 'predictor', label: 'JEE Predictor', icon: Target },
    { id: 'announcements', label: 'Announcements', icon: Bell },
    { id: 'feedback', label: 'Feedback', icon: Star },
  ];

  useEffect(() => {
    setLoading(true);
    setError('');

    // Check enrollment status first in PostgreSQL database
    api.get(`/api/courses/${courseId}/enrolled`)
      .then((enrollRes) => {
        if (!enrollRes || !enrollRes.enrolled) {
          // User has not purchased this course -> redirect to course purchase details page
          navigate(`/course/${courseId}/details`, { replace: true });
          return;
        }
        return api.get(`/api/courses/${courseId}`).then(data => setCourse(data));
      })
      .catch(err => {
        console.error('Enrollment check error:', err);
        navigate(`/course/${courseId}/details`, { replace: true });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [courseId, user, navigate]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
        <AlertCircle size={48} style={{ color: '#f87171', marginBottom: '16px' }} />
        <h3>Access Denied</h3>
        <p style={{ marginTop: '8px', color: 'var(--text-secondary)' }}>
          {error || 'You do not have active enrollment for this course.'}
        </p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: '20px' }}>Browse Marketplace</Link>
      </div>
    );
  }

  return (
    <div className="dashboard-layout-container">
      {/* 1. Dashboard Sidebar / Top Tabs on Mobile */}
      <aside className="dashboard-sidebar">
        {/* Back Link */}
        <Link to="/my-courses" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={14} /> My Dashboard
        </Link>

        {/* Course Mini Header */}
        <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', lineHeight: 1.3 }}>{course.name}</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>{course.category || 'JEE Main + Advanced'}</span>
        </div>

        {/* Navigation List */}
        <nav className="dashboard-tabs-list">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`dashboard-tab-btn ${isActive ? 'active' : ''}`}
              >
                <Icon size={16} /> {tab.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* 2. Main Workspace */}
      <main className="dashboard-main-content">
        {activeTab === 'overview' && <OverviewTab course={course} setActiveTab={setActiveTab} />}
        {activeTab === 'materials' && <MaterialsTab courseId={courseId} user={user} />}
        {activeTab === 'ai-search' && <AiSearchTab courseId={courseId} courseName={course.name} />}
        {activeTab === 'doubts' && <DoubtBoxTab courseId={courseId} />}
        {activeTab === 'tests' && <TestSeriesTab courseId={courseId} />}
        {activeTab === 'report' && <ReportCardTab courseId={courseId} />}
        {activeTab === 'predictor' && <PredictorTab />}
        {activeTab === 'announcements' && <AnnouncementsTab courseId={courseId} />}
        {activeTab === 'feedback' && <FeedbackTab courseId={courseId} />}
      </main>
    </div>
  );
};

/* =========================================================================
   TAB: OVERVIEW
   ========================================================================= */
const OverviewTab = ({ course, setActiveTab }) => {
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    api.get(`/api/admin/announcements?courseId=${course.id}`)
      .then(data => setAnnouncements(data.slice(0, 3)))
      .catch(err => console.error(err));
  }, [course.id]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', animation: 'fadeIn 0.3s ease-out' }}>
      <div>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>👋 Welcome to your dashboard!</h1>
        <p>You have access to all materials, custom timed test series, peer question threads, and the AI grounding bot.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        
        {/* Info Card */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.2rem', color: '#fff' }}>Course Description</h3>
          <p style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>{course.description}</p>
          <div style={{ display: 'flex', gap: '16px', marginTop: 'auto', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
            <div>⏳ Duration: {course.duration || 'Flexible'}</div>
            <div>🏷️ Category: {course.category || 'JEE Preparation'}</div>
          </div>
        </div>

        {/* Recent Announcements */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#fff' }}>Recent Announcements</h3>
            <button 
              onClick={() => setActiveTab('announcements')} 
              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
            >
              See all
            </button>
          </div>

          {announcements.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', padding: '20px 0', textAlign: 'center' }}>
              No course announcements posted yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {announcements.map((ann) => (
                <div key={ann.id} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px', background: 'rgba(255,255,255,0.01)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    <span>{ann.title}</span>
                    <span>{new Date(ann.created_at).toLocaleDateString()}</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ann.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

/* =========================================================================
   TAB: MATERIALS
   ========================================================================= */
const MaterialsTab = ({ courseId, user }) => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState(null);

  useEffect(() => {
    api.get(`/api/materials/course/${courseId}`)
      .then(data => setMaterials(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [courseId]);

  if (selectedMaterial) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.3s ease-out' }}>
        <button 
          onClick={() => setSelectedMaterial(null)} 
          className="btn btn-secondary" 
          style={{ alignSelf: 'flex-start', padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={14} /> Back to materials list
        </button>
        <ProtectedViewer 
          material={selectedMaterial}
          user={user}
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease-out' }}>
      <div>
        <h2 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>📚 Study Material & Lessons</h2>
        <p>Access notes, video lectures, exam guidelines, and watermarked PDFs right inside the platform.</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <div style={{ width: '30px', height: '30px', border: '3px solid var(--border-color)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : materials.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <BookOpen size={36} style={{ marginBottom: '12px', color: 'var(--text-tertiary)' }} />
          <h3>No Study Materials Uploaded</h3>
          <p style={{ fontSize: '0.9rem', marginTop: '6px' }}>Your instructor has not uploaded course materials yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {materials.map((mat) => {
            return (
              <div 
                key={mat.id} 
                className="glass-panel" 
                style={{
                  padding: '16px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    padding: '10px',
                    borderRadius: '8px',
                    background: mat.type === 'pdf' 
                      ? 'rgba(239, 68, 68, 0.1)' 
                      : mat.type === 'video'
                        ? 'rgba(99, 102, 241, 0.1)'
                        : 'rgba(52, 211, 153, 0.1)',
                    color: mat.type === 'pdf' 
                      ? '#f87171' 
                      : mat.type === 'video'
                        ? 'var(--primary)'
                        : '#34d399',
                    display: 'flex'
                  }}>
                    {mat.type === 'pdf' && <FileSpreadsheet size={20} />}
                    {mat.type === 'video' && <Play size={20} />}
                    {mat.type !== 'pdf' && mat.type !== 'video' && <BookOpen size={20} />}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>{mat.title}</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                      {mat.type} Lesson
                    </span>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedMaterial(mat)} 
                  className="btn btn-primary"
                  style={{ padding: '8px 18px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {mat.type === 'video' ? <Play size={14} /> : <Lock size={14} />}
                  Open Content
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   TAB: AI SEARCH
   ========================================================================= */
const AiSearchTab = ({ courseId, courseName }) => {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const chatBottomRef = useRef(null);

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setAnswer('');
    setSources([]);

    try {
      const data = await api.post('/api/rag/search', { courseId, query });
      setAnswer(data.answer);
      setSources(data.sources || []);
    } catch (err) {
      setAnswer('Failed to retrieve answer from AI search brain. Please try again.');
    } finally {
      setLoading(false);
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease-out' }}>
      <div>
        <h2 style={{ fontSize: '1.75rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🤖 AI Course Search Bot <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>RAG Engine</span>
        </h2>
        <p>Ask doubts grounded strictly in the files uploaded for <strong>{courseName}</strong>. The AI will not answer external queries.</p>
      </div>

      <div className="glass-panel" style={{
        padding: '30px',
        background: 'var(--bg-secondary)',
        minHeight: '260px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {/* Answer Output */}
        {!answer && !loading ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', gap: '12px', padding: '40px 0' }}>
            <Bot size={48} style={{ opacity: 0.2 }} />
            <p style={{ fontSize: '0.9rem' }}>Type your query below (e.g. "Where is Bayes theorem explained?")</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', fontSize: '0.9rem', padding: '20px 0' }}>
                <Bot size={20} className="spin" /> Checking course brain chunks, computing similarity indices...
                <style>{`
                  .spin { animation: spin 1s linear infinite; }
                `}</style>
              </div>
            ) : (
              <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600 }}>AI RESPONSE</div>
                <div style={{ 
                  background: 'rgba(99, 102, 241, 0.05)', 
                  border: '1px solid rgba(99, 102, 241, 0.15)',
                  borderRadius: '12px',
                  padding: '20px',
                  fontSize: '0.98rem',
                  lineHeight: 1.6,
                  color: '#fff',
                  whiteSpace: 'pre-wrap'
                }}>
                  {answer}
                </div>
                
                {sources.length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: '6px' }}>RETRIEVED FROM:</div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {sources.map((src, idx) => (
                        <span key={idx} className="badge badge-primary" style={{ textTransform: 'none', fontSize: '0.75rem' }}>
                          📄 {src}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Query Bar */}
      <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '12px' }}>
        <input 
          type="text" 
          required 
          disabled={loading}
          className="form-input" 
          placeholder="Ask something about the course material..." 
          style={{ flex: 1, height: '48px', borderRadius: '10px' }}
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <button 
          type="submit" 
          disabled={loading} 
          className="btn btn-primary"
          style={{ width: '100px', height: '48px' }}
        >
          {loading ? <RefreshCw size={18} className="spin" /> : <Send size={18} />}
        </button>
      </form>
    </div>
  );
};

/* =========================================================================
   TAB: DOUBT BOX
   ========================================================================= */
const DoubtBoxTab = ({ courseId }) => {
  const [doubts, setDoubts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Create doubt states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [posting, setPosting] = useState(false);

  // Active doubt detail states
  const [activeDoubt, setActiveDoubt] = useState(null);
  const [replies, setReplies] = useState([]);
  const [replyContent, setReplyContent] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  const fetchDoubts = () => {
    setLoading(true);
    api.get(`/api/doubts/course/${courseId}?search=${search}`)
      .then(data => setDoubts(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDoubts();
  }, [courseId, search]);

  const handlePostDoubt = async (e) => {
    e.preventDefault();
    setPosting(true);
    
    try {
      const formData = new FormData();
      formData.append('courseId', courseId);
      formData.append('title', title);
      formData.append('description', description);
      if (image) {
        formData.append('image', image);
      }

      await api.post('/api/doubts', formData, true);
      alert('Doubt posted successfully!');
      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      setImage(null);
      fetchDoubts();
    } catch (err) {
      alert(err.message || 'Failed to post doubt');
    } finally {
      setPosting(false);
    }
  };

  const handleSelectDoubt = async (doubt) => {
    try {
      const detail = await api.get(`/api/doubts/${doubt.id}`);
      setActiveDoubt(detail.doubt);
      setReplies(detail.replies);
    } catch (err) {
      alert(err.message || 'Failed to load doubt details');
    }
  };

  const handlePostReply = async (e) => {
    e.preventDefault();
    if (!replyContent.trim()) return;

    setSubmittingReply(true);
    try {
      await api.post(`/api/doubts/${activeDoubt.id}/reply`, { content: replyContent });
      setReplyContent('');
      // Reload replies
      const detail = await api.get(`/api/doubts/${activeDoubt.id}`);
      setReplies(detail.replies);
    } catch (err) {
      alert(err.message || 'Failed to post reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleHelpfulUpvote = async (doubtId) => {
    try {
      const res = await api.post(`/api/doubts/${doubtId}/helpful`);
      // Update local state counts
      setDoubts(doubts.map(d => d.id === doubtId ? { ...d, helpful_count: res.helpfulCount } : d));
      if (activeDoubt && activeDoubt.id === doubtId) {
        setActiveDoubt({ ...activeDoubt, helpful_count: res.helpfulCount });
      }
    } catch (err) {
      alert(err.message);
    }
  };

  if (activeDoubt) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease-out' }}>
        <button 
          onClick={() => setActiveDoubt(null)} 
          className="btn btn-secondary" 
          style={{ alignSelf: 'flex-start', padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={14} /> Back to thread list
        </button>

        {/* Doubt Question Details */}
        <div className="glass-panel" style={{ padding: '24px', background: 'var(--bg-secondary)', borderLeft: '3px solid var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>{activeDoubt.author_name}</span>
              <span>({activeDoubt.author_role})</span>
              <span>•</span>
              <span>{new Date(activeDoubt.created_at).toLocaleDateString()}</span>
            </div>
            
            <div style={{ display: 'flex', gap: '6px' }}>
              {activeDoubt.is_pinned === 1 && <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}><Pin size={10} /> PINNED</span>}
              {activeDoubt.is_locked === 1 && <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}><Lock size={10} /> LOCKED</span>}
            </div>
          </div>

          <h3 style={{ fontSize: '1.3rem', color: '#fff', marginBottom: '12px' }}>{activeDoubt.title}</h3>
          <p style={{ color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '0.95rem' }}>{activeDoubt.description}</p>
          
          {activeDoubt.image_path && (
            <div style={{ marginTop: '16px', maxWidth: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
              <img src={`/uploads/${activeDoubt.image_path}`} alt="Doubt screenshot" style={{ maxWidth: '100%', maxHeight: '400px', display: 'block' }} />
            </div>
          )}

          <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', gap: '16px' }}>
            <button 
              onClick={() => handleHelpfulUpvote(activeDoubt.id)} 
              className="btn btn-secondary" 
              style={{ padding: '6px 14px', fontSize: '0.8rem', gap: '6px' }}
            >
              <ThumbsUp size={14} /> Helpful ({activeDoubt.helpful_count || 0})
            </button>
          </div>
        </div>

        {/* Replies List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h4 style={{ fontSize: '1.05rem', color: 'var(--text-secondary)' }}>Discussion ({replies.length} replies)</h4>
          
          {replies.map(rep => (
            <div 
              key={rep.id} 
              className="glass-panel" 
              style={{ 
                padding: '16px 20px', 
                background: rep.author_role === 'admin' ? 'rgba(99, 102, 241, 0.02)' : 'var(--bg-secondary)',
                borderLeft: rep.author_role === 'admin' ? '2px solid var(--secondary)' : '1px solid var(--glass-border)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
                <span style={{ color: rep.author_role === 'admin' ? 'var(--secondary)' : 'var(--text-secondary)', fontWeight: 700 }}>
                  {rep.author_name}
                </span>
                <span>({rep.author_role})</span>
                <span>•</span>
                <span>{new Date(rep.created_at).toLocaleDateString()}</span>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {rep.content}
              </p>
            </div>
          ))}
        </div>

        {/* Reply Area */}
        {activeDoubt.is_locked ? (
          <div className="glass-panel" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
            🔒 This thread is locked and cannot receive further replies.
          </div>
        ) : (
          <form onSubmit={handlePostReply} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <textarea
              className="form-input"
              rows={4}
              required
              disabled={submittingReply}
              placeholder="Write your explanation or advice..."
              style={{ width: '100%', fontSize: '0.9rem' }}
              value={replyContent}
              onChange={e => setReplyContent(e.target.value)}
            />
            <button 
              type="submit" 
              disabled={submittingReply}
              className="btn btn-primary" 
              style={{ alignSelf: 'flex-end', padding: '10px 24px', fontSize: '0.9rem' }}
            >
              {submittingReply ? 'Posting...' : 'Post Response'}
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>💬 Doubt Discussion Box</h2>
          <p>Discuss, collaborate, and clarify details on Algebra, Calculus, and Coordinate vectors.</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary" style={{ padding: '10px 20px', fontSize: '0.9rem' }}>
          Ask a Doubt
        </button>
      </div>

      {/* Search queries */}
      <div style={{ position: 'relative', width: '100%' }}>
        <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
        <input 
          type="text" 
          className="form-input" 
          placeholder="Search doubts by title or keywords..."
          style={{ width: '100%', paddingLeft: '40px', borderRadius: '8px' }}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <div style={{ width: '30px', height: '30px', border: '3px solid var(--border-color)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : doubts.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <MessageSquare size={36} style={{ color: 'var(--text-tertiary)', marginBottom: '12px' }} />
          <h3>No doubts posted yet</h3>
          <p style={{ fontSize: '0.85rem', marginTop: '6px' }}>Got stuck? Be the first to ask a question to your peers!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {doubts.map(doubt => (
            <div 
              key={doubt.id} 
              className="glass-panel glass-panel-hover" 
              style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: 'var(--bg-secondary)' }}
              onClick={() => handleSelectDoubt(doubt)}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, marginRight: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {doubt.is_pinned === 1 && <span className="badge badge-warning" style={{ fontSize: '0.6rem', padding: '2px 6px' }}><Pin size={8} /> PINNED</span>}
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    Posted by {doubt.author_name} ({doubt.author_role}) • {new Date(doubt.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{doubt.title}</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '600px' }}>
                  {doubt.description}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexShrink: 0 }}>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleHelpfulUpvote(doubt.id); }} 
                  className="btn btn-secondary" 
                  style={{ padding: '6px 12px', fontSize: '0.75rem', gap: '4px' }}
                >
                  <ThumbsUp size={12} /> {doubt.helpful_count || 0}
                </button>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>{doubt.replies_count}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Replies</div>
                </div>
                <ChevronRight size={18} style={{ color: 'var(--text-tertiary)' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ask Doubt Modal */}
      {showCreateModal && (
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
          backdropFilter: 'blur(8px)'
        }}>
          <form onSubmit={handlePostDoubt} className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '30px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Ask a Doubt</h2>
            
            <div className="form-group">
              <label className="form-label">Doubt Title</label>
              <input 
                type="text" 
                required 
                className="form-input" 
                placeholder="E.g., Problem solving integration on page 14" 
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Detailed Explanation</label>
              <textarea
                required
                className="form-input"
                rows={5}
                placeholder="Explain what steps you tried and where you got stuck..."
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Upload Screen / Image (Optional)</label>
              <input 
                type="file" 
                accept="image/*"
                className="form-input" 
                onChange={e => setImage(e.target.files[0])}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={posting} className="btn btn-primary">
                {posting ? 'Posting...' : 'Submit Doubt'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   TAB: TEST SERIES & timed quiz portal
   ========================================================================= */
const TestSeriesTab = ({ courseId }) => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active quiz states
  const [activeQuiz, setActiveQuiz] = useState(null); // { test, questions }
  const [quizAnswers, setQuizAnswers] = useState({}); // { [questionId]: selectedOptionIndex }
  const [quizTimer, setQuizTimer] = useState(0); // seconds remaining
  const [quizIntervalId, setQuizIntervalId] = useState(null);
  const timerRef = useRef(null);

  // Graded Result Overlay state
  const [submissionResult, setSubmissionResult] = useState(null);

  const fetchTests = () => {
    setLoading(true);
    api.get(`/api/tests/course/${courseId}`)
      .then(data => setTests(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTests();
  }, [courseId]);

  const handleStartTest = async (test) => {
    const confirmAttempt = window.confirm(`Are you ready to start "${test.title}"? \nDuration: ${test.duration_minutes} minutes. \nNegative marking: ${test.negative_marking_percentage}%.`);
    if (!confirmAttempt) return;

    try {
      const data = await api.get(`/api/tests/${test.id}/questions`);
      setActiveQuiz({
        test: data.test,
        questions: data.questions
      });
      setQuizAnswers({});
      
      const durationSeconds = data.test.duration_minutes * 60;
      setQuizTimer(durationSeconds);
      
      // Start Timer Interval
      const intervalId = setInterval(() => {
        setQuizTimer(prev => {
          if (prev <= 1) {
            clearInterval(intervalId);
            // Auto submit
            alert('Time limit reached! Submitting answers automatically.');
            handleAutoSubmit(data.test.id);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      setQuizIntervalId(intervalId);
      timerRef.current = { intervalId, durationSeconds, testId: data.test.id };

    } catch (err) {
      alert(err.message || 'Could not launch test. Limit reached?');
    }
  };

  const handleAutoSubmit = async (testId) => {
    // Collect answers from ref/state if needed
    const answersToSend = quizAnswers;
    // Call Submit
    try {
      const duration = timerRef.current ? timerRef.current.durationSeconds : 0;
      const res = await api.post(`/api/tests/${testId}/submit`, {
        answers: answersToSend,
        timeTakenSeconds: duration
      });
      setSubmissionResult(res.result);
      setActiveQuiz(null);
    } catch (e) {
      alert('Error submitting test: ' + e.message);
    }
  };

  const handleManualSubmit = async () => {
    const confirmSub = window.confirm('Are you sure you want to submit your answers?');
    if (!confirmSub) return;

    if (quizIntervalId) clearInterval(quizIntervalId);

    const timeSpent = (activeQuiz.test.duration_minutes * 60) - quizTimer;

    try {
      const res = await api.post(`/api/tests/${activeQuiz.test.id}/submit`, {
        answers: quizAnswers,
        timeTakenSeconds: timeSpent
      });
      setSubmissionResult(res.result);
      setActiveQuiz(null);
      fetchTests();
    } catch (err) {
      alert(err.message || 'Failed to submit test');
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Close Results Overlay
  const handleCloseResults = () => {
    setSubmissionResult(null);
    fetchTests();
  };

  if (activeQuiz) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'var(--bg-primary)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        padding: '30px'
      }}>
        {/* Fullscreen Timed Header */}
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '20px',
          marginBottom: '30px'
        }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>📝 {activeQuiz.test.title}</h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Questions: {activeQuiz.questions.length} | Marks: +{activeQuiz.questions[0]?.marks || 4} / -{(activeQuiz.questions[0]?.marks * activeQuiz.test.negative_marking_percentage / 100).toFixed(1)}
            </span>
          </div>

          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '10px',
            padding: '10px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: quizTimer < 120 ? '#f87171' : 'var(--primary)'
          }}>
            <Timer size={18} />
            <span style={{ fontFamily: 'monospace', fontSize: '1.25rem', fontWeight: 700 }}>
              {formatTimer(quizTimer)}
            </span>
          </div>
        </header>

        {/* Questions Scroll Panel */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '30px', paddingRight: '12px', marginBottom: '30px' }}>
          {activeQuiz.questions.map((q, qidx) => (
            <div key={q.id} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff' }}>
                Q{qidx + 1}. {q.question_text}
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                {q.options.map((opt, oidx) => {
                  const isSelected = quizAnswers[q.id] === oidx;
                  return (
                    <div 
                      key={oidx} 
                      className={`question-option-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => setQuizAnswers({ ...quizAnswers, [q.id]: oidx })}
                    >
                      <span className="option-letter">
                        {String.fromCharCode(65 + oidx)}
                      </span>
                      <span style={{ fontSize: '0.95rem' }}>{opt}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer actions */}
        <footer style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
          <button onClick={handleManualSubmit} className="btn btn-primary" style={{ padding: '12px 30px' }}>
            Submit Test Answers
          </button>
        </footer>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease-out' }}>
      <div>
        <h2 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>📝 Practice Test Series</h2>
        <p>Take timed simulations, practice algebra & coordinate geometry, and review accuracy indices.</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <div style={{ width: '30px', height: '30px', border: '3px solid var(--border-color)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : tests.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <FileSpreadsheet size={36} style={{ color: 'var(--text-tertiary)', marginBottom: '12px' }} />
          <h3>No Tests Published</h3>
          <p style={{ fontSize: '0.85rem', marginTop: '6px' }}>Your instructor has not added practice test series yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {tests.map(test => {
            const limitReached = test.attempts_count >= test.attempt_limit;
            return (
              <div 
                key={test.id} 
                className="glass-panel" 
                style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
              >
                <div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{test.title}</h4>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                    <span>⏱️ {test.duration_minutes} Mins</span>
                    <span>💯 {test.total_marks} Marks</span>
                    <span>🔄 Attempt: {test.attempts_count}/{test.attempt_limit}</span>
                  </div>
                </div>

                <button 
                  onClick={() => handleStartTest(test)} 
                  disabled={limitReached}
                  className={`btn ${limitReached ? 'btn-secondary' : 'btn-primary'}`}
                  style={{ padding: '8px 18px', fontSize: '0.85rem' }}
                >
                  {limitReached ? 'Limit Reached' : 'Attempt Test'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Graded Result Report Dialog */}
      {submissionResult && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 110,
          backdropFilter: 'blur(10px)',
          padding: '24px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '650px',
            padding: '30px',
            maxHeight: '90vh',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}>
            
            <div style={{ textAlign: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px' }}>
              <Trophy size={48} style={{ color: '#fbbf24', display: 'inline-block', marginBottom: '10px' }} />
              <h2 style={{ fontSize: '1.6rem', color: '#fff' }}>Test Results Summary</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>Graded instantly server-side</p>
            </div>

            {/* Main Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', textAlign: 'center' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px 6px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{submissionResult.score}/{submissionResult.totalMarks}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginTop: '2px' }}>Score</div>
              </div>
              <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.15)', borderRadius: '8px', padding: '12px 6px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34d399' }}>{submissionResult.correctCount}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginTop: '2px' }}>Correct</div>
              </div>
              <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '8px', padding: '12px 6px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f87171' }}>{submissionResult.incorrectCount}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginTop: '2px' }}>Incorrect</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px 6px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>{submissionResult.accuracy}%</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginTop: '2px' }}>Accuracy</div>
              </div>
            </div>

            {/* Question by Question Review */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--text-secondary)' }}>Answer Key Review</h3>
              {submissionResult.questionAnalysis.map((item, idx) => (
                <div 
                  key={idx} 
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '14px',
                    background: item.status === 'correct' 
                      ? 'rgba(16, 185, 129, 0.01)' 
                      : item.status === 'incorrect' 
                        ? 'rgba(239, 68, 68, 0.01)' 
                        : 'rgba(255, 255, 255, 0.01)',
                    borderLeft: `3px solid ${item.status === 'correct' ? '#34d399' : item.status === 'incorrect' ? '#f87171' : 'var(--text-tertiary)'}`
                  }}
                >
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
                    Q{idx + 1}. {item.questionText}
                  </div>
                  
                  <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div>
                      Selected Answer: <span style={{ fontWeight: 700, color: item.status === 'correct' ? '#34d399' : '#f87171' }}>
                        {item.selectedOption !== null && item.selectedOption !== undefined 
                          ? `${String.fromCharCode(65 + item.selectedOption)}) ${item.options[item.selectedOption]}`
                          : 'Unattempted'}
                      </span>
                    </div>
                    {item.status !== 'correct' && (
                      <div style={{ color: '#34d399' }}>
                        Correct Answer: <span style={{ fontWeight: 700 }}>
                          {String.fromCharCode(65 + item.correctOption)}) {item.options[item.correctOption]}
                        </span>
                      </div>
                    )}
                    <div style={{ color: 'var(--text-tertiary)', marginTop: '4px' }}>
                      Marks Earned: <span style={{ fontWeight: 700 }}>{item.earnedMarks}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={handleCloseResults} className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
              Close Results Review
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   TAB: REPORT CARD (With native SVG graphs)
   ========================================================================= */
const ReportCardTab = ({ courseId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/tests/course/${courseId}/report-card`)
      .then(res => setData(res))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [courseId]);

  const renderSvgLineGraph = (history) => {
    if (history.length === 0) return null;
    
    const w = 600;
    const h = 250;
    const p = 40;
    const cw = w - p * 2;
    const ch = h - p * 2;

    const points = history.map((item, index) => {
      const x = p + (index / Math.max(1, history.length - 1)) * cw;
      const scorePercent = (item.score / item.totalMarks) * 100;
      // Clamp percent
      const cleanPercent = Math.max(0, Math.min(100, scorePercent));
      const y = p + ch - (cleanPercent / 100) * ch;
      return { x, y, scorePercent, title: item.testTitle };
    });

    const linePath = points.reduce((path, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.y}` : `${path} L ${pt.x} ${pt.y}`;
    }, '');

    return (
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
        {/* Y Grid lines */}
        {[0, 25, 50, 75, 100].map(yVal => {
          const yPos = p + ch - (yVal / 100) * ch;
          return (
            <g key={yVal}>
              <line x1={p} y1={yPos} x2={w - p} y2={yPos} stroke="rgba(255,255,255,0.05)" strokeDasharray={yVal === 0 || yVal === 100 ? '0' : '4'} />
              <text x={p - 10} y={yPos + 4} fill="var(--text-tertiary)" fontSize="9" textAnchor="end">{yVal}%</text>
            </g>
          );
        })}

        {/* Chart Path */}
        {points.length > 1 && (
          <path d={linePath} fill="none" stroke="url(#lineGrad)" strokeWidth="3" strokeLinecap="round" />
        )}

        {/* Data points */}
        {points.map((pt, idx) => (
          <g key={idx}>
            <circle cx={pt.x} cy={pt.y} r="5" fill="var(--primary)" stroke="#fff" strokeWidth="2" />
            <text x={pt.x} y={pt.y - 12} fill="#fff" fontSize="9" fontWeight="bold" textAnchor="middle">
              {Math.round(pt.scorePercent)}%
            </text>
            <text x={pt.x} y={p + ch + 15} fill="var(--text-tertiary)" fontSize="8" textAnchor="middle" transform={`rotate(10, ${pt.x}, ${p + ch + 15})`}>
              {pt.title.substring(0, 10)}...
            </text>
          </g>
        ))}

        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--secondary)" />
          </linearGradient>
        </defs>
      </svg>
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <div style={{ width: '30px', height: '30px', border: '3px solid var(--border-color)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!data || !data.hasAttempts) {
    return (
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', animation: 'fadeIn 0.3s ease-out' }}>
        <Award size={36} style={{ color: 'var(--text-tertiary)', marginBottom: '12px' }} />
        <h3>Report Card Empty</h3>
        <p style={{ fontSize: '0.85rem', marginTop: '6px' }}>Take a test under the **Test Series** tab to compile analytics.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', animation: 'fadeIn 0.3s ease-out' }}>
      <div>
        <h2 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>📊 Cumulative Report Card</h2>
        <p>Review cumulative statistics, course ranks, percentiles, and score trends.</p>
      </div>

      {/* Summary Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff' }}>{data.summary.attemptsCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginTop: '4px' }}>Tests Attempted</div>
        </div>
        <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>{data.summary.averageScorePercent}%</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginTop: '4px' }}>Avg. Score</div>
        </div>
        <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#34d399' }}>{data.summary.averageAccuracy}%</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginTop: '4px' }}>Avg. Accuracy</div>
        </div>
        <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fbbf24' }}>{data.summary.overallPercentile}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginTop: '4px' }}>Overall Percentile</div>
        </div>
      </div>

      {/* Score Trend SVG Graph */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.15rem', marginBottom: '20px' }}>📈 Scoring Trend Over Time</h3>
        {renderSvgLineGraph(data.history)}
      </div>

      {/* Historical Attempts Table */}
      <div className="glass-panel" style={{ padding: '24px', overflowX: 'auto' }}>
        <h3 style={{ fontSize: '1.15rem', marginBottom: '16px' }}>Attempt History</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', minWidth: '500px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-tertiary)', textAlign: 'left' }}>
              <th style={{ padding: '12px' }}>Test Name</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Score</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Accuracy</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Rank</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Percentile</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {data.history.map((h, idx) => (
              <tr key={h.attemptId || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '12px', fontWeight: 700, color: '#fff' }}>{h.testTitle}</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>{h.score} / {h.totalMarks}</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>{h.accuracy}%</td>
                <td style={{ padding: '12px', textAlign: 'center' }}><span className="badge badge-primary">{h.rank}</span></td>
                <td style={{ padding: '12px', textAlign: 'center', fontWeight: 700, color: 'var(--primary)' }}>{h.percentile}</td>
                <td style={{ padding: '12px', textAlign: 'right', color: 'var(--text-tertiary)' }}>{new Date(h.submittedAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
};

/* =========================================================================
   TAB: JEE PERCENTILE PREDICTOR
   ========================================================================= */
const PredictorTab = () => {
  const [exam, setExam] = useState('main');
  const [physics, setPhysics] = useState('');
  const [chemistry, setChemistry] = useState('');
  const [mathematics, setMathematics] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePredict = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);

    try {
      const data = await api.post('/api/tests/predict-percentile', {
        exam,
        physics: parseFloat(physics),
        chemistry: parseFloat(chemistry),
        mathematics: parseFloat(mathematics)
      });
      setResult(data);
    } catch (err) {
      setError(err.message || 'Failed to compute percentile prediction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease-out' }}>
      <div>
        <h2 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>🎯 JEE Percentile Predictor</h2>
        <p>Input marks to approximate test score-to-percentile ratios derived from historical NTA metrics.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', alignItems: 'start' }}>
        {/* Predictor Form */}
        <form onSubmit={handlePredict} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div className="form-group">
            <label className="form-label">Select Exam Target</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setExam('main')}
                className="btn"
                style={{
                  flex: 1,
                  padding: '10px',
                  background: exam === 'main' ? 'var(--gradient-main)' : 'rgba(255,255,255,0.02)',
                  color: '#fff',
                  border: exam === 'main' ? 'none' : '1px solid var(--border-color)'
                }}
              >
                JEE Main (300 Max)
              </button>
              <button
                type="button"
                onClick={() => setExam('advanced')}
                className="btn"
                style={{
                  flex: 1,
                  padding: '10px',
                  background: exam === 'advanced' ? 'var(--gradient-main)' : 'rgba(255,255,255,0.02)',
                  color: '#fff',
                  border: exam === 'advanced' ? 'none' : '1px solid var(--border-color)'
                }}
              >
                JEE Advanced (360 Max)
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Physics Marks</label>
            <input 
              type="number" 
              required 
              min={0}
              max={exam === 'main' ? 100 : 120}
              className="form-input" 
              placeholder={`Max marks: ${exam === 'main' ? 100 : 120}`}
              value={physics}
              onChange={e => setPhysics(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Chemistry Marks</label>
            <input 
              type="number" 
              required 
              min={0}
              max={exam === 'main' ? 100 : 120}
              className="form-input" 
              placeholder={`Max marks: ${exam === 'main' ? 100 : 120}`}
              value={chemistry}
              onChange={e => setChemistry(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mathematics Marks</label>
            <input 
              type="number" 
              required 
              min={0}
              max={exam === 'main' ? 100 : 120}
              className="form-input" 
              placeholder={`Max marks: ${exam === 'main' ? 100 : 120}`}
              value={mathematics}
              onChange={e => setMathematics(e.target.value)}
            />
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
            {loading ? 'Evaluating Curve...' : 'Predict JEE Percentile'}
          </button>
        </form>

        {/* Prediction Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#f87171', padding: '16px', borderRadius: '12px' }}>
              ⚠️ {error}
            </div>
          )}

          {result ? (
            <div className="glass-panel animate-fade-in" style={{ padding: '24px', border: '1px solid rgba(16, 185, 129, 0.2)', boxShadow: '0 0 20px rgba(16, 185, 129, 0.05)' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>CUMULATIVE SCORE</div>
                <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
                  {result.totalScore}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Estimated Percentile:</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>{result.estimatedPercentile}</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Estimated Rank Range:</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>{result.estimatedRank}</span>
                </div>

                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontStyle: 'italic', lineHeight: 1.4, borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '6px' }}>
                  ⚠️ Disclaimer: {result.disclaimer}
                </p>
              </div>
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-tertiary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <Target size={32} style={{ opacity: 0.15 }} />
              <p style={{ fontSize: '0.85rem' }}>Input subject marks to run predictive algorithms.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

/* =========================================================================
   TAB: ANNOUNCEMENTS
   ========================================================================= */
const AnnouncementsTab = ({ courseId }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/admin/announcements?courseId=${courseId}`)
      .then(data => setAnnouncements(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [courseId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease-out' }}>
      <div>
        <h2 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>📢 Announcements & Updates</h2>
        <p>View announcements specific to your enrolled courses, and platform wide notifications.</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <div style={{ width: '30px', height: '30px', border: '3px solid var(--border-color)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : announcements.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Bell size={36} style={{ color: 'var(--text-tertiary)', marginBottom: '12px' }} />
          <h3>No announcements yet</h3>
          <p style={{ fontSize: '0.85rem', marginTop: '6px' }}>Any important updates will show up here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {announcements.map((ann) => (
            <div 
              key={ann.id} 
              className="glass-panel" 
              style={{
                padding: '20px 24px', 
                background: 'var(--bg-secondary)', 
                borderLeft: `3px solid ${ann.type === 'universal' ? 'var(--secondary)' : 'var(--primary)'}`
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{ann.title}</h4>
                  <span className={`badge ${ann.type === 'universal' ? 'badge-primary' : 'badge-success'}`}>
                    {ann.type}
                  </span>
                </div>
                <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                  {ann.priority}
                </span>
              </div>

              <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {ann.content}
              </p>
              
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '12px' }}>
                Published on {new Date(ann.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   TAB: FEEDBACK
   ========================================================================= */
const FeedbackTab = ({ courseId }) => {
  const [rating, setRating] = useState(5);
  const [survey1, setSurvey1] = useState('Excellent');
  const [survey2, setSurvey2] = useState('Excellent');
  const [openText, setOpenText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await api.post(`/api/admin/course/${courseId}/feedback`, {
        rating,
        responses: {
          materialRating: survey1,
          testRating: survey2,
          writtenRemarks: openText
        }
      });
      setSubmitted(true);
    } catch (err) {
      alert(err.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="glass-panel" style={{ padding: '50px 30px', textAlign: 'center', maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', animation: 'fadeIn 0.3s ease-out' }}>
        <Trophy size={48} style={{ color: '#fbbf24' }} />
        <h3>Thank You For Your Feedback!</h3>
        <p style={{ color: 'var(--text-secondary)' }}>We appreciate your response. It helps us improve study materials and platform performance.</p>
        <button onClick={() => setSubmitted(false)} className="btn btn-secondary" style={{ marginTop: '10px' }}>Edit Response</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease-out', maxWidth: '600px' }}>
      <div>
        <h2 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>⭐ Course Feedback</h2>
        <p>Tell us what you think. Your inputs guide our instructors on notes creation and test designs.</p>
      </div>

      <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Rating Stars selection */}
        <div className="form-group">
          <label className="form-label">How would you rate this course overall?</label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                type="button"
                key={star}
                onClick={() => setRating(star)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', outline: 'none' }}
              >
                <Star 
                  size={32} 
                  fill={star <= rating ? '#fbbf24' : 'none'} 
                  color={star <= rating ? '#fbbf24' : 'var(--text-tertiary)'} 
                />
              </button>
            ))}
          </div>
        </div>

        {/* Survey Question 1 */}
        <div className="form-group">
          <label className="form-label">How useful was the study material?</label>
          <select 
            className="form-input" 
            style={{ width: '100%', background: 'var(--bg-primary)' }}
            value={survey1} 
            onChange={e => setSurvey1(e.target.value)}
          >
            <option value="Excellent">Highly detailed and informative (5/5)</option>
            <option value="Good">Good reference notes (4/5)</option>
            <option value="Average">Decent, but lacks advanced problems (3/5)</option>
            <option value="Poor">Incomplete or confusing (1-2/5)</option>
          </select>
        </div>

        {/* Survey Question 2 */}
        <div className="form-group">
          <label className="form-label">How useful was the test series?</label>
          <select 
            className="form-input" 
            style={{ width: '100%', background: 'var(--bg-primary)' }}
            value={survey2} 
            onChange={e => setSurvey2(e.target.value)}
          >
            <option value="Excellent">Very relevant and timed well (5/5)</option>
            <option value="Good">Decent practice problems (4/5)</option>
            <option value="Average">Lacks negative marks accuracy indices (3/5)</option>
            <option value="Poor">Too easy or poorly structured (1-2/5)</option>
          </select>
        </div>

        {/* Remarks */}
        <div className="form-group">
          <label className="form-label">Tell us what you think...</label>
          <textarea
            className="form-input"
            rows={4}
            placeholder="Share recommendations for note formatting, vector chunks updates, or test timers..."
            value={openText}
            onChange={e => setOpenText(e.target.value)}
          />
        </div>

        <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
          {submitting ? 'Submitting...' : 'Submit Feedback Response'}
        </button>
      </form>
    </div>
  );
};

export default CourseDashboard;
