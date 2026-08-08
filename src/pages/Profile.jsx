import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Lock, Camera, CheckCircle, AlertCircle, ShieldCheck } from 'lucide-react';
import { getProfile, updateProfile, uploadAvatar } from '../utils/api';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Form fields
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const data = await getProfile();
      setProfile(data);
      setName(data.name || '');
      setMobile(data.mobile || '');
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to load profile data' });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setSaving(true);

    try {
      const payload = {
        name,
        mobile
      };

      if (newPassword) {
        if (!currentPassword) {
          setMessage({ type: 'error', text: 'Please enter your current password to change password.' });
          setSaving(false);
          return;
        }
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const res = await updateProfile(payload);
      setMessage({ type: 'success', text: res.message || 'Profile updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      fetchUserData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Client-side pre-validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setMessage({ type: 'error', text: 'Invalid file type. Please upload a PNG, JPG, WEBP, or GIF image.' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image file size must be less than 2MB.' });
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    setUploading(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await uploadAvatar(formData);
      setMessage({ type: 'success', text: 'Profile picture updated successfully!' });
      fetchUserData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Security validation or upload failed.' });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto' }}></div>
        <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading profile details...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '40px 20px', maxWidth: '800px' }}>
      <div className="glass-card" style={{ padding: '36px', borderRadius: '24px' }}>
        
        {/* Header & Avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              overflow: 'hidden',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
              border: '4px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
            }}>
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <User size={56} color="#fff" />
              )}
            </div>

            {/* Avatar Change Overlay Button */}
            <label
              htmlFor="avatar-input"
              style={{
                position: 'absolute',
                bottom: '4px',
                right: '4px',
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'var(--primary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: uploading ? 'wait' : 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                transition: 'transform 0.2s'
              }}
              title="Change Profile Picture"
            >
              <Camera size={18} />
              <input
                id="avatar-input"
                type="file"
                accept="image/png, image/jpeg, image/webp, image/gif"
                onChange={handleAvatarChange}
                disabled={uploading}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 6px 0', color: '#fff' }}>
            {profile?.name}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge" style={{
              background: profile?.role === 'admin' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.2)',
              color: profile?.role === 'admin' ? '#f87171' : '#a5b4fc',
              border: '1px solid currentColor',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '0.85rem',
              fontWeight: 600,
              textTransform: 'uppercase'
            }}>
              {profile?.role === 'admin' ? 'System Administrator' : 'JEE Student'}
            </span>
            <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
              <ShieldCheck size={16} /> Verified Account
            </span>
          </div>

          {uploading && (
            <p style={{ marginTop: '8px', color: 'var(--primary)', fontSize: '0.9rem' }}>
              🔒 Performing magic-byte & security analysis...
            </p>
          )}
        </div>

        {/* Feedback Alert */}
        {message.text && (
          <div style={{
            padding: '14px 18px',
            borderRadius: '12px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.95rem',
            background: message.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            border: `1px solid ${message.type === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
            color: message.type === 'error' ? '#f87171' : '#34d399'
          }}>
            {message.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
            {message.text}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleProfileUpdate}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            
            {/* Full Name */}
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: '44px' }}
                  required
                />
              </div>
            </div>

            {/* Mobile Number */}
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                Mobile Number
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: '44px' }}
                  required
                />
              </div>
            </div>

          </div>

          {/* Email Address (Readonly) */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>
              Email Address (Cannot be changed)
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="email"
                value={profile?.email || ''}
                className="input-field"
                style={{ paddingLeft: '44px', opacity: 0.65, cursor: 'not-allowed' }}
                disabled
              />
            </div>
          </div>

          <hr style={{ border: 0, borderTop: '1px solid rgba(255,255,255,0.1)', margin: '32px 0' }} />

          {/* Password Change Section */}
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px', color: '#fff' }}>
            🔒 Change Password (Optional)
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
            
            {/* Current Password */}
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                Current Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: '44px' }}
                />
              </div>
            </div>

            {/* New Password */}
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type="password"
                  placeholder="New password (min 6 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: '44px' }}
                />
              </div>
            </div>

          </div>

          {/* Save Button */}
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 700 }}
            disabled={saving}
          >
            {saving ? 'Saving Profile Changes...' : 'Save Profile Changes'}
          </button>

        </form>
      </div>
    </div>
  );
}
