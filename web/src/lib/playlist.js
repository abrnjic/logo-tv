import { getLogoUrl, repairLegacyLogoLinks } from './logoUrl.js';

// Keep stream lines, unknown URLs and existing channel identifiers untouched.
export function repairPlaylist(content, channels, findMatch) {
  const byUrl = new Map(channels.flatMap(channel => [
    [getLogoUrl(channel.image), channel], [getLogoUrl(channel), channel],
  ]));
  const validUrls = new Set(byUrl.keys());
  let matchCount = 0;
  let totalChannels = 0;
  const lines = content.split('\n').map(line => {
    if (!line.startsWith('#EXTINF:')) return line;
    totalChannels++;
    const repaired = repairLegacyLogoLinks(line, validUrls);
    const existingLogo = repaired.match(/tvg-logo\s*=\s*(["'])(.*?)\1/i);
    // The exact logo filename is more reliable than fuzzy channel-name matching.
    let knownLogo;
    if (existingLogo) {
      try {
        knownLogo = byUrl.get(getLogoUrl(existingLogo[2]));
      } catch {
        // A malformed external URL must not interrupt the rest of the playlist.
      }
    }
    if (knownLogo) {
      matchCount++;
      return repaired.replace(/tvg-logo\s*=\s*(["']).*?\1/i, `tvg-logo="${getLogoUrl(knownLogo)}"`);
    }
    const commaIndex = repaired.lastIndexOf(',');
    if (commaIndex === -1) return repaired;
    const match = findMatch(repaired.substring(commaIndex + 1).trim());
    if (!match) return repaired;
    matchCount++;
    const attribute = `tvg-logo="${getLogoUrl(match)}"`;
    if (existingLogo) return repaired.replace(/tvg-logo\s*=\s*(["']).*?\1/i, attribute);
    return `${repaired.substring(0, commaIndex)} ${attribute}${repaired.substring(commaIndex)}`;
  });
  return { content: lines.join('\n'), matchCount, totalChannels };
}
