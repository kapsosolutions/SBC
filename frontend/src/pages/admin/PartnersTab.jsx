import { useEffect, useState } from 'react';
import { api, getToken } from '../../api.js';

const BASE = import.meta.env.VITE_API_BASE || '';

export default function PartnersTab() {
  const [partners, setPartners] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', location: '' });
  const [file, setFile] = useState(null);
  const [creds, setCreds] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api.get('/api/partners/all', 'admin').then(setPartners).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const create = async () => {
    setError(''); setCreds(null); setBusy(true);
    try {
      if (!form.name) throw new Error('Partner name required');
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('description', form.description);
      fd.append('location', form.location);
      if (file) fd.append('image', file);
      const res = await fetch(`${BASE}/api/partners`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken('admin')}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setCreds(data); // { username, password }
      setForm({ name: '', description: '', location: '' });
      setFile(null);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const resetPw = async (id) => {
    try {
      const data = await api.post(`/api/partners/${id}/reset-password`, {}, 'admin');
      setCreds(data);
    } catch (e) {
      setError(e.message);
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this partner?')) return;
    try {
      await api.del(`/api/partners/${id}`, 'admin');
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div>
      <h1 className="heading-sm">Partners</h1>
      <p className="muted body mt-8">Add a partner. A login username & password are generated automatically for their panel.</p>
      {error && <div className="alert alert-error mt-16">{error}</div>}
      {creds && (
        <div className="alert alert-ok mt-16">
          <b>Partner credentials (save now — password shown once):</b><br />
          Username: <b>{creds.username}</b> &nbsp; Password: <b>{creds.password}</b><br />
          Login at <b>/partner/login</b>
        </div>
      )}

      <div className="card mt-24">
        <h2 className="subheading">Add partner</h2>
        <div className="grid grid-2 mt-16">
          <div className="field">
            <label className="label">Partner / Brand name</label>
            <input className="input" value={form.name} onChange={set('name')} />
          </div>
          <div className="field">
            <label className="label">Business location</label>
            <input className="input" value={form.location} onChange={set('location')} />
          </div>
        </div>
        <div className="field">
          <label className="label">Description</label>
          <input className="input" value={form.description} onChange={set('description')} />
        </div>
        <div className="field">
          <label className="label">Logo / image (1:1 ratio)</label>
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
        </div>
        <button className="btn btn-primary" onClick={create} disabled={busy}>
          {busy ? 'Creating…' : 'Create partner'}
        </button>
      </div>

      <div className="card mt-24">
        <h2 className="subheading">All partners ({partners.length})</h2>
        <table className="table mt-16">
          <thead>
            <tr><th>Logo</th><th>Name</th><th>Location</th><th>Username</th><th>Scans</th><th></th></tr>
          </thead>
          <tbody>
            {partners.map((p) => (
              <tr key={p._id}>
                <td>
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt="" style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover' }} />
                  ) : '—'}
                </td>
                <td><b>{p.name}</b></td>
                <td>{p.location}</td>
                <td>{p.username}</td>
                <td>{p.totalRedemptions || 0}</td>
                <td className="row">
                  <button className="btn" onClick={() => resetPw(p._id)}>Reset PW</button>
                  <button className="btn" onClick={() => remove(p._id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
