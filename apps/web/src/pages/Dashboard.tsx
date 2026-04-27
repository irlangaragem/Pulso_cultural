import { useEffect } from "react";
import { DashboardToolbar } from "../components/DashboardToolbar";

export function Dashboard() {
  useEffect(() => {
    document.title = "Pulso Cultural - Gestão";
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#110D10' }}>
      {/* Iframe ocupa tudo menos os 64px do toolbar lateral */}
      <iframe
        src="/dashboard-pulso-cultural.html"
        style={{
          width: 'calc(100% - 64px)',
          height: '100%',
          border: 'none',
          display: 'block',
        }}
        title="Dashboard Pulso Cultural"
      />

      {/* Toolbar flutuante — QR, Upload, PDF */}
      <DashboardToolbar />
    </div>
  );
}
