/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import { Move } from '../types';
import { ScrollText, MessageSquareQuote } from 'lucide-react';

interface MoveHistoryProps {
  moves: Move[];
  onSelectMove?: (move: Move) => void;
  activeMoveIndex?: number | null;
}

export const MoveHistory: React.FC<MoveHistoryProps> = ({
  moves,
  onSelectMove,
  activeMoveIndex,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [moves]);

  // Pair moves into rounds: [Red move, Black move]
  const rounds: {
    round: number;
    red?: { move: Move; index: number };
    black?: { move: Move; index: number };
  }[] = [];

  for (let i = 0; i < moves.length; i += 2) {
    rounds.push({
      round: Math.floor(i / 2) + 1,
      red: moves[i] ? { move: moves[i], index: i } : undefined,
      black: moves[i + 1] ? { move: moves[i + 1], index: i + 1 } : undefined,
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
        <div className="flex items-center gap-1.5 text-[9px] text-stone-400">
          <MessageSquareQuote className="w-3 h-3 text-amber-400" />
          <span>Nhấn để xem nhận xét</span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-1 pr-1 font-mono-code text-[11px]">
        {rounds.length === 0 ? (
          <div className="text-center text-stone-600 italic py-10">Chưa có nước đi nào</div>
        ) : (
          rounds.map((round) => (
            <div
              key={`round-${round.round}`}
              className="grid grid-cols-12 py-0.5 px-1 rounded items-center text-stone-300 transition-colors"
            >
              <span className="col-span-2 text-stone-500 font-semibold">{round.round}.</span>

              {/* Red Move */}
              <div className="col-span-5 pr-1">
                {round.red ? (
                  <button
                    type="button"
                    onClick={() => onSelectMove?.(round.red!.move)}
                    className={`w-full text-left truncate flex items-center justify-between gap-1 px-1 py-0.5 rounded cursor-pointer transition-colors ${
                      activeMoveIndex === round.red.index
                        ? 'bg-amber-500/25 text-amber-200 font-bold border border-amber-500/40'
                        : 'text-red-400 hover:bg-stone-800'
                    }`}
                    title={
                      round.red.move.commentary
                        ? `${round.red.move.commentary.gradeLabel}: "${round.red.move.commentary.comment}"`
                        : 'Xem nhận xét nước đi'
                    }
                  >
                    <span className="truncate">{round.red.move.notation}</span>
                    {round.red.move.commentary && (
                      <span className="text-[10px] shrink-0 opacity-80 hover:opacity-100">
                        {round.red.move.commentary.badgeIcon}
                      </span>
                    )}
                  </button>
                ) : null}
              </div>

              {/* Black Move */}
              <div className="col-span-5 pl-1">
                {round.black ? (
                  <button
                    type="button"
                    onClick={() => onSelectMove?.(round.black!.move)}
                    className={`w-full text-left truncate flex items-center justify-between gap-1 px-1 py-0.5 rounded cursor-pointer transition-colors ${
                      activeMoveIndex === round.black.index
                        ? 'bg-amber-500/25 text-amber-200 font-bold border border-amber-500/40'
                        : 'text-stone-300 hover:bg-stone-800'
                    }`}
                    title={
                      round.black.move.commentary
                        ? `${round.black.move.commentary.gradeLabel}: "${round.black.move.commentary.comment}"`
                        : 'Xem nhận xét nước đi'
                    }
                  >
                    <span className="truncate">{round.black.move.notation}</span>
                    {round.black.move.commentary && (
                      <span className="text-[10px] shrink-0 opacity-80 hover:opacity-100">
                        {round.black.move.commentary.badgeIcon}
                      </span>
                    )}
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
