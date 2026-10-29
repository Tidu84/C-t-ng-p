import { createContext, useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export const MobileOptionsContext = createContext<{ compact: boolean; target: HTMLElement | null }>({ compact: false, target: null });

/** Reuse the original controls and handlers; only their mobile placement changes. */
export function MobileOptionsSlot({ title, children }: { title: string; children: ReactNode }) {
  const { compact, target } = useContext(MobileOptionsContext);
  if (!compact) return <>{children}</>;
  if (!target) return null;
  return createPortal(<section className="rounded-xl border border-white/10 bg-stone-950/60 p-3 space-y-2">
    <h3 className="text-xs font-semibold text-amber-300">{title}</h3>
    <div className="mobile-options-content">{children}</div>
  </section>, target);
}
