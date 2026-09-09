import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import { api, getToken } from '../api.js';

export default function Dashboard() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [usage, setUsage] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getToken('student')) {
      navigate('/login');
      return;
    }
    api.get('/api/students/me', 'student').then(setMe).catch((e) => {
      setError(e.message);
      if (e.status === 401) navigate('/login');
    });
    api.get('/api/students/me/usage', 'student').then(setUsage).catch(() => {});
  }, []);

  if (error) return (<><Nav /><div className="container section"><div className="alert alert-error">{error}</div></div></>);
  if (!me) return (<><Nav /><div className="container section"><p className="muted">Loading…</p></div></>);

  return (
    <>
      <Nav />
      <div className="container section">
        <h1 className="heading">Hi, {me.name || 'Student'} 👋</h1>
        <div className="row wrap mt-8">
          <span className={`pill ${me.registered ? 'pill-black' : ''}`}>
            {me.registered ? 'Active card' : 'Not activated'}
          </span>
          {me.plan && <span className="pill">{me.plan.toUpperCase()} plan</span>}
          <span className="pill">Payment: {me.paymentStatus}</span>
        </div>

        <div className="grid grid-2 mt-24">
          {/* Card */}
          <div className="card">
            <h2 className="subheading">Your card</h2>
            {me.cardUrl ? (
              <img src={me.cardUrl} alt="card" style={{ width: '100%', borderRadius: 20, marginTop: 16 }} />
            ) : (
              <div className="lime-block mt-16" style={{ padding: 40 }}>
                <div className="subheading">Student Benefit Card</div>
                <div className="display mt-16" style={{ fontSize: 34 }}>{me.cardId || 'Pending'}</div>
                <p className="body mt-8">
                  {me.registered
                    ? 'Your card is being generated.'
                    : 'Send “hi” on WhatsApp, pick a plan and pay to activate your card.'}
                </p>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="stack">
            <div className="card">
              <h2 className="subheading">Details</h2>
              <div className="mt-16">
                <Detail k="WhatsApp" v={me.phone} />
                <Detail k="Phone" v={me.altPhone || '-'} />
                <Detail k="School" v={me.school || '-'} />
                <Detail k="DOB" v={me.dob || '-'} />
                <Detail k="Card ID" v={me.cardId || '-'} />
              </div>
            </div>

            <div className="card">
              <h2 className="subheading">Your prizes</h2>
              {me.prizes?.length ? (
                <div className="mt-16 stack">
                  {me.prizes.map((p, i) => (
                    <div key={i} className="card-fog card" style={{ padding: 16 }}>
                      <b>{p.title}</b>
                      <div className="caption">{p.detail}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted body mt-8">No prizes yet. They appear here once added.</p>
              )}
            </div>
          </div>
        </div>

        {/* Usage */}
        <div className="card mt-24">
          <h2 className="subheading">Partner usage</h2>
          {usage.length ? (
            <table className="table mt-16">
              <thead>
                <tr><th>Partner</th><th>Location</th><th>Used</th></tr>
              </thead>
              <tbody>
                {usage.map((u, i) => (
                  <tr key={i}>
                    <td>{u.partner?.name}</td>
                    <td>{u.partner?.location}</td>
                    <td>{u.count} / {u.limit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted body mt-8">No redemptions yet.</p>
          )}
        </div>
      </div>
    </>
  );
}

function Detail({ k, v }) {
  return (
    <div className="row between" style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
      <span className="muted">{k}</span>
      <b>{v}</b>
    </div>
  );
}
