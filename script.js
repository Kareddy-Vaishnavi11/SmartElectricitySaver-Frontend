const API_BASE = "http://localhost:5050/api/bills";

const $ = (id) => document.getElementById(id);

let bills = [];
let notificationTimer;

// Month names used by the comparison form.
const MONTHS = [
"January", "February", "March", "April",
"May", "June", "July", "August",
"September", "October", "November", "December"
];

// Convert a number to Indian rupee formatting.
function formatRupees(value) {
return "₹" + Number(value || 0).toLocaleString("en-IN", {
maximumFractionDigits: 2
});
}

function formatNumber(value) {
return Number(value || 0).toLocaleString("en-IN", {
maximumFractionDigits: 2
});
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

// Make a request to the existing Spring Boot backend.
async function apiRequest(url, options = {}) {
let response;

try {
    response = await fetch(url, {
        ...options,
        headers: {
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...(options.headers || {})
        }
    });
} catch (error) {
    throw new Error(
        "Cannot connect to the backend. Make sure Spring Boot is running on port 5050."
    );
}

const text = await response.text();
let data = null;

if (text) {
    try {
        data = JSON.parse(text);
    } catch {
        data = text;
    }
}

if (!response.ok) {
    const message =
        data && typeof data === "object"
            ? data.message || data.error || data.detail
            : data;

    throw new Error(message || `Request failed with status ${response.status}.`);
}

return data;

}

function showNotification(message, isError = false) {
const notification = $("notification");

notification.textContent = message;
notification.classList.remove("hidden", "error");

if (isError) {
    notification.classList.add("error");
}

clearTimeout(notificationTimer);

notificationTimer = setTimeout(() => {
    notification.classList.add("hidden");
}, 6000);

notification.scrollIntoView({ behavior: "smooth", block: "nearest" });

}

function showPage(sectionId) {
document.querySelectorAll(".page-section").forEach((section) => {
section.classList.toggle("hidden", section.id !== sectionId);
});

document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.section === sectionId);
});

const titles = {
    dashboard: "Dashboard",
    bills: "Bill History",
    addBill: "Add Electricity Bill",
    comparison: "Monthly Comparison",
    calculator: "Appliance Calculator",
    recommendations: "Saving Tips"
};

$("pageTitle").textContent = titles[sectionId] || "Smart Electricity Saver";

if (sectionId === "bills") {
    loadBills();
}

if (sectionId === "recommendations") {
    loadRecommendations();
}

}

document.querySelectorAll("[data-section]").forEach((button) => {
button.addEventListener("click", () => showPage(button.dataset.section));
});

document.querySelectorAll("[data-go]").forEach((button) => {
button.addEventListener("click", () => showPage(button.dataset.go));
});

// Sort bills by year and month, newest first.
function sortBillsNewestFirst(records) {
return [...records].sort((a, b) => {
const dateA = Number(a.year) * 12 + MONTHS.indexOf(a.month);
const dateB = Number(b.year) * 12 + MONTHS.indexOf(b.month);
return dateB - dateA;
});
}

function renderRecentBills(records) {
const body = $("recentBillsBody");

if (!records.length) {
    body.innerHTML = '<tr><td colspan="3" class="empty">No bills saved yet. Add your first bill to get started.</td></tr>';
    return;
}

body.innerHTML = sortBillsNewestFirst(records).slice(0, 5).map((bill) => `
    <tr>
        <td>${escapeHTML(bill.month)} ${escapeHTML(bill.year)}</td>
        <td>${formatNumber(bill.unitsConsumed)}</td>
        <td>${formatRupees(bill.billAmount)}</td>
    </tr>
`).join("");

}

