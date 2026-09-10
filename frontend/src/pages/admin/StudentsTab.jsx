import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api.js';

export default function StudentsTab() {
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [prize, setPrize] = useState({ title: '', detail: '' });
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const load = () =>
    api.get('/api/students', 'admin').then((d) => setStudents(Array.isArray(d) ? d : [])).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const openStudent = async (s) => {
    setError('');
    try {
      const full = await api.get(`/api/students/${s._id}`, 'admin');
      setSelected(full);
    } catch (e) {
      setSelected(s);
    }
  };

  const addPrize = async () => {
    setError('');
    try {
      const res = await api.post(`/api/students/${selected._id}/prizes`, prize, 'admin');
      setSelected({ ...selected, prizes: res.prizes });
      setPrize({ title: '', detail: '' });
    } catch (e) {
      setError(e.message);
    }
  };

  const delPrize = async (prizeId) => {
    try {
      const res = await api.del(`/api/students/${selected._id}/prizes/${prizeId}`, 'admin');
      setSelected({ ...selected, prizes: res.prizes });
    } catch (e) {
      setError(e.message);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.phone || '').includes(q) ||
        (s.cardId || '').toLowerCase().includes(q)
    );
  }, [students, search]);

  // ---------- Detail view ----------
  if (selected) {
    return (
      <div>
        <button className="btn" onClick={() => setSelected(null)}>← Back to students</button>
        {error && <div className="alert alert-error mt-16">{error}</div>}

        <div className="page-head mt-16">
          <div>
            <h1 className="heading-sm">{selected.name || selected.phone}</h1>
            <div className="row wrap mt-8">
              <span className="pill">{selected.plan || 'no plan'}</span>
              <span className="pill">{selected.paymentStatus}</span>
              {selected.registered && <span className="pill pill-black">Active</span>}
              {selected.cardId && <span className="pill pill-black">{selected.cardId}</span>}
            </div>
          </div>
        </div>

        <div className="grid grid-2 mt-24">
          {/* Details + card */}
          <div className="stack">
            <div className="card">
              <h2 className="subheading">Details</h2>
              <div className="mt-16">
                <Detail k="Name" v={selected.name || '—'} />
                <Detail k="WhatsApp" v={selected.phone} />
                <Detail k="Email" v={selected.email || '—'} />
                <Detail k="School / Institute" v={selected.school || '—'} />
                <Detail k="Date of Birth" v={selected.dob || '—'} />
                <Detail k="Plan" v={selected.plan || '—'} />
                <Detail k="Payment" v={selected.paymentStatus} />
                <Detail k="Card ID" v={selected.cardId || '—'} />
                <Detail k="Source" v={selected.source || '—'} />
                <Detail k="Joined" v={selected.createdAt ? new Date(selected.createdAt).toLocaleString() : '—'} />
              </div>
            </div>

            {selected.cardUrl && (
              <div className="card">
                <h2 className="subheading">Card</h2>
                <img src={selected.cardUrl} alt="card" style={{ width: '100%', borderRadius: 16, marginTop: 12 }} />
              </div>
            )}
          </div>

          {/* Prizes */}
          <div className="card">
            <h2 className="subheading">Prizes</h2>
            <div className="stack mt-16">
              {(selected.prizes || []).map((p) => (
                <div className="card-fog card row between" key={p._id} style={{ padding: 12 }}>
                  <div><b>{p.title}</b><div className="caption">{p.detail}</div></div>
                  <button className="btn" onClick={() => delPrize(p._id)}>×</button>
                </div>
              ))}
              {!(selected.prizes || []).length && <p className="muted body">No prizes yet.</p>}
            </div>

            <div className="mt-24">
              <h3 className="subheading" style={{ fontSize: 18 }}>Add prize</h3>
              <div className="field mt-8">
                <label className="label">Prize title</label>
                <input className="input" value={prize.title} onChange={(e) => setPrize({ ...prize, title: e.target.value })} />
              </div>
              <div className="field">
                <label className="label">Detail</label>
                <input className="input" value={prize.detail} onChange={(e) => setPrize({ ...prize, detail: e.target.value })} />
              </div>
              <button className="btn btn-primary" onClick={addPrize} disabled={!prize.title}>Add prize</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- List view ----------
  return (
    <div>
      <h1 className="heading-sm">Students</h1>
      <p className="muted body mt-8">Registered students. Click a student to view full details and manage prizes.</p>
      {error && <div className="alert alert-error mt-16">{error}</div>}

      <div className="row wrap mt-24" style={{ gap: 12 }}>
        <input
          className="input"
          style={{ maxWidth: 340 }}
          placeholder="Search name, phone, card ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card mt-16">
        <h2 className="subheading">All students ({filtered.length})</h2>
        <table className="table mt-16">
          <thead>
            <tr><th>Name</th><th>Phone</th><th>Plan</th><th>Payment</th><th>Card</th></tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s._id} className="clickable-row" onClick={() => openStudent(s)}>
                <td><b>{s.name || '—'}</b></td>
                <td>{s.phone}</td>
                <td>{s.plan || '—'}</td>
                <td>{s.paymentStatus}</td>
                <td>{s.cardId || (s.registered ? '✓' : '—')}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan="5" className="muted">No students found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Detail({ k, v }) {
  return (
    <div className="row between" style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
      <span className="muted">{k}</span>
      <b style={{ textAlign: 'right' }}>{v}</b>
    </div>
  );
}
