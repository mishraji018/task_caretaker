import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
    Calendar,
    CalendarDays,
    Inbox,
    Plus,
    Tag,
    ChevronLeft,
    ChevronRight,
    Moon,
    Sun,
    LogOut,
    Folder,
    Search,
    Keyboard,
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { UI_STATE_KEY } from '../../constants/storageKeys';
import ThemeToggle from '../ui/ThemeToggle';

/**
 * Sidebar navigation component for Laptop and Tablet.
 * - Collapsible with state persisted in 'taskcaretaker.ui.v1'.
 * - Tablet starts collapsed to icons.
 * - Shows counts from countByView.
 * - Lists user categories.
 * - Action buttons: New Task, Manage Categories, Theme, Logout.
 *
 * @param {object} props
 * @param {object} props.counts { inbox, today, upcoming }
 * @param {Array<object>} props.categories
 * @param {boolean} props.isTablet
 * @param {() => void} props.onNewTask
 * @param {() => void} props.onManageCategories
 */
export default function Sidebar({
    counts = { inbox: 0, today: 0, upcoming: 0 },
    categories = [],
    selectedCategoryId = 'all',
    onSelectCategory,
    isTablet = false,
    onNewTask,
    onManageCategories,
    onOpenCommandPalette,
    onOpenShortcuts,
}) {
    const { isDark } = useTheme();
    const { logout } = useAuth();

    const [isCollapsed, setIsCollapsed] = useState(() => {
        try {
            const raw = localStorage.getItem(UI_STATE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (typeof parsed?.sidebarCollapsed === 'boolean') {
                    return parsed.sidebarCollapsed;
                }
            }
        } catch {
            // Safe fallback
        }
        return isTablet;
    });

    const toggleCollapsed = () => {
        setIsCollapsed((prev) => {
            const next = !prev;
            try {
                const raw = localStorage.getItem(UI_STATE_KEY);
                const current = raw ? JSON.parse(raw) : {};
                localStorage.setItem(
                    UI_STATE_KEY,
                    JSON.stringify({ ...current, sidebarCollapsed: next })
                );
            } catch {
                // Ignore storage errors safely
            }
            return next;
        });
    };

    const navItems = [
        { path: '/today', label: 'Today', icon: Calendar, count: counts.today },
        { path: '/upcoming', label: 'Upcoming', icon: CalendarDays, count: counts.upcoming },
        { path: '/inbox', label: 'Inbox', icon: Inbox, count: counts.inbox },
    ];

    return (
        <aside
            aria-label="Main Sidebar"
            className={`hidden md:flex flex-col border-r transition-all duration-300 select-none shrink-0 ${
                isCollapsed ? 'w-20' : 'w-64'
            } ${
                isDark
                    ? 'bg-zinc-950 border-zinc-800/80 text-zinc-300'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-700'
            }`}
        >
            {/* Header & Logo */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800/40">
                {!isCollapsed && (
                    <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="w-8 h-8 rounded-xl bg-linear-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-500/25 shrink-0">
                            TC
                        </div>
                        <div className="truncate">
                            <span className="font-bold text-base tracking-tight block text-zinc-100">
                                Task Caretaker
                            </span>
                        </div>
                    </div>
                )}
                {isCollapsed && (
                    <div className="mx-auto">
                        <div className="w-8 h-8 rounded-xl bg-linear-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-500/25">
                            TC
                        </div>
                    </div>
                )}
                <button
                    type="button"
                    onClick={toggleCollapsed}
                    aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        isDark ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900'
                    }`}
                >
                    {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
            </div>

            {/* Quick Action: New Task & Command Palette */}
            <div className="p-3 space-y-1.5">
                <button
                    type="button"
                    onClick={onNewTask}
                    aria-label="New task"
                    className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-semibold text-sm text-white bg-linear-to-tr from-indigo-600 to-violet-500 hover:from-indigo-500 hover:to-violet-400 shadow-md shadow-indigo-500/20 active:scale-98 transition-all cursor-pointer ${
                        isCollapsed ? 'px-0' : ''
                    }`}
                >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    {!isCollapsed && <span>New task</span>}
                </button>

                {onOpenCommandPalette && (
                    <button
                        type="button"
                        onClick={onOpenCommandPalette}
                        aria-label="Command palette (Ctrl+K)"
                        title={isCollapsed ? 'Command Palette (Ctrl+K)' : undefined}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                            isDark
                                ? 'bg-zinc-900/80 border-zinc-800 text-zinc-300 hover:bg-zinc-850 hover:text-white'
                                : 'bg-zinc-100/80 border-zinc-200 text-zinc-700 hover:bg-zinc-200/70 hover:text-zinc-900'
                        } ${isCollapsed ? 'justify-center px-0' : ''}`}
                    >
                        <div className="flex items-center gap-2">
                            <Search className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            {!isCollapsed && <span>Search & Menu</span>}
                        </div>
                        {!isCollapsed && (
                            <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-500">
                                ⌘K
                            </kbd>
                        )}
                    </button>
                )}
            </div>

            {/* Main Views Nav */}
            <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
                <div className={`px-2 py-1 text-[11px] font-semibold uppercase tracking-wider ${
                    isDark ? 'text-zinc-500' : 'text-zinc-400'
                }`}>
                    {!isCollapsed && 'Views'}
                </div>

                {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            title={isCollapsed ? `${item.label} (${item.count})` : undefined}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-colors cursor-pointer ${
                                    isActive
                                        ? isDark
                                            ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                                            : 'bg-indigo-50 text-indigo-600 border border-indigo-200/60'
                                        : isDark
                                        ? 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'
                                        : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                                } ${isCollapsed ? 'justify-center px-0' : ''}`
                            }
                        >
                            <Icon className="w-4 h-4 shrink-0" />
                            {!isCollapsed && (
                                <>
                                    <span className="flex-1 truncate">{item.label}</span>
                                    {item.count > 0 && (
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                                            isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-200 text-zinc-700'
                                        }`}>
                                            {item.count}
                                        </span>
                                    )}
                                </>
                            )}
                        </NavLink>
                    );
                })}

                {/* Categories Section */}
                <div className="pt-4">
                    <div className="flex items-center justify-between px-2 py-1">
                        {!isCollapsed && (
                            <span className={`text-[11px] font-semibold uppercase tracking-wider ${
                                isDark ? 'text-zinc-500' : 'text-zinc-400'
                            }`}>
                                Categories
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={onManageCategories}
                            aria-label="Manage categories"
                            title="Manage categories"
                            className={`p-1 rounded-md text-xs transition-colors cursor-pointer ${
                                isDark ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200' : 'hover:bg-zinc-200 text-zinc-600'
                            }`}
                        >
                            <Tag className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <div className="mt-1 space-y-0.5">
                        {categories.map((cat) => {
                            const isSelected = selectedCategoryId === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => {
                                        if (onSelectCategory) {
                                            onSelectCategory(isSelected ? 'all' : cat.id);
                                        }
                                    }}
                                    title={isCollapsed ? cat.name : undefined}
                                    aria-pressed={isSelected}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors cursor-pointer text-left ${
                                        isSelected
                                            ? isDark
                                                ? 'bg-indigo-600/20 text-indigo-400 font-semibold border border-indigo-500/30'
                                                : 'bg-indigo-50 text-indigo-600 font-semibold border border-indigo-200/60'
                                            : isDark
                                            ? 'text-zinc-400 hover:bg-zinc-900'
                                            : 'text-zinc-600 hover:bg-zinc-100'
                                    } ${isCollapsed ? 'justify-center px-0' : ''}`}
                                >
                                    <span
                                        className="w-2.5 h-2.5 rounded-full shrink-0"
                                        style={{ backgroundColor: cat.color || '#6366f1' }}
                                    />
                                    {!isCollapsed && (
                                        <span className="truncate flex-1 text-xs font-medium">
                                            {cat.name}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </nav>

            {/* Bottom Actions: Theme & Logout */}
            <div className={`p-3 border-t space-y-2 ${
                isDark ? 'border-zinc-800/60' : 'border-zinc-200'
            }`}>
                <ThemeToggle isCollapsed={isCollapsed} />

                <button
                    type="button"
                    onClick={logout}
                    aria-label="Sign out"
                    title={isCollapsed ? 'Sign Out' : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors cursor-pointer ${
                        isDark ? 'text-zinc-400 hover:bg-red-500/10 hover:text-red-400' : 'text-zinc-600 hover:bg-red-50 hover:text-red-600'
                    } ${isCollapsed ? 'justify-center px-0' : ''}`}
                >
                    <LogOut className="w-4 h-4 shrink-0" />
                    {!isCollapsed && <span>Sign Out</span>}
                </button>

                {onOpenShortcuts && !isCollapsed && (
                    <button
                        type="button"
                        onClick={onOpenShortcuts}
                        className={`w-full flex items-center justify-center gap-1.5 pt-1 text-[11px] font-medium transition-colors cursor-pointer ${
                            isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600'
                        }`}
                    >
                        <Keyboard className="w-3.5 h-3.5" />
                        <span>Keyboard shortcuts</span>
                        <kbd className="font-mono text-[10px] ml-0.5">?</kbd>
                    </button>
                )}
            </div>
        </aside>
    );
}
