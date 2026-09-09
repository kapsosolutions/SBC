import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, saveToken } from '../api.js';

export default function Login() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(''); setLoading(true);
    try {
      const res = await api.post('/api/auth/student/login', { phone, password });
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
        <h1 className="heading-sm mt-16">Welcome back</h1>
        <p className="muted body mt-8">Log in with your WhatsApp number and password.</p>

        {error && <div className="alert alert-error mt-16">{error}</div>}

        <div className="mt-24">
          <div className="field">
            <label className="label">WhatsApp Number</label>
            <input className="input" placeholder="919000000000" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">Password</label>
            <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button className="btn btn-primary btn-block" onClick={submit} disabled={loading}>
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </div>

        <p className="caption mt-24 center">
          New here? <Link to="/register"><b>Create an account</b></Link>
        </p>
      </div>
    </div>
  );
}
