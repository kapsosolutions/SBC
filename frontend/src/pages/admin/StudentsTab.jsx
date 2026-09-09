import { useEffect, useState } from 'react';
import { api } from '../../api.js';

export default function StudentsTab() {
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [prize, setPrize] = useState({ title: '', detail: '' });
  const [error, setError] = useState('');

  const load = () => api.get('/api/students', 'admin').then(setStudents).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const addPrize = async () => {
    setError('');
    try {
      const res = await api.post(`/api/students/${selected._id}/prizes`, prize, 'admin');
      setSelected({ ...selected, prizes: res.prizes });
      setPrize({ title: '', detail: '' });
      load();
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

  return (
    <div>
      <h1 className="heading-sm">Students</h1>
      <p className="muted body mt-8">Registered students. Add or update prizes after successful payment.</p>
      {error && <div className="alert alert-error mt-16">{error}</div>}

      <div className="grid grid-2 mt-24">
        <div className="card">
          <h2 className="subheading">All students ({students.length})</h2>
          <table className="table mt-16">
            <thead>
              <tr><th>Name</th><th>Phone</th><th>Plan</th><th>Card</th><th></th></tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s._id}>
                  <td><b>{s.name || '—'}</b></td>
                  <td>{s.phone}</td>
                  <td>{s.plan || '—'}</td>
                  <td>{s.cardId || (s.registered ? '✓' : '—')}</td>
                  <td><button className="btn" onClick={() => setSelected(s)}>Manage</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          {selected ? (
            <>
              <h2 className="subheading">{selected.name || selected.phone}</h2>
              <div className="row wrap mt-8">
                <span className="pill">{selected.plan || 'no plan'}</span>
                <span className="pill">{selected.paymentStatus}</span>
                {selected.cardId && <span className="pill pill-black">{selected.cardId}</span>}
              </div>
              {selected.cardUrl && (
                <img src={selected.cardUrl} alt="card" style={{ width: '100%', borderRadius: 16, marginTop: 16 }} />
              )}

              <h3 className="subheading mt-24" style={{ fontSize: 18 }}>Prizes</h3>
              <div className="stack mt-8">
                {(selected.prizes || []).map((p) => (
                  <div className="card-fog card row between" key={p._id} style={{ padding: 12 }}>
                    <div><b>{p.title}</b><div className="caption">{p.detail}</div></div>
                    <button className="btn" onClick={() => delPrize(p._id)}>×</button>
                  </div>
                ))}
                {!(selected.prizes || []).length && <p className="muted body">No prizes yet.</p>}
              </div>

              <div className="mt-16">
                <div className="field">
                  <label className="label">Prize title</label>
                  <input className="input" value={prize.title} onChange={(e) => setPrize({ ...prize, title: e.target.value })} />
                </div>
                <div className="field">
                  <label className="label">Detail</label>
                  <input className="input" value={prize.detail} onChange={(e) => setPrize({ ...prize, detail: e.target.value })} />
                </div>
                <button className="btn btn-primary" onClick={addPrize} disabled={!prize.title}>Add prize</button>
              </div>
            </>
          ) : (
            <p className="muted body">Select a student to manage prizes.</p>
          )}
        </div>
      </div>
    </div>
  );
}
