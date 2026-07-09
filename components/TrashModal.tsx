import React from 'react';
import { X, Trash2, RotateCcw, Sparkles, Loader2, AlertTriangle } from 'lucide-react';
import { LinkItem, Category } from '../types';

interface TrashModalProps {
  isOpen: boolean;
  onClose: () => void;
  trashedLinks: LinkItem[];
  categories: Category[];
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  onEmptyTrash: () => void;
  onRestoreAll: () => void;
  onAICleanup: () => void;
  isCleaningUp: boolean;
  aiConfigured: boolean;
}

const TrashModal: React.FC<TrashModalProps> = ({
  isOpen, onClose, trashedLinks, categories,
  onRestore, onPermanentDelete, onEmptyTrash, onRestoreAll,
  onAICleanup, isCleaningUp, aiConfigured,
}) => {
  if (!isOpen) return null;

  const categoryMap: Record<string, string> = {};
  categories.forEach(c => { categoryMap[c.id] = c.name; });

  const reasonColor = (reason?: string) => {
    if (reason === '重复链接') return 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300';
    if (reason === 'AI 建议清理') return 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300';
    return 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Trash2 size={18} className="text-slate-500" />
            垃圾站
            <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full">
              {trashedLinks.length}
            </span>
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 px-6 py-3 border-b border-slate-100 dark:border-slate-700">
          <button
            onClick={onAICleanup}
            disabled={isCleaningUp || !aiConfigured}
            title={aiConfigured ? '扫描重复及可清理的链接并移入垃圾站' : '请先在设置中配置 AI'}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
          >
            {isCleaningUp ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {isCleaningUp ? '扫描中...' : 'AI 智能清理'}
          </button>
          <div className="flex-1" />
          {trashedLinks.length > 0 && (
            <>
              <button
                onClick={onRestoreAll}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <RotateCcw size={14} /> 全部恢复
              </button>
              <button
                onClick={onEmptyTrash}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <Trash2 size={14} /> 清空
              </button>
            </>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {trashedLinks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Trash2 size={40} className="mb-3 opacity-50" />
              <p className="text-sm">垃圾站是空的</p>
              <p className="text-xs mt-1 text-slate-400">删除的链接会移到这里，可随时恢复</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {trashedLinks.map(link => (
                <div
                  key={link.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  {/* icon */}
                  <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center">
                    {link.icon ? (
                      <img src={link.icon} alt="" className="w-6 h-6 rounded" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <div className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-600 flex items-center justify-center">
                        <span className="text-xs text-slate-500 font-bold">{link.title[0]?.toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                  {/* info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{link.title}</span>
                      {link.deletedReason && (
                        <span className={`px-1.5 py-0.5 text-[10px] rounded-full flex-shrink-0 ${reasonColor(link.deletedReason)}`}>
                          {link.deletedReason}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 truncate">
                      {link.url}
                      <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
                      {categoryMap[link.categoryId] || link.categoryId}
                    </div>
                  </div>
                  {/* actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => onRestore(link.id)}
                      title="恢复"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                    >
                      <RotateCcw size={15} />
                    </button>
                    <button
                      onClick={() => onPermanentDelete(link.id)}
                      title="彻底删除"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer note */}
        <div className="px-6 py-2.5 border-t border-slate-100 dark:border-slate-700 flex items-center gap-1.5 text-xs text-slate-400">
          <AlertTriangle size={12} />
          垃圾站内的链接不会自动清理，需手动恢复或彻底删除
        </div>
      </div>
    </div>
  );
};

export default TrashModal;
