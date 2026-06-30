import { useState, useEffect } from "react";
import type { MatrixClient } from "matrix-js-sdk";
import { getVerifyStatus, getStatusMessage, getVerificationGuidance, type VerifyStatus } from "../matrix/verify";

interface Props {
  client: MatrixClient;
  onClose: () => void;
}

export default function Verification({ client, onClose }: Props) {
  const [status, setStatus] = useState<VerifyStatus>("unknown");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
    try {
      setLoading(true);
      const s = await getVerifyStatus(client);
      setStatus(s);
    } catch (err) {
      console.error("Failed to check verification status:", err);
      setStatus("unknown");
    } finally {
      setLoading(false);
    }
  }

  const statusMessage = getStatusMessage(status);
  const guidance = getVerificationGuidance(status);

  const statusColor = status === "verified" ? "var(--success, #4caf50)" :
                      status === "unverified" ? "var(--warning, #ff9800)" :
                      "var(--text-2)";

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h3 style={styles.title}>Device Verification</h3>

        {loading ? (
          <p style={styles.dim}>Checking verification status...</p>
        ) : (
          <>
            <div style={{ ...styles.statusBadge, borderColor: statusColor }}>
              <div style={{ ...styles.statusDot, background: statusColor }} />
              <span style={styles.statusText}>{statusMessage}</span>
            </div>

            {guidance && (
              <div style={styles.guidance}>
                <p style={styles.guidanceTitle}>How to verify this device:</p>
                <p style={styles.guidanceText}>{guidance}</p>
              </div>
            )}

            {status === "verified" && (
              <div style={styles.info}>
                <p style={styles.infoText}>
                  This device can participate in encrypted conversations and verify other devices.
                </p>
              </div>
            )}

            {status === "unverified" && (
              <div style={styles.warning}>
                <p style={styles.warningText}>
                  ⚠️ Unverified devices cannot send or receive encrypted messages until verified from a trusted device.
                </p>
              </div>
            )}
          </>
        )}

        <div style={styles.buttons}>
          <button onClick={onClose} style={styles.closeBtn}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    background: "var(--bg-1)",
    borderRadius: 8,
    padding: 24,
    maxWidth: 500,
    width: "90%",
    border: "1px solid var(--border)",
  },
  title: {
    margin: "0 0 16px 0",
    fontSize: 18,
    fontWeight: 600,
  },
  statusBadge: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 6,
    border: "2px solid",
    marginBottom: 16,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: "50%",
  },
  statusText: {
    fontSize: 14,
    fontWeight: 500,
  },
  guidance: {
    background: "var(--bg-2)",
    padding: 16,
    borderRadius: 6,
    marginBottom: 16,
  },
  guidanceTitle: {
    margin: "0 0 8px 0",
    fontSize: 13,
    fontWeight: 600,
  },
  guidanceText: {
    margin: 0,
    fontSize: 13,
    lineHeight: 1.5,
    color: "var(--text-1)",
  },
  info: {
    background: "rgba(76, 175, 80, 0.1)",
    border: "1px solid rgba(76, 175, 80, 0.3)",
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  infoText: {
    margin: 0,
    fontSize: 13,
    lineHeight: 1.5,
    color: "var(--success, #4caf50)",
  },
  warning: {
    background: "rgba(255, 152, 0, 0.1)",
    border: "1px solid rgba(255, 152, 0, 0.3)",
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  warningText: {
    margin: 0,
    fontSize: 13,
    lineHeight: 1.5,
    color: "var(--warning, #ff9800)",
  },
  dim: {
    color: "var(--text-2)",
    fontSize: 13,
  },
  buttons: {
    display: "flex",
    gap: 12,
    marginTop: 20,
    justifyContent: "flex-end",
  },
  closeBtn: {
    padding: "8px 16px",
    background: "var(--accent)",
    border: "none",
    borderRadius: 4,
    color: "#000",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
  },
};
