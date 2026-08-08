import React, { useState } from 'react';
import { api } from '../utils/api.js';

const Auth = ({ onLogin }) => {
  // Modes: 'login', 'register', 'forgot', 'otp'
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  
  // Forgot password
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const clearForm = () => {
    setError('');
    setMessage('');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.post('/api/auth/login', { emailOrMobile: email, password });
      localStorage.setItem('token', data.token);
      onLogin(data.user);
    } catch (err) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const data = await api.post('/api/auth/register', { name, email, mobile, password });
      setMessage(data.message);
      if (data.mockOtpUsed) {
        setMessage(`${data.message}. (Developer Mock OTP: ${data.mockOtpUsed})`);
      }
      setMode('otp');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerifySubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.post('/api/auth/verify-otp', { name, email, mobile, password, otp });
      localStorage.setItem('token', data.token);
      onLogin(data.user);
    } catch (err) {
      setError(err.message || 'Incorrect or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const data = await api.post('/api/auth/forgot-password', { email });
      setMessage(data.message);
      if (data.mockToken) {
        setMessage(`${data.message}. (Developer Mock Code: ${data.mockToken})`);
      }
      setMode('reset');
    } catch (err) {
      setError(err.message || 'Reset code request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      await api.post('/api/auth/reset-password', { email, code: resetCode, newPassword });
      setMessage('Password reset successfully! Please sign in.');
      setMode('login');
      setPassword('');
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      background: 'radial-gradient(circle at top, rgba(99, 102, 241, 0.12) 0%, transparent 60%)',
      minHeight: 'calc(100vh - 70px)'
    }}>
      <div className="glass-panel glow-effect" style={{
        width: '100%',
        maxWidth: '460px',
        padding: '40px',
        animation: 'fadeIn 0.5s ease-out'
      }}>
        
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '8px' }}>
            {mode === 'login' && 'Welcome Back'}
            {mode === 'register' && 'Create Account'}
            {mode === 'forgot' && 'Reset Password'}
            {mode === 'otp' && 'Verify Email'}
            {mode === 'reset' && 'Create New Password'}
          </h2>
          <p style={{ fontSize: '0.9rem' }}>
            {mode === 'login' && 'Sign in to access your JEE study environment'}
            {mode === 'register' && 'Enroll today to kickstart your preparation'}
            {mode === 'forgot' && 'Enter your email to receive a verification code'}
            {mode === 'otp' && `We sent a 6-digit OTP code to ${email}`}
            {mode === 'reset' && 'Choose a secure new password for your account'}
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#f87171',
            padding: '12px 16px',
            borderRadius: '10px',
            fontSize: '0.85rem',
            marginBottom: '20px',
            lineHeight: 1.4
          }}>
            ⚠️ {error}
          </div>
        )}

        {message && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            color: '#34d399',
            padding: '12px 16px',
            borderRadius: '10px',
            fontSize: '0.85rem',
            marginBottom: '20px',
            lineHeight: 1.4
          }}>
            ✅ {message}
          </div>
        )}

        {/* 1. LOGIN MODE */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label className="form-label">Email or Mobile</label>
              <input 
                type="text" 
                required 
                className="form-input" 
                placeholder="Enter your email or phone" 
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">Password</label>
                <button 
                  type="button" 
                  onClick={() => { setMode('forgot'); clearForm(); }}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                >
                  Forgot?
                </button>
              </div>
              <input 
                type="password" 
                required 
                className="form-input" 
                placeholder="••••••••" 
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>
              {loading ? 'Signing In...' : 'Sign In'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Don't have an account?{' '}
              <button 
                type="button" 
                onClick={() => { setMode('register'); clearForm(); }}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 700 }}
              >
                Sign Up
              </button>
            </div>
          </form>
        )}

        {/* 2. REGISTER MODE */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input 
                type="text" 
                required 
                className="form-input" 
                placeholder="Enter your name" 
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input 
                type="email" 
                required 
                className="form-input" 
                placeholder="yourname@gmail.com" 
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mobile Number</label>
              <input 
                type="tel" 
                required 
                pattern="[0-9]{10}"
                className="form-input" 
                placeholder="10-digit mobile number" 
                value={mobile}
                onChange={e => setMobile(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input 
                type="password" 
                required 
                minLength={6}
                className="form-input" 
                placeholder="Choose a strong password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input 
                type="password" 
                required 
                className="form-input" 
                placeholder="Re-enter password" 
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>
              {loading ? 'Sending Verification...' : 'Send Verification OTP'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Already registered?{' '}
              <button 
                type="button" 
                onClick={() => { setMode('login'); clearForm(); }}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 700 }}
              >
                Sign In
              </button>
            </div>
          </form>
        )}

        {/* 3. OTP VERIFICATION MODE */}
        {mode === 'otp' && (
          <form onSubmit={handleOtpVerifySubmit}>
            <div className="form-group">
              <label className="form-label">Enter 6-Digit OTP</label>
              <input 
                type="text" 
                required 
                maxLength={6}
                pattern="[0-9]{6}"
                className="form-input" 
                placeholder="XXXXXX" 
                style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '1.4rem' }}
                value={otp}
                onChange={e => setOtp(e.target.value)}
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>
              {loading ? 'Verifying...' : 'Verify & Setup Account'}
            </button>

            <button 
              type="button" 
              onClick={() => { setMode('register'); clearForm(); }}
              className="btn btn-secondary" 
              style={{ width: '100%', marginTop: '12px' }}
            >
              Back to Sign Up
            </button>
          </form>
        )}

        {/* 4. FORGOT PASSWORD MODE */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input 
                type="email" 
                required 
                className="form-input" 
                placeholder="yourname@gmail.com" 
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>
              {loading ? 'Sending Code...' : 'Send Reset Code'}
            </button>

            <button 
              type="button" 
              onClick={() => { setMode('login'); clearForm(); }}
              className="btn btn-secondary" 
              style={{ width: '100%', marginTop: '12px' }}
            >
              Back to Sign In
            </button>
          </form>
        )}

        {/* 5. RESET PASSWORD MODE */}
        {mode === 'reset' && (
          <form onSubmit={handleResetSubmit}>
            <div className="form-group">
              <label className="form-label">Verification Code (OTP)</label>
              <input 
                type="text" 
                required 
                maxLength={6}
                className="form-input" 
                placeholder="Enter 6-digit code" 
                value={resetCode}
                onChange={e => setResetCode(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">New Password</label>
              <input 
                type="password" 
                required 
                minLength={6}
                className="form-input" 
                placeholder="Choose a new password" 
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>
              {loading ? 'Resetting...' : 'Change Password'}
            </button>

            <button 
              type="button" 
              onClick={() => { setMode('forgot'); clearForm(); }}
              className="btn btn-secondary" 
              style={{ width: '100%', marginTop: '12px' }}
            >
              Back
            </button>
          </form>
        )}

      </div>
    </div>
  );
};

export default Auth;
