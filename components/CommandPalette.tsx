import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, ArrowRight, Hash, Sparkles, Loader2 } from 'lucide-react';
import { LinkItem, Category, AIConfig } from '../types';
import { semanticSearchLinks } from '../services/geminiService';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  links: LinkItem[];
  categories: Category[];
  aiConfig?: AIConfig;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, links, categories, aiConfig }) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [aiResults, setAiResults] = useState<LinkItem[] | null>(null);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const categoryMap = useMemo(() => {
    const m: Record<string, string> = {};
    categories.forEach(c => { m[c.id] = c.name; });
    return m;
  }, [categories]);

  const keywordResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return links.slice(0, 8);
    return links.filter(l =>
      l.title.toLowerCase().includes(q) ||
      l.url.toLowerCase().includes(q) ||
      (l.description && l.description.toLowerCase().includes(q)) ||
      (l.tags && l.tags.some(t => t.toLowerCase().includes(q)))
    ).slice(0, 12);
  }, [links, query]);

  // AI 语义搜索结果优先于关键字结果
  const results = aiResults ?? keywordResults;

  const canAiSearch = !!aiConfig?.apiKey && query.trim().length > 0;

  const runAiSearch = async () => {
    if (!canAiSearch || isAiSearching) return;
    setIsAiSearching(true);
    try {
      const ids = await semanticSearchLinks(
        query.trim(),
        links.map(l => ({ id: l.id, title: l.title, url: l.url, description: l.description, tags: l.tags })),
        aiConfig!
      );
      const byId: Record<string, LinkItem> = {};
      links.forEach(l => { byId[l.id] = l; });
      setAiResults(ids.map(id => byId[id]).filter(Boolean));
      setActiveIndex(0);
    } catch {
      setAiResults([]);
    } finally {
      setIsAiSearching(false);
    }
  };

  // 打开时自动聚焦、重置状态
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      setAiResults(null);
      setIsAiSearching(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // 键盘导航
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(i => Math.min(i + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        // 关键字无结果但可用 AI 时，回车触发语义搜索
        if (results.length === 0 && canAiSearch && !isAiSearching) {
          runAiSearch();
          return;
        }
        const link = results[activeIndex];
        if (link) openLink(link);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, results, activeIndex, onClose, canAiSearch, isAiSearching]);

  // 关键字变化时重置 AI 结果与高亮
  useEffect(() => {
    setActiveIndex(0);
    setAiResults(null);
  }, [query]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const openLink = (link: LinkItem) => {
    window.open(link.url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" />

      {/* 面板 */}
      <div
        className="relative w-full max-w-xl mx-4 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* 搜索输入 */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          <Search size={18} className="text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="搜索链接..."
            className="flex-1 bg-transparent text-slate-800 dark:text-white placeholder-slate-400 outline-none text-sm"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={14} />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-xs text-slate-400 border border-slate-200 dark:border-slate-600 rounded">
            Esc
          </kbd>
        </div>

        {/* AI 结果标记 */}
        {aiResults && (
          <div className="flex items-center gap-1.5 px-4 py-1.5 text-xs text-purple-500 dark:text-purple-400 border-b border-slate-100 dark:border-slate-700">
            <Sparkles size={12} /> AI 语义搜索结果
          </div>
        )}

        {/* 结果列表 */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
          {results.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-400 mb-3">
                {isAiSearching ? 'AI 正在理解你的意图...' : '没有找到匹配的链接'}
              </p>
              {canAiSearch && !isAiSearching && (
                <button
                  onClick={runAiSearch}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors"
                >
                  <Sparkles size={14} /> 用 AI 语义搜索「{query.trim()}」
                </button>
              )}
              {isAiSearching && (
                <div className="inline-flex items-center gap-1.5 text-sm text-purple-500">
                  <Loader2 size={14} className="animate-spin" /> 搜索中...
                </div>
              )}
            </div>
          ) : (
            results.map((link, index) => (
              <button
                key={link.id}
                data-index={index}
                onClick={() => openLink(link)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  index === activeIndex
                    ? 'bg-blue-50 dark:bg-blue-900/30'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                {/* 图标 */}
                <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
                  {link.icon && link.icon.startsWith('data:') ? (
                    <img src={link.icon} alt="" className="w-5 h-5 rounded" />
                  ) : link.icon ? (
                    <img src={link.icon} alt="" className="w-5 h-5 rounded" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-600 flex items-center justify-center">
                      <span className="text-xs text-slate-500 font-bold">{link.title[0]?.toUpperCase()}</span>
                    </div>
                  )}
                </div>

                {/* 标题 + URL */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                    {link.title}
                  </div>
                  <div className="text-xs text-slate-400 truncate">{link.url}</div>
                </div>

                {/* 分类标签 */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Hash size={10} className="text-slate-300 dark:text-slate-500" />
                  <span className="text-xs text-slate-400 dark:text-slate-500 max-w-[80px] truncate">
                    {categoryMap[link.categoryId] || link.categoryId}
                  </span>
                </div>

                {/* 激活时的回车提示 */}
                {index === activeIndex && (
                  <ArrowRight size={14} className="text-blue-400 flex-shrink-0" />
                )}
              </button>
            ))
          )}
        </div>

        {/* 底部快捷键提示 */}
        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-700 flex items-center gap-4 text-xs text-slate-400">
          <span><kbd className="font-mono">↑↓</kbd> 导航</span>
          <span><kbd className="font-mono">↵</kbd> 打开</span>
          <span><kbd className="font-mono">Esc</kbd> 关闭</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
