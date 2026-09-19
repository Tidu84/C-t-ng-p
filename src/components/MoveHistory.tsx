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
    <div className="bg-stone-800/80 backdrop-blur-sm border border-stone-700/60 rounded-xl p-3 shadow-md flex flex-col h-[220px]">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-stone-700/50">
        <ScrollText className="w-4 h-4 text-amber-400" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-200">
          Biên bản ván cờ ({moves.length} nước)
        </h3>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-1 pr-1 font-mono text-xs">
        {rounds.length === 0 ? (
          <div className="text-center text-stone-500 italic py-6">Chưa có nước đi nào</div>
        ) : (
          rounds.map((round) => (
            <div
              key={`round-${round.round}`}
              className="grid grid-cols-12 py-1 px-2 rounded hover:bg-stone-700/40 items-center text-stone-300"
            >
              <span className="col-span-2 text-stone-500 font-medium">{round.round}.</span>
              <span className="col-span-5 text-red-400 truncate">
                {round.red ? round.red.notation : ''}
              </span>
              <span className="col-span-5 text-stone-300 truncate">
                {round.black ? round.black.notation : ''}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
