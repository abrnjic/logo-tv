import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadLiveMetadata, prepareLiveCatalogue } from '../lib/liveCatalogue';
import { getLogoUrl } from '../lib/logoUrl';

export function useLiveCatalogue(raw, initialMetadata) {
  const [metadata, setMetadata] = useState(initialMetadata);
  const [previews, setPreviews] = useState({});
  const [published, setPublished] = useState({});
  const localVersion = useRef(0);
  const previewUrls = useRef(new Map());
  const updateCatalogue = useCallback((data, upload) => {
    // An in-flight public read must never undo a successful owner save.
    localVersion.current++;
    setMetadata(data);
    if (upload?.file) {
      const previous = previewUrls.current.get(upload.id);
      if (previous) URL.revokeObjectURL(previous);
      const url = URL.createObjectURL(upload.file);
      previewUrls.current.set(upload.id, url);
      setPreviews(previous => ({ ...previous, [upload.id]: url }));
    }
  }, []);
  useEffect(() => {
    const abort = new AbortController();
    const refresh = async () => {
      // Owner reads/saves are authoritative for the rest of this session.
      if (localVersion.current) return;
      try {
        const data = await loadLiveMetadata(abort.signal);
        if (!abort.signal.aborted && !localVersion.current) setMetadata(data);
      } catch { /* Keep the bundled catalogue available offline. */ }
    };
    refresh();
    const timer = setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    return () => {
      abort.abort(); clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, []);
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
