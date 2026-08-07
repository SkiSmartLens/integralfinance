import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import "./index.css";

const rootElement = document.getElementById("root");

if (rootElement) {
  const root = createRoot(rootElement);

  import("./App.tsx")
    .then(({ default: App }) => {
      root.render(
        <HelmetProvider>
          <App />
        </HelmetProvider>,
      );
    })
    .catch((error: unknown) => {
      console.error("IntegralStocks failed to start", error);
      root.render(
        <main className="min-h-screen bg-background px-6 flex items-center justify-center text-center">
          <div className="max-w-md">
            <h1 className="text-2xl font-bold">IntegralStocks couldn’t load</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              The app could not finish starting. Please refresh to try again.
            </p>
            <button
              type="button"
              className="mt-6 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
              onClick={() => window.location.reload()}
            >
              Refresh
            </button>
          </div>
        </main>,
      );
    });
}
