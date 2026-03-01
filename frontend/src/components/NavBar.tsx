import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './NavBar.css';

interface NavBarProps {
  isLoggedIn: boolean;
  onLogin: () => void;
  onLogout: () => void;
}

export const NavBar: React.FC<NavBarProps> = ({ isLoggedIn, onLogin, onLogout }) => {
  const location = useLocation();

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <span className="brand-elysium">Elysium</span>
        <span className="brand-rising">Rising</span>
      </Link>

      <div className="navbar-links">
        <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>Tower</Link>
        <Link to="/support" className={`nav-link ${location.pathname === '/support' ? 'active' : ''}`}>Support</Link>
        <Link to="/about" className={`nav-link ${location.pathname === '/about' ? 'active' : ''}`}>About</Link>
        {isLoggedIn && (
          <Link to="/profile" className={`nav-link ${location.pathname === '/profile' ? 'active' : ''}`}>Profile</Link>
        )}
      </div>

      <div className="navbar-actions">
        {isLoggedIn ? (
          <button className="nav-btn nav-btn-logout" onClick={onLogout}>Logout</button>
        ) : (
          <button className="nav-btn nav-btn-login" onClick={onLogin}>Login</button>
        )}
      </div>
    </nav>
  );
};
