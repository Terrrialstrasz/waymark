export type WaymarkAppVariant = "dev" | "prod";

export type GoogleDriveMediaOAuthConfig = {
  androidClientId: string;
  packageName: string;
  scope: "https://www.googleapis.com/auth/drive.file";
  variant: WaymarkAppVariant;
};

const GOOGLE_DRIVE_MEDIA_CONFIG: Record<WaymarkAppVariant, GoogleDriveMediaOAuthConfig> = {
  dev: {
    androidClientId: "959405842131-d38okrrc1ojit0126erh3dikgn4p0737.apps.googleusercontent.com",
    packageName: "com.waymark.lifeos.dev",
    scope: "https://www.googleapis.com/auth/drive.file",
    variant: "dev",
  },
  prod: {
    androidClientId: "959405842131-g84v46bn2cjvu51naim71jm5a32mlrhk.apps.googleusercontent.com",
    packageName: "com.waymark.lifeos",
    scope: "https://www.googleapis.com/auth/drive.file",
    variant: "prod",
  },
};

export function getWaymarkAppVariant(value = process.env.EXPO_PUBLIC_WAYMARK_APP_VARIANT): WaymarkAppVariant {
  if (value === "prod") {
    return "prod";
  }
  if (value === "dev") {
    return "dev";
  }
  return typeof __DEV__ !== "undefined" && __DEV__ ? "dev" : "prod";
}

export function getGoogleDriveMediaOAuthConfig(variant = getWaymarkAppVariant()) {
  const config = GOOGLE_DRIVE_MEDIA_CONFIG[variant];
  const overrideClientId = process.env.EXPO_PUBLIC_WAYMARK_GOOGLE_DRIVE_ANDROID_CLIENT_ID?.trim();
  return {
    ...config,
    androidClientId: overrideClientId || config.androidClientId,
  };
}
