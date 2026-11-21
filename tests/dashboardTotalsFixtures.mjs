import {readFileSync} from 'node:fs';
export const A='11111111-1111-4111-8111-111111111111', B='22222222-2222-4222-8222-222222222222', C='33333333-3333-4333-8333-333333333333';
export const H='44444444-4444-4444-8444-444444444444', K='55555555-5555-4555-8555-555555555555';
export const BILL='66666666-6666-4666-8666-666666666666', TRIP='77777777-7777-4777-8777-777777777777';
export function fixtureRows(){
 const specs=[
 [A,null,'2026-09-30',1000,'income','Salary','cash'],
 [A,null,'2026-11-01',0.1,'income','Salary',null],
 [A,null,'2026-11-01',0.2,'income','Salary','cash'],
 [A,null,'2026-11-15',5.25,'expense','Food','cash'],
 [A,null,'2026-11-15',7.1,'expense','Travel','cash',TRIP],
 [A,null,'2026-11-16',10,'income','Salary','cash'],
 [A,null,'2026-10-31',2,'income','เติมเงินวอลเล็ต','cash'],
 [A,null,'2026-11-02',3,'expense','เติมเงินวอลเล็ต','cash'],
 [A,null,'2026-11-03',4,'income','Salary','bank_transfer'],
 [A,null,'2026-11-04',6,'expense','Food','credit_card'],
 [A,H,'2026-11-01',100,'income','Salary','cash'],
 [B,H,'2026-11-15',8.75,'expense','Food','cash'],
 [B,H,'2026-11-14',12,'income','Salary','bank_transfer'],
 [B,H,'2026-11-13',0.1,'expense','Alpha','cash'],
 [B,H,'2026-11-13',0.2,'expense','Alpha','cash'],
 [B,H,'2026-11-13',0.3,'expense','Beta','cash'],
 [B,H,'2026-11-13',0.3,'expense','Gamma','cash'],
 [B,H,'2026-11-13',0.3,'expense','Delta','cash'],
 [B,null,'2026-11-01',9999,'income','Private','cash'],
 [C,K,'2026-11-01',8888,'income','Hidden','cash'],
 [A,null,'2026-08-01',20,'expense','Bill','cash',null,BILL,'2026-11-20'],
 [A,null,'2026-12-15',30,'expense','Bill','cash',null,BILL,'2026-11-25'],
 [A,null,'2026-11-10',2,'expense','Bill','cash',null,BILL,'2026-11-10'],
 [A,null,'2026-11-12',1,'expense','Food','cash'],
 ];
 const rows=specs.map(([user_id,household_id,date,amount,type,category,payment_method,travel_trip_id=null,recurring_bill_id=null,recurring_occurrence_date=null],i)=>({id:'aaaaaaaa-aaaa-4aaa-8aaa-'+String(i+1).padStart(12,'0'),user_id,household_id,date,amount,type,category,payment_method,travel_trip_id,recurring_bill_id,recurring_occurrence_date,title:'SQL fixture '+(i+1),created_at:'2026-11-01T00:00:00.000Z',card_id:null,travel_amount_thb:travel_trip_id?999:null}));
 for(let i=0;i<1005;i++)rows.push({...rows[0],id:'bbbbbbbb-bbbb-4bbb-8bbb-'+String(i+1).padStart(12,'0'),date:'2026-10-15',amount:0.01,type:'expense',category:'Micro'});
 return rows.sort((a,b)=>b.date.localeCompare(a.date)||b.created_at.localeCompare(a.created_at)||b.id.localeCompare(a.id));
}
export function visibleRows(){return fixtureRows().filter(t=>t.user_id===A||t.household_id===H);}
export function scopedRows(rows,o={}){return rows.filter(t=>(o.householdId?t.household_id===o.householdId:!o.personalOnly||t.household_id===null)&&(!o.userIds?.length||o.userIds.includes(t.user_id)));}
export function rangeRows(rows,o={}){return rows.filter(t=>(!o.dateFrom||t.date>=o.dateFrom)&&(!o.dateTo||t.date<=o.dateTo));}
export const cents=n=>Math.round((n+Number.EPSILON)*100)/100;
export const cases=[{name:'all',options:{}},{name:'range',options:{dateFrom:'2026-11-01',dateTo:'2026-11-15'}},{name:'personal',options:{personalOnly:true,userIds:[A],dateFrom:'2026-11-01',dateTo:'2026-11-15'}},{name:'household',options:{householdId:H,dateFrom:'2026-11-01',dateTo:'2026-11-15'}},{name:'member',options:{householdId:H,userIds:[B],dateFrom:'2026-11-01',dateTo:'2026-11-15'}},{name:'emptyMembers',options:{householdId:H,userIds:[]}},{name:'householdWins',options:{householdId:H,personalOnly:true}},{name:'memberAcrossScopes',options:{userIds:[A]}},{name:'emptyRange',options:{dateFrom:'2027-01-01',dateTo:'2027-01-31'}},{name:'emptyScope',options:{householdId:K}},{name:'oneSided',options:{dateFrom:'2026-11-15'}},{name:'reverseRange',options:{dateFrom:'2026-11-16',dateTo:'2026-11-01'}}];
export function readGoldens(){return JSON.parse(readFileSync(new URL('./fixtures/dashboard-totals-golden.json',import.meta.url),'utf8'));}

// Exact pre-Phase-4 MobileDashboardInsights Map/sort rule, retained for proof.
export function legacyTopCategories(rows){const totals=new Map();rows.filter(t=>t.type==='expense').forEach(t=>totals.set(t.category,(totals.get(t.category)??0)+Number(t.amount)));return [...totals.entries()].sort((a,b)=>b[1]-a[1]).slice(0,4).map(([category,amount])=>({category,amount}));}
