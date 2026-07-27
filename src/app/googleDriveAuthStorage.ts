import * as SecureStore from "expo-secure-store";

export type StoredGoogleDriveAuth = {
  accessToken: string;
  expiresAt?: number;
  refreshToken?: string;
  scope?: string;
  tokenType?: string;
  updatedAt: string;
  variant: string;
};

const GOOGLE_DRIVE_AUTH_STORAGE_KEY = "waymark.googleDrive.auth.v1";
const TOKEN_EXPIRY_MARGIN_MS = 5 * 60 * 1000;

export async function loadStoredGoogleDriveAuth(variant: string): Promise<StoredGoogleDriveAuth | null> {
  const variantKey = getGoogleDriveAuthStorageKey(variant);
  const rawValue = (await SecureStore.getItemAsync(variantKey)) ?? (await SecureStore.getItemAsync(GOOGLE_DRIVE_AUTH_STORAGE_KEY));
  if (!rawValue) {
    return null;
  }

  const parsed = JSON.parse(rawValue) as Partial<StoredGoogleDriveAuth>;
  if (!parsed.accessToken || parsed.variant !== variant) {
    return null;
  }

  const auth = {
    accessToken: parsed.accessToken,
    expiresAt: typeof parsed.expiresAt === "number" ? parsed.expiresAt : undefined,
    refreshToken: parsed.refreshToken,
    scope: parsed.scope,
    tokenType: parsed.tokenType,
    updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    variant: parsed.variant,
  };
  await SecureStore.setItemAsync(variantKey, JSON.stringify(auth)).catch(() => undefined);
  return auth;
}

export async function saveGoogleDriveAuth(auth: StoredGoogleDriveAuth): Promise<void> {
  await SecureStore.setItemAsync(getGoogleDriveAuthStorageKey(auth.variant), JSON.stringify(auth));
}

export async function clearStoredGoogleDriveAuth(variant?: string): Promise<void> {
  await SecureStore.deleteItemAsync(GOOGLE_DRIVE_AUTH_STORAGE_KEY);
  if (variant) {
    await SecureStore.deleteItemAsync(getGoogleDriveAuthStorageKey(variant));
  }
}

export function isStoredGoogleDriveAuthFresh(auth: StoredGoogleDriveAuth, now = Date.now()): boolean {
  if (!auth.expiresAt) {
    return false;
  }
  return now < auth.expiresAt - TOKEN_EXPIRY_MARGIN_MS;
}

function getGoogleDriveAuthStorageKey(variant: string) {
  return `${GOOGLE_DRIVE_AUTH_STORAGE_KEY}.${variant.replace(/[^A-Za-z0-9._-]/g, "_")}`;
}
