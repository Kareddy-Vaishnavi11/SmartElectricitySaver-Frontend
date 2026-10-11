'use strict';

// ─── Backend detection ─────────────────────────────────────────────────────
const BACKEND_HOST = window.API_BASE || localStorage.getItem('SES_API_BASE') || 'http://localhost:5050';
const API_BASE = `${BACKEND_HOST}/api/bills`;

// Whether we are running on a deployed (non-localhost) domain.
const IS_DEPLOYED = !(
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
);

// ─── Offline (localStorage) database ──────────────────────────────────────
const LS_KEY = 'ses_cloud_bills';
const SAMPLE_BILLS = [
    { id: 1, month: 'October',   year: 2026, unitsConsumed: 180, billAmount: 1260 },
    { id: 2, month: 'September', year: 2026, unitsConsumed: 150, billAmount: 1050 },
    { id: 3, month: 'August',    year: 2026, unitsConsumed: 420, billAmount: 2940 },
    { id: 4, month: 'July',      year: 2026, unitsConsumed: 220, billAmount: 1540 }
];

let offlineMode = false; // flips to true once the first real API call fails

function lsGetBills() {
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (_) {}
    const initial = JSON.parse(JSON.stringify(SAMPLE_BILLS));
    lsSaveBills(initial);
    return initial;
}

function lsSaveBills(arr) {
    localStorage.setItem(LS_KEY, JSON.stringify(arr));
}

function lsNextId() {
    const arr = lsGetBills();
    return arr.length === 0 ? 1 : Math.max(...arr.map(b => Number(b.id))) + 1;
}

// ─── Offline CRUD helpers ──────────────────────────────────────────────────
function offlineGetAll() {
    return JSON.parse(JSON.stringify(lsGetBills()));
}

function offlineSave(bill) {
    const arr = lsGetBills();
    if (bill.id) {
        // update existing
        const idx = arr.findIndex(b => Number(b.id) === Number(bill.id));
        if (idx !== -1) { arr[idx] = { ...arr[idx], ...bill }; }
        else { arr.push(bill); }
    } else {
        bill.id = lsNextId();
        arr.push(bill);
    }
    lsSaveBills(arr);
    return JSON.parse(JSON.stringify(bill));
}

function offlineDelete(id) {
    const arr = lsGetBills().filter(b => Number(b.id) !== Number(id));
    lsSaveBills(arr);
}

function offlineCompare(month1, year1, month2, year2) {
    const arr = lsGetBills();
    const b1 = arr.find(b => b.month.toLowerCase() === month1.toLowerCase() && Number(b.year) === Number(year1));
    const b2 = arr.find(b => b.month.toLowerCase() === month2.toLowerCase() && Number(b.year) === Number(year2));
    if (!b1) throw new Error(`No bill found for ${month1} ${year1}.`);
    if (!b2) throw new Error(`No bill found for ${month2} ${year2}.`);
    const u1 = Number(b1.unitsConsumed) || 0;
    const u2 = Number(b2.unitsConsumed) || 0;
    const diff = Math.round((u2 - u1) * 100) / 100;
    let pct = 0, message = '';
    if (u1 === 0) {
        pct = u2 === 0 ? 0 : 100;
        message = u2 === 0
            ? 'Consumption stayed the same (both months are 0 units).'
            : `Consumption increased from 0 units in ${month1} ${year1} to ${u2} units in ${month2} ${year2}.`;
    } else {
        pct = Math.round(((u2 - u1) / u1) * 10000) / 100;
        if (diff > 0)      message = `Consumption increased by ${diff} units (${pct}%).`;
        else if (diff < 0) message = `Consumption decreased by ${Math.abs(diff)} units (${Math.abs(pct)}%).`;
        else               message = `Consumption stayed the same between ${month1} ${year1} and ${month2} ${year2}.`;
    }
    return {
        month1, year1: String(year1), month1Units: u1,
        month2, year2: String(year2), month2Units: u2,
        unitDifference: diff, percentageChange: pct, message
    };
}

