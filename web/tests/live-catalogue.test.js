import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareLiveCatalogue, loadLiveMetadata, getSourceLogoUrl } from '../src/lib/liveCatalogue.js';
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
test('runtime catalogue bypasses static build and cache; failures never produce an empty replacement', async () => {
 let requested;
 const result = await loadLiveMetadata(undefined, async (url,options)=>{
   requested={url,options};return {ok:true,json:async()=>data};
 });
 assert.equal(result.channels[id].name,'Lud zbunjen normalan');
 assert.match(requested.url,/raw\.githubusercontent\.com.*\?fresh=/);
 assert.equal(requested.options.cache,'no-store');
 await assert.rejects(loadLiveMetadata(undefined,async()=>({ok:false})),/dostupan/);
 await assert.rejects(loadLiveMetadata(undefined,async()=>({ok:true,json:async()=>({version:1,channels:[]})})),/oblik/);
});
