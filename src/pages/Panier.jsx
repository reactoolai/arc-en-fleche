import { useEffect, useState } from "react";
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
  const { parId, chargement } = useCatalog();
  const { user, profil, ouvrir } = useAuth();
  const [mode, setMode] = useState("retrait");
  const [envoye, setEnvoye] = useState(false);
  const lignes = lignesPanier(items, parId);
  const sousTotal = lignes.reduce((t, l) => t + l.p.prix * l.q, 0);
  const frais = mode === "retrait" || sousTotal >= LIVRAISON.seuil || !lignes.length ? 0 : LIVRAISON.frais;
  const total = sousTotal + frais;

  const [form, setForm] = useState(false);
  const [c, setC] = useState({ nom: "", courriel: "", tel: "", notes: "" });
  const [etat, setEtat] = useState({ envoi: false, msg: "" });
  useEffect(() => {
    setC((x) => ({ nom: x.nom || profil?.full_name || "", courriel: x.courriel || user?.email || "", tel: x.tel || profil?.phone || "", notes: x.notes }));
  }, [user, profil]);

  const commander = async (e) => {
    e.preventDefault();
    if (!user) { ouvrir("login"); setEtat({ envoi: false, msg: "Connectez-vous pour enregistrer votre commande." }); return; }
    if (!c.nom || !c.courriel || !c.tel) { setEtat({ envoi: false, msg: "Veuillez remplir votre nom, votre courriel et votre téléphone." }); return; }
    const items = lignes.map(({ p, q }) => ({ productId: p.id, name: p.nom + (p.desc ? " (" + p.desc + ")" : ""), quantity: q, unitPrice: p.prix, total: p.prix * q }));
    const notes = [mode === "retrait" ? "Retrait en boutique" : "Livraison", c.notes].filter(Boolean).join(" — ");
    setEtat({ envoi: true, msg: "Enregistrement de votre commande…" });
    try {
      const { data: order, error } = await supabase.from("orders")
        .insert({ user_id: user.id, items, total, customer_name: c.nom, customer_email: c.courriel, customer_phone: c.tel, notes })
        .select("id").single();
      if (error) throw error;
      const { data, error: err2 } = await supabase.functions.invoke("send-email", {
        body: { type: "order", orderNumber: String(order.id).slice(0, 8).toUpperCase(), customer: { name: c.nom, email: c.courriel, phone: c.tel, notes }, items, total },
      });
      if (err2 || !data?.ok) throw new Error("courriel");
      vider();
      setEnvoye(true);
    } catch {
      setEtat({ envoi: false, msg: "Impossible d'envoyer la commande pour le moment. Réessayez ou appelez-nous au " + INFOS.tel + "." });
    }
  };

  if (envoye) {
    return (
      <div className="conteneur section vide-boite">
        <Coche s={42} />
        <h1>Commande envoyée</h1>
        <p>Merci ! Un courriel de confirmation vous a été envoyé. On vous rappelle pour confirmer la disponibilité et le paiement. Une question ? <a href={INFOS.telHref}>{INFOS.tel}</a>.</p>
        <div className="actions-ligne">
          <Link to="/compte" className="btn btn-fonce">Mes commandes</Link>
          <Link to="/boutique" className="btn btn-contour">Continuer à magasiner</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="conteneur section page-panier">
      <h1 className="h1-page">Votre panier</h1>
      {chargement && Object.keys(items).length > 0 ? (
        <div className="fiche-squelette" />
      ) : lignes.length === 0 ? (
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
            {!form ? (
              <button className="btn btn-orange btn-plein btn-grand" onClick={() => (user ? setForm(true) : ouvrir("login"))}>Passer la commande</button>
            ) : (
              <form className="form" onSubmit={commander}>
                <input placeholder="Nom complet" autoComplete="name" value={c.nom} onChange={(e) => setC({ ...c, nom: e.target.value })} />
                <input type="email" placeholder="Courriel" autoComplete="email" value={c.courriel} onChange={(e) => setC({ ...c, courriel: e.target.value })} />
                <input placeholder="Téléphone" autoComplete="tel" value={c.tel} onChange={(e) => setC({ ...c, tel: e.target.value })} />
                <textarea rows={2} placeholder="Note ou préférence de livraison (facultatif)" value={c.notes} onChange={(e) => setC({ ...c, notes: e.target.value })} />
                <button className="btn btn-orange btn-plein btn-grand" disabled={etat.envoi}>{etat.envoi ? "Envoi…" : "Confirmer la commande"}</button>
              </form>
            )}
            {etat.msg && <div className={etat.envoi ? "alerte alerte-ok" : "alerte"}>{etat.msg}</div>}
            {!user && <p className="petit centre">Un compte est requis pour commander — <button className="lien-discret" onClick={() => ouvrir("login")}>connexion ou création de compte</button>.</p>}
          </aside>
        </div>
      )}
    </div>
  );
}
