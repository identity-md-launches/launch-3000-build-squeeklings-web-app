import { createRoot } from "react-dom/client";
import { Component, type ReactNode } from "react";
import App from "./App";
import { WalletContext } from "./wallet";
import "./styles.css";

class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="fatal-error">
          <h1>A little pause.</h1>
          <p>Squeeklings couldn’t open. Reload the page to try again.</p>
          <button className="button primary" onClick={() => location.reload()}>
            Reload Squeeklings
          </button>
        </main>
      );
    return this.props.children;
  }
}
createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <WalletContext>
      <App />
    </WalletContext>
  </ErrorBoundary>,
);
