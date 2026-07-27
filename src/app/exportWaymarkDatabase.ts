import { Platform, Share } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { WAYMARK_DATABASE_NAME } from "../db/constants";
import { getWaymarkDatabaseAsync } from "../db/sqlite";

type ExportedDatabaseFile = {
  name: string;
  sourceUri: string;
  destinationUri: string;
};

export type WaymarkDatabaseExportResult = {
  exportDirectoryUri: string;
  exportedFiles: ExportedDatabaseFile[];
  archiveUri: string;
  shareAttempted: boolean;
  shareMethod?: "expo-sharing" | "react-native-share";
  sharedUri?: string;
};

const SQLITE_FILE_NAMES = [
  WAYMARK_DATABASE_NAME,
  `${WAYMARK_DATABASE_NAME}-wal`,
  `${WAYMARK_DATABASE_NAME}-shm`,
] as const;

export async function exportWaymarkDatabaseAsync(): Promise<WaymarkDatabaseExportResult> {
  await getWaymarkDatabaseAsync();

  const exportRootDirectory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  const documentDirectory = FileSystem.documentDirectory;
  if (!exportRootDirectory || !documentDirectory) {
    throw new Error("Waymark export directories are unavailable on this device.");
  }

  const sqliteDirectory = `${documentDirectory}SQLite`;
  const exportStamp = buildExportStamp();
  const exportDirectoryUri = `${exportRootDirectory}waymark/debug-db-export/${exportStamp}`;
  await FileSystem.makeDirectoryAsync(exportDirectoryUri, { intermediates: true });

  const exportedFiles: ExportedDatabaseFile[] = [];
  for (const name of SQLITE_FILE_NAMES) {
    const sourceUri = await resolveExistingDatabaseFileUri([
      `${sqliteDirectory}/${name}`,
      `${documentDirectory}${name}`,
    ]);
    if (!sourceUri) {
      if (name === WAYMARK_DATABASE_NAME) {
        throw new Error(`Unable to find ${WAYMARK_DATABASE_NAME} in Expo SQLite storage.`);
      }
      continue;
    }

    const destinationUri = `${exportDirectoryUri}/${name}`;
    await FileSystem.copyAsync({
      from: sourceUri,
      to: destinationUri,
    });
    exportedFiles.push({ name, sourceUri, destinationUri });
  }

  if (exportedFiles.length === 0) {
    throw new Error("No Waymark SQLite files were exported.");
  }

  const manifestUri = `${exportDirectoryUri}/manifest.json`;
  const manifest = {
    exportedAt: new Date().toISOString(),
    exportDirectoryUri,
    files: exportedFiles,
  };
  await FileSystem.writeAsStringAsync(manifestUri, JSON.stringify(manifest, null, 2));

  const archiveUri = `${exportDirectoryUri}/waymark-db-export-${exportStamp}.zip`;
  await writeZipArchiveAsync(archiveUri, [
    ...exportedFiles.map((file) => ({
      name: file.name,
      sourceUri: file.destinationUri,
    })),
    {
      name: "manifest.json",
      contents: JSON.stringify(manifest, null, 2),
    },
  ]);

  console.log("[WaymarkDBExport] Export directory:", exportDirectoryUri);
  for (const file of exportedFiles) {
    console.log(`[WaymarkDBExport] ${file.name}: ${file.destinationUri}`);
  }
  console.log("[WaymarkDBExport] Manifest:", manifestUri);
  console.log("[WaymarkDBExport] Archive:", archiveUri);

  const shareResult = await shareExportIfPossible(archiveUri);

  return {
    exportDirectoryUri,
    exportedFiles,
    archiveUri,
    shareAttempted: shareResult !== undefined,
    shareMethod: shareResult?.method,
    sharedUri: shareResult?.sharedUri,
  };
}

async function resolveExistingDatabaseFileUri(candidateUris: string[]): Promise<string | null> {
  for (const candidateUri of candidateUris) {
    const info = await FileSystem.getInfoAsync(candidateUri);
    if (info.exists) {
      return candidateUri;
    }
  }
  return null;
}

async function shareExportIfPossible(archiveUri: string): Promise<{ method: WaymarkDatabaseExportResult["shareMethod"]; sharedUri: string } | undefined> {
  try {
    if (await Sharing.isAvailableAsync()) {
      console.log("[WaymarkDBExport] Sharing archive with expo-sharing:", archiveUri);
      await Sharing.shareAsync(archiveUri, {
        mimeType: "application/zip",
        dialogTitle: "Share Waymark database export",
        UTI: "public.zip-archive",
      });
      return {
        method: "expo-sharing",
        sharedUri: archiveUri,
      };
    }
  } catch (error) {
    console.warn("[WaymarkDBExport] expo-sharing unavailable, falling back to platform share.", error);
  }

  const shareUri =
    Platform.OS === "android"
      ? await FileSystem.getContentUriAsync(archiveUri)
      : archiveUri;
  console.log("[WaymarkDBExport] Sharing archive with platform share:", shareUri);
  const shareResult = await Share.share({
    title: "Share Waymark database export",
    url: shareUri,
  });
  if (shareResult.action) {
    return {
      method: "react-native-share",
      sharedUri: shareUri,
    };
  }
  return undefined;
}

