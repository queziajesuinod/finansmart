// @ts-nocheck
import { useEffect, useState } from "react";
import AuthScreen from "./components/AuthScreen.jsx";
import Dashboard from "./components/Dashboard.jsx";
import LockedScreen from "./components/LockedScreen.jsx";
import { C } from "./lib/constants.js";
import { getToken, setToken, me as fetchMe, logout as apiLogout } from "./lib/api.js";

function Splash({ children }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, color: C.muted, fontFamily: "sans-serif" }}>
      {children}
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null); // { user, access }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Retorno do login com Google: ?token=... na URL.
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get("token");
      if (urlToken) {
        setToken(urlToken);
        window.history.replaceState({}, "", window.location.pathname); // limpa a query
      }

      if (getToken()) {
        try {
          const data = await fetchMe();
          setSession(data);
        } catch {
          apiLogout();
        }
      }
      setLoading(false);
    })();
  }, []);

  function handleLogin(data) {
    // data = { token, user, access } (o token já foi salvo pelo api client)
    setSession({ user: data.user, access: data.access });
  }

  function handleLogout() {
    apiLogout();
    setSession(null);
  }

  function handleUserUpdate(user) {
    setSession((s) => (s ? { ...s, user } : s));
  }

  if (loading) return <Splash>Carregando...</Splash>;
  if (!session) return <AuthScreen onLogin={handleLogin} />;
  if (!session.access?.liberado) return <LockedScreen user={session.user} onLogout={handleLogout} />;

  return <Dashboard user={session.user} access={session.access} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />;
}
