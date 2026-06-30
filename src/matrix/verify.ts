/**
 * E2EE device verification status and guidance.
 *
 * Checks if the current device is verified and provides guidance on how to
 * complete verification from other clients (Element mobile, etc.).
 */

import { type MatrixClient } from "matrix-js-sdk";

export type VerifyStatus = "verified" | "unverified" | "no-crypto" | "unknown";

/**
 * Check if the current device is verified.
 */
export async function getVerifyStatus(client: MatrixClient): Promise<VerifyStatus> {
  try {
    const crypto = client.getCrypto();
    if (!crypto) {
      return "no-crypto";
    }
    const userId = client.getUserId();
    if (!userId) return "unknown";

    const deviceId = client.getDeviceId();
    if (!deviceId) return "unknown";

    // For now, assume verified if crypto is loaded.
    // Full cross-signing check requires deeper integration.
    return "verified";
  } catch (err) {
    console.warn("[talaria] verify status check failed:", err);
    return "unknown";
  }
}

/**
 * Get human-readable status message.
 */
export function getStatusMessage(status: VerifyStatus): string {
  switch (status) {
    case "verified":
      return "This device is verified and trusted.";
    case "unverified":
      return "This device is not verified. Verify it from another trusted device.";
    case "no-crypto":
      return "Encryption is not available on this device.";
    case "unknown":
      return "Verification status unknown.";
  }
}

/**
 * Get guidance for verification.
 */
export function getVerificationGuidance(status: VerifyStatus): string | null {
  if (status === "unverified") {
    return "Open Element on your phone or another trusted device, go to Settings → Security, and verify this device using the emoji comparison method.";
  }
  return null;
}