function renderAllBills(records) {
const body = $("allBillsBody");

if (!records.length) {
    body.innerHTML = '<tr><td colspan="5" class="empty">No bills found. Add your first electricity bill.</td></tr>';
    return;
}

body.innerHTML = sortBillsNewestFirst(records).map((bill) => `
    <tr>
        <td>${escapeHTML(bill.month)}</td>
        <td>${escapeHTML(bill.year)}</td>
        <td>${formatNumber(bill.unitsConsumed)}</td>
        <td>${formatRupees(bill.billAmount)}</td>
        <td>
            <div class="action-buttons">
                <button type="button" class="edit-button" data-edit-id="${Number(bill.id)}">Edit</button>
                <button type="button" class="delete-button" data-delete-id="${Number(bill.id)}">Delete</button>
            </div>
        </td>
    </tr>
`).join("");


}

async function loadBills() {
$("recentBillsBody").innerHTML =
'<tr><td colspan="3" class="empty">Loading bills...</td></tr>';

try {
    const data = await apiRequest(API_BASE);

    if (!Array.isArray(data)) {
        throw new Error("The bills endpoint did not return a list. Check the backend response.");
    }

    bills = data;

    $("totalBills").textContent = bills.length;

    const sorted = sortBillsNewestFirst(bills);
    const latest = sorted[0];

    $("latestUnits").textContent = latest
        ? formatNumber(latest.unitsConsumed)
        : "—";

    $("latestAmount").textContent = latest
        ? formatRupees(latest.billAmount)
        : "—";

    $("latestPeriod").textContent = latest
        ? `${latest.month} ${latest.year}`
        : "No bill recorded yet";

    renderRecentBills(bills);
    renderAllBills(bills);

    return bills;
} catch (error) {
    $("recentBillsBody").innerHTML =
        `<tr><td colspan="3" class="empty">${escapeHTML(error.message)}</td></tr>`;

    $("allBillsBody").innerHTML =
        `<tr><td colspan="5" class="empty">${escapeHTML(error.message)}</td></tr>`;

    $("totalBills").textContent = "—";
    $("latestUnits").textContent = "—";
    $("latestAmount").textContent = "—";
    $("latestPeriod").textContent = "Unable to load data";

    showNotification(error.message, true);
    throw error;
}

}

