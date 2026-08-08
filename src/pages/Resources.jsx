import React, { useState, useEffect } from 'react';
import { BookOpen, AlertCircle, FileText, Compass, Search } from 'lucide-react';
import { api } from '../utils/api.js';

const Resources = ({ user }) => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    api.get('/api/admin/resources')
      .then(data => setResources(data))
      .catch(err => setError(err.message || 'Failed to fetch resources'))
      .finally(() => setLoading(false));
  }, []);

  const resourceTypes = ['All', 'notice', 'strategy', 'info', 'tip'];

  const filteredResources = resources.filter(res => {
    const matchesType = selectedType === 'All' || res.type === selectedType;
    const matchesSearch = res.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          res.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div style={{
      maxWidth: '1000px',
      margin: '0 auto',
      padding: '40px 24px',
      width: '100%',
      animation: 'fadeIn 0.4s ease-out'
    }}>
      
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '12px' }}>
          💡 Platform <span className="gradient-text">Resources</span>
        </h1>
        <p style={{ maxWidth: '600px', margin: '0 auto' }}>
          Explore exam strategies, study hacks, official notices, and general educational posts shared by Specific Learnz instructors.
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

      {/* Filters and Search Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '20px',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '32px'
      }}>
        
        {/* Type Tabs */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {resourceTypes.map(type => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className="btn"
              style={{
                padding: '6px 14px',
                fontSize: '0.8rem',
                borderRadius: '16px',
                background: selectedType === type ? 'var(--gradient-main)' : 'rgba(255,255,255,0.03)',
                color: '#fff',
                border: selectedType === type ? 'none' : '1px solid var(--border-color)',
                textTransform: 'capitalize'
              }}
            >
              {type === 'All' ? 'All Resources' : type}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div style={{
          position: 'relative',
          width: '100%',
          maxWidth: '300px'
        }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search resources..."
            style={{ width: '100%', paddingLeft: '40px', paddingRight: '16px', height: '40px', borderRadius: '20px' }}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <div style={{ width: '30px', height: '30px', border: '3px solid var(--border-color)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 40px', color: 'var(--text-secondary)' }}>
          <BookOpen size={40} style={{ color: 'var(--text-tertiary)', marginBottom: '16px' }} />
          <h3>No resources found</h3>
          <p>Try searching for other topics or clearing your filter filters.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {filteredResources.map((res) => {
            return (
              <div 
                key={res.id} 
                className="glass-panel"
                style={{
                  padding: '24px',
                  display: 'flex',
                  gap: '20px',
                  alignItems: 'start',
                  background: res.type === 'notice' ? 'rgba(239, 68, 68, 0.02)' : 'var(--glass-bg)',
                  borderColor: res.type === 'notice' ? 'rgba(239, 68, 68, 0.15)' : 'var(--glass-border)'
                }}
              >
                {/* Icon Column */}
                <div style={{
                  background: res.type === 'notice' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                  borderRadius: '10px',
                  padding: '12px',
                  color: res.type === 'notice' ? '#f87171' : 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {res.type === 'notice' && <AlertCircle size={24} />}
                  {res.type === 'strategy' && <Compass size={24} />}
                  {res.type === 'tip' && <BookOpen size={24} />}
                  {res.type === 'info' && <FileText size={24} />}
                </div>

                {/* Content Column */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{res.title}</h3>
                    <span className="badge badge-primary" style={{ textTransform: 'capitalize' }}>
                      {res.type}
                    </span>
                  </div>
                  
                  <p style={{
                    fontSize: '0.95rem',
                    color: 'var(--text-secondary)',
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.6
                  }}>
                    {res.content}
                  </p>

                  {res.file_path && (
                    <div style={{ marginTop: '12px' }}>
                      <a 
                        href={res.file_path} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                      >
                        🔗 View Attachment Link
                      </a>
                    </div>
                  )}

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '8px' }}>
                    Shared on {new Date(res.created_at).toLocaleDateString()}
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

export default Resources;
