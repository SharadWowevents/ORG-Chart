import React, { useState } from 'react';
import { initials, linesOf, deptColor } from '../utils';
import { ChevronSvg, MinusSvg, PlusSvg } from './Icons';

export const PersonCard = ({ person, color, roleLabel, deptName, small, onClick }) => {
  const cls = `person-card ${small ? 'person-card--sm' : ''}`;
  const avatarCls = `avatar ${small ? 'avatar--sm' : ''} ${person.photoUrl ? 'avatar--photo' : ''}`;
  
  return (
    <div className={cls} style={{ '--card-accent': color }} tabIndex={0} role="button" onClick={() => onClick(person, color, deptName)}>
      <span className={avatarCls} style={person.photoUrl ? {} : { background: color }}>
        {person.photoUrl ? <img className="avatar-img" src={person.photoUrl} alt="" /> : initials(person.name)}
      </span>
      <span className="person-meta">
        <span className="person-name">{person.name || "Unnamed"}</span>
        <span className="person-role">{roleLabel || person.title || ""}</span>
      </span>
    </div>
  );
};

export const OrgTree = ({ data, onPersonClick, zoomLevel, setZoomLevel }) => {
  const [collapsed, setCollapsed] = useState({});
  const toggle = (id) => setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <section className="section">
      <div className="section-head-row">
        <div className="section-title">Org Chart</div>
        <div className="zoom-controls">
          <button className="zoom-btn" onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} disabled={zoomLevel <= 0.5}><MinusSvg/></button>
          <span className="zoom-pct">{Math.round(zoomLevel * 100)}%</span>
          <button className="zoom-btn" onClick={() => setZoomLevel(z => Math.min(1.75, z + 0.1))} disabled={zoomLevel >= 1.75}><PlusSvg/></button>
          <button className="btn btn-ghost btn-tiny zoom-reset" onClick={() => setZoomLevel(1)}>Reset</button>
        </div>
      </div>

      <div className="tree" style={{ '--dept-color': 'var(--accent)' }}>
        <div className="tree-zoom" style={{ transform: `scale(${zoomLevel})` }}>
          <ul>
            <li>
              <div className="org-root">
                <div className="org-root-label">Leadership</div>
                {data.leadership.length ? (
                  <div className="leadership-row">
                    {data.leadership.map(p => (
                      <PersonCard key={p.id} person={p} color="var(--accent)" roleLabel={p.title} onClick={onPersonClick} />
                    ))}
                  </div>
                ) : <p className="tree-empty" style={{ margin: 0 }}>No leadership added yet</p>}
              </div>

              {data.eas?.length > 0 && (
                <div className="ea-row-wrap">
                  <div className="ea-row-label">Executive Assistant{data.eas.length > 1 ? 's' : ''}</div>
                  <div className="ea-row">
                    {data.eas.map(ea => (
                      <div key={ea.id} className="ea-card">
                        <PersonCard person={ea} color="var(--gold)" roleLabel={ea.title || "Executive Assistant"} onClick={onPersonClick} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.departments?.length > 0 && (
                <ul>
                  {data.departments.map((dept, i) => {
                    const color = deptColor(dept.colorIndex || i);
                    const isCol = collapsed[dept.id];
                    return (
                      <li key={dept.id} style={{ '--dept-color': color }}>
                        <div className="dept-node">
                          <div className="dept-pill" style={{ background: color }}>{dept.name || "Untitled department"}</div>
                          <PersonCard person={dept.hod} color={color} roleLabel={dept.hod.title || "Head of Department"} deptName={dept.name} onClick={onPersonClick} />
                          {dept.managers.length > 0 && (
                            <button className="node-toggle" style={{ '--card-accent': color }} onClick={() => toggle(dept.id)}>
                              <ChevronSvg collapsed={isCol} /><span className="node-count">{dept.managers.length}</span>
                            </button>
                          )}
                        </div>
                        
                        {!isCol && dept.managers.length > 0 && (
                          <ul>
                            {dept.managers.map(mgr => {
                              const mCol = collapsed[mgr.id];
                              return (
                                <li key={mgr.id}>
                                  <div className="dept-node--manager">
                                    <PersonCard person={mgr} color={color} roleLabel={mgr.title || "Manager"} deptName={dept.name} onClick={onPersonClick} />
                                    {mgr.team.length > 0 && (
                                      <button className="node-toggle node-toggle--sm" style={{ '--card-accent': color }} onClick={() => toggle(mgr.id)}>
                                        <ChevronSvg collapsed={mCol} /><span className="node-count">{mgr.team.length}</span>
                                      </button>
                                    )}
                                  </div>
                                  {!mCol && mgr.team.length > 0 && (
                                    <ul>
                                      {mgr.team.map(tm => (
                                        <li key={tm.id}>
                                          <PersonCard person={tm} color={color} roleLabel={tm.title || "Team Member"} deptName={dept.name} small onClick={onPersonClick} />
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
};

export const Modal = ({ payload, onClose }) => {
  if (!payload) return null;
  const { person, color, deptName, supports } = payload;
  
  const kras = linesOf(person.kraText);
  const kpis = linesOf(person.kpiText);
  const cadence = linesOf(person.cadenceText);

  return (
    <div className="modal-backdrop" onClick={(e) => e.target.className === 'modal-backdrop' && onClose()}>
      <div className="modal" style={{ '--card-accent': color }} role="dialog">
        <button className="modal-close" onClick={onClose}>&times;</button>
        <div className="modal-head">
          <span className={`avatar avatar--lg ${person.photoUrl ? 'avatar--photo' : ''}`} style={person.photoUrl ? {} : { background: color }}>
            {person.photoUrl ? <img className="avatar-img" src={person.photoUrl} alt="" /> : initials(person.name)}
          </span>
          <div>
            <h2 className="modal-name">{person.name}</h2>
            <p className="modal-role">{person.title} {deptName && ` · ${deptName}`}</p>
            {supports?.length > 0 && <p className="modal-supports">Supports: {supports.join(", ")}</p>}
          </div>
        </div>
        <div className="modal-grid">
          <div className="modal-col">
            <div className="modal-col-title">Key Result Areas</div>
            {kras.length ? <ol className="modal-list">{kras.map((x, i) => <li key={i}>{x}</li>)}</ol> : <p className="modal-empty">Not set yet</p>}
          </div>
          <div className="modal-col">
            <div className="modal-col-title">KPIs</div>
            {kpis.length ? <ol className="modal-list">{kpis.map((x, i) => <li key={i}>{x}</li>)}</ol> : <p className="modal-empty">Not set yet</p>}
          </div>
          <div className="modal-col">
            <div className="modal-col-title">Cadence</div>
            {cadence.length ? <ol className="modal-list">{cadence.map((x, i) => <li key={i}>{x}</li>)}</ol> : <p className="modal-empty">Not set yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
};