import { getLogoUrl } from './logoUrl.js';
export async function checkLogo(channel, signal, fetcher = fetch, decoder = globalThis.createImageBitmap) {
  try {
    const response = await fetcher(getLogoUrl(channel), { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000) });
    if (!response.ok) return { state: 'invalid', reason: `HTTP ${response.status}` };
    if (!response.headers.get('content-type')?.toLowerCase().includes('image/png')) return { state: 'invalid', reason: 'Odgovor nije image/png' };
    const blob = await response.blob();
    const bytes = new Uint8Array(await blob.slice(0, 33).arrayBuffer());
    if (bytes.length < 33 || ![137,80,78,71,13,10,26,10].every((b,i) => bytes[i] === b)) return { state: 'invalid', reason: 'Datoteka nije valjani PNG' };
    if (decoder) { try { const image = await decoder(blob); image.close(); } catch { return { state: 'invalid', reason: 'PNG slika se ne može otvoriti' }; } }
    return { state: 'ok' };
  } catch (error) { if (error.name === 'AbortError') throw error; return { state: 'unknown', reason: 'Mreža ili pristup nisu dostupni; pokušaj ponovno' }; }
}
