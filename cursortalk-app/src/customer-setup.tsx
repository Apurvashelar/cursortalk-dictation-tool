import React from "react";
import ReactDOM from "react-dom/client";
import { CustomerConfigFormPage } from "./pages/CustomerConfigFormPage";
import "./styles/marketing.css";
import "./styles/customer-config-form.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CustomerConfigFormPage />
  </React.StrictMode>,
);