function offlineCalculate(applianceName, powerRatingWatts, dailyUsageHours, electricityRate) {
    const PRESETS = {
        'led bulb': 9, 'ceiling fan': 75, 'television': 100,
        'refrigerator': 150, 'air conditioner': 1500, 'washing machine': 500
    };
    const key = (applianceName || '').trim().toLowerCase();
    const watts = powerRatingWatts != null ? Number(powerRatingWatts) : (PRESETS[key] || null);
    if (!watts) throw new Error('Power rating in watts is required for a custom appliance.');
    const daily   = Math.round((watts * dailyUsageHours / 1000) * 1000) / 1000;
    const monthly = Math.round(daily * 30 * 100) / 100;
    const cost    = Math.round(monthly * electricityRate * 100) / 100;
    return {
        applianceName, applianceType: PRESETS[key] ? 'Common' : 'Custom',
        powerRatingWatts: watts, dailyUsageHours, electricityRate,
        dailyConsumptionKwh: daily,
        monthlyConsumptionKwh: monthly,
        estimatedMonthlyCost: cost
    };
}

function offlineRecommendations() {
    const arr = lsGetBills();
    if (arr.length < 2) {
        return {
            status: 'INSUFFICIENT_DATA',
            totalBillsFound: arr.length,
            message: 'More monthly bill data is needed for comparison. Please add at least two monthly bills.'
        };
    }
    const MONTH_NUM = { january:1,february:2,march:3,april:4,may:5,june:6,july:7,august:8,september:9,october:10,november:11,december:12 };
    const sorted = [...arr].sort((a, b) => {
        const dy = Number(a.year) - Number(b.year);
        if (dy !== 0) return dy;
        return (MONTH_NUM[(a.month||'').toLowerCase()]||0) - (MONTH_NUM[(b.month||'').toLowerCase()]||0);
    });
    const prev = sorted[sorted.length - 2];
    const curr = sorted[sorted.length - 1];
    const pu = Number(prev.unitsConsumed) || 0;
    const cu = Number(curr.unitsConsumed) || 0;
    const diff = Math.round((cu - pu) * 100) / 100;
    let pct = pu === 0 ? (cu === 0 ? 0 : 100) : Math.round(((cu - pu) / pu) * 10000) / 100;
    let consumptionTrend, recommendation;
    if (pct > 20) {
        consumptionTrend = 'HIGH_INCREASE';
        recommendation = `High Consumption Alert: Your electricity consumption increased by ${pct}%. We recommend reducing unnecessary appliance usage, such as limiting air conditioner run-time, unplugging idle electronic devices, and using heavy appliances during off-peak hours.`;
    } else if (pct >= 1) {
        consumptionTrend = 'MODERATE_INCREASE';
        recommendation = `Moderate Increase Notice: Your electricity consumption increased slightly by ${pct}%. We suggest checking your daily appliance usage, turning off unused lights and fans, and monitoring appliance run-hours to prevent further rise in your bill.`;
    } else if (pct < 0) {
        consumptionTrend = 'DECREASED';
        recommendation = `Great Job! Your electricity consumption decreased by ${Math.abs(diff)} units (${Math.abs(pct)}%). Keep up your energy-saving habits and continue switching off appliances when not in use.`;
    } else {
        consumptionTrend = 'STABLE';
        recommendation = 'Consistent Consumption: Your electricity usage stayed approximately the same. Simple ways to reduce usage include switching to energy-efficient LED bulbs, cleaning AC and refrigerator coils, and utilizing natural daylight during the day.';
    }
    return {
        status: 'SUCCESS',
        previousMonth: `${prev.month} ${prev.year}`,
        previousUnits: pu,
        currentMonth: `${curr.month} ${curr.year}`,
        currentUnits: cu,
        unitDifference: diff,
        percentageChange: pct,
        consumptionTrend,
        recommendation
    };
}

