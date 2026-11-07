/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Database,
  ShieldCheck,
  Download,
  Upload,
  Trash2,
  X,
  Search,
  FileText,
  Play,
  Users,
  Award,
  Sparkles,
  RefreshCw,
  Calendar,
  CheckCircle,
} from 'lucide-react';
import { SavedMatch, PlayerProfile, PlayerStats } from '../types';

interface SupremeDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedMatches: SavedMatch[];
  playerProfile: PlayerProfile;
  stats: PlayerStats;
  onDeleteMatch?: (id: string) => void;
  onClearAllMatches?: () => void;
  onImportMatches?: (matches: SavedMatch[]) => void;
  onReplayMatch?: (match: SavedMatch) => void;
}

export const SupremeDatabaseModal: React.FC<SupremeDatabaseModalProps> = ({
  isOpen,
  onClose,
  savedMatches,
  playerProfile,
  stats,
  onDeleteMatch,
  onClearAllMatches,
  onImportMatches,
  onReplayMatch,
}) => {
  const [activeTab, setActiveTab] = useState<'matches' | 'overview' | 'raw'>('matches');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRawMatch, setSelectedRawMatch] = useState<SavedMatch | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const filteredMatches = useMemo(() => {
    if (!searchTerm.trim()) return savedMatches;
    const term = searchTerm.toLowerCase();
    return savedMatches.filter(
      (m) =>
        m.playerName.toLowerCase().includes(term) ||
        (m.difficulty && m.difficulty.toLowerCase().includes(term)) ||
        m.dateStr.toLowerCase().includes(term) ||
        m.id.toLowerCase().includes(term)
    );
  }, [savedMatches, searchTerm]);

  // Estimate localStorage usage
  const storageStats = useMemo(() => {
    try {
      let totalBytes = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('co_up_')) {
          totalBytes += (localStorage.getItem(key)?.length || 0) * 2;
        }
      }
      return {
        kb: (totalBytes / 1024).toFixed(1),
        itemCount: localStorage.length,
      };
    } catch {
      return { kb: '0.0', itemCount: 0 };
    }
  }, [savedMatches]);

  // Export full database JSON
  const handleExportDatabase = () => {
    const fullDb = {
      version: '2.1.3',
      exportDate: new Date().toISOString(),
      account: {
        name: playerProfile.name,
        role: 'Supreme Administrator',
        stats,
      },
      savedMatches,
      storageKeys: {
        matchesCount: savedMatches.length,
      },
    };

    const blob = new Blob([JSON.stringify(fullDb, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `co_up_database_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify('Đã xuất toàn bộ cơ sở dữ liệu thành công!');
  };

  // Import JSON file
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        const importedMatches: SavedMatch[] = data.savedMatches || (Array.isArray(data) ? data : []);
        if (importedMatches.length && onImportMatches) {
          onImportMatches(importedMatches);
          notify(`Đã nạp thành công ${importedMatches.length} ván đấu vào cơ sở dữ liệu!`);
        } else {
          notify('Không tìm thấy bản ghi ván đấu hợp lệ trong tệp!');
        }
      } catch (err) {
        notify('Lỗi đọc tệp JSON: định dạng không hợp lệ');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-gradient-to-b from-stone-900 via-stone-950 to-black border border-amber-500/40 shadow-[0_0_40px_rgba(245,158,11,0.25)] overflow-hidden text-stone-200">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-amber-500/30 bg-gradient-to-r from-amber-950/60 via-stone-900 to-amber-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-700 flex items-center justify-center shadow-md border border-amber-300">
              <Database className="w-5 h-5 text-stone-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-amber-300 tracking-wide">
                  TRUNG TÂM CƠ SỞ DỮ LIỆU TỐI CAO
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-950/90 text-red-300 border border-red-600/70 font-bold uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-red-400" /> Tidu · Admin
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Toàn quyền truy cập và quản trị dữ liệu người chơi, kho lưu trữ ván đấu & thông số hệ thống
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-400 hover:text-stone-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div className="bg-emerald-950/90 border-b border-emerald-600/60 text-emerald-300 px-4 py-2 text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            {notification}
          </div>
        )}

        {/* Tab Selector & Controls */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-stone-950/80 border-b border-stone-800 text-xs">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('matches')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'matches'
                  ? 'bg-amber-600 text-stone-950 shadow-sm'
                  : 'bg-stone-900 text-stone-400 hover:text-stone-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Toàn Bộ Ván Đấu ({savedMatches.length})
            </button>
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'overview'
                  ? 'bg-amber-600 text-stone-950 shadow-sm'
                  : 'bg-stone-900 text-stone-400 hover:text-stone-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Hồ Sơ & Bộ Nhớ Hệ Thống
            </button>
            <button
              onClick={() => setActiveTab('raw')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'raw'
                  ? 'bg-amber-600 text-stone-950 shadow-sm'
                  : 'bg-stone-900 text-stone-400 hover:text-stone-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> Dữ Liệu Thô (JSON)
            </button>
          </div>

          {/* Quick Actions: Export / Import */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportDatabase}
              title="Xuất toàn bộ dữ liệu ra tệp JSON"
              className="px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-amber-600/40 text-amber-300 font-medium flex items-center gap-1 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Xuất Database
            </button>
            <label className="px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 font-medium flex items-center gap-1 cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5" /> Nạp Backup
              <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
            </label>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {/* TAB 1: ALL MATCHES */}
          {activeTab === 'matches' && (
            <div className="space-y-3">
              {/* Search Bar */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Tìm kiếm theo tên kỳ thủ, ngày đấu hoặc mã ván..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-stone-900/90 border border-stone-800 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                {savedMatches.length > 0 && onClearAllMatches && (
                  <button
                    onClick={() => {
                      if (window.confirm('CẢNH BÁO: Bạn có chắc chắn muốn xóa toàn bộ ván đấu trong cơ sở dữ liệu?')) {
                        onClearAllMatches();
                        notify('Đã xóa toàn bộ bản ghi ván đấu.');
                      }
                    }}
                    className="px-3 py-2 rounded-xl bg-red-950/60 hover:bg-red-900/80 border border-red-700/60 text-red-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Xóa Toàn Bộ
                  </button>
                )}
              </div>

              {/* Matches List Table */}
              {filteredMatches.length === 0 ? (
                <div className="text-center py-12 rounded-xl border border-dashed border-stone-800 bg-stone-950/40">
                  <Database className="w-10 h-10 text-stone-600 mx-auto mb-2" />
                  <p className="text-xs text-stone-400">Không có bản ghi ván đấu nào phù hợp trong cơ sở dữ liệu.</p>
                </div>
              ) : (
                <div className="border border-stone-800 rounded-xl overflow-hidden bg-stone-950/60 shadow-inner">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-stone-900/90 text-stone-400 border-b border-stone-800">
                        <tr>
                          <th className="px-3 py-2.5">Thời gian</th>
                          <th className="px-3 py-2.5">Kỳ thủ</th>
                          <th className="px-3 py-2.5">Đối thủ</th>
                          <th className="px-3 py-2.5">Chế độ</th>
                          <th className="px-3 py-2.5">Kết quả</th>
                          <th className="px-3 py-2.5 text-center">Số nước</th>
                          <th className="px-3 py-2.5 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-800/60 text-stone-300">
                        {filteredMatches.map((match) => (
                          <tr key={match.id} className="hover:bg-amber-950/20 transition-colors">
                            <td className="px-3 py-2.5 whitespace-nowrap text-stone-400 flex items-center gap-1.5">
                              <Calendar className="w-3 h-3 text-stone-500" />
                              {match.dateStr}
                            </td>
                            <td className="px-3 py-2.5 font-semibold text-amber-200">
                              {match.playerName}
                            </td>
                            <td className="px-3 py-2.5 text-stone-300">
                              {match.gameMode === 'ai' ? (
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                                  Máy ({match.difficulty === 'hard' ? 'Lão quái' : match.difficulty === 'medium' ? 'Ham chơi' : 'Người thường'})
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                                  PvP 2 người
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 uppercase text-[10px] text-stone-400 font-mono">
                              {match.gameMode}
                            </td>
                            <td className="px-3 py-2.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  match.winner === 'red'
                                    ? 'bg-red-950 text-red-300 border border-red-800'
                                    : match.winner === 'black'
                                    ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                    : 'bg-stone-900 text-stone-400 border border-stone-700'
                                }`}
                              >
                                {match.winner === 'draw' ? 'Hòa' : match.winner === 'red' ? 'Đỏ thắng' : 'Đen thắng'}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-center font-mono text-stone-400">
                              {match.totalMoves}
                            </td>
                            <td className="px-3 py-2.5 text-right whitespace-nowrap space-x-1.5">
                              {onReplayMatch && (
                                <button
                                  onClick={() => {
                                    onReplayMatch(match);
                                    onClose();
                                  }}
                                  title="Xem lại ván cờ"
                                  className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-[11px] inline-flex items-center gap-1 shadow-sm"
                                >
                                  <Play className="w-3 h-3 fill-current" /> Xem lại
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setSelectedRawMatch(match);
                                  setActiveTab('raw');
                                }}
                                title="Xem cấu trúc JSON"
                                className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-[11px] inline-flex items-center gap-1"
                              >
                                JSON
                              </button>
                              {onDeleteMatch && (
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Xóa ván cờ ngày ${match.dateStr}?`)) {
                                      onDeleteMatch(match.id);
                                      notify('Đã xóa bản ghi ván đấu.');
                                    }
                                  }}
                                  title="Xóa ván cờ"
                                  className="px-2 py-1 rounded bg-stone-900 hover:bg-red-950 text-stone-500 hover:text-red-400 text-[11px] inline-flex items-center"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: OVERVIEW & SYSTEM STORAGE */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Account Card */}
              <div className="p-4 rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-950/40 to-stone-950 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full border-2 border-amber-400 overflow-hidden flex items-center justify-center bg-stone-900 text-2xl shadow-md">
                    {playerProfile.avatar.startsWith('data:') || playerProfile.avatar.startsWith('/') ? (
                      <img src={playerProfile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      playerProfile.avatar
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-amber-300 text-base flex items-center gap-2">
                      {playerProfile.name}
                      <span className="text-[10px] px-2 py-0.5 rounded bg-yellow-400 text-stone-950 font-black">
                        ADMIN
                      </span>
                    </h3>
                    <p className="text-xs text-stone-400">Đại Sư Tối Cao · Toàn quyền hệ thống</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-stone-800 text-center">
                  <div className="p-2 rounded-lg bg-stone-900/80 border border-stone-800">
                    <div className="text-xs text-stone-500">Thắng</div>
                    <div className="text-sm font-bold text-emerald-400">{stats.wins}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-stone-900/80 border border-stone-800">
                    <div className="text-xs text-stone-500">Thua</div>
                    <div className="text-sm font-bold text-red-400">{stats.losses}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-stone-900/80 border border-stone-800">
                    <div className="text-xs text-stone-500">Hòa</div>
                    <div className="text-sm font-bold text-amber-400">{stats.draws}</div>
                  </div>
                </div>

                <div className="text-xs text-stone-400 space-y-1 pt-1">
                  <div className="flex justify-between">
                    <span>Đẳng cấp hệ thống:</span>
                    <span className="text-amber-300 font-semibold">Đại Sư Tối Cao</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Quyền hạn mở khóa:</span>
                    <span className="text-emerald-400 font-semibold">100% Full Access</span>
                  </div>
                </div>
              </div>

              {/* Storage & Database Diagnostics Card */}
              <div className="p-4 rounded-xl border border-stone-800 bg-stone-950 space-y-3">
                <h3 className="font-bold text-stone-200 text-sm flex items-center gap-2">
                  <Database className="w-4 h-4 text-amber-400" /> Dung Lượng Cơ Sở Dữ Liệu Cục Bộ
                </h3>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-stone-900">
                    <span className="text-stone-400">Tổng dung lượng đã dùng:</span>
                    <span className="font-mono text-amber-300 font-bold">{storageStats.kb} KB</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-stone-900">
                    <span className="text-stone-400">Số lượng ván đấu đã lưu:</span>
                    <span className="font-mono text-stone-200 font-semibold">{savedMatches.length} ván</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-stone-900">
                    <span className="text-stone-400">Chế độ lưu trữ:</span>
                    <span className="text-emerald-400 font-semibold">LocalStorage (Client-Side)</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-stone-400">Tính năng đồng bộ:</span>
                    <span className="text-stone-300">Hỗ trợ Export/Import JSON</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleExportDatabase}
                    className="w-full py-2 rounded-lg bg-amber-600/90 hover:bg-amber-600 text-stone-950 font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
                  >
                    <Download className="w-4 h-4" /> Sao Lưu Dự Phòng Cơ Sở Dữ Liệu
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RAW JSON INSPECTOR */}
          {activeTab === 'raw' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-stone-400">
                <span>
                  {selectedRawMatch
                    ? `Đang hiển thị bản ghi ván cờ: ${selectedRawMatch.id}`
                    : `Toàn bộ cơ sở dữ liệu (${savedMatches.length} ván cờ)`}
                </span>
                {selectedRawMatch && (
                  <button
                    onClick={() => setSelectedRawMatch(null)}
                    className="text-amber-400 hover:underline"
                  >
                    Xem toàn bộ Database
                  </button>
                )}
              </div>
              <pre className="p-4 rounded-xl bg-stone-950 border border-stone-800 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-[50vh] selection:bg-amber-500 selection:text-stone-950">
                {JSON.stringify(selectedRawMatch || savedMatches, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-stone-800 bg-stone-950 flex items-center justify-between text-xs text-stone-500">
          <span>Hệ thống Cờ Úp Việt Nam · Quyền Tối Cao Kích Hoạt</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
