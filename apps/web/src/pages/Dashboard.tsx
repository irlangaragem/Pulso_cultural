import { useEffect } from "react";


export function Dashboard() {
  useEffect(() => {
    document.title = "Pulso Cultural - Gestão";
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#110D10' }}>
      <iframe 
        src="/dashboard-pulso-cultural.html" 
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        title="Dashboard Pulso Cultural"
      />
    </div>
  );
}
