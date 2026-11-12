import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { matchesQuery } from '../../utils/taskFilters';
import { isSameDay, isAfterDay } from '../../utils/taskSelectors';
import {
    Search,
    Plus,
    Calendar,
    CalendarDays,
    Inbox,
    Tag,
    Sun,
    Moon,
    Laptop,
    Keyboard,
    FilterX,
    CheckCircle2,
    Circle,
} from 'lucide-react';

/**
 * Command Palette Component (Ctrl/Cmd + K).
 * Provides quick access to actions and full-text task search.
 *
 * @param {object} props
 * @param {boolean} props.isOpen
 * @param {() => void} props.onClose
 * @param {Array<object>} props.tasks
 * @param {Array<object>} props.categories
 * @param {() => void} props.onNewTask
 * @param {() => void} props.onOpenCategoryManager
 * @param {() => void} props.onOpenShortcuts
 * @param {() => void} props.onClearFilters
 */
export default function CommandPalette({
    isOpen,
    onClose,
    tasks = [],
    categories = [],
    onNewTask,
    onOpenCategoryManager,
    onOpenShortcuts,
    onClearFilters,
}) {
    const { isDark, mode, setMode } = useTheme();
    const navigate = useNavigate();

    const [query, setQuery] = useState('');
    const [prevQuery, setPrevQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);

    const inputRef = useRef(null);
    const listRef = useRef(null);
    const previousFocusRef = useRef(null);

    // React 19 idiom: adjust state during rendering when query changes
    if (prevQuery !== query) {
        setPrevQuery(query);
        setSelectedIndex(0);
    }

    useBodyScrollLock(isOpen);

    const handleClose = useCallback(() => {
        setQuery('');
        setSelectedIndex(0);
        onClose();
    }, [onClose]);

    // Focus input on open and restore on close
    useEffect(() => {
        if (!isOpen) return;

        previousFocusRef.current = document.activeElement;
        const timer = setTimeout(() => {
            inputRef.current?.focus();
        }, 30);

        return () => {
            clearTimeout(timer);
            if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
                previousFocusRef.current.focus();
            }
        };
    }, [isOpen]);

    // Built-in actions
    const baseActions = useMemo(() => {
        return [
            {
                id: 'action-new-task',
                label: 'New Task',
                category: 'Actions',
                icon: Plus,
                run: () => {
                    onClose();
                    onNewTask();
                },
            },
            {
                id: 'action-goto-today',
                label: 'Go to Today',
                category: 'Navigation',
                icon: Calendar,
                run: () => {
                    onClose();
                    navigate('/today');
                },
            },
            {
                id: 'action-goto-upcoming',
                label: 'Go to Upcoming',
                category: 'Navigation',
                icon: CalendarDays,
                run: () => {
                    onClose();
                    navigate('/upcoming');
                },
            },
            {
                id: 'action-goto-inbox',
                label: 'Go to Inbox',
                category: 'Navigation',
                icon: Inbox,
                run: () => {
                    onClose();
                    navigate('/inbox');
                },
            },
            {
                id: 'action-categories',
                label: 'Manage Categories',
                category: 'Actions',
                icon: Tag,
                run: () => {
                    onClose();
                    onOpenCategoryManager();
                },
            },
            {
                id: 'action-theme-toggle',
                label: `Switch Theme (Current: ${mode})`,
                category: 'Preferences',
                icon: mode === 'dark' ? Moon : mode === 'light' ? Sun : Laptop,
                run: () => {
                    onClose();
                    const next = mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light';
                    setMode(next);
                },
            },
            {
                id: 'action-shortcuts',
                label: 'Keyboard Shortcuts Help',
                category: 'Help',
                icon: Keyboard,
                run: () => {
                    onClose();
                    onOpenShortcuts();
                },
            },
            {
                id: 'action-clear-filters',
                label: 'Clear All Active Filters',
                category: 'Actions',
                icon: FilterX,
                run: () => {
                    onClose();
                    onClearFilters();
                },
            },
        ];
    }, [mode, navigate, onClose, onNewTask, onOpenCategoryManager, onOpenShortcuts, onClearFilters, setMode]);

    // Filter actions based on query
    const matchingActions = useMemo(() => {
        if (!query.trim()) return baseActions;
        const q = query.toLowerCase().trim();
        return baseActions.filter((a) => a.label.toLowerCase().includes(q));
    }, [baseActions, query]);

    // Search tasks based on query (up to 8 tasks)
    const matchingTasks = useMemo(() => {
        if (!query.trim()) return [];
        const results = [];

        for (const task of tasks) {
            if (matchesQuery(task, query, categories)) {
                results.push(task);
                if (results.length >= 8) break;
            }
        }
        return results;
    }, [tasks, query, categories]);

    // Determine target page for a task
    const getTaskTargetPage = (task) => {
        if (!task.dueAt) return '/inbox';
        const d = new Date(task.dueAt);
        if (isNaN(d.getTime())) return '/inbox';
        const now = new Date();
        if (isSameDay(d, now) || (!task.completed && d.getTime() < now.getTime())) {
            return '/today';
        }
        if (isAfterDay(d, now)) {
            return '/upcoming';
        }
        return '/inbox';
    };

    // Combine items for keyboard index navigation
    const allItems = useMemo(() => {
        const actionItems = matchingActions.map((a) => ({
            type: 'action',
            id: a.id,
            label: a.label,
            icon: a.icon,
            category: a.category,
            execute: a.run,
        }));

        const taskItems = matchingTasks.map((t) => ({
            type: 'task',
            id: `task-result-${t.id}`,
            label: t.title,
            icon: t.completed ? CheckCircle2 : Circle,
            category: 'Tasks',
            task: t,
            execute: () => {
                handleClose();
                const targetPage = getTaskTargetPage(t);
                navigate(`${targetPage}?task=${t.id}`);
            },
        }));

        return [...actionItems, ...taskItems];
    }, [matchingActions, matchingTasks, navigate, handleClose]);

    // Scroll active item into view
    useEffect(() => {
        if (!listRef.current) return;
        const activeItemEl = listRef.current.querySelector('[aria-selected="true"]');
        if (activeItemEl) {
            activeItemEl.scrollIntoView({ block: 'nearest' });
        }
    }, [selectedIndex]);

    if (!isOpen) return null;

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            handleClose();
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (allItems.length > 0) {
                setSelectedIndex((prev) => (prev + 1) % allItems.length);
            }
            return;
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (allItems.length > 0) {
                setSelectedIndex((prev) => (prev - 1 + allItems.length) % allItems.length);
            }
            return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            const active = allItems[selectedIndex];
            if (active && typeof active.execute === 'function') {
                active.execute();
            }
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] sm:pt-[16vh] p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 motion-reduce:animate-none"
            onClick={(e) => {
                if (e.target === e.currentTarget) handleClose();
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Command Palette"
                className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden transition-all flex flex-col max-h-[60vh] ${
                    isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
                }`}
            >
                {/* Search Bar Input */}
                <div
                    className={`flex items-center gap-3 px-4 py-3.5 border-b ${
                        isDark ? 'border-zinc-800' : 'border-zinc-100'
                    }`}
                >
                    <Search className="w-5 h-5 text-indigo-500 shrink-0" aria-hidden="true" />
                    <input
                        ref={inputRef}
                        type="text"
                        role="combobox"
                        aria-expanded="true"
                        aria-autocomplete="list"
                        aria-controls="command-palette-listbox"
                        aria-activedescendant={allItems[selectedIndex]?.id}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a command or search tasks..."
                        className={`w-full bg-transparent text-sm sm:text-base font-medium outline-none placeholder-zinc-500 ${
                            isDark ? 'text-white' : 'text-zinc-900'
                        }`}
                    />
                    <kbd
                        className={`hidden sm:inline-block px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${
                            isDark
                                ? 'bg-zinc-800 border-zinc-700 text-zinc-400'
                                : 'bg-zinc-100 border-zinc-200 text-zinc-500'
                        }`}
                    >
                        Esc
                    </kbd>
                </div>

                {/* Items Listbox */}
                <div
                    ref={listRef}
                    id="command-palette-listbox"
                    role="listbox"
                    aria-label="Commands and search results"
                    className="p-2 space-y-1 overflow-y-auto flex-1"
                >
                    {allItems.length === 0 ? (
                        <div
                            className={`p-6 text-center text-sm ${
                                isDark ? 'text-zinc-500' : 'text-zinc-400'
                            }`}
                        >
                            No matching commands or tasks found for &ldquo;{query}&rdquo;
                        </div>
                    ) : (
                        allItems.map((item, idx) => {
                            const isSelected = idx === selectedIndex;
                            const Icon = item.icon;

                            return (
                                <div
                                    key={item.id}
                                    id={item.id}
                                    role="option"
                                    aria-selected={isSelected}
                                    onClick={item.execute}
                                    onMouseEnter={() => setSelectedIndex(idx)}
                                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer text-xs sm:text-sm font-medium transition-colors ${
                                        isSelected
                                            ? isDark
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-indigo-500 text-white'
                                            : isDark
                                            ? 'text-zinc-300 hover:bg-zinc-800/60'
                                            : 'text-zinc-700 hover:bg-zinc-100'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <Icon
                                            className={`w-4 h-4 shrink-0 ${
                                                isSelected
                                                    ? 'text-white'
                                                    : isDark
                                                    ? 'text-zinc-400'
                                                    : 'text-zinc-500'
                                            }`}
                                            aria-hidden="true"
                                        />
                                        <span className="truncate">{item.label}</span>
                                    </div>
                                    <span
                                        className={`text-[11px] uppercase tracking-wider shrink-0 font-semibold ${
                                            isSelected
                                                ? 'text-white/80'
                                                : isDark
                                                ? 'text-zinc-500'
                                                : 'text-zinc-400'
                                        }`}
                                    >
                                        {item.category}
                                    </span>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer Guide */}
                <div
                    className={`px-4 py-2 border-t flex items-center justify-between text-[11px] ${
                        isDark ? 'border-zinc-800 text-zinc-500 bg-zinc-950/40' : 'border-zinc-100 text-zinc-400 bg-zinc-50'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <span>Navigate: <kbd className="font-mono">↑</kbd> <kbd className="font-mono">↓</kbd></span>
                        <span>•</span>
                        <span>Select: <kbd className="font-mono">Enter</kbd></span>
                    </div>
                    <span>Close: <kbd className="font-mono">Esc</kbd></span>
                </div>
            </div>
        </div>
    );
}
