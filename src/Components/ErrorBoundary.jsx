import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console or error reporting service
    console.error('Chat Message System Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI - just render children without chat functionality
      return this.props.children;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;