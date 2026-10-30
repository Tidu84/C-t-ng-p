import React, { useEffect, useState } from 'react';
import { loadPremiumPlans, onPurchaseEvent, PremiumPlan, purchasePremium, restorePremium, usePremium } from '../utils/premium';

export function PremiumModal({onClose,onUseFree}:{onClose:()=>void;onUseFree:()=>void}){
  const premium=usePremium();const [plans,setPlans]=useState<PremiumPlan[]>([]);
  const [message,setMessage]=useState('');const [busy,setBusy]=useState(true);
  useEffect(()=>{
    let alive=true;const handles: Array<{remove:()=>Promise<void>}>=[];
    loadPremiumPlans().then(items=>{if(alive)setPlans(items);}).catch(()=>{if(alive)setMessage('Chưa tải được gói thuê bao. Anh thử lại sau.');}).finally(()=>{if(alive)setBusy(false);});
    for(const event of ['purchaseCancelled','purchaseError','purchasePending'])void onPurchaseEvent(event,data=>{
      if(!alive)return;setBusy(false);setMessage(event==='purchasePending'?'Giao dịch đang chờ Google Play xác nhận.':event==='purchaseCancelled'?'Anh chưa đăng ký.':data.message||'Anh thử khôi phục giao dịch.');
    }).then(handle=>{if(alive)handles.push(handle);else void handle.remove();}).catch(()=>{});
    return()=>{alive=false;handles.forEach(handle=>void handle.remove());};
  },[]);
  useEffect(()=>{if(premium.active)onClose();},[premium.active,onClose]);
  async function buy(plan:PremiumPlan){setBusy(true);setMessage('');try{await purchasePremium(plan.basePlanId);setMessage('Hoàn tất đăng ký trong Google Play.');}catch{setMessage('Chưa thể đăng ký. Anh thử lại sau.');}finally{setBusy(false);}}
  async function restore(){setBusy(true);try{const result=await restorePremium();setMessage(result.active?'Đã khôi phục quyền truy cập.':'Chưa tìm thấy thuê bao đang hoạt động.');}catch{setMessage('Chưa thể khôi phục. Anh kiểm tra mạng và thử lại.');}finally{setBusy(false);}}
  return <div className="fixed inset-0 z-[80] bg-black/80 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Thuê bao Kỳ thủ">
    <div className="w-full max-w-md rounded-2xl border border-amber-500/40 bg-stone-950 text-stone-100 p-5 shadow-2xl max-h-[90dvh] overflow-y-auto">
      <h2 className="text-xl font-bold text-amber-300">Thuê bao Kỳ thủ</h2>
      <p className="mt-3 text-sm text-stone-300">Mở cả Ham chơi và Lão quái. Máy tính nước ngay trên điện thoại.</p>
      <div className="mt-4 grid gap-3">{plans.map(plan=><button key={plan.basePlanId} disabled={busy} onClick={()=>void buy(plan)} className="rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-left disabled:opacity-50">
        <span className="font-bold">{plan.period==='P1M'?'Gói tháng':'Gói năm'}</span><span className="float-right text-amber-300">{plan.price}/{plan.period==='P1M'?'tháng':'năm'}</span>
      </button>)}</div>
      {!busy&&!plans.length&&<p className="mt-3 text-sm text-stone-400">Thuê bao đang được chuẩn bị. Anh vẫn có thể chơi miễn phí với Người thường.</p>}
      {plans.length>0&&<p className="mt-3 text-xs leading-relaxed text-stone-400">Tự động gia hạn theo kỳ anh chọn. Hủy trong Google Play bất cứ lúc nào; quyền truy cập còn đến hết kỳ đã thanh toán.</p>}
      {message&&<p role="status" className="mt-3 text-sm text-amber-200">{message}</p>}
      <button disabled={busy||!premium.configured} onClick={()=>void restore()} className="mt-4 text-sm underline disabled:opacity-40">Khôi phục giao dịch</button>
      <a className="ml-4 text-sm underline" href="https://play.google.com/store/account/subscriptions" target="_blank" rel="noreferrer">Quản lý thuê bao</a>
      <button onClick={onUseFree} className="mt-5 w-full rounded-lg bg-amber-500 py-3 font-bold text-stone-950">Tiếp tục với Người thường</button>
      <button onClick={onClose} className="mt-2 w-full py-2 text-sm text-stone-400">Đóng</button>
    </div>
  </div>;
}