// ─── Core API wrapper (tries real backend, falls back to offline) ──────────
async function apiRequest(url, options = {}) {
    // If we already know backend is down, skip the network call entirely.
    if (offlineMode) {
        return offlineDispatch(url, options);
    }

    let response;
    try {
        response = await fetch(url, {
            ...options,
            headers: {
                ...(options.body ? { 'Content-Type': 'application/json' } : {}),
                ...(options.headers || {})
            }
        });
    } catch (_) {
        // Network / CORS error — switch to offline mode silently on deployed builds.
        if (IS_DEPLOYED) {
            offlineMode = true;
            showOfflineBanner();
            return offlineDispatch(url, options);
        }
        throw new Error('Cannot connect to the backend. Make sure Spring Boot is running on port 5050.');
    }

    // Non-2xx → try offline on deployed builds
    if (!response.ok && IS_DEPLOYED) {
        offlineMode = true;
        showOfflineBanner();
        return offlineDispatch(url, options);
    }

    const text = await response.text();
    let data = null;
    if (text) {
        try { data = JSON.parse(text); }
        catch { data = text; }
    }

    if (!response.ok) {
        const message = data && typeof data === 'object'
            ? data.message || data.error || data.detail
            : data;
        throw new Error(message || `Request failed with status ${response.status}.`);
    }

    return data;
}

// Route an offline "request" based on URL pattern and HTTP method.
function offlineDispatch(url, options = {}) {
    const method  = (options.method || 'GET').toUpperCase();
    const body    = options.body ? JSON.parse(options.body) : null;

    // Strip query string for route matching
    const cleanUrl = url.split('?')[0];
    const qs       = url.includes('?') ? url.split('?')[1] : '';

    // GET /api/bills
    if (method === 'GET' && cleanUrl === API_BASE) {
        return offlineGetAll();
    }

    // POST /api/bills
    if (method === 'POST' && cleanUrl === API_BASE) {
        return offlineSave(body);
    }

    // PUT /api/bills/:id
    if (method === 'PUT' && cleanUrl.startsWith(API_BASE + '/')) {
        const id = cleanUrl.split('/').pop();
        body.id = Number(id);
        return offlineSave(body);
    }

    // DELETE /api/bills/:id
    if (method === 'DELETE' && cleanUrl.startsWith(API_BASE + '/')) {
        const id = cleanUrl.split('/').pop();
        offlineDelete(id);
        return null;
    }

    // GET /api/bills/compare?month1=...
    if (method === 'GET' && cleanUrl === API_BASE + '/compare') {
        const params = new URLSearchParams(qs);
        return offlineCompare(
            params.get('month1'), params.get('year1'),
            params.get('month2'), params.get('year2')
        );
    }

    // POST /api/bills/calculate-appliance
    if (method === 'POST' && cleanUrl === API_BASE + '/calculate-appliance') {
        return offlineCalculate(
            body.applianceName,
            body.powerRatingWatts != null ? body.powerRatingWatts : null,
            body.dailyUsageHours,
            body.electricityRate
        );
    }

    // GET /api/bills/recommendations
    if (method === 'GET' && cleanUrl === API_BASE + '/recommendations') {
        return offlineRecommendations();
    }

    throw new Error('Unknown API route: ' + url);
}

