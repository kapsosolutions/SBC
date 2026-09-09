import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, saveToken } from '../../api.js';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(''); setLoading(true);
    try {
      const res = await api.post('/api/auth/admin/login', { email, password });
      saveToken('admin', res.token);
      navigate('/admin');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card card">
        <div className="logo"><span className="logo-mark">S</span><span>SBC Admin</span></div>
        <h1 className="heading-sm mt-16">Admin login</h1>
        {error && <div className="alert alert-error mt-16">{error}</div>}
        <div className="mt-24">
          <div className="field">
            <label className="label">Email</label>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">Password</label>
            <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button className="btn btn-primary btn-block" onClick={submit} disabled={loading}>
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </div>
        <p className="caption mt-24 center"><Link to="/">← Back to site</Link></p>
      </div>
    </div>
  );
}
