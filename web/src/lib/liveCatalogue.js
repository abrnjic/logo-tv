import { prepareCatalogue } from './channelNames.js';
import { getLogoUrl } from './logoUrl.js';

const API = 'https://api.github.com/repos/abrnjic/logo-tv';
const RAW = 'https://raw.githubusercontent.com/abrnjic/logo-tv';
export const CATALOGUE_CACHE_KEY = 'logo-tv-catalogue-snapshot-v1';

export function validSnapshot(snapshot) {
  return Boolean(snapshot && snapshot.metadata?.version === 1 &&
    snapshot.metadata.channels && typeof snapshot.metadata.channels === 'object' &&
    !Array.isArray(snapshot.metadata.channels) &&
    /^[a-f0-9]{40}$/.test(snapshot.revision?.sha || '') &&
    Number.isFinite(Date.parse(snapshot.revision?.committedAt)));
}

export function latestSnapshot(bundled, cached) {
  if (!validSnapshot(cached)) return bundled;
  if (!validSnapshot(bundled)) return cached;
  return Date.parse(cached.revision.committedAt) >= Date.parse(bundled.revision.committedAt)
    ? cached : bundled;
}

export async function loadLiveSnapshot(signal, currentRevision, fetcher = fetch) {
  const options = { cache: 'no-store', signal };
  // Resolve the branch once, then read an immutable commit. Branch CDN caches
  // must never supply a different catalogue than the revision we just checked.
  const headResponse = await fetcher(`${API}/commits/main?fresh=${Date.now()}`, options);
  if (!headResponse.ok) throw new Error('Katalog trenutno nije dostupan.');
  const commit = await headResponse.json();
  const revision = { sha: commit.sha, committedAt: commit.commit?.committer?.date };
  if (!/^[a-f0-9]{40}$/.test(revision.sha || '') || !Number.isFinite(Date.parse(revision.committedAt)))
    throw new Error('Neispravna verzija kataloga.');
  if (currentRevision?.sha === revision.sha) return null;
  if (currentRevision?.committedAt) {
    const currentTime = Date.parse(currentRevision.committedAt);
    const incomingTime = Date.parse(revision.committedAt);
    if (incomingTime < currentTime) return null;
    if (incomingTime === currentTime && currentRevision.sha !== revision.sha) {
      const comparison = await fetcher(`${API}/compare/${currentRevision.sha}...${revision.sha}`, options);
      if (!comparison.ok || (await comparison.json()).status !== 'ahead') return null;
    }
  }
  const response = await fetcher(`${RAW}/${revision.sha}/web/catalogue-overrides.json`, options);
  if (!response.ok) throw new Error('Katalog trenutno nije dostupan.');
  const snapshot = { metadata: await response.json(), revision };
  if (!validSnapshot(snapshot)) throw new Error('Neispravan oblik kataloga.');
  return snapshot;
}

export async function loadLiveMetadata(signal, fetcher = fetch) {
  return (await loadLiveSnapshot(signal, undefined, fetcher)).metadata;
}

export function getSourceLogoUrl(channel, revision = 'main') {
  const path = channel.sourcePath;
  if (!/^logos\/[a-z0-9._/-]+\.png$/i.test(path || '') || path.includes('..'))
    return getLogoUrl(channel.image);
  return `https://raw.githubusercontent.com/abrnjic/logo-tv/${revision}/${path}`;
}

export function prepareLiveCatalogue(raw, metadata, previews = {}, published = {}, revision = 'main') {
  return prepareCatalogue(raw, metadata).map(channel => ({
    ...channel,
    previewUrl: previews[channel.id] || (channel.added || metadata.channels?.[channel.id] ? getSourceLogoUrl(channel, revision) : getLogoUrl(channel.image)),
    pendingPublication: Boolean(channel.added && !published[channel.id]),
  }));
}
