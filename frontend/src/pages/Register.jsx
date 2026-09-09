import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, saveToken } from '../api.js';

function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: phone+otp, 2: details, 3: plan+pay
  const [form, setForm] = useState({
    phone: '',
    code: '',
    name: '',
    email: '',
    school: '',
    dob: '',
    password: '',
    confirmPassword: '',
  });
  const [otpSent, setOtpSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [plans, setPlans] = useState([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState('');

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const pwMatch = form.password.length >= 6 && form.password === form.confirmPassword;

  const sendOtp = async () => {
    setError(''); setMsg(''); setLoading(true);
    try {
      await api.post('/api/auth/student/request-otp', { phone: form.phone });
      setOtpSent(true);
      setMsg('OTP sent to your WhatsApp.');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setError(''); setMsg(''); setLoading(true);
    try {
      await api.post('/api/auth/student/verify-otp', { phone: form.phone, code: form.code });
      setVerified(true);
      setStep(2);
      setMsg('Number verified. Complete your details.');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Create the (unregistered) account, then move to plan + payment.
  const createAccount = async () => {
    setError(''); setMsg(''); setLoading(true);
    try {
      const res = await api.post('/api/auth/student/register', form);
      saveToken('student', res.token);
      const list = await api.get('/api/plans');
      setPlans(Array.isArray(list) ? list : []);
      setStep(3);
      setMsg('Account created. Choose a plan and pay to activate your card.');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Razorpay checkout for the selected plan.
  const pay = async (plan) => {
    setError(''); setPaying(plan.key);
    try {
      const ok = await loadRazorpay();
      if (!ok) throw new Error('Could not load payment gateway. Check your connection.');
      const order = await api.post('/api/payment/create-order', { planKey: plan.key }, 'student');

      const rzp = new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: order.name,
        description: `${order.planTitle} — Student Benefit Card`,
        prefill: order.prefill,
        theme: { color: '#000000' },
        handler: async (resp) => {
          try {
            await api.post(
              '/api/payment/verify',
              {
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature,
              },
              'student'
            );
            navigate('/dashboard');
          } catch (e) {
            setError(e.message || 'Payment verification failed');
            setPaying('');
          }
        },
        modal: { ondismiss: () => setPaying('') },
      });
      rzp.on('payment.failed', (r) => {
        setError(r.error?.description || 'Payment failed');
        setPaying('');
      });
      rzp.open();
    } catch (e) {
      setError(e.message);
      setPaying('');
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card card">
        <Link to="/" className="logo"><span className="logo-mark">S</span><span>SBC</span></Link>
        <h1 className="heading-sm mt-16">Create your account</h1>
        <p className="muted body mt-8">
          We verify your WhatsApp number so your web and WhatsApp card stay in sync.
        </p>

        {error && <div className="alert alert-error mt-16">{error}</div>}
        {msg && <div className="alert alert-ok mt-16">{msg}</div>}

        {step === 1 && (
          <div className="mt-24">
            <div className="field">
              <label className="label">WhatsApp Number</label>
              <input
                className="input"
                placeholder="e.g. 919000000000"
                value={form.phone}
                onChange={set('phone')}
                disabled={otpSent}
              />
            </div>
            {!otpSent ? (
              <button className="btn btn-primary btn-block" onClick={sendOtp} disabled={loading || !form.phone}>
                {loading ? 'Sending…' : 'Send OTP on WhatsApp'}
              </button>
            ) : (
              <>
                <div className="field">
                  <label className="label">Enter OTP</label>
                  <input className="input" placeholder="6-digit code" value={form.code} onChange={set('code')} />
                </div>
                <button className="btn btn-primary btn-block" onClick={verifyOtp} disabled={loading || !form.code}>
                  {loading ? 'Verifying…' : 'Verify & continue'}
                </button>
                <button className="btn btn-block mt-8" onClick={sendOtp} disabled={loading}>Resend OTP</button>
              </>
            )}
          </div>
        )}

        {step === 2 && verified && (
          <div className="mt-24">
            <div className="field">
              <label className="label">WhatsApp Number (verified)</label>
              <input className="input" value={form.phone} disabled />
            </div>
            <div className="field">
              <label className="label">Student Name</label>
              <input className="input" value={form.name} onChange={set('name')} />
            </div>
            <div className="field">
              <label className="label">Email (optional)</label>
              <input className="input" value={form.email} onChange={set('email')} />
            </div>
            <div className="field">
              <label className="label">School / Institute</label>
              <input className="input" value={form.school} onChange={set('school')} />
            </div>
            <div className="field">
              <label className="label">Date of Birth</label>
              <input type="date" className="input" value={form.dob} onChange={set('dob')} />
            </div>
            <div className="field">
              <label className="label">Password</label>
              <input type="password" className="input" value={form.password} onChange={set('password')} />
            </div>
            <div className="field">
              <label className="label">Confirm Password</label>
              <input type="password" className="input" value={form.confirmPassword} onChange={set('confirmPassword')} />
              {form.confirmPassword && !pwMatch && (
                <div className="caption" style={{ color: '#b30000' }}>
                  {form.password.length < 6 ? 'Password must be 6+ characters' : 'Passwords do not match'}
                </div>
              )}
            </div>
            <button
              className="btn btn-primary btn-block"
              onClick={createAccount}
              disabled={loading || !form.name || !pwMatch}
            >
              {loading ? 'Creating…' : 'Continue'}
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="mt-24">
            <h2 className="subheading">Choose your plan</h2>
            <p className="muted body mt-8">Pay securely to activate your Student Benefit Card.</p>
            <div className="stack mt-16">
              {plans.map((p) => (
                <div className="card" key={p.key} style={{ padding: 16 }}>
                  <div className="row between">
                    <div>
                      <b>{p.title}</b>
                      <div className="caption">{p.description}</div>
                    </div>
                    <div className="subheading">₹{p.price}</div>
                  </div>
                  <button
                    className="btn btn-primary btn-block mt-16"
                    onClick={() => pay(p)}
                    disabled={!!paying}
                  >
                    {paying === p.key ? 'Opening payment…' : `Pay ₹${p.price}`}
                  </button>
                </div>
              ))}
              {plans.length === 0 && <p className="muted">Loading plans…</p>}
            </div>
          </div>
        )}

        <p className="caption mt-24 center">
          Already registered? <Link to="/login"><b>Log in</b></Link>
        </p>
      </div>
    </div>
  );
}
