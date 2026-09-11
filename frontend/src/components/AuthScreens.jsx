import React, { useState, useMemo } from 'react';
import { uid } from '../utils';

// ----------------------------------------
// Standard Login Screen
// ----------------------------------------
export const LoginScreen = ({ onLogin, error }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const handleLogin = () => {
    if (!email || !password) return;
    onLogin(email, password);
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h2 className="auth-title">Sign in</h2>
        <p className="auth-sub">Enter your email and password to access your workspace.</p>
        
        <div className="field">
          <label>Email ID</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com" />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        </div>
        
        {error && <div className="auth-error">{error}</div>}
        
        <button className="btn btn-primary" onClick={handleLogin} style={{ width: '100%', marginTop: '8px' }}>Log in</button>
      </div>
    </div>
  );
};

// ----------------------------------------
// Admin Force Password Modal
// ----------------------------------------
const ForcePasswordModal = ({ orgName, onClose, onSubmit }) => {
  const [newPwd, setNewPwd] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    if (!newPwd) return setError("Password is required.");
    try {
      await onSubmit(newPwd);
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target.className === 'modal-backdrop' && onClose()}>
      <div className="modal" style={{ maxWidth: 400, borderTop: '6px solid var(--danger)' }}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        <h2 className="auth-title" style={{ marginBottom: 4 }}>Force Reset Password</h2>
        <p className="auth-sub" style={{ marginBottom: 16 }}>For organization: <strong>{orgName}</strong></p>
        
        <div className="field">
          <label>New Password</label>
          <input type="text" value={newPwd} onChange={e => setNewPwd(e.target.value)} />
        </div>
        
        {error && <div className="auth-error">{error}</div>}
        
        <button className="btn btn-danger" style={{ width: '100%', marginTop: 8 }} onClick={handleSubmit}>
          Force Reset
        </button>
      </div>
    </div>
  );
};

