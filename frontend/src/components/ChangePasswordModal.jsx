import React, { useState } from 'react';

export const ChangePasswordModal = ({ onClose, onSubmit }) => {
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async () => {
    setError(""); 
    setSuccess("");
    if (!currentPwd || !newPwd || !confirmPwd) return setError("All fields are required.");
    if (newPwd !== confirmPwd) return setError("New passwords do not match.");
    
    try {
      await onSubmit(currentPwd, newPwd);
      setSuccess("Password updated successfully!");
      setTimeout(onClose, 1500); 
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target.className === 'modal-backdrop' && onClose()}>
      <div className="modal" style={{ maxWidth: 400, borderTop: '6px solid var(--accent)' }}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        <h2 className="auth-title" style={{ marginBottom: 16 }}>Change Password</h2>
        
        <div className="field">
          <label>Current Password</label>
          <input type="password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} />
        </div>
        <div className="field">
          <label>New Password</label>
          <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} />
        </div>
        <div className="field">
          <label>Confirm New Password</label>
          <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} />
        </div>
        
        {error && <div className="auth-error">{error}</div>}
        {success && <div style={{ color: 'var(--accent)', fontWeight: 600, marginBottom: 12, fontSize: '13.5px' }}>{success}</div>}
        
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSubmit}>
          Update Password
        </button>
      </div>
    </div>
  );
};