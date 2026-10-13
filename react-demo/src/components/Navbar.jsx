// Reusable Navbar with navigation links and logout (Week 1 reusable components)
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import './Navbar.css';

const navItems = [
  { to: '/',               label: '⚡ Dashboard' },
  { to: '/bills',          label: '📋 Bill History' },
  { to: '/add-bill',       label: '➕ Add Bill' },
  { to: '/compare',        label: '📊 Compare' },
  { to: '/calculator',     label: '🔢 Calculator' },
  { to: '/recommendations',label: '💡 Tips' },
  { to: '/chatbot',        label: '🤖 AI Chat' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">⚡</div>
        <div>
          <h2>Smart Saver</h2>
          <p>Electricity Manager</p>
        </div>
      </div>

      <p className="nav-heading">MAIN MENU</p>
      <nav>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        {user && (
          <>
            <p className="user-email">{user.email}</p>
            <button className="logout-btn" onClick={handleLogout}>Sign Out</button>
          </>
        )}
      </div>
    </aside>
  );
}
