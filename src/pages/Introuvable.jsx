import { Link } from "react-router-dom";

export default function Introuvable() {
  return (
    <div className="conteneur section vide-boite">
      <p className="sur-titre">Erreur 404</p>
      <h1>Hors piste.</h1>
      <p>Cette page n'existe pas ou a été déplacée.</p>
      <div className="actions-ligne">
        <Link to="/" className="btn btn-fonce">Accueil</Link>
        <Link to="/boutique" className="btn btn-orange">Boutique</Link>
      </div>
    </div>
  );
}
