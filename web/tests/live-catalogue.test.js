import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareLiveCatalogue, loadLiveMetadata, loadLiveSnapshot, latestSnapshot, getSourceLogoUrl } from '../src/lib/liveCatalogue.js';
import { getLogoUrl } from '../src/lib/logoUrl.js';
const id = 'lud-zbunjen-normalan-hrvatska';
const data = {version:1,channels:{[id]:{added:true,name:'Lud zbunjen normalan',country:'Hrvatska',category:'General',hidden:false,sourcePath:`logos/custom/${id}.png`}}};
test('new committed logo is searchable before a Pages build, with a working source preview and stable panel address', () => {
 const [channel] = prepareLiveCatalogue([], data);
 assert.equal(channel.name, 'Lud zbunjen normalan');
 assert.equal(channel.previewUrl, `https://raw.githubusercontent.com/abrnjic/logo-tv/main/logos/custom/${id}.png`);
 assert.equal(channel.pendingPublication,true);
 assert.equal(getLogoUrl(channel.image), `https://abrnjic.github.io/logo-tv/logos/${id}.png`);
 const [published] = prepareLiveCatalogue([],data,{[id]:'blob:local-upload'},{[id]:true});
 assert.equal(published.previewUrl,'blob:local-upload');
 assert.equal(published.pendingPublication,false);
 assert.equal(data.channels[id].hidden,false);
});
test('live updates preserve hiding and do not accept unsafe source paths', () => {
 assert.equal(prepareLiveCatalogue([], {version:1,channels:{[id]:{...data.channels[id],hidden:true}}}).length,0);
 assert.equal(getSourceLogoUrl({image:'logos/test.png',sourcePath:'logos/../../private.png'}),getLogoUrl('logos/test.png'));
});
const sha = 'a'.repeat(40);
const revision = {sha,committedAt:'2026-10-04T05:00:00Z'};
test('public metadata is fetched from the exact confirmed commit, never a cached main snapshot', async () => {
 const requests=[];
 const result=await loadLiveMetadata(undefined,async(url,options)=>{
   requests.push({url,options});
   return {ok:true,json:async()=>url.includes('/commits/main')
     ? {sha,commit:{committer:{date:revision.committedAt}}} : data};
 });
 assert.equal(result.channels[id].name,'Lud zbunjen normalan');
 assert.match(requests[1].url,new RegExp(`/`+sha+`/web/catalogue-overrides.json$`));
 assert.ok(requests.every(request=>request.options.cache==='no-store'));
 await assert.rejects(loadLiveMetadata(undefined,async()=>({ok:false})),/dostupan/);
});
test('a saved logo survives app restart and an older remote response cannot erase it', async () => {
 const saved={metadata:data,revision:{sha:'b'.repeat(40),committedAt:'2026-10-04T05:02:27Z'}};
 const old={metadata:{version:1,channels:{}},revision};
 // Browser restart restores the last confirmed save even with an old app bundle.
 const restored=latestSnapshot(old,JSON.parse(JSON.stringify(saved)));
 assert.equal(prepareLiveCatalogue([],restored.metadata)[0].name,'Lud zbunjen normalan');
 let calls=0;
 const incoming=await loadLiveSnapshot(undefined,restored.revision,async()=>{
   calls++;
   return {ok:true,json:async()=>({sha,commit:{committer:{date:revision.committedAt}}})};
 });
 assert.equal(incoming,null);
 assert.equal(calls,1);
 assert.equal(latestSnapshot(saved,old).revision.sha,saved.revision.sha);
});
test('a later deliberate hide wins over a persisted visible logo',()=>{
 const cached={metadata:data,revision};
 const bundled={metadata:{version:1,channels:{[id]:{...data.channels[id],hidden:true}}},
   revision:{sha:'c'.repeat(40),committedAt:'2026-10-04T05:05:00Z'}};
 assert.equal(prepareLiveCatalogue([],latestSnapshot(bundled,cached).metadata).length,0);
});
test('invalid snapshots and unavailable live reads do not overwrite a confirmed catalogue',async()=>{
 const saved={metadata:data,revision};
 assert.equal(latestSnapshot(saved,{metadata:{version:1,channels:[]},revision}),saved);
 await assert.rejects(loadLiveMetadata(undefined,async(url)=>({ok:true,json:async()=>
   url.includes('/commits/main')?{sha,commit:{committer:{date:revision.committedAt}}}:{version:1,channels:[]}})),/oblik/);
});
