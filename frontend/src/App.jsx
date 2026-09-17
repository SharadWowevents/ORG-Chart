import React, { useState, useEffect, useRef } from 'react';
import './index.css';
import { DefaultBrandSvg } from './components/Icons';
import { countStats } from './utils';
import { LoginScreen, SuperAdminDashboard } from './components/AuthScreens';
import { OrgTree, Modal } from './components/OrgComponents';
import { Admin } from './components/Admin';
import { ChangePasswordModal } from './components/ChangePasswordModal';

const API_URL = '/api';

// ==========================================
// SMART SWIPEABLE ROW (Shows Arrow Hint on Mobile)
// ==========================================
const SwipeableRow = ({ children, className, style }) => {
  const rowRef = useRef(null);
  const [showArrow, setShowArrow] = useState(false);

  useEffect(() => {
    const checkScroll = () => {
      if (rowRef.current) {
        const { scrollWidth, clientWidth, scrollLeft } = rowRef.current;
        setShowArrow(scrollWidth > clientWidth && Math.ceil(scrollLeft + clientWidth) < scrollWidth - 5);
      }
    };
    checkScroll();
    setTimeout(checkScroll, 150); 
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [children]);

  return (
    <div className="swipe-container" style={style}>
      <div 
        className={className} 
        ref={rowRef} 
        onScroll={(e) => {
          const { scrollWidth, clientWidth, scrollLeft } = e.target;
          setShowArrow(Math.ceil(scrollLeft + clientWidth) < scrollWidth - 5);
        }}
      >
        {children}
      </div>
      {showArrow && <div className="swipe-arrow-hint">→</div>}
    </div>
  );
};

export default function App() {
  const [companies, setCompanies] = useState([]);
  const [activeCompany, setActiveCompany] = useState(null);
  const [showSuperAdminPwdModal, setShowSuperAdminPwdModal] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isLoadingLink, setIsLoadingLink] = useState(!!new URLSearchParams(window.location.search).get('share'));

  const [screen, setScreen] = useState('loading');
  const [mode, setMode] = useState('view');
  const [userRole, setUserRole] = useState(null);

  const [loginError, setLoginError] = useState("");
  const [zoomLevel, setZoomLevel] = useState(1);
  const [modalPayload, setModalPayload] = useState(null);

  // ==========================================
  // AUTH HELPER (Attaches Token automatically)
  // ==========================================
  const fetchWithAuth = async (endpoint, options = {}) => {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

    if (response.status === 401 || response.status === 403) {
      handleLogout();
      throw new Error("Session expired or unauthorized. Please log in again.");
    }
    return response;
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareId = params.get('share');
    
    if (shareId) {
      fetch(`${API_URL}/shared/${shareId}`)
        .then(res => res.json())
        .then(data => {
          if (data.companyName) {
            setActiveCompany(data);
            setScreen('app');
            setMode('view');
            setIsGuest(true); 
          } else {
            alert("This shared link is invalid or has expired.");
          }
        })
        .catch(err => console.error("Error loading shared chart:", err));
    }
  }, []);

  useEffect(() => {
    const verifySession = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setScreen('login');
        return;
      }

      try {
        const res = await fetchWithAuth('/verify');
        const data = await res.json();

        setUserRole(data.role);

        if (data.role === 'superadmin') {
          const compsRes = await fetchWithAuth('/companies');
          setCompanies(await compsRes.json());
          setScreen('dashboard');
        } else if (data.role === 'user') {
          await handleViewCompany(data.companyId);
        }
      } catch (err) {
        handleLogout();
      }
    };
    verifySession();
  }, []);

  // ==========================================
  // API CALLS
  // ==========================================
  const handleForceChangePassword = async (orgId, newPassword) => {
    const res = await fetchWithAuth(`/companies/${orgId}/force-password`, {
      method: 'PUT',
      body: JSON.stringify({ newPassword })
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Failed to reset password.");
    }
    return true;
  };

  const handleLogin = async (email, password) => {
    setLoginError("");
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Invalid credentials.");

      localStorage.setItem('token', data.token);
      setUserRole(data.role);

      if (data.role === 'superadmin') {
        const compsRes = await fetchWithAuth('/companies');
        setCompanies(await compsRes.json());
        setScreen('dashboard');
      } else {
        await handleViewCompany(data.companyId);
      }
    } catch (err) {
      setLoginError(err.message);
    }
  };

  const handleChangePassword = async (currentPassword, newPassword) => {
    const res = await fetchWithAuth('/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword })
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Failed to change password.");
    }
    return true;
  };

  const handleCreateCompany = async (newComp) => {
    try {
      const res = await fetchWithAuth('/companies', { method: 'POST', body: JSON.stringify(newComp) });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to create organization');
      }
      const savedCompany = await res.json();
      setCompanies([...companies, savedCompany]);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleViewCompany = async (id) => {
    try {
      const res = await fetchWithAuth(`/companies/${id}`);
      const fullCompanyData = await res.json();
      setActiveCompany(fullCompanyData);
      setScreen('app');
      setMode('view');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdateCompany = async (updatedData) => {
    try {
      const res = await fetchWithAuth(`/companies/${updatedData.id}`, { method: 'PUT', body: JSON.stringify(updatedData) });
      const savedData = await res.json();
      setActiveCompany(savedData);
      if (userRole === 'superadmin') {
        setCompanies(companies.map(c => c.id === savedData.id ? savedData : c));
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteCompany = async (id) => {
    try {
      await fetchWithAuth(`/companies/${id}`, { method: 'DELETE' });
      if (userRole === 'superadmin') {
        setCompanies(companies.filter(c => c.id !== id));
        setActiveCompany(null);
        setScreen('dashboard');
      } else {
        handleLogout();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUserRole(null);
    setActiveCompany(null);
    setScreen('login');
  };

  // ==========================================
  // RENDER LOGIC
  // ==========================================

  if (screen === 'loading') return <div style={{ padding: '50px', textAlign: 'center' }}>Loading session...</div>;

  const Topbar = () => {
    const stats = activeCompany ? countStats(activeCompany) : null;
    return (
      <header id="topbar">
        <div className="topbar-inner">
          
          {/* UPDATED BRAND BLOCK: Column layout with proper logo nesting */}
          <div className="brand-block" style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start', minWidth: 0, width: '100%' }}>
            
            {/* Row 1: System Logo + Org Chart Workspace */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'scale(0.75)', transformOrigin: 'center left' }}>
                <img src="/logo.png" alt="Workspace Logo" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
              </div>
              <span className="eyebrow" style={{ margin: 0, marginTop: '2px' }}>Org Chart Workspace</span>
            </div>

            {/* Row 2: Active Company Logo + Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {activeCompany?.logoUrl && screen === 'app' && (
                <img 
                  src={activeCompany.logoUrl} 
                  alt="Company Logo" 
                  style={{ height: '36px', width: '36px', borderRadius: '6px', objectFit: 'contain', background: 'var(--surface-2)', border: '1px solid var(--border)' }} 
                />
              )}
              <h1 className="company-title" style={{ margin: 0 }}>
                {screen === 'app' ? (activeCompany?.companyName || 'Untitled Organization') : 'Administration'}
              </h1>
            </div>

            {/* Row 3: Swipeable Stats */}
            {stats && screen === 'app' && (
              <SwipeableRow className="stats-row" style={{ marginTop: '2px' }}>
                <span className="stat-pill"><b>{stats.depts}</b> Departments</span>
                <span className="stat-pill"><b>{stats.hods}</b> HODs</span>
                <span className="stat-pill"><b>{stats.eas}</b> EAs</span>
                <span className="stat-pill"><b>{stats.mgrs}</b> Managers</span>
                <span className="stat-pill"><b>{stats.team}</b> Team members</span>
                <span className="stat-pill"><b>{stats.people}</b> People total</span>
              </SwipeableRow>
            )}
          </div>

          <SwipeableRow className="mode-controls">
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
                  <button className={mode === 'admin' ? 'active' : ''} onClick={() => setMode('admin')}>Edit</button>
                </div>
              </>
            )}
            
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

            {!isGuest && userRole === 'user' && (
               <button className="btn btn-ghost btn-tiny" onClick={handleLogout}>Sign Out</button>
            )}
          </SwipeableRow>

        </div>
      </header>
    );
  };

  return (
    <div className="app-container">
      {screen !== 'login' && <Topbar />}
      <main className={`wrap ${mode === 'view' && screen === 'app' ? 'wrap-full' : ''}`}>
        {screen === 'login' && <LoginScreen onLogin={handleLogin} error={loginError} />}
        {screen === 'dashboard' && userRole === 'superadmin' && (
          <SuperAdminDashboard
            companies={companies}
            onCreateCompany={handleCreateCompany}
            onDeleteCompany={(id) => window.confirm('Delete this organization?') && handleDeleteCompany(id)}
            onViewCompany={handleViewCompany}
            onLogout={handleLogout}
            onForceChangePassword={handleForceChangePassword} 
          />
        )}
        {screen === 'app' && activeCompany && (
          mode === 'view' ? (
            <OrgTree data={activeCompany} zoomLevel={zoomLevel} setZoomLevel={setZoomLevel} onPersonClick={(person, color, deptName) => setModalPayload({ person, color, deptName })} />
          ) : (
            <Admin
              company={activeCompany}
              updateCompany={handleUpdateCompany}
              onDeleteCompany={() => window.confirm('Permanently delete this organization?') && handleDeleteCompany(activeCompany.id)}
              onChangePassword={handleChangePassword}
              onViewChart={() => setMode('view')}
            />
          )
        )}
      </main>
      
      {showSuperAdminPwdModal && (
        <ChangePasswordModal onClose={() => setShowSuperAdminPwdModal(false)} onSubmit={handleChangePassword} />
      )}
      <Modal payload={modalPayload} onClose={() => setModalPayload(null)} />
      {showShareModal && (
        <ShareModal shareUrl={`${window.location.origin}/?share=${activeCompany?.id}`} onClose={() => setShowShareModal(false)} />
      )}
    </div>
  );
}

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
            className="btn-view-chart"
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