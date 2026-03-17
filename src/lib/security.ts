export const SECURITY_SETTINGS_KEY = "wallet_security_settings_v1";

export type SecuritySettings = {
  autoLockEnabled: boolean;
  autoLockMinutes: number;
  lockOnHidden: boolean;
  requirePasswordForSensitiveActions: boolean;
};

export const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  autoLockEnabled: true,
  autoLockMinutes: 5,
  lockOnHidden: false,
  requirePasswordForSensitiveActions: true,
};

export function getSecuritySettings(): SecuritySettings {
  try {
    const raw = localStorage.getItem(SECURITY_SETTINGS_KEY);
    if (!raw) return DEFAULT_SECURITY_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      autoLockEnabled:
        typeof parsed?.autoLockEnabled === "boolean"
          ? parsed.autoLockEnabled
          : DEFAULT_SECURITY_SETTINGS.autoLockEnabled,
      autoLockMinutes: normalizeMinutes(parsed?.autoLockMinutes),
      lockOnHidden:
        typeof parsed?.lockOnHidden === "boolean"
          ? parsed.lockOnHidden
          : DEFAULT_SECURITY_SETTINGS.lockOnHidden,
      requirePasswordForSensitiveActions:
        typeof parsed?.requirePasswordForSensitiveActions === "boolean"
          ? parsed.requirePasswordForSensitiveActions
          : DEFAULT_SECURITY_SETTINGS.requirePasswordForSensitiveActions,
    };
  } catch {
    return DEFAULT_SECURITY_SETTINGS;
  }
}

export function saveSecuritySettings(next: SecuritySettings) {
  localStorage.setItem(
    SECURITY_SETTINGS_KEY,
    JSON.stringify({ ...next, autoLockMinutes: normalizeMinutes(next.autoLockMinutes) })
  );
  window.dispatchEvent(new Event("wallet-security-updated"));
}

function normalizeMinutes(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_SECURITY_SETTINGS.autoLockMinutes;
  return Math.max(1, Math.min(60, Math.round(n)));
}
