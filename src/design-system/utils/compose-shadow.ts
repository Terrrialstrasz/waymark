export function composeShadow(...shadows: Array<string | false | null | undefined>): string {
  const validShadows = shadows.filter(Boolean) as string[];
  return validShadows.length > 0 ? validShadows.join(", ") : "none";
}
