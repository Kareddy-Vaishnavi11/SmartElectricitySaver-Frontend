// Bills page — dynamic table with pagination, sorting, edit/delete modals (Week 2, 4)
import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import BillModal from '../components/BillModal';

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
const PAGE_SIZE = 8;

function sortNewest(bills) {
  return [...bills].sort((a, b) => {
    const da = Number(a.year) * 12 + MONTHS.indexOf(a.month);
    const db = Number(b.year) * 12 + MONTHS.indexOf(b.month);
    return db - da;
  });
}

function fmt(n) { return Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 }); }
function fmtRs(n) { return '₹' + fmt(n); }

export default function BillsPage() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ msg: '', type: '' });
  const [editBill, setEditBill] = useState(null);  // null = closed, object = editing
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);

  // Sort controls
  const [sortField, setSortField] = useState('date');
  const [sortAsc, setSortAsc] = useState(false);

  const notify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification({ msg: '', type: '' }), 5000);
  };

  const loadBills = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/bills');
      setBills(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      notify(e.response?.data?.message || 'Could not load bills.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBills(); }, [loadBills]);

  function sortBills(arr) {
    const sorted = [...arr].sort((a, b) => {
      if (sortField === 'date') {
        const da = Number(a.year) * 12 + MONTHS.indexOf(a.month);
        const db = Number(b.year) * 12 + MONTHS.indexOf(b.month);
        return sortAsc ? da - db : db - da;
      }
      if (sortField === 'units') return sortAsc ? a.unitsConsumed - b.unitsConsumed : b.unitsConsumed - a.unitsConsumed;
      if (sortField === 'amount') return sortAsc ? a.billAmount - b.billAmount : b.billAmount - a.billAmount;
      return 0;
    });
    return sorted;
  }

  function toggleSort(field) {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
    setPage(1);
  }

  const sorted = sortBills(bills);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function SortIcon({ field }) {
    if (sortField !== field) return <span style={{ color: '#ccc', fontSize: 11 }}> ↕</span>;
    return <span style={{ color: '#16845b', fontSize: 11 }}> {sortAsc ? '↑' : '↓'}</span>;
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this bill?')) return;
    try {
      await api.delete(`/api/bills/${id}`);
      notify('Bill deleted successfully.');
      loadBills();
    } catch (e) {
      notify(e.response?.data?.message || 'Delete failed.', 'error');
    }
  }

  function openAdd() { setEditBill(null); setShowModal(true); }
  function openEdit(bill) { setEditBill(bill); setShowModal(true); }

  async function handleSave(formData) {
    try {
      if (editBill) {
        await api.put(`/api/bills/${editBill.id}`, { ...formData, id: editBill.id });
        notify('Bill updated successfully!');
      } else {
        await api.post('/api/bills', formData);
        notify('Bill saved successfully!');
      }
      setShowModal(false);
      loadBills();
    } catch (e) {
      throw new Error(e.response?.data?.error || e.response?.data?.message || 'Save failed.');
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Bill History</h1>
        <button className="btn-primary" onClick={openAdd}>+ Add Bill</button>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading">Loading bills…</div>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th onClick={() => toggleSort('date')} style={{ cursor: 'pointer' }}>
                    Month / Year <SortIcon field="date" />
                  </th>
                  <th onClick={() => toggleSort('units')} style={{ cursor: 'pointer' }}>
                    Units (kWh) <SortIcon field="units" />
                  </th>
                  <th onClick={() => toggleSort('amount')} style={{ cursor: 'pointer' }}>
                    Bill Amount <SortIcon field="amount" />
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="empty-state">No bills found. Add your first electricity bill.</td>
                  </tr>
                ) : (
                  paginated.map((b) => (
                    <tr key={b.id}>
                      <td>{b.month} {b.year}</td>
                      <td>{fmt(b.unitsConsumed)}</td>
                      <td>{fmtRs(b.billAmount)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn-edit" onClick={() => openEdit(b)}>Edit</button>
                          <button className="btn-danger" onClick={() => handleDelete(b.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i + 1}
                    className={page === i + 1 ? 'active' : ''}
                    onClick={() => setPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
                <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>›</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add/Edit Modal (Week 4) */}
      {showModal && (
        <BillModal
          bill={editBill}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}

      {notification.msg && (
        <div className={'notification' + (notification.type === 'error' ? ' error' : '')}>
          {notification.msg}
        </div>
      )}
    </div>
  );
}
