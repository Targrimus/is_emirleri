import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 m-4 border border-danger rounded bg-light">
          <h2 className="text-danger">Something went wrong.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            <summary>Error Details</summary>
            <p className="mt-2 fw-bold">{this.state.error && this.state.error.toString()}</p>
            <p className="small text-muted">{this.state.errorInfo && this.state.errorInfo.componentStack}</p>
          </details>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
