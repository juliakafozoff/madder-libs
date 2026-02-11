import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PageShell from "../components/ui/PageShell";
import Card from "../components/ui/Card";

const InviteRedirect = () => {
  const { shortCode } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!shortCode) return;
    // Redirect directly to /start/:shortCode
    // The backend /story/get/:id endpoint handles both inviteCode and templateId lookup
    navigate(`/start/${shortCode}`, { replace: true });
  }, [shortCode, navigate]);

  // Show loading state while redirecting
  return (
    <PageShell>
      <Card>
        <div className="loader" style={{ margin: '0 auto' }}></div>
        <p style={{ textAlign: 'center', marginTop: 'var(--spacing-md)' }}>
          Redirecting...
        </p>
      </Card>
    </PageShell>
  );
};

export default InviteRedirect;

