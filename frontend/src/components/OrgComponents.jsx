import { useState } from 'react';
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

import { useRef } from 'react';

// ... (Keep PersonCard component exactly the same) ...

export const OrgTree = ({ data, onPersonClick, zoomLevel, setZoomLevel }) => {
  const [collapsed, setCollapsed] = useState({});
  const toggle = (id) => setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));

  // ==========================================
  // DRAG TO PAN LOGIC
  // ==========================================
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  const handleMouseDown = (e) => {
    // Ignore drag if the user is clicking a button or a person card
    if (e.target.closest('button') || e.target.closest('.person-card')) return;

    setIsDragging(true);
    setStartPos({
      x: e.pageX - containerRef.current.offsetLeft,
      y: e.pageY - containerRef.current.offsetTop,
      scrollLeft: containerRef.current.scrollLeft,
      scrollTop: containerRef.current.scrollTop
    });
  };

  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => setIsDragging(false);

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault(); // Prevents annoying text highlighting while dragging

    const x = e.pageX - containerRef.current.offsetLeft;
    const y = e.pageY - containerRef.current.offsetTop;
    const walkX = x - startPos.x;
    const walkY = y - startPos.y;

    containerRef.current.scrollLeft = startPos.scrollLeft - walkX;
    containerRef.current.scrollTop = startPos.scrollTop - walkY;
  };

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

      {/* DRAGGABLE CONTAINER */}
      <div 
        className="tree" 
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        style={{ 
          '--dept-color': 'var(--accent)',
          cursor: isDragging ? 'grabbing' : 'grab', // The hand cursor magic!
          userSelect: isDragging ? 'none' : 'auto'  // Prevents text selection
        }}
      >
        <div className="tree-zoom" style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}>
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

  // Calculate the max number of rows needed based on the longest array
  const maxRows = Math.max(kras.length, kpis.length, cadence.length);
  
  // Create a structured array of row objects
  const tableRows = Array.from({ length: maxRows }, (_, i) => ({
    kra: kras[i] || "",
    kpi: kpis[i] || "",
    cadence: cadence[i] || ""
  }));

  return (
    <div className="modal-backdrop" onClick={(e) => e.target.className === 'modal-backdrop' && onClose()}>
      <div className="modal" style={{ '--card-accent': color, maxWidth: 800 }} role="dialog">
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

        <div style={{ overflowX: 'auto', marginTop: '24px' }}>
          {maxRows > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-strong)' }}>
                  {/* Added borderRight and adjusted padding for column 1 */}
                  <th style={{ padding: '0 16px 12px 0', color: 'var(--card-accent)', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '.1em', width: '33.3%', borderRight: '1px solid var(--border)' }}>Key Result Areas</th>
                  {/* Added borderRight and adjusted padding for column 2 */}
                  <th style={{ padding: '0 16px 12px 16px', color: 'var(--card-accent)', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '.1em', width: '33.3%', borderRight: '1px solid var(--border)' }}>KPIs</th>
                  {/* Adjusted padding for column 3 (no right border needed here) */}
                  <th style={{ padding: '0 0 12px 16px', color: 'var(--card-accent)', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '.1em', width: '33.3%' }}>Cadence</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    
                    {/* KRA Column */}
                    <td style={{ padding: '12px 16px 12px 0', verticalAlign: 'top', fontWeight: 600, borderRight: '1px solid var(--border)' }}>
                      {row.kra ? <span style={{ color: 'var(--ink-soft)', marginRight: '4px' }}>{i + 1}.</span> : ''}
                      {row.kra || <span style={{ opacity: 0.3 }}>-</span>}
                    </td>

                    {/* KPI Column */}
                    <td style={{ padding: '12px 16px', verticalAlign: 'top', fontWeight: 600, borderRight: '1px solid var(--border)' }}>
                      {row.kpi ? <span style={{ color: 'var(--ink-soft)', marginRight: '4px' }}>{i + 1}.</span> : ''}
                      {row.kpi || <span style={{ opacity: 0.3 }}>-</span>}
                    </td>

                    {/* Cadence Column */}
                    <td style={{ padding: '12px 0 12px 16px', verticalAlign: 'top', fontWeight: 600 }}>
                      {row.cadence ? <span style={{ color: 'var(--ink-soft)', marginRight: '4px' }}>{i + 1}.</span> : ''}
                      {row.cadence || <span style={{ opacity: 0.3 }}>-</span>}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="modal-empty" style={{ textAlign: 'center', padding: '20px 0' }}>No details set yet.</p>
          )}
        </div>

      </div>
    </div>
  );
};