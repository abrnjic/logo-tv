import { useEffect, useRef, useState } from 'react';
import { filterChannels } from '../lib/catalog';
import { checkLogo } from '../lib/logoAvailability';
export default function LogoAvailability({ channels, onEdit }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [stopped, setStopped] = useState(false);
  const abort = useRef(null);
  useEffect(() => () => abort.current?.abort(), []);
  const candidates = filterChannels(channels, { search: query });
  const run = async (list) => {
    if (abort.current) return;
    const controller = new AbortController(); abort.current = controller;
    setResults([]); setTotal(list.length); setBusy(true); setStopped(false);
    let index = 0;
    await Promise.all(Array.from({ length: Math.min(4, list.length) }, async () => {
      while (!controller.signal.aborted && index < list.length) {
        const channel = list[index++];
        try { const result = await checkLogo(channel, controller.signal); if (!controller.signal.aborted) setResults(old => [...old, { channel, ...result }]); }
        catch { break; }
      }
    }));
    if (!controller.signal.aborted) setBusy(false);
    abort.current = null;
  };
  const problems = results.filter(item => item.state !== 'ok');
  return <section className="availability-panel">
    <div className="section-heading"><div><span className="eyebrow">KONTROLA KATALOGA</span><h2>Provjera PNG slika</h2><p>Provjeri javne linkove, format i otvaranje slika. Rezultati vrijede za trenutak provjere.</p></div></div>
    <label className="admin-field">Naziv kanala ili oznaka<input className="url-input" type="search" placeholder="Npr. Kursadžije ili Arena" value={query} disabled={busy} onChange={e => setQuery(e.target.value)} /></label>
    <p className="field-hint">Odabrano: {candidates.length.toLocaleString('hr')} logotipa. Brza provjera obuhvaća prvih 100; cijeli odabir može trajati dulje.</p>
    <div className="scan-actions"><button className="button primary" disabled={busy || !candidates.length} onClick={() => run(candidates.slice(0,100))}>Provjeri do 100 slika</button><button className="button secondary" disabled={busy || !candidates.length} onClick={() => run(candidates)}>Provjeri cijeli odabir</button>{busy && <button className="button secondary" onClick={() => { abort.current?.abort(); setStopped(true); setBusy(false); }}>Zaustavi</button>}</div>
    {total > 0 && <div className="scan-status" role="status"><strong>{stopped ? 'Provjera zaustavljena' : busy ? 'Provjeravam…' : 'Provjera dovršena'} · {results.length} / {total}</strong><progress value={results.length} max={total} /><span>{results.filter(x => x.state === 'ok').length} ispravnih · {results.filter(x => x.state === 'invalid').length} neispravnih · {results.filter(x => x.state === 'unknown').length} neprovjerenih</span></div>}
    {!busy && problems.length > 0 && <button className="button secondary" onClick={() => run(problems.map(x => x.channel))}>Ponovi provjeru problema</button>}
    <div className="scan-results">{problems.map(({channel, state, reason}) => <article className="scan-result" key={channel.id}><div><strong>{channel.displayName || channel.name}</strong><span>{channel.country} · {state === 'unknown' ? 'Nije moguće provjeriti' : 'Problem sa slikom'}: {reason}</span></div><button className="button secondary" onClick={() => onEdit(channel)}>Uredi kanal</button></article>)}</div>
    {!busy && results.length > 0 && !problems.length && <p className="dialog-feedback success">Sve provjerene slike su dostupne i valjani su PNG logotipi.</p>}
  </section>;
}
