import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    handleReload = () => {
        window.location.reload();
    };

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center p-4 bg-gray-900 text-gray-100 font-sans">
                    <div className="w-full max-w-md p-6 bg-gray-800 border border-gray-700 rounded-2xl shadow-xl text-center">
                        <div className="w-14 h-14 mx-auto mb-4 bg-red-500/10 text-red-400 rounded-2xl flex items-center justify-center">
                            <AlertTriangle className="w-8 h-8" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
                        <p className="text-sm text-gray-400 mb-6">
                            An unexpected error occurred. The application stopped this component from crashing your whole workspace.
                        </p>
                        {this.state.error?.message && (
                            <div className="mb-6 p-3 bg-gray-900/80 rounded-xl text-xs text-red-300 font-mono text-left overflow-auto max-h-32">
                                {this.state.error.message}
                            </div>
                        )}
                        <div className="flex items-center justify-center gap-3">
                            <button
                                type="button"
                                onClick={this.handleReset}
                                className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors"
                            >
                                Try Again
                            </button>
                            <button
                                type="button"
                                onClick={this.handleReload}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                                <span>Reload App</span>
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