function buildExportStamp() {
  const now = new Date();
  const year = now.getFullYear().toString().padStart(4, "0");
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const seconds = now.getSeconds().toString().padStart(2, "0");
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

type ZipSourceEntry =
  | {
      name: string;
      sourceUri: string;
      contents?: never;
    }
  | {
      name: string;
      sourceUri?: never;
      contents: string;
    };

async function writeZipArchiveAsync(
  archiveUri: string,
  entries: ZipSourceEntry[],
) {
  const binaryEntries: ZipEntry[] = [];
  for (const entry of entries) {
    if (entry.sourceUri) {
      const base64 = await FileSystem.readAsStringAsync(entry.sourceUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      binaryEntries.push({
        name: entry.name,
        data: decodeBase64(base64),
        modifiedAt: new Date(),
      });
      continue;
    }

    binaryEntries.push({
      name: entry.name,
      data: new TextEncoder().encode(entry.contents),
      modifiedAt: new Date(),
    });
  }

  const archiveBytes = buildStoredZip(binaryEntries);
  await FileSystem.writeAsStringAsync(archiveUri, encodeBase64(archiveBytes), {
    encoding: FileSystem.EncodingType.Base64,
  });
}

type ZipEntry = {
  name: string;
  data: Uint8Array;
  modifiedAt: Date;
};

function buildStoredZip(entries: ZipEntry[]) {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = new TextEncoder().encode(entry.name);
    const crc = crc32(entry.data);
    const dosTime = toDosTime(entry.modifiedAt);
    const dosDate = toDosDate(entry.modifiedAt);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, dosTime, true);
    localView.setUint16(12, dosDate, true);
    localView.setUint32(14, crc >>> 0, true);
    localView.setUint32(18, entry.data.length, true);
    localView.setUint32(22, entry.data.length, true);
    localView.setUint16(26, nameBytes.length, true);
    localView.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, dosTime, true);
    centralView.setUint16(14, dosDate, true);
    centralView.setUint32(16, crc >>> 0, true);
    centralView.setUint32(20, entry.data.length, true);
    centralView.setUint32(24, entry.data.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);

    localParts.push(localHeader, entry.data);
    centralParts.push(centralHeader);
    offset += localHeader.length + entry.data.length;
  }

  const centralDirectorySize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralDirectorySize, true);
  endView.setUint32(16, offset, true);
  endView.setUint16(20, 0, true);

  return concatenateUint8Arrays([...localParts, ...centralParts, endRecord]);
}

function concatenateUint8Arrays(parts: Uint8Array[]) {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function toDosTime(date: Date) {
  return ((date.getHours() & 0x1f) << 11) | ((date.getMinutes() & 0x3f) << 5) | ((Math.floor(date.getSeconds() / 2)) & 0x1f);
}

function toDosDate(date: Date) {
  const year = Math.max(date.getFullYear(), 1980);
  return (((year - 1980) & 0x7f) << 9) | (((date.getMonth() + 1) & 0x0f) << 5) | (date.getDate() & 0x1f);
}

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let index = 0; index < 8; index += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function decodeBase64(value: string) {
  const sanitized = value.replace(/\s+/g, "");
  const outputLength = Math.floor((sanitized.length * 3) / 4) - (sanitized.endsWith("==") ? 2 : sanitized.endsWith("=") ? 1 : 0);
  const result = new Uint8Array(outputLength);
  let outputIndex = 0;

  for (let index = 0; index < sanitized.length; index += 4) {
    const chunk =
      (decodeBase64Char(sanitized[index]) << 18) |
      (decodeBase64Char(sanitized[index + 1]) << 12) |
      (decodeBase64Char(sanitized[index + 2]) << 6) |
      decodeBase64Char(sanitized[index + 3]);

    if (outputIndex < outputLength) {
      result[outputIndex++] = (chunk >> 16) & 0xff;
    }
    if (outputIndex < outputLength) {
      result[outputIndex++] = (chunk >> 8) & 0xff;
    }
    if (outputIndex < outputLength) {
      result[outputIndex++] = chunk & 0xff;
    }
  }

  return result;
}

function decodeBase64Char(char: string | undefined) {
  if (!char || char === "=") {
    return 0;
  }
  const index = BASE64_ALPHABET.indexOf(char);
  if (index < 0) {
    throw new Error(`Invalid base64 character: ${char}`);
  }
  return index;
}

function encodeBase64(data: Uint8Array) {
  let result = "";
  for (let index = 0; index < data.length; index += 3) {
    const first = data[index] ?? 0;
    const second = data[index + 1] ?? 0;
    const third = data[index + 2] ?? 0;
    const chunk = (first << 16) | (second << 8) | third;

    result += BASE64_ALPHABET[(chunk >> 18) & 0x3f];
    result += BASE64_ALPHABET[(chunk >> 12) & 0x3f];
    result += index + 1 < data.length ? BASE64_ALPHABET[(chunk >> 6) & 0x3f] : "=";
    result += index + 2 < data.length ? BASE64_ALPHABET[chunk & 0x3f] : "=";
  }
  return result;
}
