// Dashboard page — useEffect API fetching, dynamic summary cards (Week 2)
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

function sortNewest(bills) {
  return [...bills].sort((a, b) => {
    const da = Number(a.year) * 12 + MONTHS.indexOf(a.month);
    const db = Number(b.year) * 12 + MONTHS.indexOf(b.month);
    return db - da;
  });
}

function fmt(n) { return Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 }); }
function fmtRs(n) { return '₹' + fmt(n); }

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [bills, setBills] = useState([]);
  const [rec, setRec] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [billsRes, recRes] = await Promise.allSettled([
          api.get('/api/bills'),
          api.get('/api/bills/recommendations'),
        ]);
        if (billsRes.status === 'fulfilled') {
          setBills(billsRes.value.data || []);
        }
        if (recRes.status === 'fulfilled') {
          const r = recRes.value.data;
          setRec(typeof r === 'string' ? r : (r?.recommendation || r?.message || ''));
        }
      } catch (e) {
        setError('Could not load dashboard data.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const sorted = sortNewest(bills);
  const latest = sorted[0];
  const totalBills = bills.length;

  return (
    <div>
      <h1 className="page-title">
        Dashboard
        {user && <span style={{ fontSize: 14, fontWeight: 500, color: '#78857d', marginLeft: 10 }}>
          Hello, {user.email.split('@')[0]} 👋
        </span>}
      </h1>

      {error && <div className="auth-alert error" style={{ marginBottom: 16 }}>{error}</div>}

      {/* Summary cards */}
      <div className="summary-grid">
        <div className="card">
          <h3>Total Bills</h3>
          <h2>{loading ? '…' : totalBills}</h2>
        </div>
        <div className="card">
          <h3>Latest Units</h3>
          <h2>{loading ? '…' : (latest ? fmt(latest.unitsConsumed) + ' kWh' : '—')}</h2>
        </div>
        <div className="card">
          <h3>Latest Bill Amount</h3>
          <h2>{loading ? '…' : (latest ? fmtRs(latest.billAmount) : '—')}</h2>
        </div>
        <div className="card">
          <h3>Latest Period</h3>
          <h2 style={{ fontSize: 18 }}>{loading ? '…' : (latest ? `${latest.month} ${latest.year}` : '—')}</h2>
        </div>
      </div>

      {/* Recent bills table */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ margin: 0 }}>Recent Bills</h3>
          <button className="btn-secondary" onClick={() => navigate('/bills')} style={{ fontSize: 13 }}>
            View All →
          </button>
        </div>

        {loading ? (
          <div className="loading">Loading bills…</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Units (kWh)</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {sorted.slice(0, 5).length === 0 ? (
                <tr><td colSpan="3" className="empty-state">No bills saved yet. <a href="/add-bill" style={{ color: '#16845b' }}>Add your first bill.</a></td></tr>
              ) : (
                sorted.slice(0, 5).map((b) => (
                  <tr key={b.id}>
                    <td>{b.month} {b.year}</td>
                    <td>{fmt(b.unitsConsumed)}</td>
                    <td>{fmtRs(b.billAmount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Recommendation */}
      <div className="card">
        <h3 style={{ marginBottom: 12 }}>💡 Energy Saving Tip</h3>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: '#1c2b23', whiteSpace: 'pre-wrap' }}>
          {loading ? 'Loading recommendations…' : (rec || 'Add at least two monthly bills to get personalised recommendations.')}
        </p>
      </div>
    </div>
  );
}
