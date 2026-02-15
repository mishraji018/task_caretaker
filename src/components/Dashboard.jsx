import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Plus, Trash2, CheckCircle2, Circle, ArrowUp, ArrowDown, Minus, Calendar, AlertTriangle, GripVertical } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableTodoItem({ todo, isDark, onToggle, onDelete }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: todo.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const isOverdue = (dueDateStr) => {
        if (!dueDateStr) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(dueDateStr);
        return due < today;
    };

    const formatDueDate = (dueDateStr) => {
        if (!dueDateStr) return '';
        const date = new Date(dueDateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getPriorityColor = (p) => {
        switch (p) {
            case 'high': return 'text-red-400 bg-red-400/10 border-red-400/20';
            case 'medium': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
            case 'low': return 'text-green-400 bg-green-400/10 border-green-400/20';
            default: return 'text-gray-400 bg-gray-400/10';
        }
    };

    const getPriorityIcon = (p) => {
        switch (p) {
            case 'high': return <ArrowUp className="h-4 w-4" />;
            case 'medium': return <Minus className="h-4 w-4" />;
            case 'low': return <ArrowDown className="h-4 w-4" />;
            default: return null;
        }
    };

    const overdue = !todo.completed && isOverdue(todo.dueDate);

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 ${todo.completed
                    ? isDark
                        ? 'bg-gray-800/50 border-gray-700/50 opacity-75'
                        : 'bg-gray-100/50 border-gray-300/50 opacity-75'
                    : overdue
                        ? 'bg-red-500/5 border-red-500/30 hover:border-red-500/50'
                        : isDark
                            ? 'bg-gray-700/30 border-gray-700 hover:border-gray-600 hover:bg-gray-700/50'
                            : 'bg-gray-50 border-gray-200 hover:border-gray-300 hover:bg-gray-100'
                }`}
        >
            <button
                {...attributes}
                {...listeners}
                className={`cursor-grab active:cursor-grabbing ${isDark ? 'text-gray-500 hover:text-gray-400' : 'text-gray-400 hover:text-gray-500'} touch-none`}
            >
                <GripVertical className="h-5 w-5" />
            </button>

            <button
                onClick={() => onToggle(todo.id)}
                className={`flex-shrink-0 transition-colors duration-200 ${todo.completed ? 'text-green-500' : isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                    }`}
            >
                {todo.completed ? (
                    <CheckCircle2 className="h-6 w-6" />
                ) : (
                    <Circle className="h-6 w-6" />
                )}
            </button>

            <div className="flex flex-col gap-1.5 overflow-hidden flex-1">
                <span
                    className={`truncate text-lg ${todo.completed
                            ? isDark ? 'text-gray-500 line-through' : 'text-gray-400 line-through'
                            : isDark ? 'text-gray-200' : 'text-gray-900'
                        }`}
                >
                    {todo.text}
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                    {!todo.completed && (
                        <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full w-fit border ${getPriorityColor(todo.priority)}`}>
                            {getPriorityIcon(todo.priority)}
                            <span className="uppercase font-bold tracking-wider">{todo.priority}</span>
                        </div>
                    )}
                    {todo.dueDate && (
                        <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${overdue
                                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                                : isDark
                                    ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                                    : 'bg-blue-50 border-blue-200 text-blue-600'
                            }`}>
                            {overdue ? <AlertTriangle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                            <span className="font-medium">{formatDueDate(todo.dueDate)}</span>
                            {overdue && <span className="font-bold">OVERDUE</span>}
                        </div>
                    )}
                </div>
            </div>

            <button
                onClick={() => onDelete(todo.id)}
                className={`p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 ${isDark
                        ? 'text-gray-500 hover:text-red-400 hover:bg-red-400/10'
                        : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                    }`}
                title="Delete task"
            >
                <Trash2 className="h-5 w-5" />
            </button>
        </div>
    );
}

export default function Dashboard() {
    const { currentUser } = useAuth();
    const { isDark } = useTheme();
    const [todos, setTodos] = useState([]);
    const [newTodo, setNewTodo] = useState('');
    const [priority, setPriority] = useState('medium');
    const [dueDate, setDueDate] = useState('');
    const [loading, setLoading] = useState(true);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Load todos from local storage on mount
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

    // Save todos to local storage whenever they change
    useEffect(() => {
        if (!currentUser || loading) return;
        localStorage.setItem(`todos_${currentUser.uid}`, JSON.stringify(todos));
    }, [todos, currentUser, loading]);

    function handleDragEnd(event) {
        const { active, over } = event;

        if (active.id !== over.id) {
            setTodos((items) => {
                const oldIndex = items.findIndex(item => item.id === active.id);
                const newIndex = items.findIndex(item => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    }

    function handleAddTodo(e) {
        e.preventDefault();
        if (!newTodo.trim()) return;

        const newTodoItem = {
            id: Date.now().toString(),
            text: newTodo,
            completed: false,
            priority: priority,
            dueDate: dueDate || null,
            userId: currentUser.uid,
            createdAt: new Date().toISOString(),
        };

        setTodos(prev => [newTodoItem, ...prev]);
        setNewTodo('');
        setPriority('medium');
        setDueDate('');
    }

    function toggleTodo(id) {
        setTodos(prev => prev.map(todo =>
            todo.id === id ? { ...todo, completed: !todo.completed } : todo
        ));
    }

    function deleteTodo(id) {
        setTodos(prev => prev.filter(todo => todo.id !== id));
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h2 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
                    My Tasks
                </h2>
                <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                    Manage your daily goals and priorities • Drag to reorder
                </p>
            </div>

            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-xl rounded-2xl overflow-hidden border`}>
                <div className="p-6">
                    <form onSubmit={handleAddTodo} className="flex flex-col gap-3 mb-8">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                className={`flex-1 ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500'} border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition`}
                                placeholder="What needs to be done?"
                                value={newTodo}
                                onChange={(e) => setNewTodo(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                                className={`${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'} border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer flex-1 sm:flex-initial`}
                            >
                                <option value="high">High Priority</option>
                                <option value="medium">Medium Priority</option>
                                <option value="low">Low Priority</option>
                            </select>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className={`${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'} border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 sm:flex-initial`}
                            />
                            <button
                                type="submit"
                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 py-2.5 font-medium transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 w-full sm:w-auto"
                            >
                                <Plus className="h-5 w-5" />
                                <span>Add</span>
                            </button>
                        </div>
                    </form>

                    {loading ? (
                        <div className={`text-center py-10 ${isDark ? 'text-gray-500' : 'text-gray-400'} animate-pulse`}>
                            Loading your tasks...
                        </div>
                    ) : todos.length === 0 ? (
                        <div className={`text-center py-12 ${isDark ? 'text-gray-500' : 'text-gray-400'} flex flex-col items-center`}>
                            <div className={`${isDark ? 'bg-gray-700/50' : 'bg-gray-200'} p-4 rounded-full mb-4`}>
                                <CheckCircle2 className={`h-8 w-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                            </div>
                            <p className={`text-lg font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>No tasks yet</p>
                            <p className="text-sm">Add a task above to get started</p>
                        </div>
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={todos.map(t => t.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="space-y-3">
                                    {todos.map((todo) => (
                                        <SortableTodoItem
                                            key={todo.id}
                                            todo={todo}
                                            isDark={isDark}
                                            onToggle={toggleTodo}
                                            onDelete={deleteTodo}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    )}
                </div>
            </div>
        </div>
    );
}
