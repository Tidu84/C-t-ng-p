import { Capacitor, registerPlugin } from '@capacitor/core';
export const isAndroidEngine = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
export interface NativeEngineResult {move?: string; depth?: number; nodes?: number; elapsedMs?: number; score?: number; engine?: string; cancelled?: boolean}
interface NativeEngineApi {
  search(input:{engine:'abjchess'|'jqe';fen:string;rootMoves:string;timeMs:number;depth:number}):Promise<NativeEngineResult>;
  cancel():Promise<void>;
}
const native = registerPlugin<NativeEngineApi>('NativeEngine');
export function cancelNativeEngine(){if(isAndroidEngine())void native.cancel().catch(()=>{});}
export function searchNativeEngine(engine:'abjchess'|'jqe',fen:string,rootMoves:string[],timeMs:number,depth:number){
  return native.search({engine,fen,rootMoves:rootMoves.join(' '),timeMs,depth});
}
