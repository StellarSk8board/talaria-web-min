import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { login, getStoredHomeserver, clearStoredSession } from "../matrix/client";

export default function Login() {
  const navigate = useNavigate();
  const [homeserver, setHomeserver] = useState(getStoredHomeserver() ?? "http://100.115.98.81:8008");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If we're already logged in, bounce to /app.
  useEffect(() => {
    if (localStorage.getItem("talaria.web.accessToken")) {
      navigate("/app", { replace: true });
    }
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login({ homeserver, username, password });
      navigate("/app", { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      // If the token is bad, scrub it so we don't get stuck in a loop.
      if (/token|forbidden|401|403|M_UNKNOWN_TOKEN/i.test(msg)) {
        clearStoredSession();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={styles.wrap}>
      <form onSubmit={submit} style={styles.card}>
        <h1 style={styles.brand}>
          <span className="mono" style={{ color: "var(--accent)" }}>◆</span> Talaria
        </h1>
        <p className="dim" style={{ marginTop: -8, marginBottom: 24, fontSize: 13 }}>
          Sign in to talk to your agents.
        </p>

        <label style={styles.label}>
          Homeserver
          <input
            type="text"
            value={homeserver}
            onChange={(e) => setHomeserver(e.target.value)}
            placeholder="https://talaria.my"
            autoComplete="off"
            spellCheck={false}
            required
          />
        </label>

        <label style={styles.label}>
          Username
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="blair"
            autoComplete="username"
            required
          />
        </label>

        <label style={styles.label}>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        <button type="submit" disabled={busy} className="primary" style={{ marginTop: 8 }}>
          {busy ? "Signing in…" : "Sign in"}
        </button>

        <p className="dim" style={{ fontSize: 11, marginTop: 20, textAlign: "center" }}>
          W7 — local dev build. Access token stored in localStorage.
        </p>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    background: "var(--bg-1)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: 28,
    display: "flex",
    flexDirection: "column",
    gap: 14,
    boxShadow: "var(--shadow-1)",
  },
  brand: {
    margin: 0,
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: "-0.02em",
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontSize: 12,
    color: "var(--text-1)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  error: {
    background: "rgba(239, 68, 68, 0.1)",
    border: "1px solid var(--danger)",
    color: "var(--danger)",
    padding: "8px 12px",
    borderRadius: 6,
    fontSize: 12,
    fontFamily: "var(--font-mono)",
    wordBreak: "break-word",
  },
};