// ─── Offline mode banner ────────────────────────────────────────────────────
function showOfflineBanner() {
    if (document.getElementById('ses-offline-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'ses-offline-banner';
    banner.style.cssText = [
        'position:fixed;top:0;left:0;right:0;z-index:9999',
        'background:#f59e0b;color:#fff;text-align:center',
        'font-size:13px;font-weight:600;padding:8px 16px',
        'font-family:inherit;letter-spacing:0.01em'
    ].join(';');
    banner.textContent = '⚡ Running in offline demo mode — all data is saved in your browser.';
    document.body.prepend(banner);
    // push main content down a bit so it is not hidden behind banner
    const app = document.querySelector('.app, main');
    if (app) app.style.paddingTop = (parseInt(app.style.paddingTop || '0') + 38) + 'px';
}

// ─── UI helpers ─────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

let bills = [];
let notificationTimer;

const MONTHS = [
    'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December'
];

function formatRupees(value) {
    return '₹' + Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function formatNumber(value) {
    return Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
}

function showNotification(message, isError = false) {
    const notification = $('notification');
    notification.textContent = message;
    notification.classList.remove('hidden', 'error');
    if (isError) notification.classList.add('error');
    clearTimeout(notificationTimer);
    notificationTimer = setTimeout(() => notification.classList.add('hidden'), 6000);
    notification.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ─── Page routing ────────────────────────────────────────────────────────────
function showPage(sectionId) {
    document.querySelectorAll('.page-section').forEach(s => {
        s.classList.toggle('hidden', s.id !== sectionId);
    });
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.section === sectionId);
    });
    const titles = {
        dashboard: 'Dashboard', bills: 'Bill History', addBill: 'Add Electricity Bill',
        comparison: 'Monthly Comparison', calculator: 'Appliance Calculator', recommendations: 'Saving Tips'
    };
    $('pageTitle').textContent = titles[sectionId] || 'Smart Electricity Saver';
    if (sectionId === 'bills') loadBills();
    if (sectionId === 'recommendations') loadRecommendations();
}

document.querySelectorAll('[data-section]').forEach(btn =>
    btn.addEventListener('click', () => showPage(btn.dataset.section))
);
document.querySelectorAll('[data-go]').forEach(btn =>
    btn.addEventListener('click', () => showPage(btn.dataset.go))
);

// ─── Bill rendering ──────────────────────────────────────────────────────────
function sortBillsNewestFirst(records) {
    return [...records].sort((a, b) => {
        const da = Number(a.year) * 12 + MONTHS.indexOf(a.month);
        const db = Number(b.year) * 12 + MONTHS.indexOf(b.month);
        return db - da;
    });
}

function renderRecentBills(records) {
    const body = $('recentBillsBody');
    if (!records.length) {
        body.innerHTML = '<tr><td colspan="3" class="empty">No bills saved yet. Add your first bill to get started.</td></tr>';
        return;
    }
    body.innerHTML = sortBillsNewestFirst(records).slice(0, 5).map(bill => `
        <tr>
            <td>${escapeHTML(bill.month)} ${escapeHTML(String(bill.year))}</td>
            <td>${formatNumber(bill.unitsConsumed)}</td>
            <td>${formatRupees(bill.billAmount)}</td>
        </tr>
    `).join('');
}

function renderAllBills(records) {
    const body = $('allBillsBody');
    if (!records.length) {
        body.innerHTML = '<tr><td colspan="5" class="empty">No bills found. Add your first electricity bill.</td></tr>';
        return;
    }
    body.innerHTML = sortBillsNewestFirst(records).map(bill => `
        <tr>
            <td>${escapeHTML(bill.month)}</td>
            <td>${escapeHTML(String(bill.year))}</td>
            <td>${formatNumber(bill.unitsConsumed)}</td>
            <td>${formatRupees(bill.billAmount)}</td>
            <td>
                <div class="action-buttons">
                    <button type="button" class="edit-button" data-edit-id="${Number(bill.id)}">Edit</button>
                    <button type="button" class="delete-button" data-delete-id="${Number(bill.id)}">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

// ─── Load all bills ──────────────────────────────────────────────────────────
async function loadBills() {
    $('recentBillsBody').innerHTML = '<tr><td colspan="3" class="empty">Loading bills...</td></tr>';
    try {
        const data = await apiRequest(API_BASE);
        if (!Array.isArray(data)) throw new Error('The bills endpoint did not return a list.');
        bills = data;
        $('totalBills').textContent = bills.length;
        const sorted = sortBillsNewestFirst(bills);
        const latest = sorted[0];
        $('latestUnits').textContent  = latest ? formatNumber(latest.unitsConsumed) : '—';
        $('latestAmount').textContent = latest ? formatRupees(latest.billAmount)    : '—';
        $('latestPeriod').textContent = latest ? `${latest.month} ${latest.year}`   : 'No bill recorded yet';
        renderRecentBills(bills);
        renderAllBills(bills);
        return bills;
    } catch (error) {
        $('recentBillsBody').innerHTML =
            `<tr><td colspan="3" class="empty">${escapeHTML(error.message)}</td></tr>`;
        $('allBillsBody').innerHTML =
            `<tr><td colspan="5" class="empty">${escapeHTML(error.message)}</td></tr>`;
        $('totalBills').textContent = '—';
        $('latestUnits').textContent = '—';
        $('latestAmount').textContent = '—';
        $('latestPeriod').textContent = 'Unable to load data';
        showNotification(error.message, true);
    }
}

// ─── Edit / Cancel ───────────────────────────────────────────────────────────
function startEditBill(id) {
    const bill = bills.find(b => Number(b.id) === Number(id));
    if (!bill) { showNotification('Bill record not found.', true); return; }
    $('editingBillId').value = bill.id;
    $('billMonth').value     = bill.month;
    $('billYear').value      = bill.year;
    $('billUnits').value     = bill.unitsConsumed;
    $('billAmount').value    = bill.billAmount;
    $('billFormHeading').textContent    = 'Edit Electricity Bill';
    $('billFormSubheading').textContent = `Updating consumption record for ${bill.month} ${bill.year}.`;
    $('saveBillButton').textContent     = 'Update Electricity Bill';
    $('cancelEditButton').classList.remove('hidden');
    showPage('addBill');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelEditBill() {
    $('editingBillId').value = '';
    $('billForm').reset();
    $('billYear').value = new Date().getFullYear();
    $('billFormHeading').textContent    = 'Add Monthly Bill';
    $('billFormSubheading').textContent = 'Save your electricity consumption details.';
    $('saveBillButton').textContent     = 'Save Electricity Bill';
    $('cancelEditButton').classList.add('hidden');
    showPage('bills');
}

$('cancelEditButton').addEventListener('click', cancelEditBill);

// ─── CSV export ──────────────────────────────────────────────────────────────
function exportBillsToCsv() {
    if (!bills || !bills.length) {
        showNotification('No bills available to export.', true);
        return;
    }
    const sorted  = sortBillsNewestFirst(bills);
    const headers = ['Month', 'Year', 'Units Consumed (kWh)', 'Bill Amount (INR)'];
    const rows    = sorted.map(b => [
        `"${String(b.month || '').replace(/"/g, '""')}"`,
        b.year, b.unitsConsumed, b.billAmount
    ]);
    const csv  = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `electricity_bills_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification('Bill history exported to CSV successfully!');
}

const exportCsvBtn = $('exportCsvButton');
if (exportCsvBtn) exportCsvBtn.addEventListener('click', exportBillsToCsv);

// ─── Save / Update bill form ─────────────────────────────────────────────────
$('billForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const editingId = $('editingBillId').value;
    const isEditing = Boolean(editingId);
    const bill = {
        month:         $('billMonth').value,
        year:          Number($('billYear').value),
        unitsConsumed: Number($('billUnits').value),
        billAmount:    Number($('billAmount').value)
    };
    if (isEditing) bill.id = Number(editingId);

    if (!bill.month || !Number.isInteger(bill.year) || bill.year < 2000 || bill.year > 2100 ||
        !Number.isFinite(bill.unitsConsumed) || bill.unitsConsumed < 0 ||
        !Number.isFinite(bill.billAmount)    || bill.billAmount    < 0) {
        showNotification('Please enter valid bill details.', true);
        return;
    }

    const button = $('saveBillButton');
    button.disabled    = true;
    button.textContent = isEditing ? 'Updating...' : 'Saving...';

    try {
        if (isEditing) {
            try {
                await apiRequest(`${API_BASE}/${encodeURIComponent(editingId)}`, {
                    method: 'PUT', body: JSON.stringify(bill)
                });
            } catch (_) {
                await apiRequest(API_BASE, { method: 'POST', body: JSON.stringify(bill) });
            }
        } else {
            await apiRequest(API_BASE, { method: 'POST', body: JSON.stringify(bill) });
        }
        cancelEditBill();
        await loadBills();
        showNotification(isEditing ? 'Electricity bill updated successfully!' : 'Electricity bill saved successfully!');
        showPage('bills');
    } catch (error) {
        showNotification(error.message, true);
    } finally {
        button.disabled    = false;
        button.textContent = isEditing ? 'Update Electricity Bill' : 'Save Electricity Bill';
    }
});

// ─── Delete / Edit row clicks ─────────────────────────────────────────────────
$('allBillsBody').addEventListener('click', async (event) => {
    const editBtn = event.target.closest('[data-edit-id]');
    if (editBtn) { startEditBill(editBtn.dataset.editId); return; }

    const delBtn = event.target.closest('[data-delete-id]');
    if (!delBtn) return;
    const id = delBtn.dataset.deleteId;
    if (!confirm('Are you sure you want to delete this bill?')) return;
    delBtn.disabled = true;
    try {
        await apiRequest(`${API_BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
        await loadBills();
        showNotification('Bill deleted successfully.');
    } catch (error) {
        delBtn.disabled = false;
        showNotification(error.message, true);
    }
});

