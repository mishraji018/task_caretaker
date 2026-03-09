import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';

export default function Insights() {
    const { currentUser } = useAuth();
    const { isDark } = useTheme();
    const [todos, setTodos] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) return;
        try {
            const storedTodos = localStorage.getItem(`todos_${currentUser.uid}`);
            if (storedTodos) {
                setTodos(JSON.parse(storedTodos));
            }
        } catch (err) {
            console.error("Failed to load todos", err);
        }
        setLoading(false);
    }, [currentUser]);

    if (loading) return <div className={`text-center p-10 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Loading insights...</div>;

    const totalTasks = todos.length;
    const completedTasks = todos.filter(t => t.completed).length;
    const pendingTasks = totalTasks - completedTasks;
    const completionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    const priorityData = [
        { name: 'High', value: todos.filter(t => t.priority === 'high' && !t.completed).length, color: '#F87171' },
        { name: 'Medium', value: todos.filter(t => t.priority === 'medium' && !t.completed).length, color: '#FACC15' },
        { name: 'Low', value: todos.filter(t => t.priority === 'low' && !t.completed).length, color: '#4ADE80' },
    ].filter(d => d.value > 0);

    const statusData = [
        { name: 'Completed', value: completedTasks, color: '#3B82F6' },
        { name: 'Pending', value: pendingTasks, color: '#6B7280' },
    ];

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div className="mb-8">
                <h2 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
                    Productivity Insights
                </h2>
                <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                    Track your progress and priorities
                </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6 rounded-2xl border shadow-lg`}>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
                            <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <h3 className={`${isDark ? 'text-gray-400' : 'text-gray-600'} font-medium`}>Completion Rate</h3>
                    </div>
                    <div className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mt-2`}>{completionRate}%</div>
                    <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'} mt-1`}>of all tasks completed</p>
                </div>

                <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6 rounded-2xl border shadow-lg`}>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-red-500/10 rounded-xl text-red-500">
                            <AlertCircle className="h-6 w-6" />
                        </div>
                        <h3 className={`${isDark ? 'text-gray-400' : 'text-gray-600'} font-medium`}>High Priority Left</h3>
                    </div>
                    <div className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mt-2`}>
                        {todos.filter(t => t.priority === 'high' && !t.completed).length}
                    </div>
                    <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'} mt-1`}>tasks need attention</p>
                </div>

                <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6 rounded-2xl border shadow-lg`}>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-purple-500/10 rounded-xl text-purple-500">
                            <Clock className="h-6 w-6" />
                        </div>
                        <h3 className={`${isDark ? 'text-gray-400' : 'text-gray-600'} font-medium`}>Pending Tasks</h3>
                    </div>
                    <div className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mt-2`}>{pendingTasks}</div>
                    <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'} mt-1`}>tasks remaining</p>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Status Chart */}
                <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6 rounded-2xl border shadow-lg`}>
                    <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-6`}>Task Status</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                                        borderColor: isDark ? '#374151' : '#E5E7EB',
                                        borderRadius: '0.5rem',
                                        color: isDark ? '#F3F4F6' : '#111827'
                                    }}
                                    itemStyle={{ color: isDark ? '#F3F4F6' : '#111827' }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Priority Chart */}
                <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6 rounded-2xl border shadow-lg`}>
                    <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-6`}>Pending by Priority</h3>
                    {priorityData.length > 0 ? (
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={priorityData}>
                                    <XAxis dataKey="name" stroke={isDark ? '#9CA3AF' : '#6B7280'} />
                                    <YAxis stroke={isDark ? '#9CA3AF' : '#6B7280'} />
                                    <Tooltip
                                        cursor={{ fill: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }}
                                        contentStyle={{
                                            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                                            borderColor: isDark ? '#374151' : '#E5E7EB',
                                            borderRadius: '0.5rem',
                                            color: isDark ? '#F3F4F6' : '#111827'
                                        }}
                                    />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                        {priorityData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className={`h-64 flex items-center justify-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            No pending tasks to analyze
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
