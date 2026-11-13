import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { lignesPanier, useAuth, useCart, useCatalog } from "../lib/store.jsx";
import { supabase } from "../lib/supabase.js";
import { BOUTIQUE_EN_LIGNE, INFOS, LIVRAISON } from "../data/site.js";
import { useContenu } from "../lib/contenu.jsx";
import { prix } from "../lib/format.js";
import { PhotoProduit } from "../components/Produit.jsx";
import { BarreLivraison, Quantite } from "../components/TiroirPanier.jsx";
import { Coche, Corbeille } from "../components/Icons.jsx";

const TPS = 0.05;
const TVQ = 0.09975;
const r2 = (n) => Math.round(n * 100) / 100;

export default function Panier() {
  useContenu();
  const { items, changer, vider } = useCart();
  const { parId, chargement } = useCatalog();
  const { user, profil, ouvrir } = useAuth();
  const [mode, setMode] = useState("retrait");
  const [envoye, setEnvoye] = useState(false);
  const lignes = lignesPanier(items, parId);
  const sousTotal = lignes.reduce((t, l) => t + l.p.prix * l.q, 0);
  const frais = mode === "retrait" || sousTotal >= LIVRAISON.seuil || !lignes.length ? 0 : LIVRAISON.frais;

  // Paiement en ligne Clover (si configuré) : taxes ajoutées, sinon commande confirmée par téléphone
  const [config, setConfig] = useState(null);
  useEffect(() => {
    let annule = false;
    supabase.functions.invoke("shop-checkout", { body: { action: "config" } })
      .then(({ data }) => { if (!annule) setConfig(data?.ok ? data : { configured: false }); })
      .catch(() => { if (!annule) setConfig({ configured: false }); });
    return () => { annule = true; };
  }, []);
  const enLigne = BOUTIQUE_EN_LIGNE && !!config?.configured;
  const base = r2(r2(lignes.reduce((t, l) => t + r2(l.p.prix * l.q), 0)) + frais);
  const tps = enLigne ? r2(base * TPS) : 0;
  const tvq = enLigne ? r2(base * TVQ) : 0;
  const total = r2(base + tps + tvq);
  const nonPayables = lignes.filter(({ p }) => !(p.prix > 0) || p.stock === false);

  const [form, setForm] = useState(false);
  const [c, setC] = useState({ nom: "", courriel: "", tel: "", notes: "" });
  const [etat, setEtat] = useState({ envoi: false, msg: "" });
  const [adr, setAdr] = useState({ rue: "", ville: "", codePostal: "" });
  const [paye, setPaye] = useState(null);
  const [attente, setAttente] = useState(null);

  // Retour de la page de paiement Clover : ?commande=<id> → attente du webhook ; ?annule= / ?echec=
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("annule")) setEtat({ envoi: false, msg: "Paiement annulé : aucun montant n'a été prélevé. Votre panier est conservé." });
    if (q.get("echec")) setEtat({ envoi: false, msg: "Le paiement a été refusé : aucun montant n'a été prélevé. Essayez une autre carte." });
    const id = q.get("commande");
    if (!id) return;
    let essais = 0, fin = false;
    setAttente({ longue: false });
    const verifier = async () => {
      if (fin) return;
      essais++;
      const { data } = await supabase.functions.invoke("shop-checkout", { body: { action: "status", id } }).catch(() => ({ data: null }));
      if (data?.ok && data.status === "paid") {
        fin = true; setAttente(null); vider(); setPaye(data);
        window.history.replaceState({}, "", "/panier");
        return;
      }
      if (essais === 15) setAttente({ longue: true });
      setTimeout(verifier, essais < 15 ? 2000 : 5000);
    };
    verifier();
    return () => { fin = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const payer = async (e) => {
    e.preventDefault();
    if (!user) { ouvrir("login"); return; }
    if (!c.nom || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c.courriel.trim()) || c.tel.replace(/\D/g, "").length < 10) {
      setEtat({ envoi: false, msg: "Veuillez remplir votre nom, un courriel valide et votre téléphone." }); return;
    }
    if (mode === "livraison" && (!adr.rue.trim() || !adr.ville.trim() || !/^[A-Za-z]\d[A-Za-z] ?\d[A-Za-z]\d$/.test(adr.codePostal.trim()))) {
      setEtat({ envoi: false, msg: "Complétez l'adresse de livraison (rue, ville et code postal valide)." }); return;
    }
    if (nonPayables.length) { setEtat({ envoi: false, msg: `« ${nonPayables[0].p.nom} » ne peut pas être payé en ligne (rupture ou prix sur demande). Retirez-le pour continuer.` }); return; }
    setEtat({ envoi: true, msg: "" });
    try {
      const { data, error } = await supabase.functions.invoke("shop-checkout", {
        body: {
          action: "checkout", totalAffiche: total,
          items: lignes.map(({ p, q }) => ({ productId: p.id, quantity: q })),
          nom: c.nom, courriel: c.courriel, tel: c.tel, notes: c.notes, mode, adresse: mode === "livraison" ? adr : null,
        },
      });
      let res = data;
      if (error && error.context?.json) res = await error.context.json().catch(() => null);
      if (!res?.ok || !res.href) { setEtat({ envoi: false, msg: res?.error || "La page de paiement n'a pas pu s'ouvrir. Réessayez." }); return; }
      window.location.assign(res.href); // page de paiement sécurisée Clover
    } catch (e2) {
      console.error(e2);
      setEtat({ envoi: false, msg: "Une erreur est survenue. Réessayez ou appelez-nous au " + INFOS.tel + "." });
    }
  };

  if (attente) {
    return (
      <div className="conteneur section vide-boite cc-attente">
        <div className="cc-sablier" aria-hidden="true" />
        <h1>Confirmation du paiement…</h1>
        <p>{attente.longue
          ? "La confirmation de Clover prend plus de temps que prévu. Si votre paiement est accepté, votre commande sera confirmée automatiquement par courriel : vous pouvez fermer cette page."
          : "Nous attendons la confirmation de Clover. Votre commande sera confirmée dès que le paiement est reçu."}</p>
      </div>
    );
  }

  if (paye) {
    return (
      <div className="conteneur section vide-boite">
        <Coche s={42} />
        <h1>Merci, c'est payé !</h1>
        <p>Commande <strong>#{paye.numero}</strong> · {prix(paye.total)} payés par carte, paiement confirmé par Clover. Une confirmation vous est envoyée par courriel.</p>
        <p>{paye.mode !== "livraison" ? "On vous avise dès que votre commande est prête à ramasser en boutique." : "On prépare votre colis et on vous avise à l'expédition."} Une question ? <a href={INFOS.telHref}>{INFOS.tel}</a>.</p>
        {paye.environment === "sandbox" && <p className="petit">Mode test Clover : aucun montant réel prélevé.</p>}
        <div className="actions-ligne">
          <Link to="/compte" className="btn btn-fonce">Mes commandes</Link>
          <Link to="/boutique" className="btn btn-contour">Continuer à magasiner</Link>
        </div>
      </div>
    );
  }

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
            {enLigne && <div className="resume-ligne"><span>TPS (5 %)</span><span>{prix(tps)}</span></div>}
            {enLigne && <div className="resume-ligne"><span>TVQ (9,975 %)</span><span>{prix(tvq)}</span></div>}
            <div className="resume-ligne resume-total"><span>Total</span><strong>{prix(total)}</strong></div>
            {BOUTIQUE_EN_LIGNE && <p className="petit">{enLigne ? "Taxes incluses. Paiement sur la page sécurisée de Clover, le même système que notre caisse en boutique." : "Taxes applicables en sus. Paiement et disponibilité confirmés par téléphone."}</p>}
            {!BOUTIQUE_EN_LIGNE ? (
              <div className="boutique-bientot">
                <strong>La boutique en ligne sera bientôt prête</strong>
                <p>En attendant, passez nous voir à Saint-Bruno ou appelez-nous au <a href={INFOS.telHref}>{INFOS.tel}</a> : on vous réserve vos articles.</p>
                <a className="btn btn-orange btn-plein" href={INFOS.telHref}>Appeler {INFOS.tel}</a>
              </div>
            ) : !form ? (
              <button className="btn btn-orange btn-plein btn-grand" onClick={() => (user ? setForm(true) : ouvrir("login"))}>Passer la commande</button>
            ) : (
              <form className="form" onSubmit={enLigne ? payer : commander} noValidate={enLigne}>
                <input placeholder="Nom complet" autoComplete="name" value={c.nom} onChange={(e) => setC({ ...c, nom: e.target.value })} />
                <input type="email" placeholder="Courriel" autoComplete="email" value={c.courriel} onChange={(e) => setC({ ...c, courriel: e.target.value })} />
                <input placeholder="Téléphone" autoComplete="tel" value={c.tel} onChange={(e) => setC({ ...c, tel: e.target.value })} />
                <textarea rows={2} placeholder="Note ou préférence de livraison (facultatif)" value={c.notes} onChange={(e) => setC({ ...c, notes: e.target.value })} />
                {enLigne && mode === "livraison" && (
                  <>
                    <input placeholder="Adresse de livraison" autoComplete="shipping street-address" value={adr.rue} onChange={(e) => setAdr({ ...adr, rue: e.target.value })} />
                    <div className="form-2">
                      <input placeholder="Ville" autoComplete="shipping address-level2" value={adr.ville} onChange={(e) => setAdr({ ...adr, ville: e.target.value })} />
                      <input placeholder="Code postal" autoComplete="shipping postal-code" maxLength={7} value={adr.codePostal} onChange={(e) => setAdr({ ...adr, codePostal: e.target.value })} />
                    </div>
                  </>
                )}
                {enLigne && nonPayables.length > 0 && <div className="alerte">« {nonPayables[0].p.nom} » ne peut pas être payé en ligne (rupture ou prix sur demande) : retirez-le ou appelez-nous.</div>}
                <button className="btn btn-orange btn-plein btn-grand" disabled={etat.envoi}>
                  {etat.envoi ? (enLigne ? "Ouverture du paiement Clover…" : "Envoi…") : enLigne ? `Payer ${prix(total)}` : "Confirmer la commande"}
                </button>
              </form>
            )}
            {etat.msg && <div className={etat.envoi ? "alerte alerte-ok" : "alerte"} role="alert">{etat.msg}</div>}
            {BOUTIQUE_EN_LIGNE && !user && <p className="petit centre">Un compte est requis pour commander — <button className="lien-discret" onClick={() => ouvrir("login")}>connexion ou création de compte</button>.</p>}
          </aside>
        </div>
      )}
    </div>
  );
}
