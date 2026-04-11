import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { LogOut, Laptop, ShieldCheck, Wrench, Users, Package, History, FileText, BarChart2, Bell, Truck, Download } from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import './index.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const API = 'http://localhost:5000/api';

// ============================================================
// PAGINATION COMPONENT
// ============================================================
function Pagination({ total, page, perPage, onPage }) {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between" style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
      <span>Showing {Math.min((page-1)*perPage+1, total)}–{Math.min(page*perPage, total)} of {total}</span>
      <div className="flex gap-2">
        <button onClick={() => onPage(page-1)} disabled={page===1} className="btn btn-outline" style={{ padding: '0.3rem 0.8rem' }} aria-label="Previous page">← Prev</button>
        {Array.from({length: totalPages}, (_,i) => i+1).map(p => (
          <button key={p} onClick={() => onPage(p)} className={`btn ${p===page ? 'btn-primary' : 'btn-outline'}`} style={{ padding: '0.3rem 0.7rem' }} aria-label={`Page ${p}`} aria-current={p===page ? 'page' : undefined}>{p}</button>
        ))}
        <button onClick={() => onPage(page+1)} disabled={page===totalPages} className="btn btn-outline" style={{ padding: '0.3rem 0.8rem' }} aria-label="Next page">Next →</button>
      </div>
    </div>
  );
}

// Excel export helper
const exportExcel = (url) => { window.open(`${API}${url}`, '_blank'); };

// ============================================================
// LAYOUT
// ============================================================
function Layout({ user, onLogout, currency, setCurrency, children }) {
  const navigate = useNavigate();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header>
        <nav className="glass-panel" role="navigation" aria-label="Main navigation" style={{ padding: '1rem 2rem', borderBottomRightRadius: 0, borderBottomLeftRadius: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="flex items-center gap-2">
            <Laptop size={30} aria-hidden="true" style={{ color: 'var(--accent-blue)' }} />
            <span className="text-xl text-gradient" style={{ fontWeight: 700 }}>Laptop Doctor Ltd – SLR</span>
          </div>
          <div className="flex items-center gap-4" style={{ flexWrap: 'wrap' }}>
            {/* Currency Toggle */}
            <div className="flex gap-1 glass-panel" style={{ padding: '0.25rem', borderRadius: '8px' }}>
              <button onClick={() => setCurrency('USD')} className={`btn ${currency === 'USD' ? 'btn-primary' : ''}`} style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>USD</button>
              <button onClick={() => setCurrency('RWF')} className={`btn ${currency === 'RWF' ? 'btn-primary' : ''}`} style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>RWF</button>
            </div>
            {user && (
              <div className="flex items-center gap-4">
                <span className="text-gray text-sm">👤 {user.name} <em>({user.role})</em></span>
                <button onClick={() => { onLogout(); navigate('/'); }} className="btn btn-outline" style={{ padding: '0.5rem 1rem' }} aria-label="Logout">
                  <LogOut size={16} aria-hidden="true" /> Logout
                </button>
              </div>
            )}
          </div>
        </nav>
      </header>
      <main id="main-content" className="container animate-slide-up" style={{ flexGrow: 1, padding: '2rem' }}>
        {children}
      </main>
      <footer style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem', borderTop: '1px solid var(--panel-border)' }}>
        © {new Date().getFullYear()} Laptop Doctor Ltd – Smart Laptop Repair System
      </footer>
    </div>
  );
}

// Currency settings
const RATE = 1250; // 1 USD = 1250 RWF
const fmt = (val, cur) => {
  if (!val) val = 0;
  if (cur === 'RWF') return `${Math.round(val * RATE).toLocaleString()} RWF`;
  return `$${val.toFixed(2)}`;
};
const toBase = (val, cur) => (cur === 'RWF' ? val / RATE : val);
const fromBase = (val, cur) => (cur === 'RWF' ? Math.round(val * RATE) : val);

// ============================================================
// LOGIN
// ============================================================
function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${API}/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        onLogin(data.user);
        if (data.user.role === 'customer') navigate('/customer');
        else if (data.user.role === 'technician') navigate('/technician');
        else navigate('/admin');
      } else setError(data.error);
    } catch { setError('Cannot connect to server. Please ensure the backend is running.'); }
  };

  return (
    <div className="flex items-center justify-center" style={{ minHeight: '80vh' }}>
      <div className="glass-panel" style={{ padding: '3rem', width: '100%', maxWidth: '420px' }}>
        <h1 className="text-2xl text-center text-gradient" style={{ marginBottom: '0.5rem' }}>Welcome Back</h1>
        <p className="text-gray text-sm text-center" style={{ marginBottom: '2rem' }}>Login to your SLR account</p>
        {error && <div role="alert" className="error-banner">{error}</div>}
        <form onSubmit={handleLogin} className="flex-col gap-4" noValidate>
          <div className="form-group">
            <label htmlFor="login-email">Email address</label>
            <input id="login-email" type="email" placeholder="e.g., admin@slr.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <input id="login-password" type="password" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>Login</button>
        </form>
        <p className="text-sm text-center" style={{ marginTop: '1.5rem', color: 'var(--text-secondary)' }}>
          New customer?{' '}
          <button onClick={() => navigate('/register')} className="link-btn">Create an account</button>
        </p>
        <details style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <summary style={{ cursor: 'pointer' }}>Demo accounts (click to show)</summary>
          <ul style={{ paddingLeft: '1rem', marginTop: '0.5rem', lineHeight: '2' }}>
            <li>Admin: admin@slr.com / admin123</li>
            <li>Technician: tech@slr.com / tech123</li>
            <li>Customer: customer@slr.com / client123</li>
          </ul>
        </details>
      </div>
    </div>
  );
}

