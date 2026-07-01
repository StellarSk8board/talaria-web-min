import type { MatrixClient } from "matrix-js-sdk";
import { useRecoveryKey } from "../matrix/recovery";

interface Props {
  client: MatrixClient;
  onClose: () => void;
}

export default function SecuritySettings({ client, onClose }: Props) {
  const { backupInfo, verificationStatus, loading } = useRecoveryKey(client);

  if (loading) {
    return (
      <div style={styles.overlay} onClick={onClose}>
        <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div style={styles.header}>
            <h2 style={styles.title}>Security Settings</h2>
            <button onClick={onClose} style={styles.closeBtn}>✕</button>
          </div>
          <div style={styles.content}>
            <p>Loading security information...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Security Settings</h2>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.content}>
          {/* Device Verification Status */}
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>Device Verification</h3>
            <div style={styles.statusCard}>
              <div style={styles.statusRow}>
                <span style={styles.label}>Status:</span>
                <span style={{
                  ...styles.status,
                  color: verificationStatus?.isVerified ? "var(--success)" : "var(--danger)"
                }}>
                  {verificationStatus?.isVerified ? "✓ Verified" : "✗ Not Verified"}
                </span>
              </div>
              <div style={styles.statusRow}>
                <span style={styles.label}>Device ID:</span>
                <span style={styles.value}>{backupInfo?.deviceId || "Unknown"}</span>
              </div>
              <div style={styles.statusRow}>
                <span style={styles.label}>User ID:</span>
                <span style={styles.value}>{backupInfo?.userId || "Unknown"}</span>
              </div>
              <p style={styles.message}>{verificationStatus?.message}</p>
            </div>
          </section>

          {/* Key Backup Status */}
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>Key Backup</h3>
            <div style={styles.statusCard}>
              <div style={styles.statusRow}>
                <span style={styles.label}>Backup Status:</span>
                <span style={{
                  ...styles.status,
                  color: backupInfo?.hasBackup ? "var(--success)" : "var(--warning)"
                }}>
                  {backupInfo?.hasBackup ? "✓ Enabled" : "⚠ Not Configured"}
                </span>
              </div>
              
              {backupInfo?.hasBackup && (
                <>
                  <div style={styles.statusRow}>
                    <span style={styles.label}>Backup Version:</span>
                    <span style={styles.value}>v1</span>
                  </div>
                  
                  <div style={styles.recoveryKeySection}>
                    <p style={styles.warning}>
                      ⚠️ Recovery key management is not yet implemented. When you set up key backup, 
                      you'll receive a recovery key that you must store safely. Without it, you won't 
                      be able to access your encrypted messages if you lose all your devices.
                    </p>
                  </div>
                </>
              )}

              {!backupInfo?.hasBackup && (
                <p style={styles.info}>
                  Key backup is not configured. Set up a recovery key to ensure you can access your encrypted messages on new devices.
                </p>
              )}
            </div>
          </section>

          {/* Cross-Signing Information */}
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>Cross-Signing</h3>
            <div style={styles.statusCard}>
              <p style={styles.message}>
                Cross-signing allows your devices to verify each other automatically. 
                When you verify a device from another trusted device, all your other devices will trust it too.
              </p>
              <p style={styles.info}>
                To verify this device, use another verified device (such as Element on your phone) 
                and complete the emoji verification process.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    background: "var(--bg-1)",
    borderRadius: 8,
    width: "90%",
    maxWidth: 600,
    maxHeight: "80vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottom: "1px solid var(--border)",
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 600,
  },
  closeBtn: {
    padding: "8px 12px",
    borderRadius: 6,
    border: "1px solid var(--border)",
    background: "transparent",
    color: "var(--text-1)",
    cursor: "pointer",
    fontSize: 16,
  },
  content: {
    flex: 1,
    overflowY: "auto",
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 12,
    color: "var(--text-0)",
  },
  statusCard: {
    background: "var(--bg-2)",
    borderRadius: 6,
    padding: 16,
    border: "1px solid var(--border)",
  },
  statusRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  label: {
    fontWeight: 500,
    color: "var(--text-1)",
  },
  value: {
    color: "var(--text-0)",
    fontFamily: "monospace",
    fontSize: 13,
  },
  status: {
    fontWeight: 600,
  },
  message: {
    margin: "12px 0 0 0",
    fontSize: 13,
    color: "var(--text-2)",
    lineHeight: 1.5,
  },
  info: {
    margin: "12px 0 0 0",
    fontSize: 13,
    color: "var(--text-2)",
    fontStyle: "italic",
    lineHeight: 1.5,
  },
  warning: {
    margin: "12px 0",
    padding: 12,
    background: "rgba(255, 193, 7, 0.1)",
    border: "1px solid var(--warning)",
    borderRadius: 4,
    fontSize: 13,
    color: "var(--text-0)",
    lineHeight: 1.5,
  },
  recoveryKeySection: {
    marginTop: 16,
  },
  recoveryKeyDisplay: {
    marginTop: 12,
    padding: 12,
    background: "var(--bg-3)",
    borderRadius: 4,
    border: "1px solid var(--border)",
  },
  recoveryKey: {
    display: "block",
    padding: 12,
    background: "var(--bg-1)",
    borderRadius: 4,
    fontSize: 14,
    fontFamily: "monospace",
    letterSpacing: "0.1em",
    wordBreak: "break-all",
    margin: "12px 0",
  },
  button: {
    padding: "8px 16px",
    borderRadius: 6,
    border: "1px solid var(--border)",
    background: "var(--bg-3)",
    color: "var(--text-0)",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
  },
  copyButton: {
    padding: "6px 12px",
    borderRadius: 4,
    border: "1px solid var(--border)",
    background: "var(--bg-2)",
    color: "var(--text-1)",
    cursor: "pointer",
    fontSize: 13,
  },
};
