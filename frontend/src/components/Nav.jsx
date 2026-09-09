import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getToken, clearToken } from '../api.js';

export default function Nav() {
  const navigate = useNavigate();
  const loggedIn = !!getToken('student');
  const [open, setOpen] = useState(false);

  const logout = () => {
    clearToken('student');
    setOpen(false);
    navigate('/');
  };
  const close = () => setOpen(false);

  const links = (
    <>
      <Link to="/" className="nav-link" onClick={close}>Home</Link>
      <Link to="/contact" className="nav-link" onClick={close}>Contact</Link>
      {loggedIn ? (
        <>
          <Link to="/dashboard" className="nav-link" onClick={close}>My Card</Link>
          <button className="btn" onClick={logout}>Logout</button>
        </>
      ) : (
        <>
          <Link to="/login" className="nav-link" onClick={close}>Login</Link>
          <Link to="/register" className="btn btn-primary" onClick={close}>Register</Link>
        </>
      )}
    </>
  );

  return (
    <nav className="nav">
      <div className="container nav-inner">
        <Link to="/" className="logo" onClick={close}>
          <span className="logo-mark">S</span>
          <span>SBC</span>
        </Link>

        {/* Desktop / tablet links */}
        <div className="nav-links nav-desktop">{links}</div>

        {/* Mobile burger */}
        <button
          className="burger"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && <div className="nav-overlay" onClick={close} />}
      <div className={`nav-drawer ${open ? 'open' : ''}`}>
        <div className="nav-drawer-inner">{links}</div>
      </div>
    </nav>
  );
}
