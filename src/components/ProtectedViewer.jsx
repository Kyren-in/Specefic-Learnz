import React, { useEffect, useRef } from 'react';
import { ShieldCheck, Lock, Play, FileText, Globe } from 'lucide-react';

const ProtectedViewer = ({ material, user }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Block Ctrl+P, Ctrl+S, Ctrl+U, Ctrl+C, Ctrl+Shift+I, F12
      if (
        (e.ctrlKey && (e.key === 'p' || e.key === 's' || e.key === 'u' || e.key === 'c' || e.key === 'a')) ||
        (e.ctrlKey && e.shiftKey && e.key === 'i') ||
        e.key === 'F12'
      ) {
        e.preventDefault();
        alert('Downloading, printing, or inspecting content on Specific Learnerz is strictly restricted.');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!material) return null;

  const token = localStorage.getItem('token');
  const type = material.type || 'pdf';
  const fileUrl = `/api/materials/${material.id}/view`;
  const authenticatedUrl = token
    ? `${fileUrl}${fileUrl.includes('?') ? '&' : '?'}token=${token}#toolbar=0&navpanes=0&statusbar=0&messages=0`
    : `${fileUrl}#toolbar=0&navpanes=0&statusbar=0&messages=0`;

  // Helper to convert YouTube link to embed URL if applicable
  const getEmbedUrl = (rawUrl) => {
    if (!rawUrl) return '';
    if (rawUrl.includes('youtube.com/watch?v=')) {
      const videoId = rawUrl.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=1`;
    }
    if (rawUrl.includes('youtu.be/')) {
      const videoId = rawUrl.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=1`;
    }
    if (rawUrl.includes('vimeo.com/')) {
      const videoId = rawUrl.split('vimeo.com/')[1]?.split('?')[0];
      return `https://player.vimeo.com/video/${videoId}`;
    }
    return rawUrl;
  };

  const userWatermark = user 
    ? `Licensed to: ${user.name} | ${user.email} | Specific Learnerz`
    : 'Licensed Session | Specific Learnerz';

  return (
    <div 
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '78vh',
        backgroundColor: '#09090b',
        borderRadius: '16px',
        border: '1px solid rgba(99, 102, 241, 0.2)',
        overflow: 'hidden',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
        display: 'flex',
        flexDirection: 'column'
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        alert('Right-click is disabled to protect platform content.');
      }}
    >
      {/* Top Header Bar inside viewer */}
      <div style={{
        padding: '14px 20px',
        background: 'rgba(24, 24, 27, 0.9)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {type === 'video' && <Play size={18} color="var(--primary)" />}
          {type === 'pdf' && <FileText size={18} color="#f87171" />}
          {type === 'link' && <Globe size={18} color="#34d399" />}
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', margin: 0 }}>
            {material.title}
          </h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 12px', borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
          <ShieldCheck size={14} /> Protected In-Platform Viewer
        </div>
      </div>

      {/* Viewer Main Body */}
      <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%', background: '#000' }}>
        
        {/* Dynamic Watermark Overlay across viewer */}
        <div style={{
          position: 'absolute',
          top: '40%',
          left: '10%',
          right: '10%',
          transform: 'rotate(-25deg)',
          color: 'rgba(255, 255, 255, 0.12)',
          fontSize: '1rem',
          fontWeight: 700,
          pointerEvents: 'none',
          zIndex: 8,
          textAlign: 'center',
          userSelect: 'none',
          letterSpacing: '1px'
        }}>
          {userWatermark}
        </div>

        {/* 1. Protected HTML5 Video Player */}
        {type === 'video' ? (
          <video
            src={authenticatedUrl}
            controls
            controlsList="nodownload noremoteplayback"
            disablePictureInPicture
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              backgroundColor: '#000'
            }}
            onContextMenu={(e) => e.preventDefault()}
          >
            Your browser does not support the video tag.
          </video>
        ) : type === 'link' ? (
          /* 2. Embedded Web Link / YouTube Video Frame */
          <iframe
            src={getEmbedUrl(material.file_path)}
            title={material.title}
            width="100%"
            height="100%"
            style={{
              border: 'none',
              backgroundColor: '#18181b'
            }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          /* 3. Protected Watermarked PDF / Document Frame */
          <iframe
            src={authenticatedUrl}
            title={material.title}
            width="100%"
            height="100%"
            style={{
              border: 'none',
              backgroundColor: '#18181b'
            }}
          />
        )}
      </div>

      {/* Floating Bottom Protection Notice */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        right: '16px',
        background: 'rgba(9, 9, 11, 0.85)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '6px 14px',
        borderRadius: '20px',
        fontSize: '0.75rem',
        color: '#a1a1aa',
        zIndex: 12,
        backdropFilter: 'blur(6px)',
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        <Lock size={12} color="var(--primary)" /> DRM Protected Content — No Downloads Allowed
      </div>

    </div>
  );
};

export default ProtectedViewer;
