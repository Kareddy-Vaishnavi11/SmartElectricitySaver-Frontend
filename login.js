'use strict';

const API_BASE = 'http://localhost:5050';

function showAlert(message, isError = false) {
    const alertEl = document.getElementById('authAlert');
    if (!alertEl) return;
    alertEl.textContent = message;
    alertEl.className = 'auth-alert show ' + (isError ? 'error' : 'success');
}

function hideAlert() {
    const alertEl = document.getElementById('authAlert');
    if (!alertEl) return;
    alertEl.className = 'auth-alert';
}

// Switch between Sign In and Register
function switchTab(mode) {
    hideAlert();

    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');
    const loginSection = document.getElementById('loginSection');
    const registerSection = document.getElementById('registerSection');

    if (tabLogin) tabLogin.classList.toggle('active', mode === 'login');
    if (tabRegister) tabRegister.classList.toggle('active', mode === 'register');

    if (loginSection) {
        loginSection.style.display = mode === 'login' ? 'block' : 'none';
    }
    if (registerSection) {
        registerSection.style.display = mode === 'register' ? 'block' : 'none';
    }
}

// Fill demo login details
function quickFillAdmin() {
    const emailInput = document.getElementById('loginEmail');
    const passInput = document.getElementById('loginPassword');
    if (emailInput) emailInput.value = 'admin@smartsaver.com';
    if (passInput) passInput.value = 'admin123';
    showAlert('Demo credentials filled. Click Sign In.');
}

// Guest login to dashboard
function loginAsGuest(event) {
    if (event) {
        event.preventDefault();
    }
    const guestUser = {
        email: 'guest@smartsaver.com',
        name: 'Guest User'
    };
    sessionStorage.setItem('ses_user', JSON.stringify(guestUser));
    showAlert('Signed in as Guest. Opening dashboard...', false);
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 400);
}

// Send request to the backend
async function sendRequest(endpoint, details) {
    let response;
    try {
        response = await fetch(`${API_BASE}/api/auth/${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(details)
        });
    } catch (err) {
        throw new Error('Cannot connect to backend on port 5050. Please ensure the backend server is running.');
    }

    let data;
    try {
        data = await response.json();
    } catch (_) {
        data = { error: `Server response status: ${response.status}` };
    }

    if (!response.ok) {
        throw new Error(data.error || data.message || 'Request failed. Please try again.');
    }

    return data;
}

// Attach event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    // Show current session if signed in
    const savedUser = sessionStorage.getItem('ses_user');
    if (savedUser) {
        try {
            const user = JSON.parse(savedUser);
            showAlert(`Currently signed in as ${user.email}.`);
        } catch (_) {
            sessionStorage.removeItem('ses_user');
        }
    }

    // Sign In form handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            hideAlert();

            const emailInput = document.getElementById('loginEmail');
            const passInput = document.getElementById('loginPassword');
            const button = document.getElementById('loginBtn');

            const email = emailInput ? emailInput.value.trim() : '';
            const password = passInput ? passInput.value : '';

            if (!email || !password) {
                showAlert('Please enter both email and password.', true);
                return;
            }

            // Support either 'admin' or 'admin123' for the demo account
            let passwordToSend = password;
            if (email.toLowerCase() === 'admin@smartsaver.com' && password === 'admin') {
                passwordToSend = 'admin123';
            }

            if (button) {
                button.disabled = true;
                button.textContent = 'Signing in...';
            }

            try {
                const data = await sendRequest('login', { email, password: passwordToSend });

                const user = {
                    email: data.email || email,
                    name: (data.email || email).split('@')[0]
                };

                sessionStorage.setItem('ses_user', JSON.stringify(user));
                showAlert('Login successful! Opening dashboard...', false);

                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 600);

            } catch (error) {
                // If backend has an error (offline, CORS, etc.) but user uses demo admin
                if (email.toLowerCase() === 'admin@smartsaver.com' &&
                    (password === 'admin' || password === 'admin123')) {

                    sessionStorage.setItem('ses_user', JSON.stringify({
                        email: 'admin@smartsaver.com',
                        name: 'admin'
                    }));
                    showAlert('Demo login successful! Opening dashboard...', false);
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 600);
                    return;
                }

                showAlert(error.message || 'Login failed. Please verify your credentials.', true);
            } finally {
                if (button) {
                    button.disabled = false;
                    button.textContent = 'Sign In';
                }
            }
        });
    }

    // Register form handler
    const regForm = document.getElementById('registerForm');
    if (regForm) {
        regForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            hideAlert();

            const nameInput = document.getElementById('regName');
            const emailInput = document.getElementById('regEmail');
            const passInput = document.getElementById('regPassword');
            const button = document.getElementById('regBtn');

            const name = nameInput ? nameInput.value.trim() : '';
            const email = emailInput ? emailInput.value.trim() : '';
            const password = passInput ? passInput.value : '';

            if (!name) {
                showAlert('Please enter your full name.', true);
                return;
            }

            if (!email) {
                showAlert('Please enter your email address.', true);
                return;
            }

            if (password.length < 6) {
                showAlert('Password must contain at least 6 characters.', true);
                return;
            }

            if (button) {
                button.disabled = true;
                button.textContent = 'Creating account...';
            }

            try {
                const data = await sendRequest('register', { email, password });

                sessionStorage.setItem('ses_user', JSON.stringify({
                    email: data.email || email,
                    name: name
                }));

                showAlert('Account created successfully! Opening dashboard...', false);

                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 600);

            } catch (error) {
                showAlert(error.message || 'Registration failed. Please try again.', true);
            } finally {
                if (button) {
                    button.disabled = false;
                    button.textContent = 'Create Account';
                }
            }
        });
    }
});

// Explicitly expose functions to window for inline HTML onclick handlers
window.switchTab = switchTab;
window.quickFillAdmin = quickFillAdmin;
window.loginAsGuest = loginAsGuest;
window.showAlert = showAlert;
window.hideAlert = hideAlert;
