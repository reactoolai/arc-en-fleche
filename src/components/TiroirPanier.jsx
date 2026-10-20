import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { lignesPanier, useCart, useCatalog } from "../lib/store.jsx";
import { LIVRAISON } from "../data/site.js";
import { prix } from "../lib/format.js";
import { Fermer, Moins, Plus } from "./Icons.jsx";
import { PhotoProduit } from "./Produit.jsx";

export function BarreLivraison({ sousTotal }) {
  const reste = LIVRAISON.seuil - sousTotal;
  const pct = Math.min(100, (sousTotal / LIVRAISON.seuil) * 100);
  return (
    <div className="barre-livraison">
      <p>{reste > 0 ? <>Plus que <strong>{prix(reste)}</strong> pour la livraison gratuite</> : <strong>Livraison gratuite débloquée</strong>}</p>
      <div className="barre"><i style={{ width: pct + "%" }} /></div>
    </div>
  );
}

export function Quantite({ q, set, petit }) {
  return (
    <div className={`qte ${petit ? "qte-petit" : ""}`}>
      <button onClick={() => set(q - 1)} aria-label="Diminuer"><Moins s={16} /></button>
      <span>{q}</span>
      <button onClick={() => set(q + 1)} aria-label="Augmenter"><Plus s={16} /></button>
    </div>
  );
}

export default function TiroirPanier() {
  const { items, ouvert, setOuvert, changer, dernier } = useCart();
  const { parId } = useCatalog();
  const { pathname } = useLocation();
  const lignes = lignesPanier(items, parId);
  const sousTotal = lignes.reduce((t, l) => t + l.p.prix * l.q, 0);

  useEffect(() => { setOuvert(false); }, [pathname, setOuvert]);
  useEffect(() => {
    document.body.style.overflow = ouvert ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [ouvert]);

  return (
    <div className={`tiroir-fond tiroir-panier ${ouvert ? "visible" : ""}`} onClick={() => setOuvert(false)} aria-hidden={!ouvert}>
      <aside className="tiroir" onClick={(e) => e.stopPropagation()} aria-label="Panier">
        <div className="tiroir-tete">
          <h2>Votre panier</h2>
          <button className="icone-btn" onClick={() => setOuvert(false)} aria-label="Fermer le panier"><Fermer /></button>
        </div>
        {lignes.length === 0 ? (
          <div className="tiroir-vide">
            <p>Votre panier est vide.</p>
            <Link to="/boutique" className="btn btn-orange">Magasiner</Link>
          </div>
        ) : (
          <>
            <BarreLivraison sousTotal={sousTotal} />
            <ul className="tiroir-lignes">
              {lignes.map(({ p, q }) => (
                <li key={p.id} className={p.id === dernier ? "flash" : ""}>
                  <Link to={`/produit/${p.id}`} className="tiroir-img"><PhotoProduit p={p} /></Link>
                  <div className="tiroir-info">
                    <Link to={`/produit/${p.id}`}>{p.nom}</Link>
                    {p.desc && <small>{p.desc}</small>}
                    <div className="tiroir-ligne-bas">
                      <Quantite q={q} set={(n) => changer(p.id, n)} petit />
                      <strong>{prix(p.prix * q)}</strong>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="tiroir-pied">
              <div className="tiroir-total"><span>Sous-total</span><strong>{prix(sousTotal)}</strong></div>
              <Link to="/panier" className="btn btn-orange btn-plein">Passer la commande</Link>
              <button className="lien-discret" onClick={() => setOuvert(false)}>Continuer à magasiner</button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