// ============================================================
// REGISTER
// ============================================================
function Register({ onLogin }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Passwords do not match.');
    if (form.password.length < 6) return setError('Password must be at least 6 characters.');
    try {
      const res = await fetch(`${API}/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password })
      });
      const data = await res.json();
      if (res.ok) { onLogin(data.user); navigate('/customer'); }
      else setError(data.error);
    } catch { setError('Cannot connect to server.'); }
  };

  return (
    <div className="flex items-center justify-center" style={{ minHeight: '80vh' }}>
      <div className="glass-panel" style={{ padding: '3rem', width: '100%', maxWidth: '420px' }}>
        <h1 className="text-2xl text-center text-gradient" style={{ marginBottom: '0.5rem' }}>Create Account</h1>
        <p className="text-gray text-sm text-center" style={{ marginBottom: '2rem' }}>Register to track your laptop repairs</p>
        {error && <div role="alert" className="error-banner">{error}</div>}
        <form onSubmit={handleRegister} className="flex-col gap-4" noValidate>
          <div className="form-group">
            <label htmlFor="reg-name">Full Name</label>
            <input id="reg-name" type="text" placeholder="e.g., John Smith" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required autoComplete="name" />
          </div>
          <div className="form-group">
            <label htmlFor="reg-email">Email address</label>
            <input id="reg-email" type="email" placeholder="e.g., john@email.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required autoComplete="email" />
          </div>
          <div className="form-group">
            <label htmlFor="reg-password">Password</label>
            <input id="reg-password" type="password" placeholder="At least 6 characters" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required autoComplete="new-password" />
          </div>
          <div className="form-group">
            <label htmlFor="reg-confirm">Confirm Password</label>
            <input id="reg-confirm" type="password" placeholder="Repeat your password" value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} required autoComplete="new-password" />
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>Register</button>
        </form>
        <p className="text-sm text-center" style={{ marginTop: '1.5rem', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <button onClick={() => navigate('/')} className="link-btn">Login</button>
        </p>
      </div>
    </div>
  );
}

// ============================================================
// CUSTOMER PORTAL
// ============================================================
function CustomerPortal({ user, currency }) {
  const [repairs, setRepairs] = useState([]);
  const [model, setModel] = useState('');
  const [desc, setDesc] = useState('');
  const [tab, setTab] = useState('active');
  const [invoiceRepair, setInvoiceRepair] = useState(null);
  const [search, setSearch] = useState('');

  const loadRepairs = async () => {
    try {
      const res = await fetch(`${API}/repairs?customer_id=${user.id}`);
      const data = await res.json();
      setRepairs(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); setRepairs([]); }
  };
  useEffect(() => { loadRepairs(); }, []);

  const reportProblem = async (e) => {
    e.preventDefault();
    await fetch(`${API}/repairs`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_id: user.id, device_model: model, problem_description: desc })
    });
    setModel(''); setDesc(''); loadRepairs(); setTab('active');
  };

  const activeRepairs = repairs.filter(r => r.status !== 'Completed' && r.status !== 'Cancelled');
  const history = repairs.filter(r => r.status === 'Completed' || r.status === 'Cancelled');
  const filtered = (tab === 'active' ? activeRepairs : history).filter(r =>
    r.device_model.toLowerCase().includes(search.toLowerCase()) ||
    r.problem_description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-col gap-6">
      <h2 className="text-2xl text-gradient">Customer Portal</h2>

      {/* Report Problem */}
      <section className="glass-panel" style={{ padding: '2rem' }} aria-label="Report a new problem">
        <h2 className="text-xl" style={{ marginBottom: '1.5rem' }}>Report a Problem</h2>
        <form onSubmit={reportProblem} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '180px' }}>
            <label htmlFor="report-model">Device Model</label>
            <input id="report-model" placeholder="e.g. Dell XPS 15" value={model} onChange={e => setModel(e.target.value)} required />
          </div>
          <div className="form-group" style={{ flex: 2, minWidth: '220px' }}>
            <label htmlFor="report-desc">Describe the Problem</label>
            <input id="report-desc" placeholder="e.g., Screen blank and overheating" value={desc} onChange={e => setDesc(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary">Submit Ticket</button>
        </form>
      </section>

      {/* Tabs: Active & History */}
      <section className="glass-panel" style={{ padding: '2rem' }} aria-label="Repair tracker">
        <div className="flex items-center justify-between" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div role="tablist" className="flex gap-2">
            <button role="tab" aria-selected={tab === 'active'} onClick={() => setTab('active')} className={`btn ${tab === 'active' ? 'btn-primary' : 'btn-outline'}`} style={{ padding: '0.5rem 1.2rem' }}>
              <Wrench size={14} aria-hidden="true" /> Active Repairs
            </button>
            <button role="tab" aria-selected={tab === 'history'} onClick={() => setTab('history')} className={`btn ${tab === 'history' ? 'btn-primary' : 'btn-outline'}`} style={{ padding: '0.5rem 1.2rem' }}>
              <History size={14} aria-hidden="true" /> Repair History
            </button>
          </div>
          <div className="form-group" style={{ minWidth: '220px', marginBottom: 0 }}>
            <label htmlFor="customer-search" className="sr-only">Search repairs</label>
            <input id="customer-search" placeholder="🔍 Search by device or problem..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div role="tabpanel">
          {tab === 'history' && history.length === 0 ? (
            <p className="text-gray">No completed repairs yet.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th scope="col">Device</th>
                  <th scope="col">Issue</th>
                  <th scope="col">Status</th>
                  <th scope="col">Cost</th>
                  <th scope="col">Technician Notes</th>
                  {tab === 'history' && <th scope="col">Invoice</th>}
                </tr>
              </thead>
              <tbody>
                {(filtered || []).map(r => (
                  <tr key={r.id}>
                    <td>{r.device_model}</td>
                    <td>{r.problem_description}</td>
                    <td><span className={`badge badge-${r.status?.toLowerCase() || 'pending'}`}>{r.status}</span></td>
                    <td>{fmt(r.cost, currency)}</td>
                    <td className="text-gray">{r.notes || '—'}</td>
                    {tab === 'history' && (
                      <td>
                        <button onClick={() => setInvoiceRepair(r)} className="btn btn-outline" style={{ padding: '0.3rem 0.8rem' }} aria-label={`View invoice for ${r.device_model}`}>
                          <FileText size={14} aria-hidden="true" /> Invoice
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan="6" className="text-gray">No repairs found.</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Invoice Modal */}
      {invoiceRepair && <InvoiceModal repair={invoiceRepair} onClose={() => setInvoiceRepair(null)} currency={currency} />}
    </div>
  );
}

// ============================================================
// INVOICE MODAL
// ============================================================
function InvoiceModal({ repair, onClose, currency }) {
  return (
    <div role="dialog" aria-modal="true" aria-label="Repair Invoice" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
      <div className="glass-panel" style={{ padding: '2.5rem', maxWidth: '500px', width: '90%' }} id="invoice-print">
        <div className="flex items-center justify-between" style={{ marginBottom: '1.5rem' }}>
          <div>
            <h2 className="text-xl text-gradient">Laptop Doctor Ltd</h2>
            <p className="text-gray text-sm">Official Repair Invoice</p>
          </div>
          <Laptop size={40} style={{ color: 'var(--accent-blue)' }} aria-hidden="true" />
        </div>
        <hr style={{ borderColor: 'var(--panel-border)', marginBottom: '1.5rem' }} />
        <table>
          <tbody>
            <tr><td style={{ fontWeight: 600, paddingRight: '1rem' }}>Invoice #</td><td>SLR-{String(repair.id).padStart(4, '0')}</td></tr>
            <tr><td style={{ fontWeight: 600 }}>Device</td><td>{repair.device_model}</td></tr>
            <tr><td style={{ fontWeight: 600 }}>Issue</td><td>{repair.problem_description}</td></tr>
            <tr><td style={{ fontWeight: 600 }}>Status</td><td><span className={`badge badge-${repair.status.toLowerCase()}`}>{repair.status}</span></td></tr>
            <tr><td style={{ fontWeight: 600 }}>Technician Notes</td><td>{repair.notes || '—'}</td></tr>
            <tr><td style={{ fontWeight: 600 }}>Date</td><td>{new Date(repair.created_at).toLocaleDateString()}</td></tr>
          </tbody>
        </table>
        <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(37,99,235,0.08)', borderRadius: '10px', textAlign: 'right' }}>
          <span className="text-lg" style={{ fontWeight: 700 }}>Total: </span>
          <span className="text-gradient" style={{ fontSize: '1.5rem', fontWeight: 700 }}>{fmt(repair.cost, currency)}</span>
        </div>
        <div className="flex gap-4" style={{ marginTop: '1.5rem' }}>
          <button onClick={() => window.print()} className="btn btn-primary" style={{ flex: 1 }}>🖨️ Print Invoice</button>
          <button onClick={onClose} className="btn btn-outline" style={{ flex: 1 }}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TECHNICIAN DASHBOARD
// ============================================================
function TechnicianDashboard({ user, currency }) {
  const [repairs, setRepairs] = useState([]);
  const [parts, setParts] = useState([]);
  const [aiDiag, setAiDiag] = useState(null);
  const [aiRepairId, setAiRepairId] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadData = async () => {
    try {
      const resR = await fetch(`${API}/repairs`);
      const dataR = await resR.json();
      setRepairs(Array.isArray(dataR) ? dataR.filter(r => r.status !== 'Completed') : []);
      
      const resP = await fetch(`${API}/parts`);
      const dataP = await resP.json();
      setParts(Array.isArray(dataP) ? dataP : []);
    } catch (e) { console.error(e); }
  };
  useEffect(() => { loadData(); }, []);

  const getAiDiagnosis = async (repairId) => {
    const res = await fetch(`${API}/ai-diagnose/${repairId}`);
    const data = await res.json();
    setAiDiag(data.diagnosis);
    setAiRepairId(repairId);
  };

  const updateStatus = async (id, status, notes, cost) => {
    await fetch(`${API}/repairs/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, technician_id: user.id, notes, cost: cost !== undefined ? Number(cost) : undefined })
    });
    loadData();
    if (status === 'Completed' && aiRepairId === id) setAiDiag(null);
  };

  const filtered = repairs
    .filter(r => statusFilter === 'all' || r.status === statusFilter)
    .filter(r => r.device_model?.toLowerCase().includes(search.toLowerCase()) ||
      r.problem_description?.toLowerCase().includes(search.toLowerCase()) ||
      r.customer_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex-col gap-6">
      <h2 className="text-2xl text-gradient">Technician Dashboard</h2>

      {/* AI Panel */}
      {aiDiag && (
        <div className="ai-alert animate-slide-up" role="status" aria-live="polite">
          <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
            <h3>🤖 Smart AI Diagnosis – Repair #{aiRepairId}</h3>
            <button onClick={() => setAiDiag(null)} className="btn btn-outline" style={{ padding: '0.2rem 0.6rem' }} aria-label="Dismiss AI diagnosis">✕</button>
          </div>
          <p className="text-gray text-sm" style={{ marginBottom: '1rem' }}>Based on reported symptoms, likely causes are:</p>
          <ul style={{ paddingLeft: '1.5rem' }}>
            {(aiDiag || []).map((d, i) => (
              <li key={i} style={{ marginBottom: '0.5rem' }}>
                <strong>{d.cause}</strong>{' '}
                <span style={{ color: 'var(--accent-blue)' }}>({d.probability}%)</span>
                {' '}– {d.action}
                <span className="probability-bar" style={{ '--pct': `${d.probability}%` }} aria-hidden="true" />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Repair Queue */}
      <section className="glass-panel" style={{ padding: '2rem' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 className="text-xl flex items-center gap-2"><Wrench size={20} aria-hidden="true" /> Repair Queue</h2>
          <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="tech-search" className="sr-only">Search repairs</label>
              <input id="tech-search" placeholder="🔍 Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '180px' }} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="status-filter" className="sr-only">Filter by status</label>
              <select id="status-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: '140px' }}>
                <option value="all">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Diagnosing">Diagnosing</option>
                <option value="Fixing">Fixing</option>
              </select>
            </div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Customer</th>
              <th scope="col">Device</th>
              <th scope="col">Problem</th>
              <th scope="col">Status</th>
              <th scope="col">Fee ({currency === 'USD' ? '$' : 'RWF'})</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(filtered || []).map(r => (
              <tr key={r.id}>
                <td>#{r.id}</td>
                <td>{r.customer_name}</td>
                <td>{r.device_model}</td>
                <td>{r.problem_description}</td>
                <td><span className={`badge badge-${r.status?.toLowerCase() || 'pending'}`}>{r.status}</span></td>
                <td>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={{ position: 'absolute', left: '8px', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{currency === 'USD' ? '$' : 'RF'}</span>
                    <input id={`cost-${r.id}`} type="number" placeholder="Fee" defaultValue={fromBase(r.cost, currency)} onBlur={e => updateStatus(r.id, r.status, r.notes, toBase(e.target.value, currency))} style={{ width: '90px', padding: '0.35rem 0.35rem 0.35rem 1.4rem' }} />
                  </div>
                </td>
                <td>
                  <div className="flex gap-2 items-center" style={{ flexWrap: 'wrap' }}>
                    <button onClick={() => getAiDiagnosis(r.id)} className="btn btn-outline" style={{ padding: '0.35rem 0.7rem' }} aria-label={`AI diagnosis for repair #${r.id}`}>🤖 AI</button>
                    <label htmlFor={`notes-${r.id}`} className="sr-only">Notes for repair #{r.id}</label>
                    <input id={`notes-${r.id}`} placeholder="Add notes..." defaultValue={r.notes} onBlur={e => updateStatus(r.id, r.status, e.target.value, r.cost)} style={{ width: '130px', padding: '0.35rem' }} />
                    <label htmlFor={`status-${r.id}`} className="sr-only">Status for repair #{r.id}</label>
                    <select id={`status-${r.id}`} onChange={e => updateStatus(r.id, e.target.value, r.notes, r.cost)} value={r.status} style={{ width: 'auto', padding: '0.35rem' }}>
                      <option value="Pending">Pending</option>
                      <option value="Diagnosing">Diagnosing</option>
                      <option value="Fixing">Fixing</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan="6" className="text-gray">No matching repairs.</td></tr>}
          </tbody>
        </table>
      </section>

      {/* Parts Inventory */}
      <section className="glass-panel" style={{ padding: '2rem' }}>
        <h2 className="text-xl" style={{ marginBottom: '1.5rem' }}>Parts Inventory</h2>
        <table>
          <thead><tr><th scope="col">Part Name</th><th scope="col">Cost ({currency === 'USD' ? '$' : 'RWF'})</th><th scope="col">Stock</th></tr></thead>
          <tbody>
            {(parts || []).map(p => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{fmt(p.cost, currency)}</td>
                <td>
                  {p.stock_level <= 5
                    ? <span className="badge badge-pending">{p.stock_level} – Low</span>
                    : <span className="badge badge-completed">{p.stock_level} – OK</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

// ============================================================
// ADMIN PANEL
// ============================================================
function AdminPanel({ currency }) {
  const [stats, setStats] = useState({ totalRepairsCompleted: 0, totalIncome: 0, pendingRepairs: 0, totalCustomers: 0, totalTechnicians: 0, commonProblems: [], weeklyData: [] });
  const [users, setUsers] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [parts, setParts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [repairs, setRepairs] = useState([]);
  const [newPart, setNewPart] = useState({ name: '', stock_level: 0, cost: 0, supplier_id: '' });
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'technician' });
  const [newSupplier, setNewSupplier] = useState({ name: '', contact: '', email: '', address: '' });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tab, setTab] = useState('analytics');
  const [repairPage, setRepairPage] = useState(1);
  const PER_PAGE = 8;

  const loadData = async () => {
    try {
      const [sRes, uRes, pRes, rRes, supRes] = await Promise.all([
        fetch(`${API}/analytics`), fetch(`${API}/users`),
        fetch(`${API}/parts`), fetch(`${API}/repairs`), fetch(`${API}/suppliers`)
      ]);
      const [s, u, p, r, sup] = await Promise.all([
        sRes.json(), uRes.json(), pRes.json(), rRes.json(), supRes.json()
      ]);
      
      setStats(s || { totalRepairsCompleted: 0, totalIncome: 0, pendingRepairs: 0, totalCustomers: 0, totalTechnicians: 0, commonProblems: [], weeklyData: [] });
      setUsers(Array.isArray(u) ? u : []);
      setTechnicians(Array.isArray(u) ? u.filter(user => user.role === 'technician') : []);
      setParts(Array.isArray(p) ? p : []);
      setRepairs(Array.isArray(r) ? r : []);
      setSuppliers(Array.isArray(sup) ? sup : []);
    } catch (e) {
      console.error("Load error:", e);
    }
  };
  useEffect(() => { loadData(); }, []);

  const addPart = async (e) => {
    e.preventDefault();
    await fetch(`${API}/parts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newPart) });
    setNewPart({ name: '', stock_level: 0, cost: 0, supplier_id: '' }); loadData();
  };

  const addSupplier = async (e) => {
    e.preventDefault();
    await fetch(`${API}/suppliers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newSupplier) });
    setNewSupplier({ name: '', contact: '', email: '', address: '' }); loadData();
  };

  const removeSupplier = async (id) => {
    if (!window.confirm('Remove this supplier?')) return;
    await fetch(`${API}/suppliers/${id}`, { method: 'DELETE' }); loadData();
  };

  const addUser = async (e) => {
    e.preventDefault();
    await fetch(`${API}/users`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newUser) });
    setNewUser({ name: '', email: '', password: '', role: 'technician' }); loadData();
  };

  const removeUser = async (id) => {
    if (!window.confirm('Remove this user?')) return;
    await fetch(`${API}/users/${id}`, { method: 'DELETE' }); loadData();
  };

  const assignTech = async (repairId, techId) => {
    await fetch(`${API}/repairs/${repairId}/assign`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ technician_id: techId })
    }); loadData();
  };

  const updateRepairAdmin = async (id, cost) => {
    await fetch(`${API}/repairs/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cost: Number(cost) })
    }); loadData();
  };

  const filteredRepairs = repairs
    .filter(r => statusFilter === 'all' || r.status === statusFilter)
    .filter(r => r.device_model?.toLowerCase().includes(search.toLowerCase()) ||
      r.problem_description?.toLowerCase().includes(search.toLowerCase()) ||
      r.customer_name?.toLowerCase().includes(search.toLowerCase()));
  const pagedRepairs = filteredRepairs.slice((repairPage-1)*PER_PAGE, repairPage*PER_PAGE);

  // Chart data
  const chartData = {
    labels: stats.weeklyData.length > 0 ? stats.weeklyData.map(d => d.day) : ['No data yet'],
    datasets: [
      {
        label: 'Repairs Completed',
        data: stats.weeklyData.length > 0 ? stats.weeklyData.map(d => d.count) : [0],
        backgroundColor: 'rgba(37,99,235,0.6)',
        borderRadius: 8,
      },
      {
        label: 'Income ($)',
        data: stats.weeklyData.length > 0 ? stats.weeklyData.map(d => d.income || 0) : [0],
        backgroundColor: 'rgba(5,150,105,0.6)',
        borderRadius: 8,
      }
    ]
  };
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Last 7 Days – Repairs & Income' }
    },
    scales: { y: { beginAtZero: true } }
  };

  const tabs = [
    { id: 'analytics', label: 'Analytics', icon: <BarChart2 size={16} aria-hidden="true" /> },
    { id: 'repairs',   label: 'Repairs',   icon: <Wrench   size={16} aria-hidden="true" /> },
    { id: 'users',     label: 'Users',     icon: <Users    size={16} aria-hidden="true" /> },
    { id: 'parts',     label: 'Parts',     icon: <Package  size={16} aria-hidden="true" /> },
    { id: 'suppliers', label: 'Suppliers', icon: <Truck    size={16} aria-hidden="true" /> },
  ];

  return (
    <div className="flex-col gap-6">
      <h2 className="text-2xl text-gradient flex items-center gap-2"><ShieldCheck size={28} aria-hidden="true" /> Manager Dashboard</h2>

      {/* Tab Navigation */}
      <nav aria-label="Admin sections">
        <div role="tablist" className="flex gap-2" style={{ flexWrap: 'wrap' }}>
          {tabs.map(t => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
              className={`btn ${tab === t.id ? 'btn-primary' : 'btn-outline'}`} style={{ padding: '0.5rem 1rem' }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </nav>

      {/* ANALYTICS TAB */}
      {tab === 'analytics' && (
        <div className="flex-col gap-6" role="tabpanel" aria-label="Analytics">
          <div className="grid grid-cols-3 gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            {[
              { label: 'Completed Repairs', value: stats.totalRepairsCompleted, color: 'var(--accent-blue)' },
              { label: 'Total Income', value: fmt(stats.totalIncome, currency), color: 'var(--accent-green)' },
              { label: 'Pending Tasks', value: stats.pendingRepairs, color: 'var(--accent-purple)' },
              { label: 'Customers', value: stats.totalCustomers, color: 'var(--accent-blue)' },
              { label: 'Technicians', value: stats.totalTechnicians, color: 'var(--accent-green)' },
            ].map((s, i) => (
              <div key={i} className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
                <h3 className="text-gray text-sm">{s.label}</h3>
                <p style={{ fontSize: '2.5rem', fontWeight: 700, color: s.color, marginTop: '0.5rem' }}>{s.value}</p>
              </div>
            ))}
          </div>

          <div className="glass-panel" style={{ padding: '2rem' }}>
            <Bar data={chartData} options={chartOptions} aria-label="Weekly repairs and income bar chart" role="img" />
          </div>

          {stats.commonProblems.length > 0 && (
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <h2 className="text-xl flex items-center gap-2" style={{ marginBottom: '1rem' }}><Bell size={18} aria-hidden="true" /> Most Reported Problems</h2>
              <ul style={{ paddingLeft: '0', listStyle: 'none' }}>
                {stats.commonProblems.map((cp, i) => (
                  <li key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid var(--panel-border)' }}>
                    <span>🔥 {cp.problem}</span>
                    <span className="badge badge-diagnosing">{cp.count} reports</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* REPAIRS TAB */}
      {tab === 'repairs' && (
        <section className="glass-panel" style={{ padding: '2rem' }} role="tabpanel" aria-label="All Repairs">
          <div className="flex items-center justify-between" style={{ marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
            <h2 className="text-xl">All Repairs</h2>
            <div className="flex gap-2" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="admin-search" className="sr-only">Search repairs</label>
                <input id="admin-search" placeholder="🔍 Search..." value={search} onChange={e => { setSearch(e.target.value); setRepairPage(1); }} style={{ width: '180px' }} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="admin-status-filter" className="sr-only">Filter by status</label>
                <select id="admin-status-filter" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setRepairPage(1); }} style={{ width: '150px' }}>
                  <option value="all">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Diagnosing">Diagnosing</option>
                  <option value="Fixing">Fixing</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <button onClick={() => exportExcel('/export/repairs')} className="btn btn-outline" style={{ padding: '0.4rem 0.9rem' }} aria-label="Export repairs to Excel">
                <Download size={14} aria-hidden="true" /> Excel
              </button>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th scope="col">ID</th><th scope="col">Customer</th><th scope="col">Device</th>
                <th scope="col">Status</th><th scope="col">Cost</th><th scope="col">Assign Technician</th>
              </tr>
            </thead>
            <tbody>
              {(pagedRepairs || []).map(r => (
                <tr key={r.id}>
                  <td>#{r.id}</td>
                  <td>{r.customer_name}</td>
                  <td>{r.device_model}</td>
                  <td><span className={`badge badge-${r.status?.toLowerCase() || 'pending'}`}>{r.status}</span></td>
                  <td>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <span style={{ position: 'absolute', left: '8px', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{currency === 'USD' ? '$' : 'RF'}</span>
                      <input type="number" defaultValue={fromBase(r.cost, currency)} onBlur={e => updateRepairAdmin(r.id, toBase(e.target.value, currency))} style={{ width: '90px', padding: '0.25rem 0.25rem 0.25rem 1.4rem', fontSize: '0.85rem' }} />
                    </div>
                  </td>
                  <td>
                    <label htmlFor={`assign-${r.id}`} className="sr-only">Assign technician to repair #{r.id}</label>
                    <select id={`assign-${r.id}`} value={r.technician_id || ''} onChange={e => assignTech(r.id, e.target.value)} style={{ width: 'auto', padding: '0.35rem' }}>
                      <option value="">-- Unassigned --</option>
                      {(technicians || []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
              {filteredRepairs.length === 0 && <tr><td colSpan="6" className="text-gray">No repairs found.</td></tr>}
            </tbody>
          </table>
          <Pagination total={filteredRepairs.length} page={repairPage} perPage={PER_PAGE} onPage={setRepairPage} />
        </section>
      )}

      {/* USERS TAB */}
      {tab === 'users' && (
        <div className="grid grid-cols-2 gap-6" role="tabpanel" aria-label="User Management">
          <section className="glass-panel" style={{ padding: '2rem' }}>
            <h2 className="text-xl flex items-center gap-2" style={{ marginBottom: '1.5rem' }}><Users size={18} aria-hidden="true" /> All Users</h2>
            <table>
              <thead><tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Role</th><th scope="col">Action</th></tr></thead>
              <tbody>
                {(users || []).map(u => (
                  <tr key={u.id}>
                    <td>{u.name}</td><td>{u.email}</td><td><span className="badge badge-diagnosing">{u.role}</span></td>
                    <td>
                      <button onClick={() => removeUser(u.id)} className="btn btn-outline" style={{ padding: '0.25rem 0.6rem', color: 'var(--accent-red)' }} aria-label={`Remove user ${u.name}`}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="glass-panel" style={{ padding: '2rem' }}>
            <h2 className="text-xl flex items-center gap-2" style={{ marginBottom: '1.5rem' }}><Users size={18} aria-hidden="true" /> Add New User</h2>
            <form onSubmit={addUser} className="flex-col gap-4" noValidate>
              <div className="form-group">
                <label htmlFor="nu-name">Full Name</label>
                <input id="nu-name" placeholder="John Smith" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label htmlFor="nu-email">Email</label>
                <input id="nu-email" type="email" placeholder="john@slr.com" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} required />
              </div>
              <div className="form-group">
                <label htmlFor="nu-password">Password</label>
                <input id="nu-password" type="password" placeholder="Temporary password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required />
              </div>
              <div className="form-group">
                <label htmlFor="nu-role">Role</label>
                <select id="nu-role" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                  <option value="technician">Technician</option>
                  <option value="customer">Customer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary">Add User</button>
            </form>
          </section>
        </div>
      )}

      {/* PARTS TAB */}
      {tab === 'parts' && (
        <div className="grid grid-cols-2 gap-6" role="tabpanel" aria-label="Parts Management">
          <section className="glass-panel" style={{ padding: '2rem' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: '1.5rem' }}>
              <h2 className="text-xl flex items-center gap-2"><Package size={18} aria-hidden="true" /> Parts Inventory</h2>
              <button onClick={() => exportExcel('/export/parts')} className="btn btn-outline" style={{ padding: '0.4rem 0.9rem' }} aria-label="Export parts to Excel">
                <Download size={14} aria-hidden="true" /> Excel
              </button>
            </div>
            <table>
              <thead><tr><th scope="col">Part</th><th scope="col">Supplier</th><th scope="col">Cost</th><th scope="col">Stock</th></tr></thead>
              <tbody>
                {(parts || []).map(p => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td className="text-gray" style={{ fontSize: '0.85rem' }}>{p.supplier_name || '—'}</td>
                    <td>{fmt(p.cost, currency)}</td>
                    <td>{p.stock_level <= 5
                      ? <span className="badge badge-pending">⚠️ Low ({p.stock_level})</span>
                      : <span className="badge badge-completed">OK ({p.stock_level})</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="glass-panel" style={{ padding: '2rem' }}>
            <h2 className="text-xl flex items-center gap-2" style={{ marginBottom: '1.5rem' }}><Package size={18} aria-hidden="true" /> Add New Part</h2>
            <form onSubmit={addPart} className="flex-col gap-4" noValidate>
              <div className="form-group">
                <label htmlFor="part-name">Part Name</label>
                <input id="part-name" placeholder="e.g. SSD 512GB" value={newPart.name} onChange={e => setNewPart({ ...newPart, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label htmlFor="part-supplier">Supplier</label>
                <select id="part-supplier" value={newPart.supplier_id} onChange={e => setNewPart({ ...newPart, supplier_id: e.target.value })}>
                  <option value="">-- Select Supplier --</option>
                  {(suppliers || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="part-stock">Stock Quantity</label>
                <input id="part-stock" type="number" min="0" value={newPart.stock_level} onChange={e => setNewPart({ ...newPart, stock_level: Number(e.target.value) })} />
              </div>
              <div className="form-group">
                <label htmlFor="part-cost">Unit Cost ({currency === 'USD' ? '$' : 'RWF'})</label>
                <input id="part-cost" type="number" min="0" step="0.01" value={newPart.cost} onChange={e => setNewPart({ ...newPart, cost: toBase(Number(e.target.value), currency) })} />
              </div>
              <button type="submit" className="btn btn-primary">Add Part</button>
            </form>
          </section>
        </div>
      )}

      {/* SUPPLIERS TAB */}
      {tab === 'suppliers' && (
        <div className="grid grid-cols-2 gap-6" role="tabpanel" aria-label="Supplier Management">
          <section className="glass-panel" style={{ padding: '2rem' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: '1.5rem' }}>
              <h2 className="text-xl flex items-center gap-2"><Truck size={18} aria-hidden="true" /> Suppliers</h2>
              <button onClick={() => exportExcel('/export/suppliers')} className="btn btn-outline" style={{ padding: '0.4rem 0.9rem' }} aria-label="Export suppliers to Excel">
                <Download size={14} aria-hidden="true" /> Excel
              </button>
            </div>
            <table>
              <thead><tr><th scope="col">Name</th><th scope="col">Contact</th><th scope="col">Email</th><th scope="col">Action</th></tr></thead>
              <tbody>
                {(suppliers || []).map(s => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{s.contact || '—'}</td>
                    <td>{s.email || '—'}</td>
                    <td>
                      <button onClick={() => removeSupplier(s.id)} className="btn btn-outline" style={{ padding: '0.25rem 0.6rem', color: 'var(--accent-red)' }} aria-label={`Remove supplier ${s.name}`}>Remove</button>
                    </td>
                  </tr>
                ))}
                {suppliers.length === 0 && <tr><td colSpan="4" className="text-gray">No suppliers yet.</td></tr>}
              </tbody>
            </table>
          </section>

          <section className="glass-panel" style={{ padding: '2rem' }}>
            <h2 className="text-xl flex items-center gap-2" style={{ marginBottom: '1.5rem' }}><Truck size={18} aria-hidden="true" /> Add New Supplier</h2>
            <form onSubmit={addSupplier} className="flex-col gap-4" noValidate>
              <div className="form-group">
                <label htmlFor="sup-name">Supplier Name</label>
                <input id="sup-name" placeholder="e.g. TechParts Ltd" value={newSupplier.name} onChange={e => setNewSupplier({ ...newSupplier, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label htmlFor="sup-contact">Contact Number</label>
                <input id="sup-contact" placeholder="e.g. +250788000001" value={newSupplier.contact} onChange={e => setNewSupplier({ ...newSupplier, contact: e.target.value })} />
              </div>
              <div className="form-group">
                <label htmlFor="sup-email">Email</label>
                <input id="sup-email" type="email" placeholder="supplier@email.com" value={newSupplier.email} onChange={e => setNewSupplier({ ...newSupplier, email: e.target.value })} />
              </div>
              <div className="form-group">
                <label htmlFor="sup-address">Address</label>
                <input id="sup-address" placeholder="e.g. Kigali, Rwanda" value={newSupplier.address} onChange={e => setNewSupplier({ ...newSupplier, address: e.target.value })} />
              </div>
              <button type="submit" className="btn btn-primary">Add Supplier</button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

// ============================================================
// APP ROOT
// ============================================================
function App() {
  const [user, setUser] = useState(null);
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    const saved = localStorage.getItem('slr_user');
    if (saved) setUser(JSON.parse(saved));
    const savedCur = localStorage.getItem('slr_currency');
    if (savedCur) setCurrency(savedCur);
  }, []);

  const handleLogin = (u) => { setUser(u); localStorage.setItem('slr_user', JSON.stringify(u)); };
  const handleLogout = () => { setUser(null); localStorage.removeItem('slr_user'); };
  const handleCurrency = (c) => { setCurrency(c); localStorage.setItem('slr_currency', c); };

  return (
    <Router>
      <Layout user={user} onLogout={handleLogout} currency={currency} setCurrency={handleCurrency}>
        <Routes>
          <Route path="/" element={!user ? <Login onLogin={handleLogin} /> : <Navigate to={`/${user.role}`} />} />
          <Route path="/register" element={!user ? <Register onLogin={handleLogin} /> : <Navigate to={`/${user.role}`} />} />
          <Route path="/customer" element={user?.role === 'customer' ? <CustomerPortal user={user} currency={currency} /> : <Navigate to="/" />} />
          <Route path="/technician" element={user?.role === 'technician' ? <TechnicianDashboard user={user} currency={currency} /> : <Navigate to="/" />} />
          <Route path="/admin" element={user?.role === 'admin' ? <AdminPanel currency={currency} /> : <Navigate to="/" />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
