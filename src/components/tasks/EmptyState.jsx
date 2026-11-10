import { CheckCircle2, Plus } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export default function EmptyState({ onFocusForm }) {
    const { isDark } = useTheme();

    return (
        <div className={`flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed transition-colors ${isDark ? 'border-gray-700 bg-gray-800/40' : 'border-gray-300 bg-gray-50/60'
            }`}>
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${isDark ? 'bg-blue-600/10 text-blue-400' : 'bg-blue-50 text-blue-600'
                }`}>
                <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                All caught up!
            </h3>
            <p className={`text-sm max-w-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                You have no tasks right now. Take a break, or add a new task to stay organized and productive today.
            </p>

            {onFocusForm && (
                <button
                    type="button"
                    onClick={onFocusForm}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    <span>Create your first task</span>
                </button>
            )}
        </div>
    );
}

