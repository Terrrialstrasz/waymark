const appJson = require("./app.json");

const WAYMARK_ANDROID_DEV_PACKAGE = "com.waymark.lifeos.dev";
const WAYMARK_ANDROID_PROD_PACKAGE = "com.waymark.lifeos";

const WAYMARK_GOOGLE_DRIVE_CLIENT_IDS = {
  dev: "959405842131-d38okrrc1ojit0126erh3dikgn4p0737.apps.googleusercontent.com",
  prod: "959405842131-g84v46bn2cjvu51naim71jm5a32mlrhk.apps.googleusercontent.com",
};

module.exports = () => {
  const explicitVariant = process.env.EXPO_PUBLIC_WAYMARK_APP_VARIANT;
  const variant = explicitVariant === "prod" ? "prod" : explicitVariant === "dev" || process.env.NODE_ENV !== "production" ? "dev" : "prod";
  const isDev = variant === "dev";
  const base = appJson.expo;
  const googleDriveAndroidClientId =
    process.env.EXPO_PUBLIC_WAYMARK_GOOGLE_DRIVE_ANDROID_CLIENT_ID ?? WAYMARK_GOOGLE_DRIVE_CLIENT_IDS[variant];

  return {
    ...base,
    name: isDev ? "Waymark Dev" : base.name,
    android: {
      ...base.android,
      package: isDev ? WAYMARK_ANDROID_DEV_PACKAGE : WAYMARK_ANDROID_PROD_PACKAGE,
    },
    plugins: [...(base.plugins ?? []), "expo-web-browser", "expo-secure-store"],
    scheme: isDev ? "waymark-dev" : "waymark",
    extra: {
      ...base.extra,
      waymark: {
        ...(base.extra?.waymark ?? {}),
        appVariant: variant,
        googleDrive: {
          androidClientId: googleDriveAndroidClientId,
          packageName: isDev ? WAYMARK_ANDROID_DEV_PACKAGE : WAYMARK_ANDROID_PROD_PACKAGE,
          scope: "https://www.googleapis.com/auth/drive.file",
        },
      },
    },
  };
};
