import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, saveToken } from '../api.js';

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: phone+otp, 2: details
  const [form, setForm] = useState({
    phone: '',
    code: '',
    name: '',
    email: '',
    school: '',
    dob: '',
    altPhone: '',
    password: '',
    confirmPassword: '',
  });
  const [otpSent, setOtpSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

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

  const submit = async () => {
    setError(''); setMsg(''); setLoading(true);
    try {
      const res = await api.post('/api/auth/student/register', form);
      saveToken('student', res.token);
      navigate('/dashboard');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
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
                <button className="btn btn-block mt-8" onClick={sendOtp} disabled={loading}>
                  Resend OTP
                </button>
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
            </div>
            <button className="btn btn-primary btn-block" onClick={submit} disabled={loading}>
              {loading ? 'Creating…' : 'Create account'}
            </button>
            <p className="caption mt-16">
              After signing up, open WhatsApp and send “hi” to pick a plan and pay to activate your card.
            </p>
          </div>
        )}

        <p className="caption mt-24 center">
          Already registered? <Link to="/login"><b>Log in</b></Link>
        </p>
      </div>
    </div>
  );
}
