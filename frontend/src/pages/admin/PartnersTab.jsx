import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api.js';
import Modal from '../../components/Modal.jsx';
import ImageUpload from '../../components/ImageUpload.jsx';

const DEFAULT_PW = 'Sbc@1234';

function EyeIcon({ off }) {
  return off ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

export default function PartnersTab() {
  const [partners, setPartners] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', location: '', category: '', offerPercent: '', password: DEFAULT_PW });
  const [showFormPw, setShowFormPw] = useState(false);
  const [file, setFile] = useState(null);
  const [open, setOpen] = useState(false);
  const [creds, setCreds] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [revealId, setRevealId] = useState(null);

  const load = () =>
    api.get('/api/partners/all', 'admin').then((d) => setPartners(Array.isArray(d) ? d : [])).catch((e) => setError(e.message));
  useEffect(() => {
    load();
    api.get('/api/categories/all', 'admin').then((d) => setCategories(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const openAdd = () => {
    setForm({ name: '', description: '', location: '', category: '', offerPercent: '', password: DEFAULT_PW });
    setShowFormPw(false);
    setFile(null);
    setError('');
    setOpen(true);
  };

  const create = async () => {
    setError(''); setBusy(true);
    try {
      if (!form.name) throw new Error('Partner name required');
      if (!form.password || form.password.length < 4) throw new Error('Password must be at least 4 characters');
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('description', form.description);
      fd.append('location', form.location);
      fd.append('category', form.category);
      fd.append('offerPercent', form.offerPercent || '0');
      fd.append('password', form.password);
      if (file) fd.append('image', file);
      const data = await api.form('/api/partners', fd, 'admin');
      setCreds(data);
      setOpen(false);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this partner permanently? Their logo will also be removed.')) return;
    try {
      await api.del(`/api/partners/${id}`, 'admin');
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return partners.filter((p) => {
      if (filterCat && String(p.category?._id || p.category || '') !== filterCat) return false;
      if (!s) return true;
      return (
        (p.name || '').toLowerCase().includes(s) ||
        (p.username || '').toLowerCase().includes(s) ||
        (p.location || '').toLowerCase().includes(s)
      );
    });
  }, [partners, search, filterCat]);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="heading-sm">Partners</h1>
          <p className="muted body mt-8">A login username & password are set for each partner.</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add partner</button>
      </div>

      {error && !open && <div className="alert alert-error mt-16">{error}</div>}
      {creds && (
        <div className="alert alert-ok mt-16">
          <b>Partner created.</b> Username: <b>{creds.username}</b> &nbsp; Password: <b>{creds.password}</b> &nbsp;(login at <b>/partner/login</b>)
        </div>
      )}

      {/* Search + filter */}
      <div className="row wrap mt-24" style={{ gap: 12 }}>
        <input
          className="input"
          style={{ maxWidth: 320 }}
          placeholder="Search name, username, location…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input" style={{ maxWidth: 240 }} value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="card mt-16">
        <h2 className="subheading">Partners ({filtered.length})</h2>
        <table className="table mt-16">
          <thead>
            <tr><th>Logo</th><th>Name</th><th>Category</th><th>Offer</th><th>Location</th><th>Username</th><th>Password</th><th>Scans</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
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
                <td>
                  <span className="row" style={{ gap: 6 }}>
                    <span style={{ fontFamily: 'monospace' }}>
                      {revealId === p._id ? (p.plainPasswordHint || '—') : '••••••'}
                    </span>
                    <button
                      className="icon-btn"
                      title={revealId === p._id ? 'Hide' : 'Show'}
                      onClick={() => setRevealId(revealId === p._id ? null : p._id)}
                    >
                      <EyeIcon off={revealId === p._id} />
                    </button>
                  </span>
                </td>
                <td>{p.totalRedemptions || 0}</td>
                <td>
                  <button className="icon-btn danger" title="Delete partner" onClick={() => remove(p._id)}>
                    <TrashIcon />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan="9" className="muted">No partners found.</td></tr>
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
          <label className="label">Login password</label>
          <div className="input-eye">
            <input
              className="input"
              type={showFormPw ? 'text' : 'password'}
              value={form.password}
              onChange={set('password')}
            />
            <button type="button" className="icon-btn eye-inside" onClick={() => setShowFormPw((v) => !v)} title={showFormPw ? 'Hide' : 'Show'}>
              <EyeIcon off={showFormPw} />
            </button>
          </div>
          <div className="caption">Default is <b>{DEFAULT_PW}</b> — change it if you like.</div>
        </div>
        <div className="field">
          <label className="label">Description</label>
          <input className="input" value={form.description} onChange={set('description')} />
        </div>
        <div className="field">
          <label className="label">Logo / image (1:1 ratio)</label>
          <ImageUpload file={file} onChange={setFile} aspect="1/1" hint="PNG or JPG, 1:1 ratio" />
        </div>
      </Modal>
    </div>
  );
}
