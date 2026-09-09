import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, saveToken } from '../../api.js';

export default function PartnerLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(''); setLoading(true);
    try {
      const res = await api.post('/api/auth/partner/login', { username, password });
      saveToken('partner', res.token);
      navigate('/partner');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card card">
        <div className="logo"><span className="logo-mark">S</span><span>Partner</span></div>
        <h1 className="heading-sm mt-16">Partner login</h1>
        <p className="muted body mt-8">Use the username & password provided by the SBC admin.</p>
        {error && <div className="alert alert-error mt-16">{error}</div>}
        <div className="mt-24">
          <div className="field">
            <label className="label">Username</label>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} />
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
