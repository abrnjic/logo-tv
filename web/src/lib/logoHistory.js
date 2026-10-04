import { getSourceLogoUrl } from './liveCatalogue.js';
import { validatePng } from './adminApi.js';
const API = 'https://api.github.com/repos/abrnjic/logo-tv';
export const HISTORY_PAGE_SIZE = 20;
export function validSource(path) {
  return /^logos\/[a-z0-9._/-]+\.png$/i.test(path || '') && !path.includes('..');
}
export async function loadCommits(path, revision, page = 1, signal, fetcher = fetch, size = HISTORY_PAGE_SIZE) {
  if (!(validSource(path) || path === 'web/catalogue-overrides.json')) throw new Error('Putanja izvornog logotipa nije dostupna.');
  const ref = /^[a-f0-9]{40}$/.test(revision || '') ? revision : 'main';
  const response = await fetcher(`${API}/commits?path=${encodeURIComponent(path)}&sha=${ref}&per_page=${size}&page=${page}`, { signal, cache: 'no-store' });
  if (!response.ok) throw new Error(response.status === 403 || response.status === 429 ? 'Dosegnuto je GitHub ograničenje zahtjeva. Pokušaj ponovno kasnije.' : `Povijest trenutno nije dostupna (HTTP ${response.status}).`);
  const items = await response.json();
  if (!Array.isArray(items)) throw new Error('Neispravan odgovor povijesti.');
  return { items: items.filter(item => /^[a-f0-9]{40}$/.test(item.sha || '') && Number.isFinite(Date.parse(item.commit?.committer?.date))).map(item => ({ sha: item.sha, at: Date.parse(item.commit.committer.date), message: String(item.commit.message || '').split('\n')[0], url: validSource(path) ? getSourceLogoUrl({ sourcePath: path }, item.sha) : undefined })), hasMore: /rel="next"/.test(response.headers.get('link') || '') };
}
export async function loadHistoricalPng(channel, version, fetcher = fetch) {
  if (!validSource(channel.sourcePath) || !/^[a-f0-9]{40}$/.test(version.sha || '')) throw new Error('Neispravna povijesna verzija.');
  const response = await fetcher(getSourceLogoUrl(channel, version.sha));
  if (!response.ok || !response.headers.get('content-type')?.includes('image/png')) throw new Error('Odabrani povijesni PNG nije dostupan.');
  const bytes = new Uint8Array(await response.arrayBuffer());
  validatePng(bytes);
  return new File([bytes], `${channel.id}.png`, { type: 'image/png' });
}
export function recentChannels(channels, commits = [], local = []) {
  const entries = new Map();
  const add = (channel, at) => { if (channel && Number.isFinite(at) && (!entries.has(channel.id) || entries.get(channel.id).editedAt < at)) entries.set(channel.id, { ...channel, editedAt: at }); };
  for (const channel of channels) add(channel, Date.parse(channel.updatedAt));
  for (const item of commits) {
    const match = item.message.match(/^Catalogue: (?:save|hide) (.+) \((.+)\)$/);
    if (match) add(channels.find(ch => [ch, ...(ch.variants || [])].some(v => v.name === match[1] && v.country === match[2])), item.at);
  }
  for (const item of local) add(channels.find(ch => (ch.aliases || [ch.id]).includes(item.id)), item.at);
  return [...entries.values()].sort((a, b) => b.editedAt - a.editedAt);
}
export const formatEditDate = at => new Date(at).toLocaleString('hr-HR', { dateStyle: 'medium', timeStyle: 'short' });
