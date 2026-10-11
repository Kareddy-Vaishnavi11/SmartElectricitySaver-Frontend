'use strict';

// ─── Constants ────────────────────────────────────────────────────────────────
const API_BASE = window.API_BASE || localStorage.getItem('SES_API_BASE') || 'http://localhost:5050';
const IS_DEPLOYED = !(
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
);

// ─── Offline user store (localStorage) ───────────────────────────────────────
const LS_USERS_KEY = 'ses_registered_users';

// Built-in demo account always available
const DEMO_ACCOUNTS = [
    { email: 'admin@smartsaver.com', password: 'admin123', name: 'Admin' },
    { email: 'admin@smartsaver.com', password: 'admin',    name: 'Admin' }
];

function getRegisteredUsers() {
    try {
        const raw = localStorage.getItem(LS_USERS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (_) { return []; }
}

function saveRegisteredUsers(users) {
    localStorage.setItem(LS_USERS_KEY, JSON.stringify(users));
}

// ─── Alert helpers ─────────────────────────────────────────────────────────
function showAlert(message, isError = false) {
    const el = document.getElementById('authAlert');
    if (!el) return;
    el.textContent = message;
    el.className = 'auth-alert show ' + (isError ? 'error' : 'success');
}

function hideAlert() {
    const el = document.getElementById('authAlert');
    if (!el) return;
    el.className = 'auth-alert';
}

// ─── Tab switcher ─────────────────────────────────────────────────────────────
function switchTab(mode) {
    hideAlert();
    const tabLogin    = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');
    const loginSection    = document.getElementById('loginSection');
    const registerSection = document.getElementById('registerSection');
    if (tabLogin)    tabLogin.classList.toggle('active', mode === 'login');
    if (tabRegister) tabRegister.classList.toggle('active', mode === 'register');
    if (loginSection)    loginSection.style.display    = mode === 'login'    ? 'block' : 'none';
    if (registerSection) registerSection.style.display = mode === 'register' ? 'block' : 'none';
}

// ─── Demo fill ────────────────────────────────────────────────────────────────
function quickFillAdmin() {
    const emailInput = document.getElementById('loginEmail');
    const passInput  = document.getElementById('loginPassword');
    if (emailInput) emailInput.value = 'admin@smartsaver.com';
    if (passInput)  passInput.value  = 'admin123';
    showAlert('Demo credentials filled. Click Sign In.');
}

// ─── Guest login ──────────────────────────────────────────────────────────────
function loginAsGuest(event) {
    if (event) event.preventDefault();
    const guestUser = { email: 'guest@smartsaver.com', name: 'Guest User' };
    sessionStorage.setItem('ses_user', JSON.stringify(guestUser));
    showAlert('Signed in as Guest. Opening dashboard...', false);
    setTimeout(() => { window.location.href = 'index.html'; }, 400);
}

// ─── Offline login ────────────────────────────────────────────────────────────
function offlineLogin(email, password) {
    // Check demo accounts first (no hashing needed)
    const isDemo = DEMO_ACCOUNTS.some(
        a => a.email.toLowerCase() === email.toLowerCase() && a.password === password
    );
    if (isDemo) return { email: 'admin@smartsaver.com', name: 'Admin' };

    // Check registered users (plain text stored locally — fine for demo)
    const users = getRegisteredUsers();
    const found = users.find(
        u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (!found) return null;
    return { email: found.email, name: found.name || found.email.split('@')[0] };
}

function offlineRegister(email, password, name) {
    const users = getRegisteredUsers();
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        throw new Error('An account with this email already exists. Please sign in instead.');
    }
    const newUser = { email, password, name };
    users.push(newUser);
    saveRegisteredUsers(users);
    return { email, name };
}

// ─── Real backend request (try → fallback to offline) ────────────────────────
async function sendRequest(endpoint, details) {
    // On deployed builds, skip network immediately — use offline store
    if (IS_DEPLOYED) {
        throw new Error('OFFLINE');
    }
    let response;
    try {
        response = await fetch(`${API_BASE}/api/auth/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(details)
        });
    } catch (_) {
        throw new Error('Cannot connect to backend on port 5050. Please ensure the backend server is running.');
    }
    let data;
    try   { data = await response.json(); }
    catch (_) { data = { error: `Server response status: ${response.status}` }; }
    if (!response.ok) throw new Error(data.error || data.message || 'Request failed. Please try again.');
    return data;
}

// ─── DOM ready ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
    // Show currently signed-in session info
    const savedUser = sessionStorage.getItem('ses_user');
    if (savedUser) {
        try {
            const user = JSON.parse(savedUser);
            showAlert(`Currently signed in as ${user.email}.`);
        } catch (_) { sessionStorage.removeItem('ses_user'); }
    }

    // ── Sign In form ──────────────────────────────────────────────────────
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            hideAlert();
            const emailInput  = document.getElementById('loginEmail');
            const passInput   = document.getElementById('loginPassword');
            const button      = document.getElementById('loginBtn');
            const email    = emailInput ? emailInput.value.trim() : '';
            const password = passInput  ? passInput.value         : '';
            if (!email || !password) {
                showAlert('Please enter both email and password.', true);
                return;
            }
            if (button) { button.disabled = true; button.textContent = 'Signing in...'; }

            try {
                // Try real backend first (only on localhost)
                const data = await sendRequest('login', { email, password });
                const user = {
                    email: data.email || email,
                    name:  (data.email || email).split('@')[0]
                };
                sessionStorage.setItem('ses_user', JSON.stringify(user));
                showAlert('Login successful! Opening dashboard...', false);
                setTimeout(() => { window.location.href = 'index.html'; }, 600);
            } catch (_) {
                // Offline fallback
                const user = offlineLogin(email, password);
                if (user) {
                    sessionStorage.setItem('ses_user', JSON.stringify(user));
                    showAlert('Login successful! Opening dashboard...', false);
                    setTimeout(() => { window.location.href = 'index.html'; }, 600);
                } else {
                    showAlert('Invalid email or password. Please try again, or use the Demo Account below.', true);
                    if (button) { button.disabled = false; button.textContent = 'Sign In'; }
                }
            } finally {
                // Only re-enable if we haven't redirected
                setTimeout(() => {
                    if (button) { button.disabled = false; button.textContent = 'Sign In'; }
                }, 700);
            }
        });
    }

    // ── Register form ─────────────────────────────────────────────────────
    const regForm = document.getElementById('registerForm');
    if (regForm) {
        regForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            hideAlert();
            const nameInput  = document.getElementById('regName');
            const emailInput = document.getElementById('regEmail');
            const passInput  = document.getElementById('regPassword');
            const button     = document.getElementById('regBtn');
            const name     = nameInput  ? nameInput.value.trim()  : '';
            const email    = emailInput ? emailInput.value.trim()  : '';
            const password = passInput  ? passInput.value          : '';
            if (!name)  { showAlert('Please enter your full name.', true);     return; }
            if (!email) { showAlert('Please enter your email address.', true); return; }
            if (password.length < 6) {
                showAlert('Password must contain at least 6 characters.', true);
                return;
            }
            if (button) { button.disabled = true; button.textContent = 'Creating account...'; }

            try {
                // Try real backend first (only on localhost)
                const data = await sendRequest('register', { email, password });
                sessionStorage.setItem('ses_user', JSON.stringify({
                    email: data.email || email,
                    name
                }));
                showAlert('Account created successfully! Opening dashboard...', false);
                setTimeout(() => { window.location.href = 'index.html'; }, 600);
            } catch (backendErr) {
                // Offline fallback
                try {
                    const user = offlineRegister(email, password, name);
                    sessionStorage.setItem('ses_user', JSON.stringify(user));
                    showAlert('Account created successfully! Opening dashboard...', false);
                    setTimeout(() => { window.location.href = 'index.html'; }, 600);
                } catch (offlineErr) {
                    showAlert(offlineErr.message || 'Registration failed. Please try again.', true);
                    if (button) { button.disabled = false; button.textContent = 'Create Account'; }
                }
            } finally {
                setTimeout(() => {
                    if (button) { button.disabled = false; button.textContent = 'Create Account'; }
                }, 700);
            }
        });
    }
});

// ─── Expose to inline HTML onclick handlers ───────────────────────────────────
window.switchTab    = switchTab;
window.quickFillAdmin = quickFillAdmin;
window.loginAsGuest   = loginAsGuest;
window.showAlert    = showAlert;
window.hideAlert    = hideAlert;
