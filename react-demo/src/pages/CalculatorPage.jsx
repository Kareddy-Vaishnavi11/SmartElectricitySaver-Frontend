// Appliance Calculator page (Week 2)
import { useState, useEffect } from 'react';
import api from '../api';

const COMMON = ['LED bulb','Ceiling fan','Television','Refrigerator','Air conditioner','Washing machine','Custom'];

function fmt(n) { return Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 }); }
function fmtRs(n) { return '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 }); }

export default function CalculatorPage() {
  const [form, setForm] = useState({
    applianceName: 'LED bulb',
    powerRatingWatts: '',
    dailyUsageHours: '',
    electricityRate: '7',
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [applianceList, setApplianceList] = useState({});

  // Load predefined appliances from backend on mount
  useEffect(() => {
    api.get('/api/bills/appliances')
      .then(res => setApplianceList(res.data || {}))
      .catch(() => {});
  }, []);

  // When switching to a known appliance, autofill its default watts
  function handleApplianceChange(name) {
    const defaultWatts = applianceList[name] ?? null;
    setForm(f => ({
      ...f,
      applianceName: name,
      powerRatingWatts: defaultWatts !== null ? String(defaultWatts) : '',
    }));
    setResult(null);
    setError('');
  }

  const isCustom = form.applianceName === 'Custom';

  function validate() {
    if (!form.applianceName) return 'Select an appliance.';
    const hours = Number(form.dailyUsageHours);
    if (isNaN(hours) || hours < 0 || hours > 24) return 'Daily usage must be 0–24 hours.';
    const rate = Number(form.electricityRate);
    if (isNaN(rate) || rate < 0) return 'Enter a valid electricity rate.';
    if (isCustom) {
      const watts = Number(form.powerRatingWatts);
      if (isNaN(watts) || watts <= 0) return 'Enter a valid power rating for custom appliance.';
    }
    return null;
  }

  async function handleCalculate(e) {
    e.preventDefault();
    setError('');
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);
    const body = {
      applianceName: form.applianceName,
      dailyUsageHours: Number(form.dailyUsageHours),
      electricityRate: Number(form.electricityRate),
    };
    if (form.powerRatingWatts !== '') body.powerRatingWatts = Number(form.powerRatingWatts);
    try {
      const res = await api.post('/api/bills/calculate-appliance', body);
      setResult(res.data);
    } catch (e) {
      setError(e.response?.data || e.message || 'Calculation failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">Appliance Calculator</h1>

      <div className="card" style={{ maxWidth: 520, marginBottom: 24 }}>
        <form onSubmit={handleCalculate}>
          <div className="form-group">
            <label>Appliance</label>
            <select value={form.applianceName} onChange={(e) => handleApplianceChange(e.target.value)}>
              {COMMON.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Power Rating (Watts) {!isCustom && <span style={{ color: '#78857d', fontWeight: 400 }}>(editable)</span>}</label>
            <input
              type="number"
              min="0"
              step="any"
              value={form.powerRatingWatts}
              onChange={(e) => setForm({ ...form, powerRatingWatts: e.target.value })}
              placeholder={isCustom ? 'Enter watts' : 'Optional — uses default if blank'}
              required={isCustom}
            />
          </div>

          <div className="form-group">
            <label>Daily Usage (hours)</label>
            <input
              type="number"
              min="0"
              max="24"
              step="any"
              value={form.dailyUsageHours}
              onChange={(e) => setForm({ ...form, dailyUsageHours: e.target.value })}
              placeholder="e.g. 5"
              required
            />
          </div>

          <div className="form-group">
            <label>Electricity Rate (₹/kWh)</label>
            <input
              type="number"
              min="0"
              step="any"
              value={form.electricityRate}
              onChange={(e) => setForm({ ...form, electricityRate: e.target.value })}
              placeholder="e.g. 7"
              required
            />
          </div>

          {error && <p className="form-error" style={{ marginBottom: 12 }}>{typeof error === 'string' ? error : JSON.stringify(error)}</p>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Calculating…' : 'Calculate'}
          </button>
        </form>
      </div>

      {result && (
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Result — {result.applianceName}</h3>
          <div className="result-grid">
            <div className="result-card">
              <p>Daily Consumption</p>
              <h4>{fmt(result.dailyConsumptionKwh)} kWh</h4>
            </div>
            <div className="result-card">
              <p>Monthly Consumption</p>
              <h4>{fmt(result.monthlyConsumptionKwh)} kWh</h4>
            </div>
            <div className="result-card">
              <p>Estimated Monthly Cost</p>
              <h4>{fmtRs(result.estimatedMonthlyCost)}</h4>
            </div>
          </div>
          <p style={{ fontSize: 12, color: '#78857d', marginTop: 12 }}>
            Power: {result.powerRatingWatts}W · Rate: ₹{result.electricityRate}/kWh · Type: {result.applianceType}
          </p>
        </div>
      )}
    </div>
  );
}
