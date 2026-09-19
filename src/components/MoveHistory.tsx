/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import { Move } from '../types';
import { ScrollText } from 'lucide-react';

interface MoveHistoryProps {
  moves: Move[];
}

export const MoveHistory: React.FC<MoveHistoryProps> = ({ moves }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [moves]);

  // Pair moves into rounds: [Red move, Black move]
  const rounds: { round: number; red?: Move; black?: Move }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    rounds.push({
      round: Math.floor(i / 2) + 1,
      red: moves[i],
      black: moves[i + 1],
    });
  }

  return (
    <div className="bg-[#121214] border border-white/10 rounded-md p-3 font-mono-code text-[11px] flex flex-col h-[200px] shadow-inner">
      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/10 text-stone-400">
        <div className="flex items-center gap-2">
          <ScrollText className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-300">
            Nước đi ({moves.length})
          </span>
        </div>
        <span className="text-[9px] text-stone-500">Đỏ vs Đen</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-1 pr-1 font-mono-code text-[11px]">
        {rounds.length === 0 ? (
          <div className="text-center text-stone-600 italic py-10">Chưa có nước đi nào</div>
        ) : (
          rounds.map((round) => (
            <div
              key={`round-${round.round}`}
              className="grid grid-cols-12 py-0.5 px-1.5 rounded hover:bg-zinc-800/60 items-center text-stone-300 transition-colors"
            >
              <span className="col-span-2 text-stone-500 font-semibold">{round.round}.</span>
              <span className="col-span-5 text-red-400 font-medium truncate">
                {round.red ? round.red.notation : ''}
              </span>
              <span className="col-span-5 text-stone-300 font-medium truncate">
                {round.black ? round.black.notation : ''}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
