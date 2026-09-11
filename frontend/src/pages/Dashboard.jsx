import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import { api, getToken } from '../api.js';

export default function Dashboard() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [usage, setUsage] = useState([]);
  const [error, setError] = useState('');
  const cardRef = useRef(null);

  useEffect(() => {
    if (!getToken('student')) {
      navigate('/login');
      return;
    }
    api.get('/api/students/me', 'student').then(setMe).catch((e) => {
      setError(e.message);
      if (e.status === 401) navigate('/login');
    });
    api.get('/api/students/me/usage', 'student').then((d) => setUsage(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const scrollToCard = () => cardRef.current?.scrollIntoView({ behavior: 'smooth' });

  if (error) return (<><Nav /><div className="container section"><div className="alert alert-error">{error}</div></div></>);
  if (!me) return (<><Nav /><div className="container section"><p className="muted">Loading…</p></div></>);

  const activated = me.registered;

  const tiles = [
    { id: 'mycard', title: 'My Card', sub: 'View your card', icon: '🪪', onClick: scrollToCard },
    { id: 'usecard', title: 'Use Card', sub: 'Scan & redeem', icon: '📲', onClick: () => navigate(`/scan?phone=${encodeURIComponent(me.phone)}`) },
    { id: 'partners', title: 'Our Partners', sub: 'Browse offers', icon: '🤝', onClick: () => navigate('/') },
    { id: 'contact', title: 'Contact', sub: 'Talk to us', icon: '📞', onClick: () => navigate('/contact') },
  ];

  const totalRedemptions = usage.reduce((s, u) => s + (u.count || 0), 0);

  return (
    <>
      <Nav />
      <div className="container section">
        <h1 className="heading">Hi, {me.name || 'Student'} 👋</h1>
        <div className="row wrap mt-8">
          <span className={`pill ${activated ? 'pill-black' : ''}`}>{activated ? 'Active card' : 'Not activated'}</span>
          {me.plan && <span className="pill">{me.plan.toUpperCase()} plan</span>}
          <span className="pill">Payment: {me.paymentStatus}</span>
          {me.cardId && <span className="pill">{me.cardId}</span>}
        </div>

        {!activated && (
          <div className="alert alert-ok mt-16">
            Your card isn’t active yet. Complete payment on WhatsApp (send “hi”) or finish registration to activate it.
          </div>
        )}

        {/* Action tiles */}
        <div className="grid grid-4 mt-24">
          {tiles.map((t) => (
            <button key={t.id} className="tile" onClick={t.onClick}>
              <span className="tile-icon">{t.icon}</span>
              <span className="tile-title">{t.title}</span>
              <span className="tile-sub">{t.sub}</span>
            </button>
          ))}
        </div>

        {/* Usage summary */}
        <div className="grid grid-3 mt-24">
          <div className="lime-block" style={{ padding: 28 }}>
            <div className="caption" style={{ color: '#000' }}>Total redemptions</div>
            <div className="display" style={{ fontSize: 48 }}>{totalRedemptions}</div>
          </div>
          <div className="card">
            <div className="caption">Partners used</div>
            <div className="display" style={{ fontSize: 48 }}>{usage.length}</div>
          </div>
          <div className="card">
            <div className="caption">Plan</div>
            <div className="display" style={{ fontSize: 40 }}>{me.plan ? me.plan.toUpperCase() : '—'}</div>
          </div>
        </div>

        {/* Card + details */}
        <div className="grid grid-2 mt-24" ref={cardRef}>
          <div className="card">
            <h2 className="subheading">Your card</h2>
            {me.cardUrl ? (
              <img src={me.cardUrl} alt="card" style={{ width: '100%', borderRadius: 20, marginTop: 16 }} />
            ) : (
              <div className="lime-block mt-16" style={{ padding: 40 }}>
                <div className="subheading">Student Benefit Card</div>
                <div className="display mt-16" style={{ fontSize: 34 }}>{me.cardId || 'Pending'}</div>
                <p className="body mt-8">{activated ? 'Your card is being generated.' : 'Activate to get your card.'}</p>
              </div>
            )}
          </div>

          <div className="stack">
            <div className="card">
              <h2 className="subheading">Details</h2>
              <div className="mt-16">
                <Detail k="WhatsApp" v={me.phone} />
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
                <p className="muted body mt-8">No prizes yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Visual usage per partner */}
        <div className="card mt-24">
          <h2 className="subheading">Partner usage</h2>
          <p className="muted body mt-8">How many times you’ve redeemed at each partner.</p>
          {usage.length ? (
            <div className="grid grid-2 mt-16">
              {usage.map((u, i) => {
                const pct = u.limit ? Math.min(100, Math.round((u.count / u.limit) * 100)) : 0;
                const full = u.count >= u.limit;
                return (
                  <div className="card" key={i} style={{ padding: 18 }}>
                    <div className="row between">
                      <div className="row" style={{ gap: 12 }}>
                        {u.partner?.imageUrl ? (
                          <img src={u.partner.imageUrl} alt="" style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--color-fog)', display: 'grid', placeItems: 'center', fontWeight: 700 }}>
                            {u.partner?.name?.[0] || 'P'}
                          </div>
                        )}
                        <div>
                          <b>{u.partner?.name || 'Partner'}</b>
                          <div className="caption">{u.partner?.location || ''}</div>
                        </div>
                      </div>
                      <span className={`pill ${full ? '' : 'pill-black'}`}>{u.count}/{u.limit}</span>
                    </div>
                    <div className="progress mt-16">
                      <div className="progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="caption mt-8">
                      {full ? 'Limit reached' : `${u.limit - u.count} redemption${u.limit - u.count === 1 ? '' : 's'} left`}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="muted body mt-16">No redemptions yet. Tap “Use Card” to scan a partner QR.</p>
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
