import {readdirSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import assert from 'node:assert/strict';
// Run AFTER next build; test engine must remain outside app JS and runtime traces.
const matches=[];let examined=0;
function scan(directory){for(const entry of readdirSync(directory,{withFileTypes:true})){
 const file=join(directory,entry.name);
 if(/pglite/i.test(entry.name))matches.push(file);
 if(entry.isDirectory())scan(file);
 else if(entry.name.endsWith('.js')||entry.name.endsWith('.nft.json')){
  examined++;
  if(/@electric-sql\/pglite|pglite\.(?:wasm|data)/i.test(readFileSync(file,'utf8')))matches.push(file);
 }
}}
scan('.next/server');scan('.next/static');
assert(examined>0,'Build output required; run npm run build first');
assert.deepEqual(matches,[],'PGlite must not enter app JS/assets or runtime traces');
console.log('PASS: no PGlite references/assets in '+examined+' built app JS/trace files');
