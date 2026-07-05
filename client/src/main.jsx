import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import App from "./App";
import "./styles.css";
import "./styles-ui-sprint1-design-system.css";
import "./styles-bundle10-google-reviews-admin.css";
import "./styles-bundle11-analytics.css";
import "./styles-bundle19bcd-customer-experience.css";
import "./styles-bundle21-payment-finance.css";
import "leaflet/dist/leaflet.css";
import "./styles-stitch-buffet-details.css";
import "./styles-stitch-master-redesign.css";
import "./styles-bundle29-qa-fixes.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
