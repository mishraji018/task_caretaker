import { CheckCircle2, Plus } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export default function EmptyState({
    onFocusForm,
    title = 'All caught up!',
    message = 'You have no tasks right now. Take a break, or add a new task to stay organized and productive today.',
    actionLabel = 'Create your first task',
}) {
    const { isDark } = useTheme();

    return (
        <div className={`flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed transition-colors ${isDark ? 'border-zinc-800 bg-zinc-900/40' : 'border-zinc-300 bg-zinc-50/60'
            }`}>
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${isDark ? 'bg-indigo-600/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                }`}>
                <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                {title}
            </h3>
            <p className={`text-sm max-w-sm mb-6 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                {message}
            </p>

            {onFocusForm && (
                <button
                    type="button"
                    onClick={onFocusForm}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all shadow-xs cursor-pointer"
                >
                    <Plus className="w-4 h-4" />
                    <span>{actionLabel}</span>
                </button>
            )}
        </div>
    );
}

