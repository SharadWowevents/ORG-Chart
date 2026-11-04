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
    <div className="modal-backdrop privacy-policy-backdrop" onClick={handleBackdropClick}>
      <section
        className="modal privacy-policy-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-policy-title"
      >
        {!isMandatory && onClose && (
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close Privacy Policy"
          >
            &times;
          </button>
        )}

        <header className="privacy-policy-header">
          <p className="eyebrow">Org Chart Workspace</p>
          <h2 className="modal-name" id="privacy-policy-title">Privacy Policy</h2>
          <p className="modal-role">
            {isMandatory
              ? "Please review and agree to continue using your account."
              : "Review how your organization data and accounts are managed."}
          </p>
        </header>

        <div className="privacy-policy-content">
          <p><strong>Information we handle.</strong> The workspace stores account details such as your email address and organization name, along with the organization-chart information you or your administrator enter. Your login session is kept in this browser so you can stay signed in.</p>
          <p><strong>How information is used.</strong> This information is used to authenticate accounts, provide and administer the workspace, and display organization charts. If a chart is shared, anyone with its share link may be able to view that chart.</p>
          <p><strong>Your responsibilities and choices.</strong> Only enter personal information that you are authorized to provide. Avoid putting sensitive personal information in a chart. You can sign out to end your current browser session; contact your workspace administrator to request changes to or removal of organization information.</p>
          <p><strong>Storage and updates.</strong> Information is stored by the service to provide the workspace. This policy may be updated as the service changes; material updates may require you to review it again.</p>
        </div>

        <footer className="privacy-policy-actions">
          {isMandatory ? (
            <>
              <button className="btn btn-ghost" onClick={onSignOut}>Sign out</button>
              <button className="btn btn-primary" onClick={onAgree}>I Agree</button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={onClose}>Close</button>
          )}
        </footer>
      </section>
    </div>
  );
};
