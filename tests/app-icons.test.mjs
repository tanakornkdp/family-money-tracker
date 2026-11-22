import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { loadTsModule } from './loadTsModule.mjs';
const root=new URL('../',import.meta.url);
const manifest=loadTsModule('app/manifest.ts').default;
function pngSize(path){const b=readFileSync(new URL(path,root));assert.equal(b.subarray(1,4).toString(),'PNG');return [b.readUInt32BE(16),b.readUInt32BE(20)];}
test('installed app and Apple icons use existing square PNGs with matching declared sizes',()=>{
  for(const icon of manifest().icons){assert.equal(icon.type,'image/png');assert.deepEqual(pngSize('public'+icon.src),icon.sizes.split('x').map(Number));}
  assert.deepEqual(pngSize('app/icon.png'),[512,512]);assert.deepEqual(pngSize('app/apple-icon.png'),[180,180]);
  const ico=readFileSync(new URL('app/favicon.ico',root));assert.equal(ico.readUInt16LE(2),1);assert.equal(ico.readUInt16LE(4),3);
  for(let i=0;i<3;i++){const offset=6+i*16,size=ico.readUInt32LE(offset+8),start=ico.readUInt32LE(offset+12);assert.ok(start+size<=ico.length);assert.equal(ico.subarray(start+1,start+4).toString(),'PNG');assert.equal(ico.readUInt32BE(start+16),ico[offset]);assert.equal(ico.readUInt32BE(start+20),ico[offset+1]);}
});
test('service worker installs current manifest assets and removes only obsolete app caches',async()=>{
  const events={},pending=[],seen=[],removed=[];
  runInNewContext(readFileSync(new URL('public/sw.js',root),'utf8'),{self:{addEventListener:(name,fn)=>events[name]=fn,skipWaiting(){},clients:{claim(){}},location:{origin:'https://example.test'}},caches:{open:async name=>({addAll:async paths=>{seen.push({name,paths:Array.from(paths)});for(const path of paths)pngSize('public'+path);}}),keys:async()=>['family-money-shell-v2','unrelated-cache','family-money-shell-v3'],delete:async name=>removed.push(name)}});
  const event={waitUntil:p=>pending.push(p)};events.install(event);events.activate(event);await Promise.all(pending);
  assert.deepEqual(seen[0].paths,manifest().icons.map(icon=>icon.src));assert.notEqual(seen[0].name,'family-money-shell-v2');assert.deepEqual(removed,['family-money-shell-v2']);
});
