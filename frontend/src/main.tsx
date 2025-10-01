import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import "./index.css";
import "./styles/global.css";

import RootLayout from "./components/RootLayout";
import App from "./App"; // your Home page
import Library from "./pages/Library"; // your second page

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Shared layout with sidebar */}
        <Route element={<RootLayout />}>
          <Route path="/" element={<App />} />
          <Route path="/library" element={<Library />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
