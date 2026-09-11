import React, { useState } from 'react';
import { uid, setPath, fileToSquareDataUrl, deptColor } from '../utils';
import { CameraSvg, LogoPlaceholderSvg } from './Icons';
import { ChangePasswordModal } from './ChangePasswordModal';

// ========================================================
// 1. DYNAMIC POINT LIST (Polished, Professional UI)
// ========================================================
const DynamicPointList = ({ label, value, path, onUpdateField }) => {
  const items = typeof value === 'string' ? value.split('\n') : [""];

  const handleUpdate = (index, newVal) => {
    const newItems = [...items];
    newItems[index] = newVal;
    onUpdateField(path, newItems.join('\n'));
  };

  const handleAdd = () => {
    const newItems = [...items, ""];
    onUpdateField(path, newItems.join('\n'));
  };

  const handleRemove = (index) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    if (newItems.length === 0) newItems.push("");
    onUpdateField(path, newItems.join('\n'));
  };

  return (
    <div className="field">
      <label>{label}</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {items.map((item, idx) => (
          <div key={idx} style={{ position: 'relative', width: '100%' }}>
            <input 
              type="text" 
              value={item} 
              onChange={e => handleUpdate(idx, e.target.value)} 
              placeholder={`Point ${idx + 1}`}
              style={{ 
                paddingRight: items.length > 1 ? '32px' : '12px',
                width: '100%'
              }}
            />
            {items.length > 1 && (
              <button 
                type="button" 
                onClick={() => handleRemove(idx)}
                style={{ 
                  position: 'absolute', 
                  right: '10px', 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--ink-soft)',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: 0,
                  lineHeight: 1,
                  opacity: 0.5,
                  transition: 'opacity 0.2s, color 0.2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'var(--danger)'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.color = 'var(--ink-soft)'; }}
                title="Remove point"
              >
                &times;
              </button>
            )}
          </div>
        ))}
        
        <button 
          type="button" 
          onClick={handleAdd}
          style={{ 
            alignSelf: 'flex-start', 
            background: 'transparent',
            border: 'none',
            color: 'var(--accent)',
            fontWeight: 700,
            fontSize: '12.5px',
            cursor: 'pointer',
            padding: '2px 4px',
            marginTop: '2px'
          }}
        >
          + Add point
        </button>
      </div>
    </div>
  );
};