// ─── Month selectors ──────────────────────────────────────────────────────────
function populateMonthSelectors() {
    const currentYear  = new Date().getFullYear();
    const currentMonth = MONTHS[new Date().getMonth()];
    ['month1', 'month2'].forEach(id => {
        $(id).innerHTML = MONTHS.map(m => `<option value="${m}">${m}</option>`).join('');
    });
    $('month1').value = currentMonth === 'January' ? 'December' : MONTHS[(new Date().getMonth() + 10) % 12];
    $('month2').value = currentMonth;
    $('year1').value  = currentMonth === 'January' ? currentYear - 1 : currentYear;
    $('year2').value  = currentYear;
}

// ─── Monthly comparison ───────────────────────────────────────────────────────
$('compareForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const month1 = $('month1').value;
    const year1  = Number($('year1').value);
    const month2 = $('month2').value;
    const year2  = Number($('year2').value);
    if (![year1, year2].every(y => Number.isInteger(y) && y >= 2000 && y <= 2100)) {
        showNotification('Please enter valid years.', true);
        return;
    }
    const query = new URLSearchParams({
        month1, year1: String(year1), month2, year2: String(year2)
    });
    const resultPanel = $('comparisonResult');
    const content     = $('comparisonContent');
    resultPanel.classList.remove('hidden');
    content.textContent = 'Comparing months...';
    try {
        const result = await apiRequest(`${API_BASE}/compare?${query.toString()}`);
        content.innerHTML = `
            <div class="result-grid">
                <div class="result-card">
                    <p>${escapeHTML(result.month1)} ${escapeHTML(result.year1)}</p>
                    <h4>${formatNumber(result.month1Units)} units</h4>
                </div>
                <div class="result-card">
                    <p>${escapeHTML(result.month2)} ${escapeHTML(result.year2)}</p>
                    <h4>${formatNumber(result.month2Units)} units</h4>
                </div>
                <div class="result-card">
                    <p>Unit Difference</p>
                    <h4>${formatNumber(result.unitDifference)}</h4>
                </div>
            </div>
            <div class="result-message">
                <strong>Percentage change:</strong>
                ${formatNumber(result.percentageChange)}%
                <br><br>
                ${escapeHTML(result.message)}
            </div>
        `;
    } catch (error) {
        content.textContent = error.message;
        showNotification(error.message, true);
    }
});

