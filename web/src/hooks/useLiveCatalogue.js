import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CATALOGUE_CACHE_KEY, latestSnapshot, loadLiveSnapshot, prepareLiveCatalogue, validSnapshot } from '../lib/liveCatalogue';
import { getLogoUrl } from '../lib/logoUrl';

export function useLiveCatalogue(raw, initialMetadata) {
  const [snapshot, setSnapshot] = useState(() => {
    const bundled = { metadata: initialMetadata, revision: __CATALOGUE_REVISION__ };
    try { return latestSnapshot(bundled, JSON.parse(localStorage.getItem(CATALOGUE_CACHE_KEY))); }
    catch { return bundled; }
  });
  const snapshotRef = useRef(snapshot);
  const metadata = snapshot.metadata;
  const persist = useCallback(next => {
    snapshotRef.current = next;
    setSnapshot(next);
    if (validSnapshot(next)) {
      try { localStorage.setItem(CATALOGUE_CACHE_KEY, JSON.stringify(next)); }
      catch { /* A blocked/full browser store must not prevent saving to GitHub. */ }
    }
  }, []);
  const [previews, setPreviews] = useState({});
  const [published, setPublished] = useState({});
  const localVersion = useRef(0);
  const previewUrls = useRef(new Map());
  const updateCatalogue = useCallback((data, upload) => {
    // An in-flight public read must never undo a successful owner save.
    localVersion.current++;
    persist({ metadata: data, revision: upload?.sha
      ? { sha: upload.sha, committedAt: upload.committedAt }
      : snapshotRef.current.revision });
    if (upload?.file) {
      const previous = previewUrls.current.get(upload.id);
      if (previous) URL.revokeObjectURL(previous);
      const url = URL.createObjectURL(upload.file);
      previewUrls.current.set(upload.id, url);
      setPreviews(previous => ({ ...previous, [upload.id]: url }));
    }
  }, [persist]);
  useEffect(() => {
    const abort = new AbortController();
    let running = false;
    let lastCheck = 0;
    const refresh = async () => {
      if (running || Date.now() - lastCheck < 15000) return;
      // Owner reads/saves are authoritative for the rest of this session.
      if (localVersion.current) return;
      running = true;
      lastCheck = Date.now();
      try {
        const next = await loadLiveSnapshot(abort.signal, snapshotRef.current.revision);
        if (next && !abort.signal.aborted && !localVersion.current) persist(next);
      } catch { /* Keep the newest confirmed catalogue available offline. */ }
      finally { running = false; }
    };
    refresh();
    const timer = setInterval(refresh, 300000);
    window.addEventListener('focus', refresh);
    return () => {
      abort.abort(); clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [persist]);
  useEffect(() => () => {
    for (const url of previewUrls.current.values()) URL.revokeObjectURL(url);
  }, []);
  const channels = useMemo(
    () => prepareLiveCatalogue(raw, metadata, previews, published),
    [raw, metadata, previews, published],
  );
  useEffect(() => {
    const pending = channels.filter(channel => channel.pendingPublication);
    if (!pending.length) return;
    const abort = new AbortController();
    let running = false;
    const check = async () => {
      if (running) return;
      running = true;
      await Promise.all(pending.map(async channel => {
        try {
          const url = new URL(getLogoUrl(channel.image));
          url.searchParams.set('publication', Date.now());
          const response = await fetch(url, { method: 'HEAD', cache: 'no-store', signal: abort.signal });
          if (response.ok && response.headers.get('content-type')?.includes('image/png') && !abort.signal.aborted)
            setPublished(previous => ({ ...previous, [channel.id]: true }));
        } catch { /* The preview remains available while Pages publishes. */ }
      }));
      running = false;
    };
    check();
    const timer = setInterval(check, 10000);
    return () => { abort.abort(); clearInterval(timer); };
  }, [channels]);
  return { channels, updateCatalogue };
}
