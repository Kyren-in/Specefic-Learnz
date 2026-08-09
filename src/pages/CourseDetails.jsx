import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { BookOpen, CheckCircle, Clock, ShieldCheck, HelpCircle, Layers, ArrowLeft } from 'lucide-react';
import { api } from '../utils/api.js';

const CourseDetails = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [enrolled, setEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Payment UI states
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showMockModal, setShowMockModal] = useState(false);
  const [mockOrderDetails, setMockOrderDetails] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError('');

    // Fetch course details & enrollment status concurrently
    Promise.all([
      api.get(`/api/courses/${courseId}`),
      api.get(`/api/courses/${courseId}/enrolled`)
    ])
      .then(([courseData, enrolledData]) => {
        setCourse(courseData);
        setEnrolled(enrolledData.enrolled);
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch course details');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [courseId]);

  // Dynamic Razorpay script injector
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePurchaseClick = async () => {
    setError('');
    setPaymentLoading(true);

    try {
      // Initiate order on backend
      const orderData = await api.post('/api/courses/purchase', { courseId });

      if (orderData.mock) {
        // Show developer mock modal
        setMockOrderDetails(orderData);
        setShowMockModal(true);
        setPaymentLoading(false);
      } else {
        // Trigger live Razorpay payment
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          throw new Error('Razorpay SDK failed to load. Are you offline?');
        }

        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency,
          name: 'Specific Learnz',
          description: `Enroll in ${orderData.courseName}`,
          order_id: orderData.orderId,
          handler: async (response) => {
            try {
              setPaymentLoading(true);
              const verifyRes = await api.post('/api/courses/verify-payment', {
                courseId,
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                signature: response.razorpay_signature,
                isMock: false
              });
              alert('Payment verified! Course unlocked.');
              navigate(`/course/${courseId}`);
            } catch (verifyErr) {
              setError(verifyErr.message || 'Payment verification failed');
            } finally {
              setPaymentLoading(false);
            }
          },
          prefill: {
            name: orderData.user.name,
            email: orderData.user.email,
          },
          theme: {
            color: '#6366f1',
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response) {
          setError(response.error?.description || 'Payment failed. Please try again.');
        });
        rzp.open();
        setPaymentLoading(false);
      }
    } catch (err) {
      setError(err.message || 'Purchase process failed');
      setPaymentLoading(false);
    }
  };

  const handleMockPaymentSuccess = async () => {
    if (!mockOrderDetails) return;
    setError('');
    setPaymentLoading(true);
    setShowMockModal(false);

    try {
      const mockPaymentId = `pay_mock_${Math.random().toString(36).substring(2, 10)}`;
      await api.post('/api/courses/verify-payment', {
        courseId,
        paymentId: mockPaymentId,
        orderId: mockOrderDetails.orderId,
        isMock: true
      });
      alert('Mock payment simulated successfully! Course unlocked.');
      navigate(`/course/${courseId}`);
    } catch (err) {
      setError(err.message || 'Mock payment verification failed');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!course) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center' }}>
        <h3>Course not found</h3>
        <Link to="/" className="btn btn-secondary" style={{ marginTop: '16px' }}>Back to home</Link>
      </div>
    );
  }

  const hasDiscount = course.discount_price !== null && course.discount_price < course.price;
  const discountPercent = hasDiscount 
    ? Math.round(((course.price - course.discount_price) / course.price) * 100) 
    : 0;

  return (
    <div style={{
      maxWidth: '1000px',
      margin: '0 auto',
      padding: '40px 24px',
      width: '100%',
      animation: 'fadeIn 0.4s ease-out'
    }}>
      
      {/* Back Button */}
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginBottom: '30px', fontWeight: 600 }}>
        <ArrowLeft size={16} /> Back to Courses
      </Link>

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

      {/* Main Grid split: Info (Left) & Pricing Action (Right) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '40px',
        alignItems: 'start'
      }}>
        
        {/* Left: Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          <div>
            <span className="badge badge-primary" style={{ marginBottom: '12px' }}>{course.category || 'General'}</span>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '16px', lineHeight: 1.2 }}>{course.name}</h1>
            <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{course.description}</p>
          </div>

          <div style={{ display: 'flex', gap: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} style={{ color: 'var(--primary)' }} />
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Duration</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>{course.duration || 'Flexible'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={18} style={{ color: 'var(--primary)' }} />
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Study Items</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>PDFs & Video Materials</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} style={{ color: 'var(--primary)' }} />
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>AI Search</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>RAG Enabled</div>
              </div>
            </div>
          </div>

          {/* Curriculum Structure Overview */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>What's Included in this Course:</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'start' }}>
                <CheckCircle size={16} style={{ color: 'var(--primary)', marginTop: '4px', flexShrink: 0 }} />
                <span>**In-Browser Document Viewer**: Secure, watermarked PDFs so you can study safely.</span>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'start' }}>
                <CheckCircle size={16} style={{ color: 'var(--primary)', marginTop: '4px', flexShrink: 0 }} />
                <span>**Course-Specific AI Bot**: RAG Search Engine designed to retrieve explanations only from the admin's uploaded files.</span>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'start' }}>
                <CheckCircle size={16} style={{ color: 'var(--primary)', marginTop: '4px', flexShrink: 0 }} />
                <span>**Interactive Doubts Thread**: Post algebra/calculus queries, insert mock screenshots, and comment with peers.</span>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'start' }}>
                <CheckCircle size={16} style={{ color: 'var(--primary)', marginTop: '4px', flexShrink: 0 }} />
                <span>**Custom Test Series**: Standard timed MCQs, negative markings scoring, accuracy calculations, and historical report cards.</span>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'start' }}>
                <CheckCircle size={16} style={{ color: 'var(--primary)', marginTop: '4px', flexShrink: 0 }} />
                <span>**Percentile Predictor**: Input test marks to evaluate estimated Main/Advanced rankings.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Pricing & Buy Card */}
        <div className="glass-panel glow-effect" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            height: '180px',
            background: course.thumbnail 
              ? `url(${course.thumbnail}) center/cover no-repeat` 
              : 'linear-gradient(135deg, #1e1b4b 0%, #311042 100%)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {!course.thumbnail && (
              <BookOpen size={48} style={{ opacity: 0.15, color: '#fff' }} />
            )}
          </div>

          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
              Investment
            </div>
            {hasDiscount ? (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '4px' }}>
                <span style={{ fontSize: '2rem', fontWeight: 800, color: '#fff' }}>₹{course.discount_price}</span>
                <span style={{ fontSize: '1.1rem', textDecoration: 'line-through', color: 'var(--text-tertiary)' }}>₹{course.price}</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#34d399' }}>{discountPercent}% OFF</span>
              </div>
            ) : (
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>₹{course.price}</div>
            )}
          </div>

          {enrolled ? (
            <button 
              onClick={() => navigate(`/course/${courseId}`)} 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '14px' }}
            >
              Go to Course Dashboard
            </button>
          ) : (
            <button 
              onClick={handlePurchaseClick} 
              disabled={paymentLoading}
              className="btn btn-primary" 
              style={{ width: '100%', padding: '14px' }}
            >
              {paymentLoading ? 'Processing Checkout...' : 'Enroll and Unlock Now'}
            </button>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={14} style={{ color: '#34d399' }} /> SECURE RAZORPAY GATEWAY
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={14} style={{ color: 'var(--primary)' }} /> LIFETIME ACCESS & UPDATES
            </div>
          </div>
        </div>

      </div>

      {/* Mock Payment Modal */}
      {showMockModal && mockOrderDetails && (
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
          backdropFilter: 'blur(10px)'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '450px',
            padding: '30px',
            textAlign: 'center',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            boxShadow: '0 0 40px rgba(99, 102, 241, 0.2)'
          }}>
            <span style={{
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: '50%',
              width: '60px',
              height: '60px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
              marginBottom: '20px'
            }}>
              <ShieldCheck size={32} />
            </span>
            
            <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Developer Sandbox Checkout</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
              We noticed Razorpay credentials are not configured in your environment. The system has automatically loaded mock billing.
            </p>

            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'left',
              marginBottom: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>COURSE</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{mockOrderDetails.courseName}</div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '6px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>ORDER ID</div>
                  <div style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>{mockOrderDetails.orderId.substring(0, 16)}...</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>AMOUNT DUE</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#34d399' }}>₹{(mockOrderDetails.amount / 100).toFixed(2)}</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                onClick={handleMockPaymentSuccess} 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '12px' }}
              >
                Simulate Successful Payment
              </button>
              <button 
                onClick={() => setShowMockModal(false)} 
                className="btn btn-secondary" 
                style={{ width: '100%', padding: '12px' }}
              >
                Cancel Checkout
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CourseDetails;
