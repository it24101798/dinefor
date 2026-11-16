import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import App from "./App";

// ===== SINGLE CSS IMPORT =====
import "./index.css";
import "./mobile/styles/foundation.css";
import "./mobile/styles/navigation.css";
import "./mobile/styles/surfaces.css";
import "./design/complete-design.css";
// Restored: these were not imported by the real entry file, so tablet hero, date hint,
// crew art and discovery spacing rules never reached the browser (QA F01/F05).
import "./design/mobile-polish.css";
import "./mobile/styles/reference-upgrade.css";
import "./mobile/styles/bundle02-discovery.css";
import "./mobile/styles/bundle03a-corrections.css";


ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);