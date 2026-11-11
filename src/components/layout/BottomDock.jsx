import { NavLink } from 'react-router-dom';
import { Calendar, CalendarDays, Plus, Inbox, MoreHorizontal } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Mobile Bottom Dock Navigation (5 slots).
 * Slots: Today, Upcoming, Add (center raised), Inbox, Menu.
 * - Every item has a text label and at least 44px tap targets.
 * - Active item highlighted with aria-current="page".
 * - Safe area padding pb-[env(safe-area-inset-bottom)].
 *
 * @param {object} props
 * @param {object} props.counts { inbox, today, upcoming }
 * @param {() => void} props.onOpenAdd
 * @param {() => void} props.onOpenMenu
 */
export default function BottomDock({
    counts = { inbox: 0, today: 0, upcoming: 0 },
    onOpenAdd,
    onOpenMenu,
}) {
    const { isDark } = useTheme();

    const linkBaseClasses = `flex flex-col items-center justify-center flex-1 py-1.5 min-h-[48px] min-w-[48px] rounded-xl transition-all cursor-pointer relative`;

    return (
        <nav
            aria-label="Mobile Navigation"
            className={`md:hidden fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-md px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-lg ${
                isDark
                    ? 'bg-zinc-950/90 border-zinc-800/80 text-zinc-400'
                    : 'bg-white/95 border-zinc-200 text-zinc-600'
            }`}
        >
            <div className="flex items-center justify-around max-w-md mx-auto relative">
                {/* 1. Today */}
                <NavLink
                    to="/today"
                    aria-label={`Today tasks (${counts.today})`}
                    className={({ isActive }) =>
                        `${linkBaseClasses} ${
                            isActive
                                ? isDark
                                    ? 'text-indigo-400 font-semibold'
                                    : 'text-indigo-600 font-semibold'
                                : isDark
                                ? 'hover:text-zinc-200'
                                : 'hover:text-zinc-900'
                        }`
                    }
                >
                    {({ isActive }) => (
                        <>
                            <div className="relative">
                                <Calendar className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                                {counts.today > 0 && (
                                    <span className="absolute -top-1 -right-2 px-1 min-w-[14px] h-[14px] text-[10px] font-bold rounded-full bg-indigo-500 text-white flex items-center justify-center leading-none">
                                        {counts.today > 99 ? '99+' : counts.today}
                                    </span>
                                )}
                            </div>
                            <span className="text-[11px] mt-0.5 tracking-tight">Today</span>
                        </>
                    )}
                </NavLink>

                {/* 2. Upcoming */}
                <NavLink
                    to="/upcoming"
                    aria-label={`Upcoming tasks (${counts.upcoming})`}
                    className={({ isActive }) =>
                        `${linkBaseClasses} ${
                            isActive
                                ? isDark
                                    ? 'text-indigo-400 font-semibold'
                                    : 'text-indigo-600 font-semibold'
                                : isDark
                                ? 'hover:text-zinc-200'
                                : 'hover:text-zinc-900'
                        }`
                    }
                >
                    {({ isActive }) => (
                        <>
                            <div className="relative">
                                <CalendarDays className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                                {counts.upcoming > 0 && (
                                    <span className={`absolute -top-1 -right-2 px-1 min-w-[14px] h-[14px] text-[10px] font-bold rounded-full text-white flex items-center justify-center leading-none ${
                                        isDark ? 'bg-zinc-700' : 'bg-zinc-500'
                                    }`}>
                                        {counts.upcoming > 99 ? '99+' : counts.upcoming}
                                    </span>
                                )}
                            </div>
                            <span className="text-[11px] mt-0.5 tracking-tight">Upcoming</span>
                        </>
                    )}
                </NavLink>

                {/* 3. Center Add (Raised Prominent Button) */}
                <div className="flex flex-col items-center justify-center px-2">
                    <button
                        type="button"
                        onClick={onOpenAdd}
                        aria-label="Add a task"
                        className="w-12 h-12 -mt-5 rounded-full bg-linear-to-tr from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-500/35 hover:shadow-indigo-500/50 hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer focus:outline-none focus:ring-3 focus:ring-indigo-400"
                    >
                        <Plus className="w-6 h-6 stroke-[2.5]" />
                    </button>
                    <span className={`text-[10px] font-semibold mt-1 ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>
                        Add
                    </span>
                </div>

                {/* 4. Inbox */}
                <NavLink
                    to="/inbox"
                    aria-label={`Inbox tasks (${counts.inbox})`}
                    className={({ isActive }) =>
                        `${linkBaseClasses} ${
                            isActive
                                ? isDark
                                    ? 'text-indigo-400 font-semibold'
                                    : 'text-indigo-600 font-semibold'
                                : isDark
                                ? 'hover:text-zinc-200'
                                : 'hover:text-zinc-900'
                        }`
                    }
                >
                    {({ isActive }) => (
                        <>
                            <div className="relative">
                                <Inbox className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                                {counts.inbox > 0 && (
                                    <span className={`absolute -top-1 -right-2 px-1 min-w-[14px] h-[14px] text-[10px] font-bold rounded-full text-white flex items-center justify-center leading-none ${
                                        isDark ? 'bg-zinc-700' : 'bg-zinc-500'
                                    }`}>
                                        {counts.inbox > 99 ? '99+' : counts.inbox}
                                    </span>
                                )}
                            </div>
                            <span className="text-[11px] mt-0.5 tracking-tight">Inbox</span>
                        </>
                    )}
                </NavLink>

                {/* 5. Menu */}
                <button
                    type="button"
                    onClick={onOpenMenu}
                    aria-label="Open menu"
                    className={`${linkBaseClasses} ${
                        isDark ? 'hover:text-zinc-200' : 'hover:text-zinc-900'
                    }`}
                >
                    <MoreHorizontal className="w-5 h-5 stroke-2" />
                    <span className="text-[11px] mt-0.5 tracking-tight">Menu</span>
                </button>
            </div>
        </nav>
    );
}

