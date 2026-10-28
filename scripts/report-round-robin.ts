import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
const labels = process.argv.slice(2);
if (!labels.length || labels.some(l => !/^[a-zA-Z0-9_-]+$/.test(l))) throw new Error('Pass one or more match labels');
const lab = path.resolve('../engine-lab/results');
const rows: string[] = [];
const details: string[] = [];
const aggregate: Record<string, { wins: number; draws: number; losses: number; points: number; faults: number }> = {};
for (const label of labels) {
  const summary = JSON.parse(await readFile(path.join(lab, label, 'summary.json'), 'utf8'));
  const replay = JSON.parse(await readFile(path.join(lab, label, 'replay-check.json'), 'utf8'));
  if (summary.completed !== summary.scheduled || replay.status !== 'PASS' || !replay.colorPairsComplete || replay.games !== summary.completed) throw new Error(`${label}: incomplete or unverified tournament`);
  const games = (await readFile(path.join(lab, label, 'games.jsonl'), 'utf8')).trim().split('\n').map(line => JSON.parse(line));
  const order = Object.entries(summary.standings).sort((a: any, b: any) => b[1].points - a[1].points);
  for (const [engine, raw] of order) {
    const score = raw as any;
    rows.push(`| ${summary.timeMs} ms ${summary.rootFilter ? '(lọc nước gốc)' : '(chưa lọc nước gốc)'} | ${engine} | ${score.wins}–${score.draws}–${score.losses} | ${score.points}/${score.games} | ${score.faults} |`);
    const all = aggregate[engine] ??= { wins: 0, draws: 0, losses: 0, points: 0, faults: 0 };
    for (const key of ['wins','draws','losses','points','faults'] as const) all[key] += score[key];
  }
  const engines = Object.keys(summary.standings);
  details.push(`### ${summary.timeMs} ms/nước ${summary.rootFilter ? '— có searchmoves theo luật app' : '— chưa gửi searchmoves'} — ${summary.completed} ván\n\n`);
  for (let i=0; i<engines.length; i++) for(let j=i+1; j<engines.length; j++) {
    const a=engines[i], b=engines[j], pair=games.filter(g => [g.red,g.black].includes(a) && [g.red,g.black].includes(b));
    const wins=pair.filter(g => g.winner!=='draw' && g[g.winner]===a).length, losses=pair.filter(g => g.winner!=='draw' && g[g.winner]===b).length;
    details.push(`- ${a} gặp ${b}: **${wins} thắng, ${pair.length-wins-losses} hòa, ${losses} thua** (theo ${a}).`);
  }
  const cap=games.filter(g=>g.reason==='220-ply-test-cap').length;
  details.push(`\nPhát lại: ${replay.verifiedPlies} nửa nước hợp lệ; ${replay.rejected} nước bị từ chối; ${cap} ván hòa do trần 220 nửa nước thử nghiệm. Tất cả cặp chia quân đã đổi màu.\n`);
  details.push(`Biên bản: \`../engine-lab/results/${label}/games.jsonl\`; cấu hình/hash/mạng: \`manifest.json\`; kiểm phát lại: \`replay-check.json\`.\n`);
}
const ranked = Object.entries(aggregate).sort((a,b)=>b[1].points-a[1].points);
const text = `# Đấu vòng tròn ba engine cờ úp — 28/10/2026\n\nĐây là kết quả đấu thực tế trên máy local của anh, theo bộ luật hiện tại của app. Không suy ra Elo 2400 hay khẳng định thứ hạng trên mọi thiết bị/thời gian.\n\n## Kết quả\n\n| Thời gian mỗi nước | Engine | Thắng–Hòa–Thua | Điểm | Lỗi/bất hợp lệ |\n|---|---|---|---|---|\n${rows.join('\n')}\n\nTổng điểm các lượt thử: ${ranked.map(([name,s])=>`${name} **${s.points} điểm** (${s.wins} thắng, ${s.draws} hòa, ${s.losses} thua)`).join('; ')}.\n\n## Điều kiện công bằng\n\n- Đấu vòng tròn cả ba cặp; mỗi thế chia quân cố định được đấu hai lần, hoán đổi engine cầm Đỏ/Đen. Hạt giống và toàn bộ quân chia được lưu để phát lại.\n- Mỗi engine 1 thread, Hash 32 MB; chỉ một bên đang tìm nước, không chạy các ván song song. Cùng thời gian movetime ở từng lượt thử, không so bằng độ sâu hay số node.\n- Tiến trình được giữ suốt lượt thử và nạp mạng trước khi bấm giờ. AB-JChess 0.2d nạp mạng abjchess-20261010.nnue; jqe nạp it014.jqn; PikaJieQi dùng đánh giá cổ điển.\n- Nước đi sai/lỗi engine bị ghi riêng và xử thua; không cho AI dự phòng đi hộ.\n- Sau giải, phát lại mọi nước, kiểm lại kết quả và kiểm tra payload công khai không thay đổi khi thay toàn bộ danh tính quân còn úp.\n\n## Từng cặp\n\n${details.join('\n')}\n## Giới hạn\n\nHai lượt có thể khác cả thời gian tính và cơ chế lọc nước gốc; không thể quy chênh lệch kết quả chỉ cho một yếu tố. Tổng điểm chỉ tóm tắt các bài thử, không phải thang sức cờ chuẩn hóa.\n\nĐây là một mẫu nhỏ, thời gian ngắn trên CPU Windows; kết quả có thể đổi khi tăng thời gian, đổi mạng, đổi phiên bản hoặc chạy trên điện thoại. Luật app khác một số nền tảng Jieqi: quân bị bắt lúc úp không lộ cho bên nào; chiếu/đuổi cùng quân lần thứ sáu bị cấm; 80 nửa nước không bắt quân xử hòa. Mỗi lượt gửi FEN hiện tại, chưa gửi toàn bộ lịch sử lặp cho engine; trọng tài app vẫn giữ lịch sử. Vì vậy đây là so sánh sức cờ kèm độ tương thích trong app, không phải bảng xếp hạng engine Jieqi tiêu chuẩn.\n`;
await writeFile('ENGINE_TOURNAMENT.md', text);
console.log('Wrote ENGINE_TOURNAMENT.md');
