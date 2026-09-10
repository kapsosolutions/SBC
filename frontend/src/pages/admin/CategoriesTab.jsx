import { useEffect, useState } from 'react';
import { api } from '../../api.js';

export default function CategoriesTab() {
  const [cats, setCats] = useState([]);
  const [form, setForm] = useState({ name: '', order: '' });
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () =>
    api.get('/api/categories/all', 'admin').then((d) => setCats(Array.isArray(d) ? d : [])).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const create = async () => {
    setError(''); setBusy(true);
    try {
      if (!form.name) throw new Error('Category name required');
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('order', form.order || '0');
      if (file) fd.append('image', file);
      await api.form('/api/categories', fd, 'admin');
      setForm({ name: '', order: '' });
      setFile(null);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this category? Partners in it will be uncategorised.')) return;
    try {
      await api.del(`/api/categories/${id}`, 'admin');
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div>
      <h1 className="heading-sm">Categories</h1>
      <p className="muted body mt-8">Categories group partners. Each shows a 1:1 image in the WhatsApp flow.</p>
      {error && <div className="alert alert-error mt-16">{error}</div>}

      <div className="card mt-24">
        <h2 className="subheading">Add category</h2>
        <div className="grid grid-2 mt-16">
          <div className="field">
            <label className="label">Category name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="field">
            <label className="label">Order (optional)</label>
            <input className="input" type="number" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} />
          </div>
        </div>
        <div className="field">
          <label className="label">Category image (1:1 ratio)</label>
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
        </div>
        <button className="btn btn-primary" onClick={create} disabled={busy}>
          {busy ? 'Creating…' : 'Create category'}
        </button>
      </div>

      <div className="card mt-24">
        <h2 className="subheading">All categories ({cats.length})</h2>
        <div className="grid grid-4 mt-16">
          {cats.map((c) => (
            <div className="card" key={c._id}>
              {c.imageUrl ? (
                <img src={c.imageUrl} alt={c.name} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: 16 }} />
              ) : (
                <div style={{ aspectRatio: '1/1', background: 'var(--color-fog)', borderRadius: 16, display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 28 }}>
                  {c.name?.[0] || 'C'}
                </div>
              )}
              <div className="subheading mt-16" style={{ fontSize: 18 }}>{c.name}</div>
              <button className="btn btn-block mt-8" onClick={() => remove(c._id)}>Delete</button>
            </div>
          ))}
          {cats.length === 0 && <p className="muted">No categories yet.</p>}
        </div>
      </div>
    </div>
  );
}
