// Monthly Comparison page — form + API call (Week 2)
import { useState } from 'react';
import api from '../api';

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

function fmt(n) { return Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 }); }

export default function ComparePage() {
  const now = new Date();
  const currMonth = MONTHS[now.getMonth()];
  const prevMonth = MONTHS[(now.getMonth() + 11) % 12];
  const currYear = now.getFullYear();

  const [form, setForm] = useState({
    month1: prevMonth,
    year1: prevMonth === 'December' && now.getMonth() === 0 ? currYear - 1 : currYear,
    month2: currMonth,
    year2: currYear,
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCompare(e) {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const params = new URLSearchParams({
        month1: form.month1, year1: String(form.year1),
        month2: form.month2, year2: String(form.year2),
      });
      const res = await api.get(`/api/bills/compare?${params}`);
      setResult(res.data);
    } catch (e) {
      setError(e.response?.data || e.message || 'Comparison failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">Monthly Comparison</h1>

      <div className="card" style={{ maxWidth: 560, marginBottom: 24 }}>
        <form onSubmit={handleCompare}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label>Month 1</label>
              <select value={form.month1} onChange={(e) => setForm({ ...form, month1: e.target.value })}>
                {MONTHS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Year 1</label>
              <input type="number" min="2000" max="2100" value={form.year1}
                onChange={(e) => setForm({ ...form, year1: Number(e.target.value) })} />
            </div>
            <div className="form-group">
              <label>Month 2</label>
              <select value={form.month2} onChange={(e) => setForm({ ...form, month2: e.target.value })}>
                {MONTHS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Year 2</label>
              <input type="number" min="2000" max="2100" value={form.year2}
                onChange={(e) => setForm({ ...form, year2: Number(e.target.value) })} />
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Comparing…' : 'Compare Months'}
          </button>
        </form>
      </div>

      {error && <div className="auth-alert error">{typeof error === 'string' ? error : JSON.stringify(error)}</div>}

      {result && (
        <div className="card">
          <div className="result-grid">
            <div className="result-card">
              <p>{result.month1} {result.year1}</p>
              <h4>{fmt(result.month1Units)} kWh</h4>
            </div>
            <div className="result-card">
              <p>{result.month2} {result.year2}</p>
              <h4>{fmt(result.month2Units)} kWh</h4>
            </div>
            <div className="result-card">
              <p>Unit Difference</p>
              <h4>{fmt(result.unitDifference)}</h4>
            </div>
          </div>
          <div className="result-message">
            <strong>Percentage change:</strong> {fmt(result.percentageChange)}%
            <br /><br />
            {result.message}
          </div>
        </div>
      )}
    </div>
  );
}
