import { MediaAssetKind } from "../domain/waymark";

export type CaptureMediaKind = MediaAssetKind;

export type CaptureMediaAttachment = {
  uri: string;
  kind?: CaptureMediaKind | null;
  fileName?: string | null;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  durationMs?: number | null;
  thumbnailUri?: string | null;
  fileSize?: number | null;
  libraryAssetId?: string | null;
  originalPickerUri?: string | null;
};

export type CapturePhotoAttachment = CaptureMediaAttachment;
