import React, { useState, useEffect } from 'react';
import { 
  BarChart, Users, BookOpen, Layers, ShieldAlert, FileText, CheckCircle, 
  Trash2, Plus, Ban, Check, HelpCircle, AlertCircle, Sparkles, Send, DollarSign
} from 'lucide-react';
import { api } from '../utils/api.js';

const AdminDashboard = () => {
  const [activeSubTab, setActiveSubTab] = useState('stats'); // stats, courses, materials, users, announcements, tests
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Core Data Lists
  const [courses, setCourses] = useState([]);
  const [users, setUsers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [tests, setTests] = useState([]);

  // Selections
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedTestId, setSelectedTestId] = useState('');

  // Course Form States
  const [cName, setCName] = useState('');
  const [cDesc, setCDesc] = useState('');
  const [cPrice, setCPrice] = useState('');
  const [cDiscount, setCDiscount] = useState('');
  const [cThumb, setCThumb] = useState('');
  const [cCategory, setCCategory] = useState('Mathematics');
  const [cDuration, setCDuration] = useState('3 Months');
  const [cStatus, setCStatus] = useState('draft');
  const [editingCourseId, setEditingCourseId] = useState(null);

  // Material Form States
  const [mTitle, setMTitle] = useState('');
  const [mType, setMType] = useState('pdf');
  const [mFile, setMFile] = useState(null);
  const [mExternalUrl, setMExternalUrl] = useState('');
  const [uploadingMaterial, setUploadingMaterial] = useState(false);

  // User Management
  const [userSearch, setUserSearch] = useState('');
  const [showBanModal, setShowBanModal] = useState(false);
  const [banUserId, setBanUserId] = useState(null);
  const [banReason, setBanReason] = useState('');

  // Announcement Form States
  const [aType, setAType] = useState('universal');
  const [aCourseId, setACourseId] = useState('');
  const [aTitle, setATitle] = useState('');
  const [aContent, setAContent] = useState('');
  const [aPriority, setAPriority] = useState('medium');

  // Test Form States
  const [tTitle, setTTitle] = useState('');
  const [tDuration, setTDuration] = useState('');
  const [tMarks, setTMarks] = useState('100');
  const [tNegative, setTNegative] = useState('25');
  const [tLimit, setTLimit] = useState('1');

  // Question Form States
  const [qText, setQText] = useState('');
  const [qOptions, setQOptions] = useState(['', '', '', '']);
  const [qCorrect, setQCorrect] = useState(0);
  const [qMarks, setQMarks] = useState('4');

  // Load dashboard stats
  const fetchStats = () => {
    setLoadingStats(true);
    api.get('/api/admin/stats')
      .then(data => setStats(data))
      .catch(err => console.error(err))
      .finally(() => setLoadingStats(false));
  };

  const fetchCourses = () => {
    api.get('/api/courses/admin')
      .then(data => {
        setCourses(data);
        if (data.length > 0 && !selectedCourseId) {
          setSelectedCourseId(data[0].id.toString());
          setACourseId(data[0].id.toString());
        }
      })
      .catch(err => console.error(err));
  };

  const fetchUsers = () => {
    api.get(`/api/admin/users?search=${userSearch}`)
      .then(data => setUsers(data))
      .catch(err => console.error(err));
  };

  const fetchAnnouncements = () => {
    api.get('/api/admin/announcements')
      .then(data => setAnnouncements(data))
      .catch(err => console.error(err));
  };

  const fetchMaterials = (courseId) => {
    if (!courseId) return;
    api.get(`/api/materials/course/${courseId}`)
      .then(data => setMaterials(data))
      .catch(err => console.error(err));
  };

  const fetchTests = (courseId) => {
    if (!courseId) return;
    api.get(`/api/tests/course/${courseId}`)
      .then(data => {
        setTests(data);
        if (data.length > 0) {
          setSelectedTestId(data[0].id.toString());
        }
      })
      .catch(err => console.error(err));
  };

  // Initial loads
  useEffect(() => {
    fetchStats();
    fetchCourses();
    fetchAnnouncements();
  }, []);

  // Fetch materials / tests when selectedCourseId updates
  useEffect(() => {
    if (selectedCourseId) {
      fetchMaterials(selectedCourseId);
      fetchTests(selectedCourseId);
    }
  }, [selectedCourseId]);

  // Fetch users when search input triggers
  useEffect(() => {
    fetchUsers();
  }, [userSearch]);

  // ----------------- SUBMITS -----------------

  const handleCourseSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: cName,
        description: cDesc,
        price: parseFloat(cPrice),
        discount_price: cDiscount ? parseFloat(cDiscount) : null,
        thumbnail: cThumb || null,
        category: cCategory,
        duration: cDuration,
        status: cStatus
      };

      if (editingCourseId) {
        await api.put(`/api/courses/${editingCourseId}`, payload);
        alert('Course details updated successfully!');
      } else {
        await api.post('/api/courses', payload);
        alert('New course created successfully!');
      }

      // Reset
      setCName('');
      setCDesc('');
      setCPrice('');
      setCDiscount('');
      setCThumb('');
      setEditingCourseId(null);
      fetchCourses();
      fetchStats();
    } catch (err) {
      alert(err.message || 'Course save failed');
    }
  };

  const handleEditCourseClick = (course) => {
    setEditingCourseId(course.id);
    setCName(course.name);
    setCDesc(course.description);
    setCPrice(course.price.toString());
    setCDiscount(course.discount_price ? course.discount_price.toString() : '');
    setCThumb(course.thumbnail || '');
    setCCategory(course.category || 'Mathematics');
    setCDuration(course.duration || '3 Months');
    setCStatus(course.status);
  };

  const handleUploadMaterial = async (e) => {
    e.preventDefault();
    if (!selectedCourseId) {
      alert('Please select or create a course first');
      return;
    }

    setUploadingMaterial(true);
    try {
      const formData = new FormData();
      formData.append('courseId', selectedCourseId);
      formData.append('title', mTitle);
      formData.append('type', mType);
      
      if (mType === 'link') {
        formData.append('externalUrl', mExternalUrl);
      } else if (mFile) {
        formData.append('file', mFile);
      }

      await api.post('/api/materials/upload', formData, true);
      alert('Material uploaded successfully! RAG background text index initialized.');
      setMTitle('');
      setMFile(null);
      setMExternalUrl('');
      // Reset file input element
      const fileInput = document.getElementById('materialFileInput');
      if (fileInput) fileInput.value = '';
      
      fetchMaterials(selectedCourseId);
    } catch (err) {
      alert(err.message || 'Material upload failed');
    } finally {
      setUploadingMaterial(false);
    }
  };

  const handleDeleteMaterial = async (matId) => {
    if (!window.confirm('Are you sure you want to delete this study material?')) return;
    try {
      await api.delete(`/api/materials/${matId}`);
      fetchMaterials(selectedCourseId);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleBanToggleClick = (user) => {
    if (user.status === 'banned') {
      // Unban directly
      if (window.confirm(`Unban student "${user.name}"?`)) {
        api.put(`/api/admin/users/${user.id}/status`, { status: 'active' })
          .then(() => {
            alert('User unbanned successfully');
            fetchUsers();
            fetchStats();
          })
          .catch(err => alert(err.message));
      }
    } else {
      // Open Ban modal
      setBanUserId(user.id);
      setBanReason('');
      setShowBanModal(true);
    }
  };

  const handleBanSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/api/admin/users/${banUserId}/status`, { status: 'banned', banReason });
      alert('User banned successfully');
      setShowBanModal(false);
      fetchUsers();
      fetchStats();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAnnouncementSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/admin/announcements', {
        type: aType,
        courseId: aType === 'course' ? aCourseId : null,
        title: aTitle,
        content: aContent,
        priority: aPriority
      });
      alert('Announcement published!');
      setATitle('');
      setAContent('');
      fetchAnnouncements();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteAnnouncement = async (annId) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await api.delete(`/api/admin/announcements/${annId}`);
      fetchAnnouncements();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateTest = async (e) => {
    e.preventDefault();
    if (!selectedCourseId) return;

    try {
      await api.post('/api/tests/create', {
        courseId: parseInt(selectedCourseId),
        title: tTitle,
        durationMinutes: parseInt(tDuration),
        totalMarks: parseInt(tMarks),
        negativeMarkingPercentage: parseFloat(tNegative),
        attemptLimit: parseInt(tLimit)
      });
      alert('Practice test series added!');
      setTTitle('');
      setTDuration('');
      fetchTests(selectedCourseId);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    if (!selectedTestId) {
      alert('Please select or create a test series first');
      return;
    }

    try {
      await api.post(`/api/tests/${selectedTestId}/questions`, {
        questionText: qText,
        options: qOptions,
        correctAnswer: parseInt(qCorrect),
        marks: parseInt(qMarks)
      });
      alert('MCQ question attached successfully!');
      setQText('');
      setQOptions(['', '', '', '']);
      setQCorrect(0);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleOptionChange = (idx, val) => {
    const updated = [...qOptions];
    updated[idx] = val;
    setQOptions(updated);
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      
      {/* Head banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            🛡️ Administrative <span className="gradient-text">Panel</span>
          </h1>
          <p>Control courses, enrollments, watermarked materials, timed exams, bans and platform analytics.</p>
        </div>
      </div>

      {/* Sub-tab navigation */}
      <div style={{
        display: 'flex',
        gap: '12px',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '12px',
        marginBottom: '32px',
        overflowX: 'auto'
      }}>
        {[
          { id: 'stats', label: 'Overview Stats', icon: BarChart },
          { id: 'courses', label: 'Courses CRUD', icon: BookOpen },
          { id: 'materials', label: 'Materials Upload', icon: FileText },
          { id: 'tests', label: 'Tests Builder', icon: CheckCircle },
          { id: 'announcements', label: 'Announcements', icon: Send },
          { id: 'users', label: 'User Control', icon: Users }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className="btn"
              style={{
                padding: '8px 18px',
                fontSize: '0.85rem',
                borderRadius: '8px',
                background: isActive ? 'var(--gradient-main)' : 'rgba(255,255,255,0.02)',
                color: '#fff',
                border: isActive ? 'none' : '1px solid var(--border-color)'
              }}
            >
              <Icon size={14} style={{ marginRight: '6px' }} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* ------------------- VIEW: STATS ------------------- */}
      {activeSubTab === 'stats' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', animation: 'fadeIn 0.3s ease-out' }}>
          {loadingStats ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div style={{ width: '30px', height: '30px', border: '3px solid var(--border-color)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /></div>
          ) : stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
              <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
                <DollarSign size={24} style={{ color: '#34d399', marginBottom: '8px' }} />
                <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#fff' }}>₹{stats.revenue.toLocaleString()}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginTop: '4px' }}>Total Revenue</div>
              </div>
              <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
                <Users size={24} style={{ color: 'var(--primary)', marginBottom: '8px' }} />
                <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#fff' }}>{stats.totalUsers}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginTop: '4px' }}>Total Registrations</div>
              </div>
              <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
                <Check className="badge-success" style={{ borderRadius: '50%', padding: '4px', marginBottom: '8px' }} />
                <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#fff' }}>{stats.activeUsers}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginTop: '4px' }}>Active Students</div>
              </div>
              <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
                <BookOpen size={24} style={{ color: 'var(--secondary)', marginBottom: '8px' }} />
                <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#fff' }}>{stats.totalEnrollments}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginTop: '4px' }}>Course Enrollments</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------- VIEW: COURSES ------------------- */}
      {activeSubTab === 'courses' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', alignItems: 'start', animation: 'fadeIn 0.3s ease-out' }}>
          {/* Create Form */}
          <form onSubmit={handleCourseSubmit} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3>{editingCourseId ? '✏️ Edit Course Details' : '➕ Create New Course'}</h3>

            <div className="form-group">
              <label className="form-label">Course Name</label>
              <input type="text" required className="form-input" placeholder="E.g., Complete Coordinate Geometry 2027" value={cName} onChange={e => setCName(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Short Description</label>
              <textarea required className="form-input" rows={3} placeholder="Provide summaries of topics covered..." value={cDesc} onChange={e => setCDesc(e.target.value)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Base Price (INR)</label>
                <input type="number" required className="form-input" placeholder="3999" value={cPrice} onChange={e => setCPrice(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Discount Price (Optional)</label>
                <input type="number" className="form-input" placeholder="2999" value={cDiscount} onChange={e => setCDiscount(e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Thumbnail URL</label>
              <input type="text" className="form-input" placeholder="https://domain.com/thumbnail.png" value={cThumb} onChange={e => setCThumb(e.target.value)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-input" value={cCategory} onChange={e => setCCategory(e.target.value)} style={{ background: 'var(--bg-primary)' }}>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Publishing Status</label>
                <select className="form-input" value={cStatus} onChange={e => setCStatus(e.target.value)} style={{ background: 'var(--bg-primary)' }}>
                  <option value="draft">Draft (Private)</option>
                  <option value="published">Published (Marketplace)</option>
                  <option value="archived">Archived (Purchased list only)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              {editingCourseId && (
                <button type="button" onClick={() => { setEditingCourseId(null); setCName(''); setCDesc(''); setCPrice(''); setCDiscount(''); setCThumb(''); }} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancel Edit
                </button>
              )}
              <button type="submit" className="btn btn-primary" style={{ flex: 1.5 }}>
                {editingCourseId ? 'Save Changes' : 'Create Course'}
              </button>
            </div>
          </form>

          {/* List panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3>Course Registrations</h3>
            {courses.map(course => (
              <div key={course.id} className="glass-panel" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)' }}>
                <div>
                  <h4 style={{ color: '#fff', fontSize: '1rem' }}>{course.name}</h4>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    <span>Price: ₹{course.discount_price || course.price}</span>
                    <span>Status: <strong style={{ color: course.status === 'published' ? '#34d399' : 'var(--text-tertiary)' }}>{course.status}</strong></span>
                  </div>
                </div>

                <button onClick={() => handleEditCourseClick(course)} className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
                  Edit Details
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------- VIEW: MATERIALS ------------------- */}
      {activeSubTab === 'materials' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', alignItems: 'start', animation: 'fadeIn 0.3s ease-out' }}>
          {/* Upload Form */}
          <form onSubmit={handleUploadMaterial} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3>📚 Add Study Resource</h3>

            <div className="form-group">
              <label className="form-label">Target Course</label>
              <select className="form-input" style={{ width: '100%', background: 'var(--bg-primary)' }} value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)}>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Material Title</label>
              <input type="text" required className="form-input" placeholder="E.g., Integration Formulas Cheatsheet" value={mTitle} onChange={e => setMTitle(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Material Type</label>
              <select className="form-input" style={{ width: '100%', background: 'var(--bg-primary)' }} value={mType} onChange={e => setMType(e.target.value)}>
                <option value="pdf">Protected PDF Document</option>
                <option value="link">External Web Link</option>
                <option value="video">Protected Video File</option>
              </select>
            </div>

            {mType === 'link' ? (
              <div className="form-group animate-fade-in">
                <label className="form-label">External URL</label>
                <input type="url" required className="form-input" placeholder="https://youtube.com/..." value={mExternalUrl} onChange={e => setMExternalUrl(e.target.value)} />
              </div>
            ) : (
              <div className="form-group animate-fade-in">
                <label className="form-label">Select File</label>
                <input id="materialFileInput" type="file" required className="form-input" onChange={e => setMFile(e.target.files[0])} />
                <small style={{ color: 'var(--text-tertiary)' }}>PDF uploads will be processed dynamically for AI search models.</small>
              </div>
            )}

            <button type="submit" disabled={uploadingMaterial} className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
              {uploadingMaterial ? 'Uploading & Chunking...' : 'Add Material'}
            </button>
          </form>

          {/* List panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3>Existing Study Materials ({materials.length})</h3>
            {materials.map(mat => (
              <div key={mat.id} className="glass-panel" style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)' }}>
                <div>
                  <h4 style={{ color: '#fff', fontSize: '0.95rem' }}>{mat.title}</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{mat.type}</span>
                </div>
                <button onClick={() => handleDeleteMaterial(mat.id)} className="btn btn-danger" style={{ padding: '6px 12px', borderRadius: '6px' }}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------- VIEW: ANNOUNCEMENTS ------------------- */}
      {activeSubTab === 'announcements' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '30px', alignItems: 'start', animation: 'fadeIn 0.3s ease-out' }}>
          {/* Create Form */}
          <form onSubmit={handleAnnouncementSubmit} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3>📢 Publish Announcement</h3>

            <div className="form-group">
              <label className="form-label">Scope Type</label>
              <select className="form-input" style={{ width: '100%', background: 'var(--bg-primary)' }} value={aType} onChange={e => setAType(e.target.value)}>
                <option value="universal">Universal (Platform-wide)</option>
                <option value="course">Course-Specific</option>
              </select>
            </div>

            {aType === 'course' && (
              <div className="form-group animate-fade-in">
                <label className="form-label">Select Target Course</label>
                <select className="form-input" style={{ width: '100%', background: 'var(--bg-primary)' }} value={aCourseId} onChange={e => setACourseId(e.target.value)}>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Announcement Title</label>
              <input type="text" required className="form-input" placeholder="Title header" value={aTitle} onChange={e => setATitle(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Body Content</label>
              <textarea required className="form-input" rows={4} placeholder="Type announcement message details..." value={aContent} onChange={e => setAContent(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Urgency Priority</label>
              <select className="form-input" style={{ width: '100%', background: 'var(--bg-primary)' }} value={aPriority} onChange={e => setAPriority(e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
              Publish Announcement
            </button>
          </form>

          {/* List panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3>Active Announcements ({announcements.length})</h3>
            {announcements.map(ann => (
              <div key={ann.id} className="glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'start', background: 'var(--bg-secondary)' }}>
                <div style={{ flex: 1, marginRight: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <h4 style={{ color: '#fff', fontSize: '0.95rem' }}>{ann.title}</h4>
                    <span className="badge badge-primary" style={{ fontSize: '0.6rem', padding: '1px 4px' }}>{ann.type}</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{ann.content}</p>
                </div>
                <button onClick={() => handleDeleteAnnouncement(ann.id)} className="btn btn-danger" style={{ padding: '6px 12px', borderRadius: '6px', flexShrink: 0 }}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------- VIEW: TESTS BUILDER ------------------- */}
      {activeSubTab === 'tests' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '30px', alignItems: 'start', animation: 'fadeIn 0.3s ease-out' }}>
          
          {/* Create Test / Add Question Columns */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            {/* Create Test Form */}
            <form onSubmit={handleCreateTest} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3>➕ Add Practice Test</h3>
              
              <div className="form-group">
                <label className="form-label">Course Target</label>
                <select className="form-input" style={{ width: '100%', background: 'var(--bg-primary)' }} value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)}>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Test Title</label>
                <input type="text" required className="form-input" placeholder="E.g., Coordinate Geometry Test 1" value={tTitle} onChange={e => setTTitle(e.target.value)} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Duration (Minutes)</label>
                  <input type="number" required className="form-input" placeholder="60" value={tDuration} onChange={e => setTDuration(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Total Marks</label>
                  <input type="number" required className="form-input" placeholder="100" value={tMarks} onChange={e => setTMarks(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Neg. Marking (%)</label>
                  <input type="number" required className="form-input" placeholder="25" value={tNegative} onChange={e => setTNegative(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Attempt Limit</label>
                  <input type="number" required className="form-input" placeholder="1" value={tLimit} onChange={e => setTLimit(e.target.value)} />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                Create Test
              </button>
            </form>
          </div>

          {/* Add MCQ Question Form */}
          <form onSubmit={handleAddQuestion} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3>🧠 Add Question to Timed Test</h3>

            <div className="form-group">
              <label className="form-label">Select Active Test</label>
              <select className="form-input" style={{ width: '100%', background: 'var(--bg-primary)' }} value={selectedTestId} onChange={e => setSelectedTestId(e.target.value)}>
                {tests.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Question Text</label>
              <textarea required className="form-input" rows={3} placeholder="Type MCQ problem formulation..." value={qText} onChange={e => setQText(e.target.value)} />
            </div>

            {/* Options list */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {qOptions.map((opt, idx) => (
                <div key={idx} className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Option {String.fromCharCode(65 + idx)}</label>
                  <input type="text" required className="form-input" placeholder={`Option content ${idx+1}`} value={opt} onChange={e => handleOptionChange(idx, e.target.value)} />
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '6px' }}>
              <div className="form-group">
                <label className="form-label">Correct Answer</label>
                <select className="form-input" value={qCorrect} onChange={e => setQCorrect(e.target.value)} style={{ background: 'var(--bg-primary)' }}>
                  <option value={0}>Option A</option>
                  <option value={1}>Option B</option>
                  <option value={2}>Option C</option>
                  <option value={3}>Option D</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Marks Reward</label>
                <input type="number" required className="form-input" value={qMarks} onChange={e => setQMarks(e.target.value)} />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
              Attach Question MCQ
            </button>
          </form>

        </div>
      )}

      {/* ------------------- VIEW: USERS CONTROL ------------------- */}
      {activeSubTab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.3s ease-out' }}>
          
          {/* Search bar */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search users by name, email, phone..." 
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
            />
          </div>

          {/* Users Table */}
          <div className="glass-panel" style={{ padding: '24px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', minWidth: '600px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-tertiary)', textAlign: 'left' }}>
                  <th style={{ padding: '12px' }}>Name</th>
                  <th style={{ padding: '12px' }}>Email</th>
                  <th style={{ padding: '12px' }}>Mobile</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Role</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Courses</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '12px', fontWeight: 700, color: '#fff' }}>{u.name}</td>
                    <td style={{ padding: '12px' }}>{u.email}</td>
                    <td style={{ padding: '12px' }}>{u.mobile}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}><span className="badge badge-primary">{u.role}</span></td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{u.course_count}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span className={`badge ${u.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      {u.role !== 'admin' && (
                        <button 
                          onClick={() => handleBanToggleClick(u)} 
                          className="btn btn-secondary"
                          style={{
                            padding: '4px 10px',
                            fontSize: '0.75rem',
                            display: 'inline-flex',
                            gap: '4px',
                            borderColor: u.status === 'active' ? '#ef4444' : '#10b981',
                            color: u.status === 'active' ? '#f87171' : '#34d399'
                          }}
                        >
                          {u.status === 'active' ? <><Ban size={12} /> Ban User</> : <><Check size={12} /> Unban</>}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* Ban user dialog confirmation modal */}
      {showBanModal && (
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
          zIndex: 120,
          backdropFilter: 'blur(8px)'
        }}>
          <form onSubmit={handleBanSubmit} className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '30px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171' }}>
              <ShieldAlert size={22} /> Ban Student Account
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>This will revoke all course permissions and block authentication instantly.</p>
            
            <div className="form-group">
              <label className="form-label">Reason for Banning</label>
              <textarea
                required
                className="form-input"
                rows={3}
                placeholder="E.g., Unauthorized commercial redistribution of course PDFs..."
                value={banReason}
                onChange={e => setBanReason(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button type="button" onClick={() => setShowBanModal(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-danger">
                Confirm Ban
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