// Switch form to edit mode for a specific bill.
function startEditBill(id) {
    const bill = bills.find((b) => Number(b.id) === Number(id));
    if (!bill) {
        showNotification("Bill record not found.", true);
        return;
    }

    $("editingBillId").value = bill.id;
    $("billMonth").value = bill.month;
    $("billYear").value = bill.year;
    $("billUnits").value = bill.unitsConsumed;
    $("billAmount").value = bill.billAmount;

    $("billFormHeading").textContent = "Edit Electricity Bill";
    $("billFormSubheading").textContent = `Updating consumption record for ${bill.month} ${bill.year}.`;
    $("saveBillButton").textContent = "Update Electricity Bill";
    $("cancelEditButton").classList.remove("hidden");

    showPage("addBill");
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// Reset the bill form back to add mode.
function cancelEditBill() {
    $("editingBillId").value = "";
    $("billForm").reset();
    $("billYear").value = new Date().getFullYear();
    $("billFormHeading").textContent = "Add Monthly Bill";
    $("billFormSubheading").textContent = "Save your electricity consumption details.";
    $("saveBillButton").textContent = "Save Electricity Bill";
    $("cancelEditButton").classList.add("hidden");
    showPage("bills");
}

$("cancelEditButton").addEventListener("click", cancelEditBill);

// Export all bills to CSV for download.
function exportBillsToCsv() {
    if (!bills || !bills.length) {
        showNotification("No bills available to export. Please add at least one bill.", true);
        return;
    }

    const sorted = sortBillsNewestFirst(bills);
    const headers = ["Month", "Year", "Units Consumed (kWh)", "Bill Amount (INR)"];
    const rows = sorted.map((b) => [
        `"${String(b.month || "").replace(/"/g, '""')}"`,
        b.year,
        b.unitsConsumed,
        b.billAmount
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const timestamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `electricity_bills_${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showNotification("Bill history exported to CSV successfully!");
}

const exportCsvBtn = $("exportCsvButton");
if (exportCsvBtn) {
    exportCsvBtn.addEventListener("click", exportBillsToCsv);
}

// Save or Update a monthly electricity bill.
$("billForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const editingId = $("editingBillId").value;
    const isEditing = Boolean(editingId);

    const bill = {
        month: $("billMonth").value,
        year: Number($("billYear").value),
        unitsConsumed: Number($("billUnits").value),
        billAmount: Number($("billAmount").value)
    };

    if (isEditing) {
        bill.id = Number(editingId);
    }

    if (!bill.month ||
        !Number.isInteger(bill.year) ||
        bill.year < 2000 ||
        bill.year > 2100 ||
        !Number.isFinite(bill.unitsConsumed) ||
        bill.unitsConsumed < 0 ||
        !Number.isFinite(bill.billAmount) ||
        bill.billAmount < 0) {
        showNotification("Please enter valid bill details.", true);
        return;
    }

    const button = $("saveBillButton");
    button.disabled = true;
    button.textContent = isEditing ? "Updating..." : "Saving...";

    try {
        if (isEditing) {
            // First try PUT /api/bills/{id}; if method not allowed on running instance, fall back to POST with id
            try {
                await apiRequest(`${API_BASE}/${encodeURIComponent(editingId)}`, {
                    method: "PUT",
                    body: JSON.stringify(bill)
                });
            } catch (putErr) {
                await apiRequest(API_BASE, {
                    method: "POST",
                    body: JSON.stringify(bill)
                });
            }
        } else {
            await apiRequest(API_BASE, {
                method: "POST",
                body: JSON.stringify(bill)
            });
        }

        cancelEditBill();
        await loadBills();

        showNotification(isEditing ? "Electricity bill updated successfully!" : "Electricity bill saved successfully in the database.");
        showPage("bills");
    } catch (error) {
        showNotification(error.message, true);
    } finally {
        button.disabled = false;
        button.textContent = isEditing ? "Update Electricity Bill" : "Save Electricity Bill";
    }
});

// Handle Edit or Delete clicks on bill rows.
$("allBillsBody").addEventListener("click", async (event) => {
    // 1. Edit button clicked
    const editButton = event.target.closest("[data-edit-id]");
    if (editButton) {
        const id = editButton.dataset.editId;
        startEditBill(id);
        return;
    }

    // 2. Delete button clicked
    const deleteButton = event.target.closest("[data-delete-id]");
    if (!deleteButton) return;

    const id = deleteButton.dataset.deleteId;

    if (!confirm("Are you sure you want to delete this bill?")) return;

    deleteButton.disabled = true;

    try {
        await apiRequest(`${API_BASE}/${encodeURIComponent(id)}`, {
            method: "DELETE"
        });

        await loadBills();
        showNotification("Bill deleted successfully.");
    } catch (error) {
        deleteButton.disabled = false;
        showNotification(error.message, true);
    }
});

// Populate month selectors.
function populateMonthSelectors() {
const currentYear = new Date().getFullYear();
const currentMonth = MONTHS[new Date().getMonth()];

["month1", "month2"].forEach((id) => {
    $(id).innerHTML = MONTHS.map((month) =>
        `<option value="${month}">${month}</option>`
    ).join("");
});

$("month1").value = currentMonth === "January" ? "December" : MONTHS[(new Date().getMonth() + 10) % 12];
$("month2").value = currentMonth;

$("year1").value = currentMonth === "January" ? currentYear - 1 : currentYear;
$("year2").value = currentYear;

}

// Compare two months using the existing API.
$("compareForm").addEventListener("submit", async (event) => {
event.preventDefault();

const month1 = $("month1").value;
const year1 = Number($("year1").value);
const month2 = $("month2").value;
const year2 = Number($("year2").value);

if (![year1, year2].every((year) =>
    Number.isInteger(year) && year >= 2000 && year <= 2100
)) {
    showNotification("Please enter valid years.", true);
    return;
}

const query = new URLSearchParams({
    month1,
    year1: String(year1),
    month2,
    year2: String(year2)
});

const resultPanel = $("comparisonResult");
const content = $("comparisonContent");

resultPanel.classList.remove("hidden");
content.textContent = "Comparing months...";

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

// Calculate appliance consumption using the existing backend API.
$("calculatorForm").addEventListener("submit", async (event) => {
event.preventDefault();

const applianceName = $("applianceName").value;
const powerRatingWatts = $("powerRating").value;
const dailyUsageHours = Number($("dailyHours").value);
const electricityRate = Number($("electricityRate").value);

if (!applianceName ||
    !Number.isFinite(dailyUsageHours) ||
    dailyUsageHours < 0 ||
    dailyUsageHours > 24 ||
    !Number.isFinite(electricityRate) ||
    electricityRate < 0) {
    showNotification("Please enter valid appliance details.", true);
    return;
}

if (applianceName === "Custom" &&
    (!powerRatingWatts || !Number.isFinite(Number(powerRatingWatts)) ||
     Number(powerRatingWatts) <= 0)) {
    showNotification("Enter a valid power rating for a custom appliance.", true);
    return;
}

const requestBody = {
    applianceName,
    dailyUsageHours,
    electricityRate
};

if (powerRatingWatts !== "") {
    requestBody.powerRatingWatts = Number(powerRatingWatts);
}

$("calculatorResult").classList.remove("hidden");
$("calculatorContent").textContent = "Calculating...";

try {
    // Endpoint and JSON field names match the existing backend implementation.
    const result = await apiRequest(`${API_BASE}/calculate-appliance`, {
        method: "POST",
        body: JSON.stringify(requestBody)
    });

    $("calculatorContent").innerHTML = `
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

    showNotification("Appliance calculation completed.");
} catch (error) {
    $("calculatorContent").textContent = error.message;
    showNotification(error.message, true);
}

});

// Read recommendations generated by the backend.
async function loadRecommendations() {
$("fullRecommendation").textContent = "Loading recommendations...";
$("dashboardRecommendation").textContent = "Loading recommendations...";

try {
    const result = await apiRequest(`${API_BASE}/recommendations`);

    const recommendation = typeof result === "string"
        ? result
        : Object.entries(result || {})
            .map(([key, value]) => {
                const label = key.replace(/([A-Z])/g, " $1");
                const formattedLabel = label.charAt(0).toUpperCase() + label.slice(1);
                const displayValue = value && typeof value === "object"
                    ? JSON.stringify(value)
                    : String(value ?? "");
                return `${formattedLabel}: ${displayValue}`;
            })
            .join("\n");

    $("fullRecommendation").textContent =
        recommendation || "No recommendations are available yet.";

    $("dashboardRecommendation").textContent =
        recommendation || "No recommendations are available yet.";
} catch (error) {
    const message = error.message;

    $("fullRecommendation").textContent = message;
    $("dashboardRecommendation").textContent = message;
}

}

$("refreshRecommendations").addEventListener("click", loadRecommendations);

// Show custom power rating input when Custom is selected.
$("applianceName").addEventListener("change", () => {
const isCustom = $("applianceName").value === "Custom";
$("powerRating").required = isCustom;
$("powerRating").placeholder = isCustom
? "Enter custom appliance watts"
: "Optional power rating";
});

// Initialize the application.
async function initializeApp() {
$("billYear").value = new Date().getFullYear();
populateMonthSelectors();

// Load bills and recommendations independently so one failure
// does not prevent the rest of the dashboard from initializing.
await Promise.allSettled([
    loadBills(),
    loadRecommendations()
]);

}

initializeApp();
