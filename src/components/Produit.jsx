import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart, useCatalog } from "../lib/store.jsx";
import { prix } from "../lib/format.js";
import { Plus } from "./Icons.jsx";

export function PhotoProduit({ p, i = 0, className = "", eager = false }) {
  const [erreur, setErreur] = useState(false);
  const src = p?.images?.[i];
  if (!src || erreur) {
    return (
      <div className={`photo-vide ${className}`}>
        <img src="/images/logo-fonce.png" alt="" />
        <span>Photo à venir</span>
      </div>
    );
  }
  return (
    <img
      className={className}
      src={src}
      alt={p.nom + (p.desc ? " — " + p.desc : "")}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => setErreur(true)}
    />
  );
}

export function CarteProduit({ p }) {
  const { ajouter } = useCart();
  const { catParId } = useCatalog();
  const etiquette = p.marque || catParId(p.cat)?.nom || "";
  return (
    <article className="carte">
      <Link to={`/produit/${p.id}`} className="carte-photo" aria-label={p.nom}>
        <PhotoProduit p={p} />
        {p.tag && <span className="pastille">{p.tag}</span>}
        {!p.stock && <span className="pastille pastille-gris">Rupture</span>}
      </Link>
      <div className="carte-corps">
        <div className="carte-marque">{etiquette}</div>
        <Link to={`/produit/${p.id}`} className="carte-nom">{p.nom}</Link>
        {p.desc && <div className="carte-desc">{p.desc}</div>}
        <div className="carte-pied">
          <span className="carte-prix">{p.prix > 0 ? prix(p.prix) : "Prix en boutique"}</span>
          <button
            className="btn-rond"
            onClick={() => ajouter(p.id, 1)}
            disabled={!p.stock || p.prix <= 0}
            aria-label={`Ajouter ${p.nom} au panier`}
            title="Ajouter au panier"
          >
            <Plus s={18} />
          </button>
        </div>
      </div>
    </article>
  );
}

export function SqueletteCartes({ n = 8 }) {
  return Array.from({ length: n }, (_, i) => (
    <div className="carte carte-squelette" key={i}>
      <div className="carte-photo" />
      <div className="carte-corps"><span /><span /><span /></div>
    </div>
  ));
}
