import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { api, getToken, clearToken } from '../../api.js';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'customers', label: 'Customers' },
  { id: 'usage', label: 'Usage' },
];

export default function PartnerPanel() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('dashboard');
  const [dash, setDash] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [usage, setUsage] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getToken('partner')) { navigate('/partner/login'); return; }
    api.get('/api/partner-panel/dashboard', 'partner').then(setDash).catch((e) => {
      setError(e.message);
      if (e.status === 401) navigate('/partner/login');
    });
  }, []);

  useEffect(() => {
    if (tab === 'customers') api.get('/api/partner-panel/customers', 'partner').then(setCustomers).catch(() => {});
    if (tab === 'usage') api.get('/api/partner-panel/usage', 'partner').then(setUsage).catch(() => {});
  }, [tab]);

  const logout = () => { clearToken('partner'); navigate('/partner/login'); };

  return (
    <div className="panel">
      <aside className="sidebar">
        <div className="logo"><span className="logo-mark">S</span><span>Partner</span></div>
        <div className="mt-24" style={{ width: '100%' }}>
          {TABS.map((t) => (
            <div key={t.id} className={`side-link ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </div>
          ))}
          <div className="side-link" onClick={logout}>Logout</div>
        </div>
      </aside>

      <main className="panel-main">
        {error && <div className="alert alert-error">{error}</div>}

        {tab === 'dashboard' && dash && (
          <div>
            <h1 className="heading-sm">{dash.partner.name}</h1>
            <p className="muted body mt-8">{dash.partner.location}</p>

            <div className="grid grid-3 mt-24">
              <Stat label="Total scans" value={dash.stats.totalScans} />
              <Stat label="Redemptions" value={dash.stats.totalRedemptions} />
              <Stat label="Customers" value={dash.stats.uniqueCustomers} />
            </div>

            <div className="grid grid-2 mt-24">
              <div className="card center">
                <h2 className="subheading">Your redeem QR</h2>
                <p className="muted body mt-8">Students scan this from “Use Card” to redeem an offer.</p>
                <div style={{ display: 'grid', placeItems: 'center', marginTop: 20 }}>
                  <div style={{ padding: 16, background: '#fff', borderRadius: 20, border: '1px solid var(--color-border)' }}>
                    <QRCodeCanvas value={dash.qrData} size={220} />
                  </div>
                </div>
                <p className="caption mt-16" style={{ wordBreak: 'break-all' }}>{dash.qrData}</p>
              </div>
              <div className="lime-block">
                <h2 className="heading-sm">How it works</h2>
                <p className="body mt-16">
                  1. Print or display this QR at your counter.<br />
                  2. A student opens “Use Card” on WhatsApp and scans it.<br />
                  3. Each student can redeem up to their limit; usage updates here live.
                </p>
              </div>
            </div>
          </div>
        )}

        {tab === 'customers' && (
          <div>
            <h1 className="heading-sm">Customers</h1>
            <div className="card mt-16">
              <table className="table">
                <thead>
                  <tr><th>Name</th><th>Phone</th><th>Card</th><th>Plan</th><th>Used</th><th>Last used</th></tr>
                </thead>
                <tbody>
                  {customers.map((c, i) => (
                    <tr key={i}>
                      <td><b>{c.name || '—'}</b></td>
                      <td>{c.phone}</td>
                      <td>{c.cardId || '—'}</td>
                      <td>{c.plan || '—'}</td>
                      <td>{c.count} / {c.limit}</td>
                      <td>{new Date(c.lastUsed).toLocaleString()}</td>
                    </tr>
                  ))}
                  {!customers.length && <tr><td colSpan="6" className="muted">No customers yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'usage' && (
          <div>
            <h1 className="heading-sm">Usage log</h1>
            <div className="card mt-16">
              <table className="table">
                <thead>
                  <tr><th>Name</th><th>Phone</th><th>Card</th><th>When</th></tr>
                </thead>
                <tbody>
                  {usage.map((u, i) => (
                    <tr key={i}>
                      <td><b>{u.name || '—'}</b></td>
                      <td>{u.phone}</td>
                      <td>{u.cardId || '—'}</td>
                      <td>{new Date(u.at).toLocaleString()}</td>
                    </tr>
                  ))}
                  {!usage.length && <tr><td colSpan="4" className="muted">No usage yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="card">
      <div className="caption">{label}</div>
      <div className="display" style={{ fontSize: 48 }}>{value}</div>
    </div>
  );
}
