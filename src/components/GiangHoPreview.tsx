import { lazy, Suspense, useState } from 'react';
import { ChessPiece } from './ChessPiece';
import { ChessBoard } from './ChessBoard';
import type { Piece, PieceRole, PlayerColor } from '../types';

const Scene = lazy(() => import('./three/Board3DScene'));
const roles: PieceRole[] = ['king', 'advisor', 'elephant', 'horse', 'chariot', 'cannon', 'soldier'];
const token = (color: PlayerColor, role: PieceRole, covered = false): Piece => ({
  id: `preview-${color}-${role}-${covered}`, color, trueRole: role, initialRole: role, isCovered: covered,
});
// Design fixture only: no running match or player data is read or changed.
const board: (Piece | null)[][] = Array.from({ length: 10 }, () => Array(9).fill(null));
for (const color of ['black', 'red'] as const) {
  const y = color === 'black' ? 1 : 8;
  roles.forEach((role, i) => { board[y][i + 1] = token(color, role); });
  for (const x of [0, 2, 4, 6, 8]) board[color === 'black' ? 3 : 6][x] = {
    ...token(color, 'soldier', true), id: `preview-${color}-lid-${x}`,
  };
}

export default function GiangHoPreview() {
  const [spatial, setSpatial] = useState(false);
  return <main style={{ minHeight: '100vh', background: '#171916', color: '#f4e6cb', padding: '24px 16px', fontFamily: 'system-ui, sans-serif' }}>
    <div style={{ maxWidth: 940, margin: '0 auto' }}>
      <p style={{ fontSize: 11, letterSpacing: '0.16em', color: '#cdb38b', margin: '0 0 8px' }}>TIDU PRODUCTION · BỘ MẪU 01</p>
      <h1 style={{ fontSize: 28, margin: '0 0 8px', fontWeight: 700 }}>Ngà sáng · Mực trầm</h1>
      <p style={{ color: '#c3bdaf', fontSize: 14, margin: '0 0 22px' }}>Bàn óc chó tối. Mặt ngà khắc son và mực. Nắp úp đỏ/đen, viền ngà.</p>
      <section style={{ background: '#262823', border: '1px solid #504b40', borderRadius: 16, padding: 18 }}>
        {(['red', 'black'] as const).map(color => <div key={color} style={{ display: 'grid', gridTemplateColumns: 'repeat(8,minmax(0,1fr))', gap: 7, margin: '12px 0 18px' }}>
          {roles.map(role => <div key={role} style={{ aspectRatio: '1', minWidth: 0 }}>
            <ChessPiece piece={token(color, role)} theme="giang_ho" displayMode="han" />
          </div>)}
          <div style={{ aspectRatio: '1', minWidth: 0 }}><ChessPiece piece={token(color, 'soldier', true)} theme="giang_ho" /></div>
        </div>)}
        <p style={{ margin: 0, color: '#c3bdaf', fontSize: 12 }}>Bảy quân ngửa và một nắp úp mỗi bên. Nắp không mang ký hiệu loại quân.</p>
      </section>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '22px 0 10px' }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Trên bàn cờ</h2>
        <button onClick={() => setSpatial(v => !v)} style={{ border: '1px solid #d1b487', padding: '8px 14px', borderRadius: 8, cursor: 'pointer' }}>{spatial ? 'Xem phẳng 2D' : 'Xem khắc chìm 3D'}</button>
      </div>
      <div style={{ height: spatial ? 480 : undefined, maxWidth: spatial ? undefined : 570, margin: '0 auto', position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
        {spatial ? <Suspense fallback={<p>Đang dựng bàn mẫu…</p>}><Scene
          board={board} turn="red" selectedPos={null} legalMoves={[]} lastMove={null} isCheck={false}
          flipped={false} displayMode="han" theme="giang_ho" pieceTheme="giang_ho" riverMode="blank"
          bgScene="tra_da" isLiteMode={false} disabled onSelectSquare={() => {}} resetSignal={0}
          cameraElevation={65} cameraView="player" />
        </Suspense> : <ChessBoard board={board} turn="red" selectedPos={null} legalMoves={[]}
          lastMove={null} isCheck={false} theme="giang_ho" pieceTheme="giang_ho" displayMode="han"
          perspective="2d" disabled onSelectSquare={() => {}} />}
      </div>
      <p style={{ color: '#aca99d', fontSize: 12, marginTop: 18 }}>Trang xem mẫu riêng · Không thay đổi ván đang chơi. <a href="/" style={{ color: '#ebd2a6', textDecoration: 'underline' }}>Về app</a></p>
    </div>
  </main>;
}
