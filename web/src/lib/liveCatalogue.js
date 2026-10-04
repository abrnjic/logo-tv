import { prepareCatalogue } from './channelNames.js';
import { getLogoUrl } from './logoUrl.js';

const METADATA_URL = 'https://raw.githubusercontent.com/abrnjic/logo-tv/main/web/catalogue-overrides.json';

export async function loadLiveMetadata(signal, fetcher = fetch) {
  const response = await fetcher(`${METADATA_URL}?fresh=${Date.now()}`, {
    cache: 'no-store', signal,
  });
  if (!response.ok) throw new Error('Katalog trenutno nije dostupan.');
  const data = await response.json();
  if (data.version !== 1 || !data.channels || Array.isArray(data.channels) || typeof data.channels !== 'object')
    throw new Error('Neispravan oblik kataloga.');
  return data;
}

export function getSourceLogoUrl(channel, revision = 'main') {
  const path = channel.sourcePath;
  if (!/^logos\/[a-z0-9._/-]+\.png$/i.test(path || '') || path.includes('..'))
    return getLogoUrl(channel.image);
  return `https://raw.githubusercontent.com/abrnjic/logo-tv/${revision}/${path}`;
}

export function prepareLiveCatalogue(raw, metadata, previews = {}, published = {}) {
  return prepareCatalogue(raw, metadata).map(channel => ({
    ...channel,
    previewUrl: previews[channel.id] || (channel.added ? getSourceLogoUrl(channel) : getLogoUrl(channel.image)),
    pendingPublication: Boolean(channel.added && !published[channel.id]),
  }));
}
