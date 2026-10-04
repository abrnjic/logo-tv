import { useEffect, useState } from 'react';
import { loadCommits, formatEditDate } from '../lib/logoHistory';
export default function LogoHistory({ channel, onRestore }) {
  const [state, setState] = useState({ items: [], hasMore: false });
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    const abort = new AbortController();
    setBusy(true); setError('');
    loadCommits(channel.sourcePath, channel.catalogueRevision, page, abort.signal).then(result => {
      if (!abort.signal.aborted) setState(old => ({ ...result, items: page === 1 ? result.items : [...old.items, ...result.items.filter(item => !old.items.some(v => v.sha === item.sha))] }));
    }).catch(err => { if (!abort.signal.aborted) setError(err.message); }).finally(() => { if (!abort.signal.aborted) setBusy(false); });
    return () => abort.abort();
  }, [channel.sourcePath, channel.catalogueRevision, page, attempt]);
  return <section className="history-panel" aria-label="Povijest logotipa">
    <p className="field-hint">Vraćanje objavljuje novu verziju i novi link za panel. Postojeće verzije ostaju sačuvane.</p>
    {state.items.map((item, index) => <article className="history-row" key={item.sha}>
      <img src={item.url} alt={`Verzija od ${formatEditDate(item.at)}`} loading="lazy" />
      <div><strong>{formatEditDate(item.at)}</strong><span className="field-hint">{index === 0 ? 'Trenutna verzija slike' : 'Prethodna verzija slike'}</span></div>
      {index > 0 && <button className="button secondary" onClick={() => onRestore(channel, item)}>Vrati ovaj logo</button>}
    </article>)}
    {busy && <p role="status">Učitavam povijest…</p>}
    {!busy && !error && !state.items.length && <p>Nema dostupnih verzija za ovu sliku.</p>}
    {error && <><p className="inline-error" role="alert">{error}</p><button className="button secondary" onClick={() => setAttempt(x => x + 1)}>Pokušaj ponovno</button></>}
    {!busy && !error && state.hasMore && <button className="button secondary" onClick={() => setPage(x => x + 1)}>Učitaj starije verzije</button>}
  </section>;
}
