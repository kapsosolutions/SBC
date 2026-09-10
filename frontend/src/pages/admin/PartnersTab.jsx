import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import Modal from '../../components/Modal.jsx';

export default function PartnersTab() {
  const [partners, setPartners] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', location: '', category: '', offerPercent: '' });
  const [file, setFile] = useState(null);
  const [open, setOpen] = useState(false);
  const [creds, setCreds] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () =>
    api.get('/api/partners/all', 'admin').then((d) => setPartners(Array.isArray(d) ? d : [])).catch((e) => setError(e.message));
  useEffect(() => {
    load();
    api.get('/api/categories/all', 'admin').then((d) => setCategories(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const openAdd = () => {
    setForm({ name: '', description: '', location: '', category: '', offerPercent: '' });
    setFile(null);
    setError('');
    setOpen(true);
  };

  const create = async () => {
    setError(''); setBusy(true);
    try {
      if (!form.name) throw new Error('Partner name required');
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('description', form.description);
      fd.append('location', form.location);
      fd.append('category', form.category);
      fd.append('offerPercent', form.offerPercent || '0');
      if (file) fd.append('image', file);
      const data = await api.form('/api/partners', fd, 'admin');
      setCreds(data); // { username, password }
      setOpen(false);
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
      <div className="page-head">
        <div>
          <h1 className="heading-sm">Partners</h1>
          <p className="muted body mt-8">A login username & password are generated automatically for each partner.</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add partner</button>
      </div>

      {error && !open && <div className="alert alert-error mt-16">{error}</div>}
      {creds && (
        <div className="alert alert-ok mt-16">
          <b>Partner credentials (save now — password shown once):</b><br />
          Username: <b>{creds.username}</b> &nbsp; Password: <b>{creds.password}</b><br />
          Login at <b>/partner/login</b>
        </div>
      )}

      <div className="card mt-24">
        <h2 className="subheading">All partners ({partners.length})</h2>
        <table className="table mt-16">
          <thead>
            <tr><th>Logo</th><th>Name</th><th>Category</th><th>Offer</th><th>Location</th><th>Username</th><th>Scans</th><th></th></tr>
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
                <td>{p.category?.name || '—'}</td>
                <td>{p.offerPercent ? `${p.offerPercent}%` : '—'}</td>
                <td>{p.location}</td>
                <td>{p.username}</td>
                <td>{p.totalRedemptions || 0}</td>
                <td className="row">
                  <button className="btn" onClick={() => resetPw(p._id)}>Reset PW</button>
                  <button className="btn" onClick={() => remove(p._id)}>Delete</button>
                </td>
              </tr>
            ))}
            {partners.length === 0 && (
              <tr><td colSpan="8" className="muted">No partners yet. Tap “Add partner”.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={open}
        title="Add partner"
        onClose={() => setOpen(false)}
        footer={
          <>
            <button className="btn" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={create} disabled={busy}>
              {busy ? 'Creating…' : 'Create partner'}
            </button>
          </>
        }
      >
        {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
        <div className="field">
          <label className="label">Partner / Brand name</label>
          <input className="input" value={form.name} onChange={set('name')} />
        </div>
        <div className="field">
          <label className="label">Business location</label>
          <input className="input" value={form.location} onChange={set('location')} />
        </div>
        <div className="grid grid-2">
          <div className="field">
            <label className="label">Category</label>
            <select className="input" value={form.category} onChange={set('category')}>
              <option value="">— Select category —</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="label">Offer % for members</label>
            <input className="input" type="number" min="0" max="100" value={form.offerPercent} onChange={set('offerPercent')} />
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
      </Modal>
    </div>
  );
}
