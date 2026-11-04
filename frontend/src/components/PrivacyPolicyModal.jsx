export const PrivacyPolicyModal = ({
  isMandatory = false,
  onAgree,
  onSignOut,
  onClose
}) => {
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isMandatory && onClose) {
      onClose();
    }
  };

  return (
    <div 
      className="modal-backdrop" 
      style={{ zIndex: 300 }}
      onClick={handleBackdropClick}
    >
      <div
        className="modal"
        style={{ 
          maxWidth: 680, 
          borderTop: '6px solid var(--accent)', 
          zIndex: 301,
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        {!isMandatory && onClose && (
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        )}

        <div style={{ marginBottom: 18, paddingRight: 32 }}>
          <p className="eyebrow" style={{ marginBottom: 6 }}>Org Chart Workspace</p>
          <h2 className="modal-name">Privacy Policy</h2>
          <p className="modal-role">
            {isMandatory
              ? "Please review and agree to continue using your account."
              : "Review how your organization data and accounts are managed."}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, color: 'var(--ink-soft)', fontSize: '13.5px', lineHeight: 1.6 }}>
          <p style={{ margin: 0 }}>
            <strong style={{ color: 'var(--ink)' }}>Information we handle.</strong> The workspace stores account details such as your email address and organization name, along with the organization-chart information you or your administrator enter. Your login session is kept in this browser so you can stay signed in.
          </p>
          <p style={{ margin: 0 }}>
            <strong style={{ color: 'var(--ink)' }}>How information is used.</strong> This information is used to authenticate accounts, provide and administer the workspace, and display organization charts. If a chart is shared, anyone with its share link may be able to view that chart.
          </p>
          <p style={{ margin: 0 }}>
            <strong style={{ color: 'var(--ink)' }}>Your responsibilities and choices.</strong> Only enter personal information that you are authorized to provide. Avoid putting sensitive personal information in a chart. You can sign out to end your current browser session; contact your workspace administrator to request changes to or removal of organization information.
          </p>
          <p style={{ margin: 0 }}>
            <strong style={{ color: 'var(--ink)' }}>Storage and updates.</strong> Information is stored by the service to provide the workspace. This policy may be updated as the service changes; material updates may require you to review it again.
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
          {isMandatory ? (
            <>
              <button className="btn btn-ghost" onClick={onSignOut}>Sign out</button>
              <button className="btn btn-primary" onClick={onAgree}>I Agree</button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={onClose}>Close</button>
          )}
        </div>
      </div>
    </div>
  );
};
