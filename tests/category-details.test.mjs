import {test} from 'node:test';
import assert from 'node:assert/strict';
import {groupCategoryDetails} from '../lib/utils/categoryDetails.mjs';
test('category drilldown accounts for every selected row and keeps same-name templates distinct by id',()=>{
 const rows=[{id:'1',title:'Netflix',date:'2026-11-01',category:'บันเทิง',amount:1200,type:'expense'}, {id:'2',title:'Youtube',date:'2026-11-15',category:'บันเทิง',amount:800,type:'expense'}, {id:'3',title:'Coffee',date:'2026-11-12',category:'เครื่องดื่ม',amount:50,type:'expense'}];
 const original=JSON.stringify(rows);const groups=groupCategoryDetails(rows);
 assert.equal(groups[0].category,'บันเทิง');assert.equal(groups[0].amount,2000);
 assert.deepEqual(groups[0].rows.map(r=>r.id),['2','1']);assert.equal(groups[1].amount,50);assert.equal(JSON.stringify(rows),original);
 assert.deepEqual(groupCategoryDetails([]),[]);
});
test('category drilldown preserves income, decimals and filtered input without loading other rows',()=>{
 const groups=groupCategoryDetails([{id:'i',title:'Refund',date:'2026-11-01',category:'Mixed',amount:0.1,type:'income'}, {id:'e',title:'Purchase',date:'2026-11-02',category:'Mixed',amount:0.2,type:'expense'}]);
 assert(Math.abs(groups[0].amount-0.3)<1e-10);assert.deepEqual(groups[0].rows.map(r=>r.type),['expense','income']);
});
test('category drilldown excludes malformed legacy amounts just like report charts',()=>{
 assert.deepEqual(groupCategoryDetails([{id:'bad',category:'Bad',date:'2026-11-01',amount:NaN},{id:'negative',category:'Bad',date:'2026-11-01',amount:-1}]),[]);
});
