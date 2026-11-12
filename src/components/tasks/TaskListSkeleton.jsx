import { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * TaskListSkeleton displays a placeholder loading state.
 * Only becomes visible if loading lasts longer than 150ms to prevent visual flash on rapid loads.
 * Matches the layout and row heights of real TaskItem components in both Light and Dark themes.
 *
 * @param {object} props
 * @param {number} [props.count=3]
 * @param {number} [props.delay=150]
 */
export default function TaskListSkeleton({ count = 3, delay = 150 }) {
    const { isDark } = useTheme();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(true);
        }, delay);

        return () => {
            clearTimeout(timer);
        };
    }, [delay]);

    if (!visible) return null;

    const rows = Array.from({ length: count });

    return (
        <div
            aria-busy="true"
            aria-label="Loading tasks"
            className="space-y-2.5 animate-pulse motion-reduce:animate-none"
        >
            <div className="sr-only">Loading tasks...</div>
            {rows.map((_, idx) => (
                <div
                    key={idx}
                    className={`flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl border min-h-[72px] sm:min-h-[80px] transition-colors ${
                        isDark ? 'bg-zinc-900/60 border-zinc-800/80' : 'bg-white border-zinc-200/80'
                    }`}
                >
                    {/* Checkbox skeleton */}
                    <div
                        className={`w-5 h-5 rounded-lg shrink-0 mt-0.5 ${
                            isDark ? 'bg-zinc-800' : 'bg-zinc-200'
                        }`}
                    />

                    {/* Content skeleton */}
                    <div className="flex-1 space-y-2 min-w-0">
                        <div
                            className={`h-4 rounded-md ${
                                isDark ? 'bg-zinc-800' : 'bg-zinc-200'
                            }`}
                            style={{ width: `${Math.max(40, 75 - idx * 15)}%` }}
                        />
                        <div
                            className={`h-3 rounded-md w-1/3 ${
                                isDark ? 'bg-zinc-800/60' : 'bg-zinc-100'
                            }`}
                        />
                    </div>

                    {/* Action buttons skeleton */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        <div
                            className={`w-6 h-6 rounded-md ${
                                isDark ? 'bg-zinc-800/50' : 'bg-zinc-200/50'
                            }`}
                        />
                        <div
                            className={`w-6 h-6 rounded-md ${
                                isDark ? 'bg-zinc-800/50' : 'bg-zinc-200/50'
                            }`}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}
