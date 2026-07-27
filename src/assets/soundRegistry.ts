export type WaymarkSoundAssetId = "strength.restBell";

export type WaymarkSoundAsset = {
  id: WaymarkSoundAssetId;
  source: number;
  sourcePath: string;
  recommendedUse: string;
};

const soundAssets: readonly WaymarkSoundAsset[] = [
  {
    id: "strength.restBell",
    source: require("../../assets/sounds/strength_rest_bell.wav"),
    sourcePath: "assets/sounds/strength_rest_bell.wav",
    recommendedUse: "Strength rest timer completion bell",
  },
];

const soundAssetMap = new Map<WaymarkSoundAssetId, WaymarkSoundAsset>(
  soundAssets.map((asset) => [asset.id, asset]),
);

export function getWaymarkSoundAsset(id: WaymarkSoundAssetId): WaymarkSoundAsset {
  const asset = soundAssetMap.get(id);
  if (!asset) {
    throw new Error(`Unknown sound asset: ${id}`);
  }
  return asset;
}

export const waymarkSoundAssets = soundAssets;
