import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Capacitor } from '@capacitor/core';
import { initializeBoard } from './chessRules';

const cap=Capacitor as any;
cap.PluginHeaders=[{name:'NativeEngine',methods:[{name:'search',rtype:'promise'},{name:'cancel',rtype:'promise'}]}];
cap.isNativePlatform=()=>true;
cap.getPlatform=()=> 'android';
const requests:any[]=[];
let answer:any={move:'a3a4',depth:4,nodes:100,elapsedMs:200};
cap.nativePromise=async(_plugin:string,method:string,input:any)=>{
  if(method==='cancel')return;
  requests.push(input);
  if(answer instanceof Error)throw answer;
  return answer;
};
const { searchBestMoveViaWorker,cancelCurrentWorkerSearch }=await import('./aiWorkerService');

test('Android selects distinct native engines, sends public data and never falls back for paid levels',async()=>{
  const board=initializeBoard();
  try{
    await searchBestMoveViaWorker(board,'red','medium',5);
    assert.equal(requests.at(-1).engine,'abjchess');
    assert.equal(requests.at(-1).timeMs,5000);
    await searchBestMoveViaWorker(board,'red','hard',10);
    assert.equal(requests.at(-1).engine,'jqe');
    const first=requests.at(-1);
    const changed=board.map(row=>row.map(p=>p?.isCovered?{...p,trueRole:'chariot' as const,id:'hidden-secret'}:p));
    await searchBestMoveViaWorker(changed,'red','hard',10);
    assert.equal(requests.at(-1).fen,first.fen);
    assert.equal(requests.at(-1).rootMoves,first.rootMoves);
    assert.equal(JSON.stringify(requests.at(-1)).includes('hidden-secret'),false);
    assert.equal(Object.hasOwn(first,'board'),false);
    answer={move:'a6a5'};
    await assert.rejects(searchBestMoveViaWorker(board,'red','hard',5),/rejected by app rules/);
    answer=new Error('native offline');
    await assert.rejects(searchBestMoveViaWorker(board,'red','medium',5),/native offline/);
    answer={cancelled:true};
    await assert.rejects(searchBestMoveViaWorker(board,'red','hard',5),{name:'AbortError'});
  }finally{cancelCurrentWorkerSearch();}
});
