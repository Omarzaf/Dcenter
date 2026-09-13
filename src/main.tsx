import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
function DownloadFailure() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        padding: "15vh 10vw",
        background: "#17323a",
        color: "#e3edcb",
        fontFamily: "system-ui",
      }}
    >
      <h1>Let’s get you back to the facility.</h1>
      <p>
        The game could not finish downloading. Your saved progress stays on this
        device.
      </p>
      <button
        onClick={() => location.reload()}
        style={{ padding: "12px 20px", marginTop: 20, cursor: "pointer" }}
      >
        Try again
      </button>
    </main>
  );
}
const App =
  new URLSearchParams(location.search).get("mode") === "legacy"
    ? lazy(() =>
        import("./strategy/StrategyApp").catch(() => ({
          default: DownloadFailure,
        })),
      )
    : lazy(() =>
        import("./campaign/CampaignRouter").catch(() => ({
          default: DownloadFailure,
        })),
      );

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100dvh",
            display: "grid",
            placeItems: "center",
            color: "#d7dfb5",
            background: "#17323a",
            fontFamily: "system-ui",
          }}
        >
          Opening CORE…
        </div>
      }
    >
      <App />
    </Suspense>
  </StrictMode>,
);
