import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Loader } from '../../components/Spinner.jsx';

const KEYS = ['silver', 'gold', 'platinum'];

export default function PlansTab() {
  const [plans, setPlans] = useState({});
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () =>
    api.get('/api/plans/all', 'admin').then((list) => {
      const map = {};
      for (const p of Array.isArray(list) ? list : []) map[p.key] = p;
      setPlans(map);
    }).catch((e) => setError(e.message)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const set = (key, field) => (e) => {
    const v = field === 'price' ? e.target.value : e.target.value;
    setPlans({ ...plans, [key]: { ...(plans[key] || { key }), [field]: v } });
  };

  const save = async (key) => {
    setError(''); setMsg('');
    try {
      const p = plans[key] || {};
      await api.put(`/api/plans/${key}`, {
        title: p.title || key,
        description: p.description || '',
        price: Number(p.price) || 0,
        order: KEYS.indexOf(key) + 1,
        active: p.active !== false,
      }, 'admin');
      setMsg(`${key} saved`);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div>
      <h1 className="heading-sm">Plans & prices</h1>
      <p className="muted body mt-8">These plans and prices appear in the WhatsApp flow and on the site.</p>
      {error && <div className="alert alert-error mt-16">{error}</div>}
      {msg && <div className="alert alert-ok mt-16">{msg}</div>}

      {loading && <Loader label="Loading plans…" />}

      <div className="grid grid-3 mt-24" style={{ display: loading ? 'none' : undefined }}>
        {KEYS.map((key) => {
          const p = plans[key] || { key };
          return (
            <div className="card" key={key}>
              <div className="pill pill-black">{key.toUpperCase()}</div>
              <div className="field mt-16">
                <label className="label">Title</label>
                <input className="input" value={p.title || ''} onChange={set(key, 'title')} />
              </div>
              <div className="field">
                <label className="label">Description</label>
                <input className="input" value={p.description || ''} onChange={set(key, 'description')} />
              </div>
              <div className="field">
                <label className="label">Price (₹)</label>
                <input className="input" type="number" value={p.price ?? ''} onChange={set(key, 'price')} />
              </div>
              <button className="btn btn-primary btn-block" onClick={() => save(key)}>Save</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
