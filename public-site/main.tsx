import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import KlassenkompassApp from "../app/KlassenkompassApp";
import "../app/globals.css";
import "./public.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Klassenkompass konnte nicht gestartet werden.");
}

createRoot(root).render(
  <StrictMode>
    <KlassenkompassApp />
  </StrictMode>,
);
