import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { INFOS } from "../data/site.js";
import CarteCadeau, { montantTxt } from "../components/CarteCadeau.jsx";

const PRESETS = [100, 200, 500, 1000];
const FRAIS_PHYSIQUE = 40;
const MIN = 25;
const MAX = 5000;
const PROVINCES = ["QC", "ON", "NB", "NS", "PE", "NL", "MB", "SK", "AB", "BC", "YT", "NT", "NU"];
const courrielOk = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());

export default function CartesCadeaux() {
  const [choix, setChoix] = useState(200);
  const [perso, setPerso] = useState("");
  const [f, setF] = useState({ recipientName: "", recipientEmail: "", buyerName: "", buyerEmail: "", message: "" });
  const [physique, setPhysique] = useState(false);
  const [adr, setAdr] = useState({ nom: "", rue: "", ville: "", province: "QC", codePostal: "" });
  const [config, setConfig] = useState(null);
  const [etat, setEtat] = useState({ envoi: false, msg: "" });
  const [fini, setFini] = useState(null);
  const idem = useRef(crypto.randomUUID());

  const montant = choix === "perso" ? Math.floor(Number(perso) || 0) : choix;
  const total = montant + (physique ? FRAIS_PHYSIQUE : 0);
  const champ = (k) => ({ value: f[k], onChange: (e) => setF({ ...f, [k]: e.target.value }) });
  const champA = (k) => ({ value: adr[k], onChange: (e) => setAdr({ ...adr, [k]: e.target.value }) });

  useEffect(() => {
    const avant = document.title;
    document.title = "Cartes cadeaux Arc En Flèche — Offrez la prochaine sortie";
    return () => { document.title = avant; };
  }, []);

  // Configuration : le paiement est-il activé (secrets Clover présents) ?
  useEffect(() => {
    let annule = false;
    supabase.functions.invoke("gift-card", { body: { action: "config" } })
      .then(({ data }) => { if (!annule) setConfig(data?.ok ? data : { configured: false }); })
      .catch(() => { if (!annule) setConfig({ configured: false }); });
    return () => { annule = true; };
  }, []);

  // Retour de la page de paiement Clover : ?merci=<id> (attente du webhook), ?annule= / ?echec=
  const [attente, setAttente] = useState(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const id = q.get("merci");
    if (q.get("annule")) setEtat({ envoi: false, msg: "Paiement annulé : aucun montant n'a été prélevé. Vous pouvez réessayer." });
    if (q.get("echec")) setEtat({ envoi: false, msg: "Le paiement a été refusé : aucun montant n'a été prélevé. Vérifiez la carte ou essayez-en une autre." });
    if (!id) return;
    let essais = 0, fin = false;
    setAttente({ id, longue: false });
    const verifier = async () => {
      if (fin) return;
      essais++;
      const { data } = await supabase.functions.invoke("gift-card", { body: { action: "status", id } }).catch(() => ({ data: null }));
      if (data?.ok && data.status !== "pending" && data.status !== "failed" && (data.termine || essais > 10)) {
        fin = true; setAttente(null);
        setFini({ ...data });
        window.history.replaceState({}, "", "/cartes-cadeaux/");
        return;
      }
      if (essais === 15) setAttente({ id, longue: true });
      setTimeout(verifier, essais < 15 ? 2000 : 5000);
    };
    verifier();
    return () => { fin = true; };
  }, []);

  const erreurForm = () => {
    if (!montant || montant < MIN || montant > MAX) return `Choisissez un montant entre ${MIN} $ et ${MAX} $.`;
    if (!f.recipientName.trim()) return "Indiquez le nom du destinataire.";
    if (!courrielOk(f.recipientEmail)) return "Le courriel du destinataire est invalide.";
    if (!f.buyerName.trim()) return "Indiquez votre nom.";
    if (!courrielOk(f.buyerEmail)) return "Votre courriel est invalide (pour le reçu).";
    if (physique && (!adr.rue.trim() || !adr.ville.trim() || !/^[A-Za-z]\d[A-Za-z] ?\d[A-Za-z]\d$/.test(adr.codePostal.trim())))
      return "Complétez l'adresse postale (rue, ville et code postal valide).";
    return "";
  };

  const payer = async (e) => {
    e.preventDefault();
    const err = erreurForm();
    if (err) { setEtat({ envoi: false, msg: err }); return; }
    setEtat({ envoi: true, msg: "" });
    try {
      const { data, error } = await supabase.functions.invoke("gift-card", {
        body: { action: "checkout", amount: montant, ...f, physical: physique, address: physique ? { ...adr, nom: adr.nom || f.recipientName } : null },
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
          ? "La confirmation de Clover prend plus de temps que prévu. Si votre paiement est accepté, la carte sera envoyée automatiquement dès sa réception : vous pouvez fermer cette page."
          : "Nous attendons la confirmation de Clover. La carte sera envoyée dès que le paiement est confirmé."}</p>
      </div>
    );
  }

  if (fini) {
    return (
      <div className="conteneur section cc-merci">
        <CarteCadeau montant={fini.amount} pour={fini.recipientName} de={fini.buyerName} code="Envoyée ✓" />
        <div>
          <p className="sur-titre sur-titre-orange">Paiement accepté</p>
          <h1 className="h1-page">Merci, c'est envoyé !</h1>
          <p className="txt">
            {fini.emailSent === false
              ? <>La carte de <strong>{montantTxt(fini.amount)}</strong> est créée. Le courriel à {fini.recipientEmail} a eu un problème ; notre équipe lui transmettra le code rapidement.</>
              : <>Paiement confirmé par Clover : la carte cadeau de <strong>{montantTxt(fini.amount)}</strong> vient d'être envoyée à <strong>{fini.recipientEmail}</strong> avec votre message et son code unique.</>}
            {fini.physique && <> La carte physique partira par la poste dans les prochains jours ouvrables.</>}
          </p>
          <p className="petit">Total payé : {montantTxt(fini.total)}. Un reçu Clover vous est envoyé par courriel.{fini.environment === "sandbox" && " (Mode test : aucun montant réel prélevé.)"}</p>
          <div className="actions-ligne cc-actions">
            <button className="btn btn-orange" onClick={() => { setFini(null); idem.current = crypto.randomUUID(); setF({ recipientName: "", recipientEmail: "", buyerName: f.buyerName, buyerEmail: f.buyerEmail, message: "" }); setEtat({ envoi: false, msg: "" }); }}>Offrir une autre carte</button>
            <Link to="/boutique" className="btn btn-contour">Voir la boutique</Link>
          </div>
        </div>
      </div>
    );
  }

  const indisponible = config && !config.configured;

  return (
    <>
      <section className="page-tete page-tete-photo" style={{ backgroundImage: "url(/images/equipe-foret.webp)" }}>
        <div className="page-tete-voile" />
        <div className="conteneur page-tete-in">
          <p className="sur-titre sur-titre-orange">Cartes cadeaux</p>
          <h1>Offrez la prochaine sortie.</h1>
          <p>Une carte cadeau Arc En Flèche, valable sur tout l'inventaire et à l'atelier. Envoyée par courriel en quelques secondes, ou par la poste dans une belle carte.</p>
        </div>
      </section>

      <section className="section conteneur cc-grille">
        <div className="cc-apercu">
          <div className="cc-apercu-colle">
            <p className="sur-titre">Aperçu en direct</p>
            <CarteCadeau montant={montant} pour={f.recipientName.trim()} de={f.buyerName.trim()} />
            <div className={`cc-mot ${f.message.trim() ? "" : "cc-mot-vide"}`}>
              <p>{f.message.trim() || "Votre message apparaîtra ici…"}</p>
              {f.buyerName.trim() && <span>— {f.buyerName.trim()}</span>}
            </div>
            <ul className="cc-avantages">
              <li>Code unique envoyé par courriel après le paiement</li>
              <li>Valable en boutique, en ligne et à l'atelier</li>
              <li>Paiement sécurisé par Clover</li>
            </ul>
          </div>
        </div>

        <form className="form cc-form" onSubmit={payer} noValidate>
          <fieldset>
            <legend><em>1</em> Montant</legend>
            <div className="cc-montants">
              {PRESETS.map((m) => (
                <button type="button" key={m} className={choix === m ? "actif" : ""} onClick={() => setChoix(m)}>{montantTxt(m)}</button>
              ))}
              <button type="button" className={choix === "perso" ? "actif" : ""} onClick={() => setChoix("perso")}>Autre</button>
            </div>
            {choix === "perso" && (
              <label>Montant personnalisé ({MIN} $ à {MAX} $)
                <div className="cc-perso"><input type="number" inputMode="numeric" min={MIN} max={MAX} step="1" placeholder="150" value={perso} onChange={(e) => setPerso(e.target.value)} autoFocus /><span>$</span></div>
              </label>
            )}
          </fieldset>

          <fieldset>
            <legend><em>2</em> Destinataire</legend>
            <div className="form-2">
              <label>Son nom<input placeholder="Marie Tremblay" autoComplete="off" maxLength={80} {...champ("recipientName")} /></label>
              <label>Son courriel<input type="email" placeholder="marie@exemple.com" autoComplete="off" maxLength={160} {...champ("recipientEmail")} /></label>
            </div>
            <label>Votre message ou vos vœux
              <textarea rows={4} maxLength={400} placeholder="Bonne saison de chasse ! Que ta prochaine flèche trouve sa cible…" {...champ("message")} />
              <small className="cc-compte">{f.message.length}/400</small>
            </label>
          </fieldset>

          <fieldset>
            <legend><em>3</em> De la part de</legend>
            <div className="form-2">
              <label>Votre nom<input placeholder="Jean Gagnon" autoComplete="name" maxLength={80} {...champ("buyerName")} /></label>
              <label>Votre courriel (reçu)<input type="email" placeholder="jean@exemple.com" autoComplete="email" maxLength={160} {...champ("buyerEmail")} /></label>
            </div>
          </fieldset>

          <fieldset>
            <legend><em>4</em> Livraison</legend>
            <div className="choix-mode">
              <label className={!physique ? "actif" : ""}><input type="radio" checked={!physique} onChange={() => setPhysique(false)} /> <span><strong>Par courriel</strong><small>Inclus · envoyée immédiatement</small></span></label>
              <label className={physique ? "actif" : ""}><input type="radio" checked={physique} onChange={() => setPhysique(true)} /> <span><strong>Courriel + carte physique</strong><small>+{FRAIS_PHYSIQUE} $ · envoyée par la poste</small></span></label>
            </div>
            {physique && (
              <div className="cc-adresse">
                <label>Nom sur l'enveloppe<input placeholder={f.recipientName || "Nom du destinataire"} autoComplete="shipping name" {...champA("nom")} /></label>
                <label>Adresse<input placeholder="123, rue Principale, app. 4" autoComplete="shipping street-address" {...champA("rue")} /></label>
                <div className="cc-adresse-3">
                  <label>Ville<input placeholder="Alma" autoComplete="shipping address-level2" {...champA("ville")} /></label>
                  <label>Province<select {...champA("province")}>{PROVINCES.map((p) => <option key={p}>{p}</option>)}</select></label>
                  <label>Code postal<input placeholder="G8B 1A1" autoComplete="shipping postal-code" maxLength={7} {...champA("codePostal")} /></label>
                </div>
              </div>
            )}
          </fieldset>

          <fieldset>
            <legend><em>5</em> Paiement</legend>
            <div className="cc-total">
              <div className="resume-ligne"><span>Carte cadeau</span><span>{montant ? montantTxt(montant) : "—"}</span></div>
              {physique && <div className="resume-ligne"><span>Carte physique et envoi postal</span><span>{montantTxt(FRAIS_PHYSIQUE)}</span></div>}
              <div className="resume-ligne resume-total"><span>Total</span><strong>{montantTxt(total)}</strong></div>
            </div>
            {indisponible && (
              <p className="alerte">Le paiement en ligne des cartes cadeaux sera activé sous peu. En attendant, appelez-nous au <a href={INFOS.telHref}>{INFOS.tel}</a> ou passez en boutique.</p>
            )}
            <button className="btn btn-orange btn-plein btn-grand" disabled={etat.envoi || !config?.configured}>
              {etat.envoi ? "Ouverture du paiement Clover…" : `Payer ${montantTxt(total)}`}
            </button>
            {etat.msg && <div className="alerte" role="alert">{etat.msg}</div>}
            <p className="petit cc-securite">Vous serez dirigé vers la page de paiement sécurisée de Clover, le même système que notre caisse en boutique. La carte est envoyée seulement après la confirmation du paiement.</p>
          </fieldset>
        </form>
      </section>
    </>
  );
}
