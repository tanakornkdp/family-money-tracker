import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadTsModule } from './loadTsModule.mjs';
const ChartSkeleton=loadTsModule('components/ui/ChartSkeleton.tsx').default;
const dynamic=(_loader,options)=>options.loading ?? (()=>null);
test('lazy chart fallbacks reserve existing heights and preserve zero-data messages',()=>{
  for(const [name,height] of [['IncomeExpenseChart',300],['StackedExpenseChart',380],['CategoryPieChart',280],['TypePieChart',280]]){
    const Component=loadTsModule('components/dashboard/'+name+'.tsx',{'next/dynamic':{default:dynamic},'@/components/ui/ChartSkeleton':{default:ChartSkeleton}}).default;
    const props=name==='IncomeExpenseChart'?{transactions:[]}:{data:[{}],categories:['Food'],labels:{income:'Income',expense:'Expense'},emptyLabel:'No data'};
    assert.match(renderToStaticMarkup(React.createElement(Component,props)),new RegExp('height:'+height+'px'));
    if(name!=='IncomeExpenseChart')assert.match(renderToStaticMarkup(React.createElement(Component,{...props,data:[]})),/No data/);
  }
});
test('reports skeleton preserves data-dependent plot heights and stacked mobile pie legend rows',()=>{
  const t={reports:{trendTitle:'Trend',categoryTitle:'Categories',categories:'Categories'}};
  const Component=loadTsModule('components/reports/ExpenseReportCharts.tsx',{'next/dynamic':{default:dynamic},'@/components/ui/ChartSkeleton':{default:ChartSkeleton},'@/lib/i18n/LanguageProvider':{useLanguage:()=>({t})}}).default;
  const props={trend:[{label:'Today',amount:1}],categoryComparison:Array.from({length:8},(_,i)=>({category:'Cat'+i,amount:1})),currency:'THB',locale:'en'};
  const html=renderToStaticMarkup(React.createElement(Component,props));
  assert.match(html,/height:244px/);assert.match(html,/height:304px/);assert.match(html,/height:224px/);assert.equal((html.match(/<li /g)??[]).length,6);assert.match(html,/Share by category/);
});
test('CountUp server/reduced-motion initial render contains the final number, not zero',()=>{
  const CountUp=loadTsModule('components/ui/CountUp.tsx').default;
  const html=renderToStaticMarkup(React.createElement(CountUp,{value:'฿1,234.50'}));assert.match(html,/>฿1,234\.50<\/span>/);assert(!html.includes('>0<'));
  const {useReducedMotion}=loadTsModule('lib/hooks/useReducedMotion.ts');
  function Motion(){return React.createElement('span',null,String(useReducedMotion()));}
  assert.equal(renderToStaticMarkup(React.createElement(Motion)),'<span>true</span>');
});
test('dock menus open and close at 420ms and skip both directions for reduced motion',t=>{
  const {animateDockWindow}=loadTsModule('lib/utils/dockWindowMotion.ts');let calls=0;
  const oldMatch=globalThis.matchMedia,oldCSS=globalThis.CSS;
  t.after(()=>{if(oldMatch===undefined)delete globalThis.matchMedia;else globalThis.matchMedia=oldMatch;if(oldCSS===undefined)delete globalThis.CSS;else globalThis.CSS=oldCSS;});
  globalThis.CSS={supports:()=>true};
  const box={getBoundingClientRect:()=>({left:0,top:0,width:300,height:300}),animate(frames,options){calls++;assert.equal(options.duration,420);assert.equal(frames.length,21);return{};}};
  const trigger={querySelector:()=>null,getBoundingClientRect:()=>({left:100,top:350,width:40,height:40})};
  globalThis.matchMedia=()=>({matches:false});animateDockWindow(box,trigger,true);animateDockWindow(box,trigger,false);assert.equal(calls,2);
  globalThis.matchMedia=()=>({matches:true});animateDockWindow(box,trigger,true);animateDockWindow(box,trigger,false);assert.equal(calls,2);
});
