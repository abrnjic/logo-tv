import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadCommits, loadHistoricalPng, recentChannels } from '../src/lib/logoHistory.js';
import { checkLogo } from '../src/lib/logoAvailability.js';
import { prepareCatalogue } from '../src/lib/channelNames.js';
import { filterChannels } from '../src/lib/catalog.js';
const sha = 'a'.repeat(40);
const png = readFileSync(new URL('../../logos/247-kanali/247livetvkursadzije.png', import.meta.url));
const channel = { id:'247livetvkursadzije', name:'247 Livetvkursadzije', country:'Međunarodni', category:'General', image:'logos/247livetvkursadzije.png', sourcePath:'logos/247-kanali/247livetvkursadzije.png' };
test('history is tied to exact source and revision; invalid commits and paths cannot form restore URLs', async () => {
  let requested;
  const result = await loadCommits(channel.sourcePath,sha,2,undefined,async url => { requested=url;return new Response(JSON.stringify([{sha,commit:{message:'save',committer:{date:'2026-10-04T12:00:00Z'}}},{sha:'bad'}]),{headers:{link:'<next>; rel="next"'}}); });
  assert.match(requested,/sha=aaaaaaaa/);assert.match(requested,/page=2/);assert.equal(result.items.length,1);assert.equal(result.hasMore,true);
  assert.equal(result.items[0].url,`https://raw.githubusercontent.com/abrnjic/logo-tv/${sha}/${channel.sourcePath}`);
  await assert.rejects(loadCommits('logos/../private.png',sha),/Putanja/);
  await assert.rejects(loadHistoricalPng(channel,{sha:'main'}),/verzija/);
  const file = await loadHistoricalPng(channel,{sha},async () => new Response(png,{headers:{'content-type':'image/png'}}));
  assert.deepEqual(new Uint8Array(await file.arrayBuffer()),new Uint8Array(png));
  await assert.rejects(loadHistoricalPng(channel,{sha},async () => new Response('html',{headers:{'content-type':'text/html'}})),/nije dostupan/);
});
test('shared recent edits deduplicate aliases, include remote saves and persist dates across devices', () => {
  const records=[{...channel,aliases:[channel.id,'old-id'],updatedAt:'2026-10-04T13:00:00Z'}, {id:'other',name:'Other',country:'BiH'}];
  const commits=[{message:'Catalogue: save Other (BiH)',at:Date.parse('2026-10-04T14:00:00Z')}];
  const remote = recentChannels(records,commits);
  assert.deepEqual(remote.map(x=>x.id),['other',channel.id]);
  assert.equal(recentChannels(records,commits,[{id:'old-id',at:Date.parse('2026-10-04T15:00:00Z')}]).length,2);
  assert.equal(recentChannels(records,commits,[{id:'old-id',at:Date.parse('2026-10-04T15:00:00Z')}])[0].id,channel.id);
});
test('friendly names remain searchable by old IDs and never rewrite records or custom names', () => {
  const before=structuredClone(channel);
  const [prepared]=prepareCatalogue([channel]);
  assert.equal(prepared.displayName,'Kursadžije'); assert.deepEqual(channel,before); assert.equal(prepared.id,channel.id);
  assert.equal(filterChannels([prepared],{search:'kursadzije'}).length,1);
  assert.equal(filterChannels([prepared],{search:channel.id}).length,1);
  assert.equal(prepareCatalogue([channel],{version:1,channels:{[channel.id]:{name:'Moj naziv'}}})[0].displayName,'Moj naziv');
});
test('availability distinguishes HTTP, non-PNG, corrupt image, offline, and cancellation', async () => {
  const valid = () => new Response(png,{headers:{'content-type':'image/png'}});
  assert.equal((await checkLogo(channel,undefined,valid,async()=>({close(){}}))).state,'ok');
  assert.equal((await checkLogo(channel,undefined,async()=>new Response('',{status:404}))).reason,'HTTP 404');
  assert.equal((await checkLogo(channel,undefined,async()=>new Response('html',{headers:{'content-type':'text/html'}}))).state,'invalid');
  assert.equal((await checkLogo(channel,undefined,valid,async()=>{throw Error('decode')})).state,'invalid');
  assert.equal((await checkLogo(channel,undefined,async()=>{throw Error('offline')})).state,'unknown');
  await assert.rejects(checkLogo(channel,undefined,async()=>{throw new DOMException('cancel','AbortError')}),/cancel/);
});
