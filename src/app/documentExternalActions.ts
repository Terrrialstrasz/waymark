import { Linking, Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import * as WebBrowser from "expo-web-browser";

const ANDROID_ACTION_VIEW = "android.intent.action.VIEW";
const ANDROID_FLAG_GRANT_READ_URI_PERMISSION = 1;
const PDF_MIME_TYPE = "application/pdf";

export type PickWaymarkDocumentOptions = {
  multiple?: boolean;
  pdfOnly?: boolean;
};

export async function pickWaymarkDocumentForUpload(options: PickWaymarkDocumentOptions = {}) {
  return DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: options.multiple ?? false,
    type: options.pdfOnly === false ? "*/*" : [PDF_MIME_TYPE],
  });
}

export async function openWaymarkDocumentUri(uri: string, mimeType = PDF_MIME_TYPE) {
  if (Platform.OS === "android" && uri.startsWith("file:")) {
    const contentUri = await FileSystem.getContentUriAsync(uri);
    await IntentLauncher.startActivityAsync(ANDROID_ACTION_VIEW, {
      data: contentUri,
      flags: ANDROID_FLAG_GRANT_READ_URI_PERMISSION,
      type: mimeType,
    });
    return;
  }

  const canOpen = await Linking.canOpenURL(uri);
  if (!canOpen) {
    throw new Error(`No app can open document URI: ${uri}`);
  }
  await Linking.openURL(uri);
}

export async function openWaymarkExternalLink(url: string) {
  if (/^https?:\/\//i.test(url)) {
    await WebBrowser.openBrowserAsync(url);
    return;
  }

  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) {
    throw new Error(`No app can open link: ${url}`);
  }
  await Linking.openURL(url);
}