// ----------------------------------------
// Super Admin Dashboard
// ----------------------------------------
export const SuperAdminDashboard = ({ companies, onCreateCompany, onDeleteCompany, onViewCompany, onLogout, onForceChangePassword }) => {
  // Create form state
  const [name, setName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [createError, setCreateError] = useState("");
  
  // Table Controls State
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });

  const [resetOrg, setResetOrg] = useState(null);
  
  const today = new Date().toISOString().split('T')[0];

  const handleCreate = () => {
    if (!name || !email || !password) {
      setCreateError("Company name, email ID, and password are required.");
      return;
    }
    if (companies.some(c => c?.email?.toLowerCase() === email.toLowerCase())) {
      setCreateError("That email ID is already in use by another organization.");
      return;
    }
    onCreateCompany({
      id: uid(),
      companyName: name, adminName, email, password,
      logoUrl: "", leadership: [], eas: [], departments: [],
      createdAt: new Date().toISOString() // Ensure we track creation time
    });
    setName(""); setAdminName(""); setEmail(""); setPassword(""); setCreateError("");
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Memoized Filtering & Sorting Logic
  const processedCompanies = useMemo(() => {
    let result = [...companies];

    // 1. Apply Date Filter
    result = result.filter(c => {
      if (!c.createdAt && (startDate || endDate)) return false; // If filtering by date, exclude those without dates
      if (!c.createdAt) return true;
      
      const cDate = new Date(c.createdAt);
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      end.setHours(23, 59, 59, 999);
      
      return cDate >= start && cDate <= end;
    });

    // 2. Apply Search Filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => 
        (c.companyName || '').toLowerCase().includes(q) ||
        (c.adminName || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q)
      );
    }

    // 3. Apply Sorting
    result.sort((a, b) => {
      let valA = a[sortConfig.key] || "";
      let valB = b[sortConfig.key] || "";
      
      if (sortConfig.key === 'createdAt') {
        valA = valA ? new Date(valA).getTime() : 0;
        valB = valB ? new Date(valB).getTime() : 0;
      } else {
        valA = typeof valA === 'string' ? valA.toLowerCase() : valA;
        valB = typeof valB === 'string' ? valB.toLowerCase() : valB;
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [companies, searchQuery, startDate, endDate, sortConfig]);

  const handleDownloadCSV = () => {
    if (processedCompanies.length === 0) {
      alert("No organizations match your current filters.");
      return;
    }

    const headers = ["Company ID", "Company Name", "Admin Name", "Email", "Created At"];
    const rows = processedCompanies.map(c => [
      c.id,
      `"${c.companyName || ''}"`,
      `"${c.adminName || ''}"`,
      `"${c.email || ''}"`,
      `"${c.createdAt ? new Date(c.createdAt).toLocaleString() : 'N/A'}"`
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Orgs_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <span style={{ opacity: 0.3, marginLeft: 4, fontSize: '10px' }}>↕</span>;
    return <span style={{ marginLeft: 4, color: 'var(--accent)', fontSize: '12px' }}>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>;
  };

  // Helper for clickable table headers
  const thStyle = { padding: '14px 10px', cursor: 'pointer', userSelect: 'none' };

  return (
    <div className="admin-shell">
      {/* TOP SECTION: Create Organization */}
      <section className="admin-section">
        <div className="admin-section-head">
          <div className="admin-section-title">Create New Organization</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {/* Note: Ensure setShowPwdModal is passed down or managed here if you want Admin to change their own password from Dashboard */}
            {/* <button className="btn btn-danger btn-tiny btn-ghost" onClick={onLogout}>Sign Out</button> */}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          <div className="field" style={{ marginBottom: 0 }}><label>Company Name</label><input type="text" value={name} onChange={e => setName(e.target.value)} /></div>
          <div className="field" style={{ marginBottom: 0 }}><label>Primary Admin</label><input type="text" value={adminName} onChange={e => setAdminName(e.target.value)} /></div>
          <div className="field" style={{ marginBottom: 0 }}><label>Login Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div className="field" style={{ marginBottom: 0 }}><label>Initial Password</label><input type="text" value={password} onChange={e => setPassword(e.target.value)} /></div>
        </div>
        {createError && <div className="auth-error">{createError}</div>}
        <button className="btn btn-primary" onClick={handleCreate}>Provision Workspace</button>
      </section>

      {/* BOTTOM SECTION: Registered Organizations Table */}
      <section className="admin-section">
        <div className="admin-section-head" style={{ marginBottom: '24px' }}>
          <div className="admin-section-title">Registered Organizations</div>
        </div>
        
        {/* Sleek Professional Toolbar */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '20px', background: 'var(--surface-2)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          
          {/* Search Bar */}
          <div style={{ flex: '1 1 250px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
            <input 
              type="text" 
              placeholder="Search by company, admin, or email..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--surface)' }}
            />
          </div>

          {/* Unified Date Range Picker */}
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: '8px', padding: '0 8px', overflow: 'hidden' }}>
            <span style={{ opacity: 0.5, fontSize: '13px', padding: '0 4px' }}>📅</span>
            <input 
              type="date" 
              max={today} 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
              style={{ border: 'none', background: 'transparent', padding: '8px', outline: 'none', fontSize: '13px', cursor: 'pointer' }}
              title="Start Date"
            />
            <span style={{ opacity: 0.3 }}>→</span>
            <input 
              type="date" 
              max={today} 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
              style={{ border: 'none', background: 'transparent', padding: '8px', outline: 'none', fontSize: '13px', cursor: 'pointer' }}
              title="End Date"
            />
          </div>

          {/* Export Button */}
          <button className="btn btn-primary" onClick={handleDownloadCSV} style={{ padding: '9px 16px', display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span>↓</span> Export CSV
          </button>
        </div>

        {/* Data Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-strong)', color: 'var(--ink-soft)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={thStyle} onClick={() => handleSort('companyName')}>Company Name <SortIcon columnKey="companyName" /></th>
                <th style={thStyle} onClick={() => handleSort('adminName')}>Admin <SortIcon columnKey="adminName" /></th>
                <th style={thStyle} onClick={() => handleSort('email')}>Email <SortIcon columnKey="email" /></th>
                <th style={thStyle} onClick={() => handleSort('createdAt')}>Created Date <SortIcon columnKey="createdAt" /></th>
                <th style={{ padding: '14px 10px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {processedCompanies.length > 0 ? processedCompanies.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                  <td style={{ padding: '14px 10px', fontWeight: 700, color: 'var(--ink)' }}>{c.companyName || "Untitled"}</td>
                  <td style={{ padding: '14px 10px' }}>{c.adminName || "N/A"}</td>
                  <td style={{ padding: '14px 10px' }}>{c.email}</td>
                  <td style={{ padding: '14px 10px', color: 'var(--ink-soft)' }}>
                    {c.createdAt ? new Date(c.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                  </td>
                  <td style={{ padding: '14px 10px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost btn-tiny" onClick={() => onViewCompany(c.id)}>View/Edit</button>
                      <button className="btn btn-ghost btn-tiny" onClick={() => setResetOrg(c)}>Change Pwd</button>
                      <button className="btn btn-danger btn-tiny btn-ghost" onClick={() => onDeleteCompany(c.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ink-soft)' }}>
                    No organizations match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {resetOrg && (
        <ForcePasswordModal 
          orgName={resetOrg.companyName} 
          onClose={() => setResetOrg(null)} 
          onSubmit={async (newPwd) => {
            await onForceChangePassword(resetOrg.id, newPwd);
            alert("Password forcefully reset!");
          }} 
        />
      )}
    </div>
  );
};