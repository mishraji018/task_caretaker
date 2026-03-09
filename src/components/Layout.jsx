import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, PieChart, LogOut, Moon, Sun } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function Layout() {
    const { logout } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const location = useLocation();

    const navItems = [
        { path: '/', label: 'My Tasks', icon: LayoutDashboard },
        { path: '/insights', label: 'Insights', icon: PieChart },
    ];

    return (
        <div className={`flex h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} ${isDark ? 'text-gray-100' : 'text-gray-900'} font-sans overflow-hidden transition-colors`}>
            {/* Sidebar for Desktop */}
            <aside className={`hidden md:flex flex-col w-64 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-r`}>
                <div className="p-6">
                    <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} tracking-wider flex items-center gap-2`}>
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                            <span className="text-white text-lg">T</span>
                        </div>
                        TaskMaster
                    </h1>
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                        : isDark
                                            ? 'text-gray-400 hover:bg-gray-700 hover:text-white'
                                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                    }`}
                            >
                                <Icon className="h-5 w-5" />
                                <span className="font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className={`p-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'} space-y-2`}>
                    <button
                        onClick={toggleTheme}
                        className={`flex items-center gap-3 px-4 py-3 w-full rounded-xl transition-colors ${isDark
                                ? 'text-gray-400 hover:bg-gray-700 hover:text-white'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                    >
                        {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                        <span className="font-medium">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                    </button>
                    <button
                        onClick={logout}
                        className={`flex items-center gap-3 px-4 py-3 w-full rounded-xl transition-colors ${isDark
                                ? 'text-gray-400 hover:bg-red-500/10 hover:text-red-400'
                                : 'text-gray-600 hover:bg-red-50 hover:text-red-600'
                            }`}
                    >
                        <LogOut className="h-5 w-5" />
                        <span className="font-medium">Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col h-full overflow-hidden relative ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
                    <Outlet />
                </main>

                {/* Bottom Navigation for Mobile */}
                <div className={`md:hidden absolute bottom-0 left-0 right-0 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-t px-6 py-3 flex justify-around items-center z-10`}>
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex flex-col items-center gap-1 ${isActive
                                        ? 'text-blue-500'
                                        : isDark
                                            ? 'text-gray-500 hover:text-gray-300'
                                            : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <Icon className={`h-6 w-6 ${isActive ? 'fill-current' : ''}`} />
                                <span className="text-xs font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                    <button
                        onClick={toggleTheme}
                        className={`flex flex-col items-center gap-1 ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {isDark ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
                        <span className="text-xs font-medium">Theme</span>
                    </button>
                    <button
                        onClick={logout}
                        className={`flex flex-col items-center gap-1 ${isDark ? 'text-gray-500 hover:text-red-400' : 'text-gray-500 hover:text-red-600'}`}
                    >
                        <LogOut className="h-6 w-6" />
                        <span className="text-xs font-medium">Out</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