// ========================================================
// 2. MAIN ADMIN COMPONENT
// ========================================================
export const Admin = ({ company, updateCompany, onDeleteCompany, onChangePassword, onViewChart }) => {
  const [expandedKra, setExpandedKra] = useState({});
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState({});

  const updateField = (path, value) => {
    const clone = structuredClone(company);
    setPath(clone, path, value);
    updateCompany(clone);
  };

  const toggleKra = (id) => setExpandedKra(p => ({ ...p, [id]: !p[id] }));

  const handlePhoto = async (e, path) => {
    if (e.target.files?.[0]) {
      const url = await fileToSquareDataUrl(e.target.files[0], 128, 0.85);
      if (url) updateField(`${path}.photoUrl`, url);
    }
  };

  const handleLogo = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => updateField('logoUrl', event.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleAutoSuggest = async (personId, path, roleTitle) => {
    if (!roleTitle) return alert("Please enter a Title/Designation first so the AI knows what to generate.");
    
    setIsGenerating(p => ({ ...p, [personId]: true }));
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/generate-kpi', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          companyName: company.companyName, 
          role: roleTitle 
        })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message);
      }
      
      const data = await res.json();
      
      const clone = structuredClone(company);
      setPath(clone, `${path}.kraText`, (data.kras || []).join('\n'));
      setPath(clone, `${path}.kpiText`, (data.kpis || []).join('\n'));
      setPath(clone, `${path}.cadenceText`, (data.cadence || []).join('\n'));
      updateCompany(clone);

    } catch (err) {
      alert("AI Generation Error: " + err.message);
    } finally {
      setIsGenerating(p => ({ ...p, [personId]: false }));
    }
  };

  const renderPersonEditor = (path, person, color, titlePlaceholder, onRemove) => (
    <div className="repeat-row" style={{ '--card-accent': color }}>
      <div className="repeat-row-main">
        <label className="avatar avatar--sm avatar-upload" style={person.photoUrl ? {} : { background: color }}>
          {person.photoUrl ? <img className="avatar-img" src={person.photoUrl} alt="" /> : "UP"}
          <span className="avatar-upload-badge"><CameraSvg /></span>
          <input type="file" accept="image/*" onChange={e => handlePhoto(e, path)} hidden />
        </label>
        <input type="text" className="rr-name" value={person.name} onChange={e => updateField(`${path}.name`, e.target.value)} placeholder="Full name" />
        <input type="text" className="rr-title" value={person.title} onChange={e => updateField(`${path}.title`, e.target.value)} placeholder={titlePlaceholder} />
        
        <button className="btn btn-tiny btn-ghost" onClick={() => toggleKra(person.id)}>KRA / KPI</button>
        {person.photoUrl && <button className="btn btn-tiny btn-ghost" onClick={() => updateField(`${path}.photoUrl`, "")}>Remove photo</button>}
        {onRemove && <button className="btn btn-tiny btn-danger" onClick={onRemove}>Remove</button>}
      </div>
      
      {expandedKra[person.id] && (
        <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px dashed var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
             <button 
                className="btn btn-tiny" 
                style={{ background: 'var(--surface-2)', color: 'var(--accent)', border: '1px solid var(--accent)' }}
                onClick={() => handleAutoSuggest(person.id, path, person.title)}
                disabled={isGenerating[person.id]}
             >
                {isGenerating[person.id] ? "Generating..." : "✨ Auto-Fill with AI"}
             </button>
          </div>

          <div className="rr-kra-grid" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
            <DynamicPointList label="Top KRAs" value={person.kraText} path={`${path}.kraText`} onUpdateField={updateField} />
            <DynamicPointList label="KPIs" value={person.kpiText} path={`${path}.kpiText`} onUpdateField={updateField} />
            <DynamicPointList label="Cadence" value={person.cadenceText} path={`${path}.cadenceText`} onUpdateField={updateField} />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="admin-shell">
      
      {/* 1. Company Settings */}
      <section className="admin-section">
        <div className="admin-section-title">Company Settings</div>
        <div className="field" style={{ marginTop: '14px' }}>
          <label>Company name</label>
          <input type="text" value={company.companyName} onChange={e => updateField('companyName', e.target.value)} />
        </div>
        <div className="field">
          <label>Admin name</label>
          <input type="text" value={company.adminName} onChange={e => updateField('adminName', e.target.value)} />
        </div>
        <div className="field">
          <label>Email ID</label>
          <input type="email" value={company.email} onChange={e => updateField('email', e.target.value)} />
        </div>
        
        <div className="field">
          <label>Security</label>
          <div>
            <button className="btn btn-ghost btn-tiny" onClick={() => setShowPwdModal(true)}>
              Change Password
            </button>
          </div>
        </div>

        <div className="field">
          <label>Company logo</label>
          <div className="logo-upload-row">
            <label className="logo-upload">
              {company.logoUrl 
                ? <img className="logo-preview-img" src={company.logoUrl} alt="Company logo" />
                : <span className="logo-preview-empty"><LogoPlaceholderSvg /></span>}
              <span className="logo-upload-label">{company.logoUrl ? "Change logo" : "Upload logo"}</span>
              <input type="file" accept="image/*" onChange={handleLogo} hidden />
            </label>
            {company.logoUrl && (
              <button className="btn btn-tiny btn-ghost btn-danger" onClick={() => updateField('logoUrl', "")}>
                Remove logo
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 2. Leadership */}
      <section className="admin-section">
        <div className="admin-section-head">
          <div className="admin-section-title">Leadership</div>
          <button className="btn btn-ghost" onClick={() => {
            const clone = structuredClone(company);
            clone.leadership.push({ id: uid(), name: "", title: "", kraText: "", kpiText: "", cadenceText: "", photoUrl: "" });
            updateCompany(clone);
          }}>+ Add leader</button>
        </div>
        {company.leadership.map((ldr, i) => (
          <React.Fragment key={ldr.id}>
            {renderPersonEditor(`leadership.${i}`, ldr, "var(--accent)", "e.g. CEO", () => {
              const clone = structuredClone(company);
              clone.leadership.splice(i, 1);
              updateCompany(clone);
            })}
          </React.Fragment>
        ))}
      </section>

      {/* 3. Executive Assistants */}
      <section className="admin-section">
        <div className="admin-section-head">
          <div className="admin-section-title">Executive Assistant</div>
          <button className="btn btn-ghost" onClick={() => {
            const clone = structuredClone(company);
            clone.eas = clone.eas || [];
            clone.eas.push({ id: uid(), name: "", title: "Executive Assistant", kraText: "", kpiText: "", cadenceText: "", photoUrl: "", supportsIds: [] });
            updateCompany(clone);
          }}>+ Add EA</button>
        </div>
        {(company.eas || []).map((ea, i) => (
          <div key={ea.id} className="ea-editor">
            {renderPersonEditor(`eas.${i}`, ea, "var(--gold)", "e.g. Executive Assistant", () => {
              const clone = structuredClone(company);
              clone.eas.splice(i, 1);
              updateCompany(clone);
            })}
          </div>
        ))}
      </section>

      {/* 4. Departments */}
      <section className="admin-section">
        <div className="admin-section-head">
          <div className="admin-section-title">Departments</div>
          <button className="btn btn-ghost" onClick={() => {
            const clone = structuredClone(company);
            clone.departments.push({ id: uid(), name: "", colorIndex: clone.departments.length, hod: { id: uid() }, managers: [] });
            updateCompany(clone);
          }}>+ Add department</button>
        </div>
        {company.departments.map((dept, di) => {
          const color = deptColor(dept.colorIndex || di);
          return (
            <div key={dept.id} className="dept-editor" style={{ '--card-accent': color }}>
              <div className="dept-editor-head">
                 <input type="text" className="rr-name" value={dept.name} onChange={e => updateField(`departments.${di}.name`, e.target.value)} placeholder="Department Name" />
                 <button className="btn btn-tiny btn-danger" onClick={() => {
                    const clone = structuredClone(company);
                    clone.departments.splice(di, 1);
                    updateCompany(clone);
                 }}>Remove</button>
              </div>
              <div className="dept-editor-body">
                <div className="dept-editor-label">Head of department</div>
                {renderPersonEditor(`departments.${di}.hod`, dept.hod, color, "e.g. Head of Sales")}
                
                <div className="dept-editor-label">Managers
                  <button className="btn btn-ghost btn-tiny" onClick={() => {
                    const clone = structuredClone(company);
                    clone.departments[di].managers.push({ id: uid(), name: "", team: [] });
                    updateCompany(clone);
                  }}>+ Add manager</button>
                </div>
                
                {dept.managers.map((mgr, mi) => (
                  <div key={mgr.id} className="manager-block">
                    {renderPersonEditor(`departments.${di}.managers.${mi}`, mgr, color, "Manager", () => {
                      const clone = structuredClone(company);
                      clone.departments[di].managers.splice(mi, 1);
                      updateCompany(clone);
                    })}
                    <div className="team-block">
                      <div className="dept-editor-label dept-editor-label--sm">Team members
                        <button className="btn btn-ghost btn-tiny" onClick={() => {
                          const clone = structuredClone(company);
                          clone.departments[di].managers[mi].team.push({ id: uid(), name: "" });
                          updateCompany(clone);
                        }}>+ Add team member</button>
                      </div>
                      {mgr.team.map((tm, ti) => (
                         <React.Fragment key={tm.id}>
                           {renderPersonEditor(`departments.${di}.managers.${mi}.team.${ti}`, tm, color, "Member", () => {
                             const clone = structuredClone(company);
                             clone.departments[di].managers[mi].team.splice(ti, 1);
                             updateCompany(clone);
                           })}
                         </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </section>

      {/* NEW: View Chart Action Section */}
      <section style={{ textAlign: 'center', padding: '20px 0 10px 0' }}>
        <button 
          className="btn btn-primary" 
          onClick={onViewChart}
          style={{ padding: '12px 40px', fontSize: '15px', borderRadius: '30px', boxShadow: '0 4px 14px rgba(124, 58, 237, 0.3)' }}
        >
         Save and View →
        </button>
      </section>

      {/* 5. Danger Zone */}
      <section className="admin-section">
        <div className="admin-section-title">Danger zone</div>
        <button className="btn btn-tiny btn-danger" style={{ marginTop: 14 }} onClick={onDeleteCompany}>Delete this company</button>
      </section>

      {/* Password Modal */}
      {showPwdModal && (
        <ChangePasswordModal onClose={() => setShowPwdModal(false)} onSubmit={onChangePassword} />
      )}
    </div>
  );
};