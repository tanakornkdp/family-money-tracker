import fs from 'node:fs';
import vm from 'node:vm';
import { gzipSync } from 'node:zlib';
const routes=['(dashboard)/dashboard','mobile/dashboard','(dashboard)/reports','mobile/reports','mobile/transactions','mobile/budget'];
const result={};
for(const route of routes){const context={};vm.runInNewContext(fs.readFileSync(`.next/server/app/${route}/page_client-reference-manifest.js`,'utf8'),context);const manifest=Object.values(context.__RSC_MANIFEST)[0];const chunks=[...new Set(Object.values(manifest.entryJSFiles).flat())];const files=chunks.map(chunk=>fs.readFileSync('.next/'+chunk));result[route]={entryChunks:chunks.length,rawBytes:files.reduce((sum,f)=>sum+f.length,0),gzipBytes:files.reduce((sum,f)=>sum+gzipSync(f).length,0)};}
console.log(JSON.stringify(result,null,2));
