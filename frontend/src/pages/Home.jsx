import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import { api, getToken } from '../api.js';

export default function Home() {
  const [plans, setPlans] = useState([]);
  const [partners, setPartners] = useState([]);
  const loggedIn = !!getToken('student');

  useEffect(() => {
    api.get('/api/plans').then((d) => setPlans(Array.isArray(d) ? d : [])).catch(() => {});
    api.get('/api/partners').then((d) => setPartners(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  return (
    <>
      <Nav />
      <div className="container">
        {/* Hero */}
        <section className="section">
          <div className="lime-block center">
            <div className="pill" style={{ background: '#00000010', borderColor: '#00000020' }}>
              Student Benefit Card
            </div>
            <h1 className="display mt-16">One card. Endless student perks.</h1>
            <p className="body mt-16" style={{ maxWidth: 620, margin: '16px auto 0' }}>
              Register on WhatsApp or here, pick a plan, and unlock exclusive offers from our
              partner network. Scan, save, repeat.
            </p>
            <div className="row center mt-24" style={{ justifyContent: 'center' }}>
              {loggedIn ? (
                <Link to="/dashboard" className="btn btn-primary">Go to my dashboard</Link>
              ) : (
                <>
                  <Link to="/register" className="btn btn-primary">Get your card</Link>
                  <Link to="/login" className="btn">I already have one</Link>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Plans */}
        <section className="section">
          <h2 className="heading">Choose your plan</h2>
          <p className="muted body mt-8">Simple pricing. Cancel anytime.</p>
          <div className="grid grid-3 mt-24">
            {plans.map((p) => (
              <div className={`card plan-card plan-${p.key}`} key={p.key}>
                <div className="plan-card-body">
                  <div className="pill pill-black">{p.title}</div>
                  <div className="display mt-16" style={{ fontSize: 44 }}>₹{p.price}</div>
                  <p className="muted body mt-8">{p.description}</p>
                  {loggedIn ? (
                    <Link to="/dashboard" className="btn btn-block mt-24">Go to dashboard</Link>
                  ) : (
                    <Link to="/register" className="btn btn-block mt-24">Select {p.title}</Link>
                  )}
                </div>
              </div>
            ))}
            {plans.length === 0 && <p className="muted">Plans loading…</p>}
          </div>
        </section>

        {/* Partners */}
        <section className="section">
          <div className="card-fog card">
            <h2 className="heading">Our partners</h2>
            <p className="muted body mt-8">Redeem your benefits across these brands.</p>
            <div className="grid grid-4 mt-24">
              {partners.map((p) => (
                <div className="card" key={p._id}>
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: 16 }}
                    />
                  ) : (
                    <div
                      style={{
                        aspectRatio: '1/1',
                        background: 'var(--color-fog)',
                        borderRadius: 16,
                        display: 'grid',
                        placeItems: 'center',
                        fontWeight: 700,
                        fontSize: 32,
                      }}
                    >
                      {p.name?.[0] || 'P'}
                    </div>
                  )}
                  <div className="subheading mt-16">{p.name}</div>
                  <div className="caption">{p.location}</div>
                </div>
              ))}
              {partners.length === 0 && <p className="muted">Partners coming soon.</p>}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="section center">
          <div className="logo" style={{ justifyContent: 'center' }}>
            <span className="logo-mark">S</span>
            <span>Student Benefit Card</span>
          </div>
          <p className="caption mt-8">
            <Link to="/admin/login">Admin</Link> · <Link to="/partner/login">Partner Login</Link>
          </p>
        </footer>
      </div>
    </>
  );
}
