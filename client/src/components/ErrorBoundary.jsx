import React from 'react';
import { RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
                    <div className="card w-full max-w-md bg-base-100 shadow-xl">
                        <div className="card-body text-center items-center">
                            <div className="text-error mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h2 className="card-title text-2xl font-bold mb-2">Something went wrong</h2>
                            <p className="text-base-content/70 mb-6">
                                We apologize for the inconvenience. An unexpected error has occurred.
                                {this.state.error && process.env.NODE_ENV === 'development' && (
                                    <span className="block mt-2 text-xs font-mono bg-base-300 p-2 rounded text-left overflow-auto max-h-32 w-full">
                                        {this.state.error.toString()}
                                    </span>
                                )}
                            </p>
                            <div className="card-actions">
                                <button onClick={this.handleReload} className="btn btn-primary gap-2">
                                    <RefreshCw size={18} />
                                    Reload Application
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
