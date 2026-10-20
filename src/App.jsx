import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import Entete from "./components/Entete.jsx";
import Pied from "./components/Pied.jsx";
import TiroirPanier from "./components/TiroirPanier.jsx";
import Connexion from "./components/Connexion.jsx";
import Accueil from "./pages/Accueil.jsx";
import Boutique from "./pages/Boutique.jsx";
import FicheProduit from "./pages/FicheProduit.jsx";
import Atelier from "./pages/Atelier.jsx";
import APropos from "./pages/APropos.jsx";
import Album from "./pages/Album.jsx";
import Contact from "./pages/Contact.jsx";
import Panier from "./pages/Panier.jsx";
import Compte from "./pages/Compte.jsx";
import Admin from "./pages/Admin.jsx";
import Introuvable from "./pages/Introuvable.jsx";

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  return (
    <div className="app">
      <Entete />
      <main>
        <Routes>
          <Route path="/" element={<Accueil />} />
          <Route path="/boutique" element={<Boutique />} />
          <Route path="/produit/:id" element={<FicheProduit />} />
          <Route path="/atelier" element={<Atelier />} />
          <Route path="/a-propos" element={<APropos />} />
          <Route path="/album" element={<Album />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/panier" element={<Panier />} />
          <Route path="/compte" element={<Compte />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Introuvable />} />
        </Routes>
      </main>
      <Pied />
      <TiroirPanier />
      <Connexion />
    </div>
  );
}
