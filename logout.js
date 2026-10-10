'use strict';

// Clears session storage and redirects to the login page
function logout() {
    console.log('Logout function executed');
    sessionStorage.removeItem('ses_user');
    window.location.href = 'login.html';
}
window.logout = logout;

// Initialise logout UI and authentication guard on page load
function initLogout() {
    // If the user is not authenticated, redirect to login immediately
    if (!sessionStorage.getItem('ses_user')) {
        window.location.href = 'login.html';
        return;
    }

    const topbar = document.querySelector('.topbar');
    if (!topbar) return;

    // Prevent duplicate injection
    if (document.getElementById('userAuthProfile')) return;

    let userData = null;
    try {
        userData = JSON.parse(sessionStorage.getItem('ses_user'));
    } catch (_) {}

    const userInfo = document.createElement('div');
    userInfo.id = 'userAuthProfile';
    userInfo.style.cssText = 'display:flex;align-items:center;gap:12px;margin-left:auto;';

    if (userData && userData.email) {
        const emailBadge = document.createElement('span');
        emailBadge.textContent = '\uD83D\uDC64 ' + userData.email;
        emailBadge.style.cssText = 'font-size:12px;color:#56645b;font-weight:600;background:#f3f7f4;padding:8px 14px;border-radius:20px;border:1px solid #dce8df;display:inline-flex;align-items:center;gap:6px;';
        userInfo.appendChild(emailBadge);
    }

    const logoutBtn = document.createElement('button');
    logoutBtn.textContent = '\u23FB Logout';
    logoutBtn.style.cssText = 'padding:8px 16px;background:#fff0f0;color:#c94040;border:1px solid #f0c8c8;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;transition:background 0.2s;display:inline-flex;align-items:center;gap:6px;';
    logoutBtn.addEventListener('mouseenter', () => { logoutBtn.style.background = '#ffe5e5'; });
    logoutBtn.addEventListener('mouseleave', () => { logoutBtn.style.background = '#fff0f0'; });
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.confirm('Are you sure you want to sign out?')) {
            logout();
        }
    });
    userInfo.appendChild(logoutBtn);

    topbar.appendChild(userInfo);
}

document.addEventListener('DOMContentLoaded', initLogout);
