import React, { useEffect, useRef } from 'react';

const ProtectedViewer = ({ fileUrl, title }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Block Ctrl+P, Ctrl+S, Ctrl+U, Ctrl+Shift+I, F12
      if (
        (e.ctrlKey && (e.key === 'p' || e.key === 's' || e.key === 'u' || e.key === 'c' || e.key === 'a')) ||
        (e.ctrlKey && e.shiftKey && e.key === 'i') ||
        e.key === 'F12'
      ) {
        e.preventDefault();
        alert('Downloading, printing, or inspecting this document is restricted.');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const token = localStorage.getItem('token');
  const authenticatedUrl = token
    ? `${fileUrl}${fileUrl.includes('?') ? '&' : '?'}token=${token}#toolbar=0&navpanes=0&statusbar=0&messages=0`
    : `${fileUrl}#toolbar=0&navpanes=0&statusbar=0&messages=0`;

  return (
    <div 
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '75vh',
        backgroundColor: '#1c1917',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        overflow: 'hidden',
        boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        alert('Right-click is disabled to protect content rights.');
      }}
    >
      {/* Visual Header protection shield - blocks download toolbars */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '56px',
        background: 'transparent',
        zIndex: 5,
        pointerEvents: 'auto'
      }} />

      {/* Main Document Frame */}
      <iframe
        src={authenticatedUrl}
        title={title}
        width="100%"
        height="100%"
        style={{
          border: 'none',
          pointerEvents: 'auto',
          backgroundColor: '#18181b'
        }}
      />
      
      {/* Floating security notice */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        right: '16px',
        background: 'rgba(9, 9, 11, 0.85)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '6px 12px',
        borderRadius: '20px',
        fontSize: '0.75rem',
        color: '#a1a1aa',
        zIndex: 6,
        backdropFilter: 'blur(4px)',
        pointerEvents: 'none'
      }}>
        🔒 Protected Viewer (Watermarked Session)
      </div>
    </div>
  );
};

export default ProtectedViewer;