// ─── Appliance calculator ─────────────────────────────────────────────────────
$('calculatorForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const applianceName  = $('applianceName').value;
    const powerRatingWatts = $('powerRating').value;
    const dailyUsageHours  = Number($('dailyHours').value);
    const electricityRate  = Number($('electricityRate').value);
    if (!applianceName ||
        !Number.isFinite(dailyUsageHours) || dailyUsageHours < 0 || dailyUsageHours > 24 ||
        !Number.isFinite(electricityRate)  || electricityRate < 0) {
        showNotification('Please enter valid appliance details.', true);
        return;
    }
    if (applianceName === 'Custom' &&
        (!powerRatingWatts || !Number.isFinite(Number(powerRatingWatts)) || Number(powerRatingWatts) <= 0)) {
        showNotification('Enter a valid power rating for a custom appliance.', true);
        return;
    }
    const requestBody = { applianceName, dailyUsageHours, electricityRate };
    if (powerRatingWatts !== '') requestBody.powerRatingWatts = Number(powerRatingWatts);
    $('calculatorResult').classList.remove('hidden');
    $('calculatorContent').textContent = 'Calculating...';
    try {
        const result = await apiRequest(`${API_BASE}/calculate-appliance`, {
            method: 'POST',
            body: JSON.stringify(requestBody)
        });
        $('calculatorContent').innerHTML = `
            <div class="result-card">
                <p>Daily Consumption</p>
                <h4>${formatNumber(result.dailyConsumptionKwh)} kWh</h4>
            </div>
            <div class="result-card">
                <p>Monthly Consumption</p>
                <h4>${formatNumber(result.monthlyConsumptionKwh)} kWh</h4>
            </div>
            <div class="result-card">
                <p>Estimated Monthly Cost</p>
                <h4>${formatRupees(result.estimatedMonthlyCost)}</h4>
            </div>
        `;
        showNotification('Appliance calculation completed.');
    } catch (error) {
        $('calculatorContent').textContent = error.message;
        showNotification(error.message, true);
    }
});

