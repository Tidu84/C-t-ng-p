import { useSyncExternalStore } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
export interface PremiumStatus {active:boolean;testMode:boolean;configured:boolean;loaded:boolean;supported:boolean}
export interface PremiumPlan {basePlanId:string;period:'P1M'|'P1Y';price:string}
interface BillingApi {
  getStatus():Promise<Partial<PremiumStatus>>;
  catalog():Promise<Partial<PremiumStatus>&{plans:PremiumPlan[]}>;
  restore():Promise<Partial<PremiumStatus>>;
  purchase(input:{basePlanId:string}):Promise<{started:boolean}>;
  addListener(name:string,listener:(event:any)=>void):Promise<{remove():Promise<void>}>;
}
const billing=registerPlugin<BillingApi>('PremiumBilling');
const supported=Capacitor.isNativePlatform()&&Capacitor.getPlatform()==='android';
let status:PremiumStatus={active:false,testMode:false,configured:false,loaded:!supported,supported};
const listeners=new Set<()=>void>();let initialized=false;
function update(next:Partial<PremiumStatus>){status={...status,...next,loaded:true,supported};listeners.forEach(listener=>listener());}
export async function refreshPremium(){
  if(!supported)return;
  try{const next=await billing.getStatus();update(next);if(next.configured)update(await billing.restore());}
  catch {update({});}
}
function initialize(){
  if(initialized||!supported)return;initialized=true;
  void billing.addListener('entitlementChanged',update).catch(()=>{});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refreshPremium();});
  void refreshPremium();
}
export function usePremium(){initialize();return useSyncExternalStore(listener=>{listeners.add(listener);return()=>{listeners.delete(listener);};},()=>status,()=>status);}
export async function loadPremiumPlans(){if(!supported)return [];const result=await billing.catalog();update(result);return result.plans||[];}
export async function restorePremium(){const next=await billing.restore();update(next);return next;}
export const purchasePremium=(basePlanId:string)=>billing.purchase({basePlanId});
export const onPurchaseEvent=(event:string,listener:(data:any)=>void)=>billing.addListener(event,listener);
