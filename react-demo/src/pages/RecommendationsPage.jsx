// Recommendations page (Week 2)
import { useState, useEffect } from 'react';
import api from '../api';

export default function RecommendationsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/bills/recommendations');
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to load recommendations.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const trendColors = {
    HIGH_INCREASE: '#dc2626',
    MODERATE_INCREASE: '#d97706',
    DECREASED: '#16845b',
    STABLE: '#2563eb',
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Energy Saving Tips</h1>
        <button className="btn-secondary" onClick={load} disabled={loading}>
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
      </div>

      {loading && <div className="loading">Loading recommendations…</div>}
      {error && <div className="auth-alert error">{error}</div>}

      {!loading && data && (
        <>
          {data.status === 'INSUFFICIENT_DATA' ? (
            <div className="card">
              <p style={{ color: '#78857d', fontSize: 14 }}>
                {data.message} (Bills found: {data.totalBillsFound})
              </p>
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="summary-grid" style={{ marginBottom: 20 }}>
                <div className="card">
                  <h3>Previous Month</h3>
                  <h2 style={{ fontSize: 18 }}>{data.previousMonth}</h2>
                  <p style={{ color: '#78857d', marginTop: 4, fontSize: 13 }}>{Number(data.previousUnits || 0).toFixed(2)} kWh</p>
                </div>
                <div className="card">
                  <h3>Current Month</h3>
                  <h2 style={{ fontSize: 18 }}>{data.currentMonth}</h2>
                  <p style={{ color: '#78857d', marginTop: 4, fontSize: 13 }}>{Number(data.currentUnits || 0).toFixed(2)} kWh</p>
                </div>
                <div className="card">
                  <h3>Change</h3>
                  <h2 style={{ fontSize: 22, color: trendColors[data.consumptionTrend] || '#1c2b23' }}>
                    {data.percentageChange >= 0 ? '+' : ''}{Number(data.percentageChange || 0).toFixed(2)}%
                  </h2>
                </div>
              </div>

              {/* Recommendation box */}
              <div className="card">
                <div style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  borderRadius: 6,
                  background: trendColors[data.consumptionTrend] + '20',
                  color: trendColors[data.consumptionTrend] || '#1c2b23',
                  fontWeight: 700,
                  fontSize: 12,
                  marginBottom: 14,
                }}>
                  {data.consumptionTrend?.replace('_', ' ')}
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.7 }}>{data.recommendation}</p>
              </div>
            </>
          )}
        </>
      )}

      {/* Static tips */}
      <div className="card" style={{ marginTop: 20 }}>
        <h3 style={{ marginBottom: 14 }}>General Energy-Saving Tips</h3>
        <ul style={{ paddingLeft: 20, fontSize: 14, lineHeight: 2, color: '#1c2b23' }}>
          <li>Switch off lights and fans when leaving a room.</li>
          <li>Use energy-efficient LED bulbs (save up to 80% vs. incandescent).</li>
          <li>Set AC temperature to 24–26°C for optimal savings.</li>
          <li>Avoid leaving devices on standby — unplug chargers.</li>
          <li>Clean AC filters monthly for efficient cooling.</li>
          <li>Use washing machines with full loads.</li>
          <li>Utilize natural daylight during daytime hours.</li>
        </ul>
      </div>
    </div>
  );
}
