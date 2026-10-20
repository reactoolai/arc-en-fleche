import { useState } from "react";
import { Link } from "react-router-dom";
import { lignesPanier, useAuth, useCart, useCatalog } from "../lib/store.jsx";
import { supabase } from "../lib/supabase.js";
import { INFOS, LIVRAISON } from "../data/site.js";
import { prix } from "../lib/format.js";
import { PhotoProduit } from "../components/Produit.jsx";
import { BarreLivraison, Quantite } from "../components/TiroirPanier.jsx";
import { Coche, Corbeille } from "../components/Icons.jsx";

export default function Panier() {
  const { items, changer, vider } = useCart();
  const { parId } = useCatalog();
  const { user, profil, ouvrir } = useAuth();
  const [mode, setMode] = useState("retrait");
  const [envoye, setEnvoye] = useState(false);
  const lignes = lignesPanier(items, parId);
  const sousTotal = lignes.reduce((t, l) => t + l.p.prix * l.q, 0);
  const frais = mode === "retrait" || sousTotal >= LIVRAISON.seuil || !lignes.length ? 0 : LIVRAISON.frais;
  const total = sousTotal + frais;

  const commander = async () => {
    const detail = lignes.map(({ p, q }) => `• ${q} × ${p.nom}${p.desc ? " (" + p.desc + ")" : ""} — ${prix(p.prix * q)}  [#${p.id}]`).join("\n");
    const corps =
      `Bonjour,\n\nJ'aimerais commander :\n\n${detail}\n\nSous-total : ${prix(sousTotal)}\n` +
      `${mode === "retrait" ? "Retrait en boutique (gratuit)" : "Livraison : " + (frais ? prix(frais) : "gratuite")}\nTotal : ${prix(total)}\n\n` +
      `Nom : ${profil?.full_name || ""}\nTéléphone : ${profil?.phone || ""}\n\nMerci !`;
    if (user) {
      await supabase.from("orders").insert({
        items: lignes.map(({ p, q }) => ({ id: p.id, nom: p.nom, desc: p.desc, prix: p.prix, qte: q })),
        total, status: "pending",
      });
    }
    window.location.href = `mailto:${INFOS.courriel}?subject=${encodeURIComponent("Commande en ligne — Arc En Flèche")}&body=${encodeURIComponent(corps)}`;
    setEnvoye(true);
  };

  if (envoye) {
    return (
      <div className="conteneur section vide-boite">
        <Coche s={42} />
        <h1>Commande prête à envoyer</h1>
        <p>Votre application de courriel s'est ouverte avec le détail de la commande. Envoyez-la et on vous rappelle pour confirmer la disponibilité et le paiement. Vous pouvez aussi appeler au <a href={INFOS.telHref}>{INFOS.tel}</a>.</p>
        <div className="actions-ligne">
          <button className="btn btn-fonce" onClick={() => { vider(); setEnvoye(false); }}>Vider le panier</button>
          <Link to="/boutique" className="btn btn-contour">Continuer à magasiner</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="conteneur section page-panier">
      <h1 className="h1-page">Votre panier</h1>
      {lignes.length === 0 ? (
        <div className="vide-boite">
          <h3>Votre panier est vide</h3>
          <p>La saison approche — il est encore temps de vous équiper.</p>
          <Link to="/boutique" className="btn btn-orange">Voir la boutique</Link>
        </div>
      ) : (
        <div className="panier-grille">
          <ul className="panier-lignes">
            {lignes.map(({ p, q }) => (
              <li key={p.id}>
                <Link to={`/produit/${p.id}`} className="panier-img"><PhotoProduit p={p} /></Link>
                <div className="panier-info">
                  <Link to={`/produit/${p.id}`}><strong>{p.nom}</strong></Link>
                  {p.desc && <small>{p.desc}</small>}
                  <span className="petit">{prix(p.prix)} l'unité</span>
                </div>
                <Quantite q={q} set={(n) => changer(p.id, n)} petit />
                <strong className="panier-tot">{prix(p.prix * q)}</strong>
                <button className="icone-btn" onClick={() => changer(p.id, 0)} aria-label={`Retirer ${p.nom}`}><Corbeille s={18} /></button>
              </li>
            ))}
          </ul>
          <aside className="resume">
            <h2 className="h2-petit">Résumé</h2>
            <div className="choix-mode">
              <label className={mode === "retrait" ? "actif" : ""}><input type="radio" checked={mode === "retrait"} onChange={() => setMode("retrait")} /> <span><strong>Retrait en boutique</strong><small>Gratuit · Saint-Bruno</small></span></label>
              <label className={mode === "livraison" ? "actif" : ""}><input type="radio" checked={mode === "livraison"} onChange={() => setMode("livraison")} /> <span><strong>Livraison au Québec</strong><small>Gratuite dès {LIVRAISON.seuil} $</small></span></label>
            </div>
            {mode === "livraison" && <BarreLivraison sousTotal={sousTotal} />}
            <div className="resume-ligne"><span>Sous-total</span><span>{prix(sousTotal)}</span></div>
            <div className="resume-ligne"><span>{mode === "retrait" ? "Retrait" : "Livraison"}</span><span>{frais ? prix(frais) : "Gratuit"}</span></div>
            <div className="resume-ligne resume-total"><span>Total</span><strong>{prix(total)}</strong></div>
            <p className="petit">Taxes applicables en sus. Paiement et disponibilité confirmés par téléphone.</p>
            <button className="btn btn-orange btn-plein btn-grand" onClick={commander}>Envoyer ma commande</button>
            {!user && <p className="petit centre">Astuce : <button className="lien-discret" onClick={() => ouvrir("login")}>connectez-vous</button> pour retrouver vos commandes.</p>}
          </aside>
        </div>
      )}
    </div>
  );
}
