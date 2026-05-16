import React from "react";
import ReactDOM from "react-dom/client";
import { MarketingLandingPage } from "./pages/MarketingLandingPage";
import "./styles/marketing.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MarketingLandingPage />
  </React.StrictMode>,
);
