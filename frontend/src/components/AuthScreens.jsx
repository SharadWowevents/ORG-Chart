import React, { useState } from 'react';
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
// Super Admin Dashboard (Top/Bottom Layout)
// ----------------------------------------
export const SuperAdminDashboard = ({ companies, onCreateCompany, onDeleteCompany, onViewCompany, onLogout, onForceChangePassword }) => {
  // Create form state
  const [name, setName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [createError, setCreateError] = useState("");
  const today = new Date().toISOString().split('T')[0];
  // CSV Filter State
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Password Reset State
  const [resetOrg, setResetOrg] = useState(null); // Holds the company object being reset

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
      logoUrl: "", leadership: [], eas: [], departments: []
    });
    setName(""); setAdminName(""); setEmail(""); setPassword(""); setCreateError("");
  };

  const handleDownloadCSV = () => {
    // Filter companies by date range
    const filtered = companies.filter(c => {
      if (!c.createdAt) return true; // If no date exists, include it
      const cDate = new Date(c.createdAt);
      const start = startDate ? new Date(startDate) : new Date(0); // 1970 fallback
      const end = endDate ? new Date(endDate) : new Date();
      end.setHours(23, 59, 59, 999); // End of the day
      return cDate >= start && cDate <= end;
    });

    if (filtered.length === 0) {
      alert("No organizations found in this date range.");
      return;
    }

    // Build CSV
    const headers = ["Company ID", "Company Name", "Admin Name", "Email", "Created At"];
    const rows = filtered.map(c => [
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
    link.setAttribute("download", `Registered_Orgs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="admin-shell">
      
      {/* TOP SECTION: Create Organization */}
      <section className="admin-section">
        <div className="admin-section-head">
          <div className="admin-section-title">Create New Organization</div>
          
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
        <div className="admin-section-head">
          <div className="admin-section-title">Registered Organizations</div>
          
          {/* CSV Controls */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>From Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>To Date</label>
              <input type="date" max={today} value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <button className="btn btn-ghost" onClick={handleDownloadCSV}>↓ Export CSV</button>
          </div>
        </div>

        <div style={{ overflowX: 'auto', marginTop: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-strong)', color: 'var(--ink-soft)' }}>
                <th style={{ padding: '12px 8px' }}>Company Name</th>
                <th style={{ padding: '12px 8px' }}>Admin</th>
                <th style={{ padding: '12px 8px' }}>Email</th>
                <th style={{ padding: '12px 8px' }}>Created (Date & Time)</th>
                <th style={{ padding: '12px 8px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.length > 0 ? companies.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                  <td style={{ padding: '12px 8px', fontWeight: 600 }}>{c.companyName || "Untitled"}</td>
                  <td style={{ padding: '12px 8px' }}>{c.adminName || "N/A"}</td>
                  <td style={{ padding: '12px 8px' }}>{c.email}</td>
                  <td style={{ padding: '12px 8px' }}>{c.createdAt ? new Date(c.createdAt).toLocaleString() : 'N/A'}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost btn-tiny" onClick={() => onViewCompany(c.id)}>View/Edit</button>
                      <button className="btn btn-ghost btn-tiny" onClick={() => setResetOrg(c)}>Change Pwd</button>
                      <button className="btn btn-danger btn-tiny" onClick={() => onDeleteCompany(c.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--ink-soft)' }}>
                    No organizations registered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Render the Force Password Modal if an org is selected */}
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