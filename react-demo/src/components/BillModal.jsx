// BillModal — reusable edit/add modal with form validation (Week 4)
import { useState, useEffect } from 'react';

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

export default function BillModal({ bill, onSave, onClose }) {
  const [form, setForm] = useState({
    month: bill?.month || MONTHS[new Date().getMonth()],
    year: bill?.year || new Date().getFullYear(),
    unitsConsumed: bill?.unitsConsumed ?? '',
    billAmount: bill?.billAmount ?? '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    // Prevent background scroll when modal is open
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  function validate() {
    const e = {};
    if (!form.month) e.month = 'Month is required.';
    const y = Number(form.year);
    if (!Number.isInteger(y) || y < 2000 || y > 2100) e.year = 'Enter a valid year (2000–2100).';
    const u = Number(form.unitsConsumed);
    if (isNaN(u) || u < 0) e.unitsConsumed = 'Enter a valid non-negative number.';
    const a = Number(form.billAmount);
    if (isNaN(a) || a < 0) e.billAmount = 'Enter a valid non-negative amount.';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaveError('');
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setSaving(true);
    try {
      await onSave({
        month: form.month,
        year: Number(form.year),
        unitsConsumed: Number(form.unitsConsumed),
        billAmount: Number(form.billAmount),
      });
    } catch (err) {
      setSaveError(err.message || 'Failed to save bill.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <h3>{bill ? 'Edit Electricity Bill' : 'Add Electricity Bill'}</h3>

        {saveError && <div className="auth-alert error" style={{ marginBottom: 16 }}>{saveError}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label htmlFor="m-month">Month</label>
              <select
                id="m-month"
                value={form.month}
                onChange={(e) => setForm({ ...form, month: e.target.value })}
              >
                {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              {errors.month && <p className="form-error">{errors.month}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="m-year">Year</label>
              <input
                id="m-year"
                type="number"
                min="2000"
                max="2100"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
              />
              {errors.year && <p className="form-error">{errors.year}</p>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="m-units">Units Consumed (kWh)</label>
            <input
              id="m-units"
              type="number"
              min="0"
              step="any"
              value={form.unitsConsumed}
              onChange={(e) => setForm({ ...form, unitsConsumed: e.target.value })}
              placeholder="e.g. 180"
            />
            {errors.unitsConsumed && <p className="form-error">{errors.unitsConsumed}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="m-amount">Bill Amount (₹)</label>
            <input
              id="m-amount"
              type="number"
              min="0"
              step="any"
              value={form.billAmount}
              onChange={(e) => setForm({ ...form, billAmount: e.target.value })}
              placeholder="e.g. 1260"
            />
            {errors.billAmount && <p className="form-error">{errors.billAmount}</p>}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : (bill ? 'Update Bill' : 'Save Bill')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
