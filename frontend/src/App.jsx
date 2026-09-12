import React, { useState, useEffect } from 'react';
import { LoginScreen, SuperAdminDashboard } from './AuthScreens';
import { Admin } from './Admin';
import { OrgTree, Modal } from './OrgComponents';
import { ChangePasswordModal } from './ChangePasswordModal';

// ==========================================
// CUSTOM SHARE MODAL
// ==========================================
const ShareModal = ({ shareUrl, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 500, padding: '24px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-head" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: '16px' }}>
          <div>
            <h2 className="modal-name">Share Organization Chart</h2>
            <p className="modal-role" style={{ marginTop: '4px' }}>
              Anyone with this link can view this chart in read-only mode.
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <input 
            type="text" 
            readOnly 
            value={shareUrl} 
            style={{ 
              flex: 1, padding: '10px 14px', borderRadius: '8px', 
              border: '1px solid var(--border-strong)', background: 'var(--surface-2)', 
              color: 'var(--ink)', fontSize: '14px', outline: 'none'
            }} 
          />
          <button 
            className="btn btn-primary" 
            onClick={handleCopy}
            style={{ padding: '0 20px', borderRadius: '8px', minWidth: '100px' }}
          >
            {copied ? "Copied! ✓" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// MAIN APP COMPONENT
// ==========================================
export default function App() {
  // Navigation & Auth States
  const [screen, setScreen] = useState('login'); // 'login', 'dashboard', 'app'
  const [mode, setMode] = useState('view'); // 'view', 'admin'
  const [userRole, setUserRole] = useState(null); // 'superadmin', 'user'
  
  // Data States
  const [activeCompany, setActiveCompany] = useState(null);
  const [companies, setCompanies] = useState([]); // For SuperAdmin dashboard
  
  // UI States
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showSuperAdminPwdModal, setShowSuperAdminPwdModal] = useState(false);
  
  // Share Feature States
  const [showShareModal, setShowShareModal] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoadingLink, setIsLoadingLink] = useState(!!new URLSearchParams(window.location.search).get('share'));

  // ----------------------------------------
  // ON INITIAL LOAD: Check for Share Link or Token
  // ----------------------------------------
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareId = params.get('share');
    
    if (shareId) {
      // 1. Handle Public Share Link
      fetch(`/api/shared/${shareId}`)
        .then(res => {
          if (!res.ok) throw new Error("Link invalid");
          return res.json();
        })
        .then(data => {
          if (data.companyName) {
            setActiveCompany(data);
            setScreen('app');
            setMode('view');
            setIsGuest(true);
            setIsLoadingLink(false);
          }
        })
        .catch(err => {
          console.error("Error loading shared chart:", err);
          alert("This shared link is invalid or has expired.");
          window.location.href = '/'; 
        });
    } else {
      // 2. Normal Flow: Check for existing token
      setIsLoadingLink(false);
      const token = localStorage.getItem('token');
      const role = localStorage.getItem('role');
      if (token && role) {
        setUserRole(role);
        // If superadmin, fetch all orgs and go to dashboard
        if (role === 'superadmin') {
          fetchCompanies(token);
        } else {
          // If standard user, fetch their specific org
          fetchMyCompany(token);
        }
      }
    }
  }, []);

  // ----------------------------------------
  // API Fetching Helpers
  // ----------------------------------------
  const fetchCompanies = async (token) => {
    try {
      const res = await fetch('/api/companies', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
        setScreen('dashboard');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMyCompany = async (token) => {
    try {
      const res = await fetch('/api/my-company', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveCompany(data);
        setScreen('app');
        setMode('view');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ----------------------------------------
  // Auth Handlers
  // ----------------------------------------
  const handleLogin = (token, role, companyData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
    setUserRole(role);
    setIsGuest(false);
    
    if (role === 'superadmin') {
      fetchCompanies(token);
    } else {
      setActiveCompany(companyData);
      setScreen('app');
      setMode('view');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setUserRole(null);
    setActiveCompany(null);
    setScreen('login');
  };

  // ----------------------------------------
  // Company Data Handlers
  // ----------------------------------------
  const handleUpdateCompany = async (updatedCompany) => {
    setActiveCompany(updatedCompany); // Optimistic UI update
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/companies/${updatedCompany.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedCompany)
      });
      // Optionally re-fetch companies if SuperAdmin
      if (userRole === 'superadmin') fetchCompanies(token);
    } catch (err) {
      console.error("Failed to update company", err);
    }
  };

  const handleDeleteCompany = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/companies/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (userRole === 'superadmin') {
        fetchCompanies(token);
        setScreen('dashboard');
      } else {
        handleLogout();
      }
    } catch (err) {
      console.error("Failed to delete company", err);
    }
  };

  const handleCreateCompany = async (newCompanyData) => {
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/companies', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newCompanyData)
      });
      fetchCompanies(token);
    } catch (err) {
      console.error("Failed to create company", err);
    }
  };

  // ----------------------------------------
  // RENDER LOGIC
  // ----------------------------------------

  // Intercept the render if we are currently loading a shared link
  if (isLoadingLink) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-soft)' }}>
        <h2>Loading Workspace...</h2>
      </div>
    );
  }

  return (
    <div className="app-container">
      
      {/* TOP NAVIGATION BAR */}
      {screen !== 'login' && (
        <header className="topbar">
          <div className="logo-area">
            {activeCompany?.logoUrl 
              ? <img src={activeCompany.logoUrl} alt="Logo" style={{ height: 32, borderRadius: 4 }} />
              : <div style={{ fontWeight: 800, fontSize: '18px', color: 'var(--accent)' }}>ORG CHART WORKSPACE</div>
            }
            {screen === 'app' && (
               <div style={{ marginLeft: 16, fontSize: '20px', fontWeight: 700, color: 'var(--ink)' }}>
                 {activeCompany?.companyName || 'Untitled Organization'}
               </div>
            )}
          </div>
          
          <div className="mode-controls">
            
            {/* SHARE BUTTON & VIEW/SETTINGS TOGGLE (Only for Admins viewing the app) */}
            {screen === 'app' && !isGuest && (
              <>
                <button 
                  className="btn btn-ghost" 
                  style={{ display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--accent)' }}
                  onClick={() => setShowShareModal(true)}
                >
                  🔗 Share
                </button>
                <div className="mode-toggle">
                  <button className={mode === 'view' ? 'active' : ''} onClick={() => setMode('view')}>View</button>
                  <button className={mode === 'admin' ? 'active' : ''} onClick={() => setMode('admin')}>Settings</button>
                </div>
              </>
            )}
            
            {/* SUPER ADMIN CONTROLS */}
            {!isGuest && userRole === 'superadmin' && screen === 'app' && (
              <button className="btn btn-ghost btn-tiny" onClick={() => { setActiveCompany(null); setScreen('dashboard'); }}>
                ← Back to Dashboard
              </button>
            )}

            {!isGuest && userRole === 'superadmin' && screen === 'dashboard' && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-ghost btn-tiny" onClick={() => setShowSuperAdminPwdModal(true)}>Change Password</button>
                <button className="btn btn-ghost btn-tiny" onClick={handleLogout}>Sign Out</button>
              </div>
            )}

            {/* STANDARD USER SIGNOUT */}
            {!isGuest && userRole === 'user' && (
               <button className="btn btn-ghost btn-tiny" onClick={handleLogout}>Sign Out</button>
            )}

            {/* GUEST MODE: Admin Login Button */}
            {isGuest && (
               <button className="btn btn-ghost btn-tiny" onClick={() => {
                 window.location.href = '/'; 
               }}>
                 Admin Login
               </button>
            )}

          </div>
        </header>
      )}

      {/* MAIN CONTENT AREA */}
      <main className={`wrap ${mode === 'view' && screen === 'app' ? 'wrap-full' : ''}`}>
        
        {screen === 'login' && <LoginScreen onLogin={handleLogin} />}
        
        {screen === 'dashboard' && (
          <SuperAdminDashboard 
            companies={companies} 
            onCreateCompany={handleCreateCompany} 
            onDeleteCompany={(id) => window.confirm('Permanently delete this organization?') && handleDeleteCompany(id)} 
            onViewCompany={(id) => {
              const comp = companies.find(c => c.id === id);
              if (comp) { setActiveCompany(comp); setScreen('app'); setMode('view'); }
            }}
            onLogout={handleLogout}
            onForceChangePassword={async (orgId, newPwd) => {
              // API call to force reset an org's password
              const token = localStorage.getItem('token');
              await fetch(`/api/companies/${orgId}/force-password`, {
                 method: 'PUT',
                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                 body: JSON.stringify({ newPassword: newPwd })
              });
              fetchCompanies(token);
            }}
          />
        )}
        
        {screen === 'app' && mode === 'admin' && activeCompany && !isGuest && (
          <Admin 
            company={activeCompany} 
            updateCompany={handleUpdateCompany} 
            onDeleteCompany={() => window.confirm('Permanently delete this organization?') && handleDeleteCompany(activeCompany.id)} 
            onChangePassword={async (currentPwd, newPwd) => {
               // API call to change standard admin password
               const token = localStorage.getItem('token');
               const res = await fetch('/api/change-password', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                  body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd })
               });
               if (!res.ok) {
                 const err = await res.json();
                 throw new Error(err.message);
               }
            }}
            onViewChart={() => setMode('view')} 
          />
        )}
        
        {screen === 'app' && mode === 'view' && activeCompany && (
          <OrgTree 
            data={activeCompany} 
            zoomLevel={zoomLevel} 
            setZoomLevel={setZoomLevel} 
            onPersonClick={(payload) => setSelectedPerson(payload)} 
          />
        )}

      </main>

      {/* MODALS */}
      {selectedPerson && <Modal payload={selectedPerson} onClose={() => setSelectedPerson(null)} />}
      
      {showShareModal && (
        <ShareModal 
          shareUrl={`${window.location.origin}/?share=${activeCompany.id}`} 
          onClose={() => setShowShareModal(false)} 
        />
      )}

      {showSuperAdminPwdModal && (
        <ChangePasswordModal 
          onClose={() => setShowSuperAdminPwdModal(false)} 
          onSubmit={async (currentPwd, newPwd) => {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/change-superadmin-password', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd })
            });
            if (!res.ok) {
              const err = await res.json();
              throw new Error(err.message);
            }
            alert('Super Admin password updated successfully.');
            setShowSuperAdminPwdModal(false);
          }} 
        />
      )}

    </div>
  );
}