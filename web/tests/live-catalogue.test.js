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

test('replacing an existing logo uses the confirmed commit after reload, not the cached Pages image', () => {
 const raw = [{id:'247livetvfrasier',name:'Frasier',country:'International',category:'24/7',image:'logos/247livetvfrasier.png',sourcePath:'logos/247-kanali/247livetvfrasier.png'}];
 const metadata = {version:1,channels:{'247livetvfrasier':{name:'Frasier',preferred:true}}};
 const first = prepareLiveCatalogue(raw,metadata,{}, {},'a'.repeat(40))[0];
 const reloaded = prepareLiveCatalogue(raw,metadata,{}, {},'b'.repeat(40))[0];
 assert.equal(reloaded.previewUrl,'https://raw.githubusercontent.com/abrnjic/logo-tv/'+'b'.repeat(40)+'/logos/247-kanali/247livetvfrasier.png');
 assert.notEqual(first.previewUrl,reloaded.previewUrl);
 assert.equal(getLogoUrl(first.image),getLogoUrl(reloaded.image));
 assert.equal(reloaded.pendingPublication,false);
 assert.equal(prepareLiveCatalogue(raw,metadata,{'247livetvfrasier':'blob:replacement'}, {},'b'.repeat(40))[0].previewUrl,'blob:replacement');
 assert.equal(prepareLiveCatalogue(raw,{version:1,channels:{}}, {}, {},'b'.repeat(40))[0].previewUrl,getLogoUrl(raw[0].image));
});

test('panel links and playlist replacements use the new confirmed PNG after a save and reload', async () => {
 const { repairPlaylist } = await import('../src/lib/playlist.js');
 const raw = [{id:'247livetvkursadzije',name:'Kursadzije',country:'International',category:'24/7',image:'logos/247livetvkursadzije.png',sourcePath:'logos/247-kanali/247livetvkursadzije.png'}];
 const metadata = {version:1,channels:{'247livetvkursadzije':{preferred:true}}};
 const before = prepareLiveCatalogue(raw,metadata,{}, {},'a'.repeat(40))[0];
 const after = prepareLiveCatalogue(raw,JSON.parse(JSON.stringify(metadata)),{'247livetvkursadzije':'blob:upload'}, {},'b'.repeat(40))[0];
 assert.notEqual(getLogoUrl(before),getLogoUrl(after));
 assert.equal(getLogoUrl(after),`https://raw.githubusercontent.com/abrnjic/logo-tv/${'b'.repeat(40)}/${raw[0].sourcePath}`);
 assert.ok(!getLogoUrl(after).startsWith('blob:'));
 const input = `#EXTM3U\n#EXTINF:-1 tvg-id="keep" tvg-logo="${getLogoUrl(raw[0].image)}",Custom name\nhttps://stream.example/play`;
 const result = repairPlaylist(input,[after],()=>{throw Error('Exact link should match');});
 assert.equal(result.content,input.replace(getLogoUrl(raw[0].image),getLogoUrl(after)));
 const [added] = prepareLiveCatalogue([],data,{}, {},'b'.repeat(40));
 assert.equal(added.pendingPublication,false);
 assert.match(getLogoUrl(added),/raw.githubusercontent.com/);
});
