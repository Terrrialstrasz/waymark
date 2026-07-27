export type DriveFolderRef = {
  id: string;
  name: string;
  path: string[];
};

export type DriveFileRef = {
  id: string;
  name: string;
  folderId: string;
  parentIds?: string[];
  mimeType: string;
  sizeBytes?: number;
  md5Checksum?: string;
  webViewLink?: string;
  webContentLink?: string;
  appProperties?: Record<string, string>;
};

export interface DriveMediaAdapter {
  ensureVaultRoot(): Promise<DriveFolderRef>;
  ensureFolderPath(path: string[]): Promise<DriveFolderRef>;
  findFileByMediaAssetId(params: {
    folderId: string;
    mediaAssetId: string;
  }): Promise<DriveFileRef | null>;
  findFileByAppProperties(params: {
    folderId: string;
    appProperties: Record<string, string>;
    fileName?: string;
  }): Promise<DriveFileRef | null>;
  uploadResumable(params: {
    folderId: string;
    fileName: string;
    localUri: string;
    mimeType: string;
    appProperties: Record<string, string>;
  }): Promise<DriveFileRef>;
  uploadJson(params: {
    folderId: string;
    fileName: string;
    json: unknown;
    appProperties: Record<string, string>;
  }): Promise<DriveFileRef>;
  getFileMetadata(fileId: string): Promise<DriveFileRef | null>;
}

export class FakeDriveAdapter implements DriveMediaAdapter {
  private readonly foldersByPath = new Map<string, DriveFolderRef>();
  private readonly filesById = new Map<string, DriveFileRef>();

  async ensureVaultRoot(): Promise<DriveFolderRef> {
    return this.ensureFolderPath(["Waymark Vault", "Media"]);
  }

  async ensureFolderPath(path: string[]): Promise<DriveFolderRef> {
    const key = path.join("/");
    const existing = this.foldersByPath.get(key);
    if (existing) {
      return existing;
    }
    const folder = {
      id: `fake_folder_${this.foldersByPath.size + 1}`,
      name: path[path.length - 1] ?? "Media",
      path: [...path],
    };
    this.foldersByPath.set(key, folder);
    return folder;
  }

  async findFileByMediaAssetId({ folderId, mediaAssetId }: { folderId: string; mediaAssetId: string }): Promise<DriveFileRef | null> {
    return (
      [...this.filesById.values()].find(
        (file) => file.folderId === folderId && file.appProperties?.waymarkMediaAssetId === mediaAssetId,
      ) ?? null
    );
  }

  async findFileByAppProperties({
    folderId,
    appProperties,
    fileName,
  }: {
    folderId: string;
    appProperties: Record<string, string>;
    fileName?: string;
  }): Promise<DriveFileRef | null> {
    return (
      [...this.filesById.values()].find(
        (file) =>
          file.folderId === folderId &&
          (!fileName || file.name === fileName) &&
          Object.entries(appProperties).every(([key, value]) => file.appProperties?.[key] === value),
      ) ?? null
    );
  }

  async uploadResumable(params: {
    folderId: string;
    fileName: string;
    localUri: string;
    mimeType: string;
    appProperties: Record<string, string>;
  }): Promise<DriveFileRef> {
    return this.upsertFakeFile(params.folderId, params.fileName, params.mimeType, params.appProperties);
  }

  async uploadJson(params: {
    folderId: string;
    fileName: string;
    json: unknown;
    appProperties: Record<string, string>;
  }): Promise<DriveFileRef> {
    const jsonText = JSON.stringify(params.json);
    return this.upsertFakeFile(params.folderId, params.fileName, "application/json", {
      ...params.appProperties,
      fakeSizeBytes: String(jsonText.length),
    });
  }

  async getFileMetadata(fileId: string): Promise<DriveFileRef | null> {
    return this.filesById.get(fileId) ?? null;
  }

  private upsertFakeFile(folderId: string, name: string, mimeType: string, appProperties: Record<string, string>) {
    const idempotencyKey = `${folderId}:${appProperties.waymarkMediaAssetId ?? name}:${name}`;
    const existing = [...this.filesById.values()].find(
      (file) => `${file.folderId}:${file.appProperties?.waymarkMediaAssetId ?? file.name}:${file.name}` === idempotencyKey,
    );
    const file: DriveFileRef = {
      id: existing?.id ?? `fake_file_${this.filesById.size + 1}`,
      folderId,
      name,
      mimeType,
      sizeBytes: Number(appProperties.fakeSizeBytes ?? 0),
      webViewLink: `https://drive.fake/${encodeURIComponent(name)}`,
      appProperties,
    };
    this.filesById.set(file.id, file);
    return file;
  }
}
