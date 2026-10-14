// Login & Register page — controlled forms, validation, Auth Context (Week 3 + 5)
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';

const DEMO_ACCOUNTS = [
  { email: 'admin@smartsaver.com', password: 'admin123', name: 'Admin', role: 'ADMIN' },
  { email: 'admin@smartsaver.com', password: 'admin', name: 'Admin', role: 'ADMIN' },
];

const LS_USERS_KEY = 'ses_registered_users';

function getRegisteredUsers() {
  try {
    const raw = localStorage.getItem(LS_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRegisteredUsers(users) {
  localStorage.setItem(LS_USERS_KEY, JSON.stringify(users));
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState('login');
  const [alert, setAlert] = useState({ msg: '', type: '' });

  // Login form state
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);

  // Register form state
  const [regForm, setRegForm] = useState({ name: '', email: '', password: '' });
  const [regErrors, setRegErrors] = useState({});
  const [regLoading, setRegLoading] = useState(false);

  function showAlert(msg, type = 'success') {
    setAlert({ msg, type });
  }

  // Frontend validation for register (Week 3)
  function validateRegister() {
    const errors = {};
    if (!regForm.name.trim()) errors.name = 'Full name is required.';
    if (!regForm.email.trim()) errors.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(regForm.email)) errors.email = 'Enter a valid email.';
    if (regForm.password.length < 6) errors.password = 'Password must be at least 6 characters.';
    return errors;
  }

  async function handleLogin(e) {
    e.preventDefault();
    setAlert({ msg: '', type: '' });
    if (!loginForm.email || !loginForm.password) {
      showAlert('Please enter email and password.', 'error');
      return;
    }
    setLoginLoading(true);

    const emailTrimmed = loginForm.email.trim().toLowerCase();
    const isDemo = DEMO_ACCOUNTS.some(
      (a) => a.email.toLowerCase() === emailTrimmed && a.password === loginForm.password
    );

    try {
      const res = await api.post('/api/auth/login', {
        email: emailTrimmed,
        password: loginForm.password,
      });
      const data = res.data;
      const userData = {
        email: data.email || emailTrimmed,
        name: (data.email || emailTrimmed).split('@')[0],
        role: data.role || 'USER',
      };
      login(userData, data.token || null);
      navigate('/');
    } catch (err) {
      // If demo account, sign in immediately on backend error / offline
      if (isDemo) {
        login({ email: 'admin@smartsaver.com', name: 'Admin', role: 'ADMIN' }, null);
        navigate('/');
        return;
      }

      // Check offline registered accounts
      const localUsers = getRegisteredUsers();
      const localFound = localUsers.find(
        (u) => u.email.toLowerCase() === emailTrimmed && u.password === loginForm.password
      );
      if (localFound) {
        login(
          {
            email: localFound.email,
            name: localFound.name || localFound.email.split('@')[0],
            role: 'USER',
          },
          null
        );
        navigate('/');
        return;
      }

      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Invalid email or password. Use demo account (admin@smartsaver.com / admin123) or click Continue as Guest.';
      showAlert(msg, 'error');
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setAlert({ msg: '', type: '' });
    const errors = validateRegister();
    if (Object.keys(errors).length > 0) {
      setRegErrors(errors);
      return;
    }
    setRegErrors({});
    setRegLoading(true);

    const emailTrimmed = regForm.email.trim().toLowerCase();

    try {
      const res = await api.post('/api/auth/register', {
        email: emailTrimmed,
        password: regForm.password,
      });
      const data = res.data;
      const userData = { email: data.email || emailTrimmed, name: regForm.name.trim(), role: 'USER' };
      login(userData, data.token || null);
      navigate('/');
    } catch (err) {
      // Fallback: save to local storage if backend is offline/unreachable
      try {
        const users = getRegisteredUsers();
        if (users.some((u) => u.email.toLowerCase() === emailTrimmed)) {
          showAlert('An account with this email already exists. Please sign in.', 'error');
          setRegLoading(false);
          return;
        }
        users.push({
          name: regForm.name.trim(),
          email: emailTrimmed,
          password: regForm.password,
        });
        saveRegisteredUsers(users);
        const userData = { email: emailTrimmed, name: regForm.name.trim(), role: 'USER' };
        login(userData, null);
        navigate('/');
      } catch {
        const msg = err.response?.data?.error || err.response?.data?.message || 'Registration failed.';
        showAlert(msg, 'error');
      }
    } finally {
      setRegLoading(false);
    }
  }

  function quickFill() {
    setLoginForm({ email: 'admin@smartsaver.com', password: 'admin123' });
    showAlert('Demo credentials filled. Click Sign In.');
  }

  function handleGuestLogin() {
    login({ email: 'guest@smartsaver.com', name: 'Guest User', role: 'GUEST' }, null);
    navigate('/');
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-brand">
        <div className="auth-brand-icon">⚡</div>
        <div className="auth-brand-text">
          <h1>Smart Saver</h1>
          <p>Electricity Manager</p>
        </div>
      </div>

      <div className="auth-card">
        <div className="auth-tabs">
          <button
            className={'auth-tab' + (tab === 'login' ? ' active' : '')}
            onClick={() => { setTab('login'); setAlert({ msg: '', type: '' }); }}
          >
            Sign In
          </button>
          <button
            className={'auth-tab' + (tab === 'register' ? ' active' : '')}
            onClick={() => { setTab('register'); setAlert({ msg: '', type: '' }); }}
          >
            Register
          </button>
        </div>

        {alert.msg && (
          <div className={'auth-alert ' + alert.type}>{alert.msg}</div>
        )}

        {/* LOGIN FORM */}
        {tab === 'login' && (
          <>
            <div className="auth-header">
              <h2>Welcome Back</h2>
              <p>Sign in to access your energy tracking dashboard.</p>
            </div>

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label htmlFor="loginEmail">Email</label>
                <input
                  id="loginEmail"
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  placeholder="admin@smartsaver.com"
                  autoComplete="username"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="loginPassword">Password</label>
                <input
                  id="loginPassword"
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>
              <button type="submit" className="btn-auth-primary" disabled={loginLoading}>
                {loginLoading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            <div style={{ marginTop: 16, background: '#f5f7f5', borderRadius: 9, padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#78857d' }}>Demo Account</span>
                <button
                  onClick={quickFill}
                  style={{ fontSize: 12, padding: '4px 10px', border: '1px solid #e5ebe6', borderRadius: 6, background: 'white', cursor: 'pointer' }}
                >
                  Autofill
                </button>
              </div>
              <code style={{ fontSize: 12, color: '#1c2b23' }}>
                <strong>Email:</strong> admin@smartsaver.com<br />
                <strong>Pass:</strong> admin123
              </code>
            </div>
          </>
        )}

        {/* REGISTER FORM */}
        {tab === 'register' && (
          <>
            <div className="auth-header">
              <h2>Create Account</h2>
              <p>Join to optimize and lower your electricity consumption.</p>
            </div>

            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label htmlFor="regName">Full Name</label>
                <input
                  id="regName"
                  type="text"
                  value={regForm.name}
                  onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                  placeholder="John Doe"
                />
                {regErrors.name && <p className="form-error">{regErrors.name}</p>}
              </div>
              <div className="form-group">
                <label htmlFor="regEmail">Email Address</label>
                <input
                  id="regEmail"
                  type="email"
                  value={regForm.email}
                  onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                  placeholder="user@example.com"
                  autoComplete="email"
                />
                {regErrors.email && <p className="form-error">{regErrors.email}</p>}
              </div>
              <div className="form-group">
                <label htmlFor="regPassword">Password</label>
                <input
                  id="regPassword"
                  type="password"
                  value={regForm.password}
                  onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                />
                {regErrors.password && <p className="form-error">{regErrors.password}</p>}
              </div>
              <button type="submit" className="btn-auth-primary" disabled={regLoading}>
                {regLoading ? 'Creating account…' : 'Create Account'}
              </button>
            </form>
          </>
        )}
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <button
            type="button"
            onClick={handleGuestLogin}
            style={{
              background: 'none',
              border: 'none',
              color: '#10b981',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'underline',
              padding: '6px 12px'
            }}
          >
            Continue to Dashboard as Guest →
          </button>
        </div>
      </div>

      <p style={{ marginTop: 20, fontSize: 13, color: '#78857d' }}>
        Smart Electricity Saver · Monitor better. Save smarter.
      </p>
    </div>
  );
}
