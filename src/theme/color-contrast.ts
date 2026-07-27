function normalizeHex(hex: string) {
  const value = hex.replace("#", "").trim();
  if (value.length === 3) {
    return value
      .split("")
      .map((char) => `${char}${char}`)
      .join("");
  }

  return value.slice(0, 6);
}

function channelToLinear(channel: number) {
  const normalized = channel / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : Math.pow((normalized + 0.055) / 1.055, 2.4);
}

export function getRelativeLuminance(hex: string) {
  const normalized = normalizeHex(hex);
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return (
    0.2126 * channelToLinear(red) +
    0.7152 * channelToLinear(green) +
    0.0722 * channelToLinear(blue)
  );
}

export function getContrastRatio(foregroundHex: string, backgroundHex: string) {
  const lighter = Math.max(
    getRelativeLuminance(foregroundHex),
    getRelativeLuminance(backgroundHex),
  );
  const darker = Math.min(
    getRelativeLuminance(foregroundHex),
    getRelativeLuminance(backgroundHex),
  );

  return (lighter + 0.05) / (darker + 0.05);
}

export function formatContrastRatio(foregroundHex: string, backgroundHex: string) {
  return `${getContrastRatio(foregroundHex, backgroundHex).toFixed(2)}:1`;
}

export function meetsContrast(
  foregroundHex: string,
  backgroundHex: string,
  minimumRatio: number,
) {
  return getContrastRatio(foregroundHex, backgroundHex) >= minimumRatio;
}
