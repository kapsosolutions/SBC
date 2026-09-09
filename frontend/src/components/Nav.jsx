import { Link, useNavigate } from 'react-router-dom';
import { getToken, clearToken } from '../api.js';

export default function Nav() {
  const navigate = useNavigate();
  const loggedIn = !!getToken('student');

  const logout = () => {
    clearToken('student');
    navigate('/');
  };

  return (
    <nav className="nav">
      <div className="container nav-inner">
        <Link to="/" className="logo">
          <span className="logo-mark">S</span>
          <span>SBC</span>
        </Link>
        <div className="nav-links">
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/contact" className="nav-link">Contact</Link>
          {loggedIn ? (
            <>
              <Link to="/dashboard" className="nav-link">My Card</Link>
              <button className="btn" onClick={logout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/register" className="btn">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
