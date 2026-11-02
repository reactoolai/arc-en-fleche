import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider, CartProvider, CatalogProvider } from "./lib/store.jsx";
import { ContenuProvider } from "./lib/contenu.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <CatalogProvider>
        <AuthProvider>
          <ContenuProvider>
            <CartProvider>
              <App />
            </CartProvider>
          </ContenuProvider>
        </AuthProvider>
      </CatalogProvider>
    </BrowserRouter>
  </StrictMode>
);