// ─── Recommendations ──────────────────────────────────────────────────────────
async function loadRecommendations() {
    $('fullRecommendation').textContent    = 'Loading recommendations...';
    $('dashboardRecommendation').textContent = 'Loading recommendations...';
    try {
        const result = await apiRequest(`${API_BASE}/recommendations`);
        const rec = typeof result === 'string'
            ? result
            : Object.entries(result || {})
                .map(([key, value]) => {
                    const label = key.replace(/([A-Z])/g, ' $1');
                    const displayLabel = label.charAt(0).toUpperCase() + label.slice(1);
                    const displayValue = value && typeof value === 'object'
                        ? JSON.stringify(value)
                        : String(value ?? '');
                    return `${displayLabel}: ${displayValue}`;
                })
                .join('\n');
        $('fullRecommendation').textContent    = rec || 'No recommendations available yet.';
        $('dashboardRecommendation').textContent = rec || 'No recommendations available yet.';
    } catch (error) {
        $('fullRecommendation').textContent    = error.message;
        $('dashboardRecommendation').textContent = error.message;
    }
}

$('refreshRecommendations').addEventListener('click', loadRecommendations);

// ─── Custom power rating toggle ───────────────────────────────────────────────
$('applianceName').addEventListener('change', () => {
    const isCustom = $('applianceName').value === 'Custom';
    $('powerRating').required    = isCustom;
    $('powerRating').placeholder = isCustom ? 'Enter custom appliance watts' : 'Optional power rating';
});

// ─── Initialise ───────────────────────────────────────────────────────────────
async function initializeApp() {
    // On deployed builds, switch to offline mode immediately so the first
    // data load does not briefly flash the "cannot connect" message.
    if (IS_DEPLOYED) {
        offlineMode = true;
        // But first try a quick ping to see if a real backend is available.
        try {
            const ctrl = new AbortController();
            const t = setTimeout(() => ctrl.abort(), 2500);
            const r = await fetch(API_BASE, { method: 'GET', signal: ctrl.signal });
            clearTimeout(t);
            if (r.ok) {
                // Real backend is reachable — use it!
                offlineMode = false;
            } else {
                showOfflineBanner();
            }
        } catch (_) {
            showOfflineBanner();
        }
    }

    $('billYear').value = new Date().getFullYear();
    populateMonthSelectors();

    await Promise.allSettled([
        loadBills(),
        loadRecommendations()
    ]);
}

initializeApp();
