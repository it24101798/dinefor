import { Component } from "react";
import { Link } from "react-router-dom";

export default class RouteLoadBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidUpdate(previous) {
    if (previous.route !== this.props.route && this.state.failed) {
      this.setState({ failed: false });
    }
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return <main className="df-error-page min-h-[65vh] grid place-items-center px-4 pt-28 pb-16">
      <section className="card-ambient p-6 max-w-md space-y-4" role="alert">
        <h1 className="text-xl font-bold">This page couldn’t load</h1>
        <p>Reload the page or return to buffet listings.</p>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-primary" onClick={() => window.location.reload()}>Reload page</button>
          <Link className="btn-outline" to="/listings">Browse buffets</Link>
        </div>
      </section>
    </main>;
  }
}
