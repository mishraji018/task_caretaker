import { Sun, Moon, Laptop } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * 3-Mode Theme Toggle (Light, Dark, System).
 * Fully accessible with role="radiogroup", visible focus outlines, and clear announcements.
 *
 * @param {object} props
 * @param {boolean} [props.isCollapsed=false] When collapsed (tablet sidebar), shows compact trigger
 */
export default function ThemeToggle({ isCollapsed = false }) {
    const { mode, isDark, setMode } = useTheme();

    const options = [
        { id: 'light', label: 'Light', icon: Sun },
        { id: 'dark', label: 'Dark', icon: Moon },
        { id: 'system', label: 'System', icon: Laptop },
    ];

    if (isCollapsed) {
        return (
            <button
                type="button"
                onClick={() => {
                    const next = mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light';
                    setMode(next);
                }}
                aria-label={`Current theme: ${mode}. Click to cycle.`}
                title={`Theme: ${mode}`}
                className={`w-full flex items-center justify-center p-2 rounded-xl transition-colors cursor-pointer ${
                    isDark ? 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
            >
                {mode === 'light' && <Sun className="w-4 h-4 text-amber-500" />}
                {mode === 'dark' && <Moon className="w-4 h-4 text-indigo-400" />}
                {mode === 'system' && <Laptop className="w-4 h-4 text-zinc-400" />}
            </button>
        );
    }

    return (
        <div
            role="radiogroup"
            aria-label="Theme mode"
            className={`flex items-center p-1 rounded-xl border transition-colors ${
                isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-200'
            }`}
        >
            {options.map((opt) => {
                const Icon = opt.icon;
                const isSelected = mode === opt.id;

                return (
                    <button
                        key={opt.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => setMode(opt.id)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                                ? isDark
                                    ? 'bg-zinc-800 text-white shadow-xs'
                                    : 'bg-white text-zinc-900 shadow-xs'
                                : isDark
                                ? 'text-zinc-400 hover:text-zinc-200'
                                : 'text-zinc-500 hover:text-zinc-900'
                        }`}
                    >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{opt.label}</span>
                    </button>
                );
            })}
        </div>
    );
}
