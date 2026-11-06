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

// Charge le SDK Web Payments de Square (sandbox ou production) une seule fois
let sdk = null;
function chargerSquare(environment) {
  if (window.Square) return Promise.resolve(window.Square);
  if (!sdk) {
    sdk = new Promise((ok, ko) => {
      const s = document.createElement("script");
      s.src = environment === "production" ? "https://web.squarecdn.com/v1/square.js" : "https://sandbox.web.squarecdn.com/v1/square.js";
      s.onload = () => ok(window.Square);
      s.onerror = () => { sdk = null; ko(new Error("square")); };
      document.head.appendChild(s);
    });
  }
  return sdk;
}

export default function CartesCadeaux() {
  const [choix, setChoix] = useState(200);
  const [perso, setPerso] = useState("");
  const [f, setF] = useState({ recipientName: "", recipientEmail: "", buyerName: "", buyerEmail: "", message: "" });
  const [physique, setPhysique] = useState(false);
  const [adr, setAdr] = useState({ nom: "", rue: "", ville: "", province: "QC", codePostal: "" });
  const [config, setConfig] = useState(null);
  const [pret, setPret] = useState(false);
  const [etat, setEtat] = useState({ envoi: false, msg: "" });
  const [fini, setFini] = useState(null);
  const carteRef = useRef(null);
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

  // Configuration Square (IDs publics servis par la fonction, les clés restent dans les secrets)
  useEffect(() => {
    let annule = false;
    supabase.functions.invoke("gift-card", { body: { action: "config" } })
      .then(({ data }) => { if (!annule) setConfig(data?.ok ? data : { configured: false }); })
      .catch(() => { if (!annule) setConfig({ configured: false }); });
    return () => { annule = true; };
  }, []);

  // Champ de carte de crédit Square
  useEffect(() => {
    if (!config?.configured || fini) return;
    let carte, annule = false;
    (async () => {
      try {
        const Square = await chargerSquare(config.environment);
        const payments = Square.payments(config.applicationId, config.locationId);
        carte = await payments.card({
          style: {
            input: { color: "#0d1410", fontSize: "16px" },
            "input::placeholder": { color: "#a9b3ab" },
            ".input-container": { borderColor: "#ddd2bf", borderRadius: "10px" },
            ".input-container.is-focus": { borderColor: "#ff6a1a" },
            ".message-text": { color: "#6f7a72" },
          },
        });
        if (annule) { carte.destroy(); return; }
        await carte.attach("#cc-paiement");
        carteRef.current = carte;
        setPret(true);
      } catch (e) {
        console.error(e);
        if (!annule) setEtat({ envoi: false, msg: "Le formulaire de paiement n'a pas pu se charger. Rechargez la page ou appelez-nous." });
      }
    })();
    return () => { annule = true; setPret(false); carteRef.current = null; carte?.destroy?.(); };
  }, [config, fini]);

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
    if (!carteRef.current) { setEtat({ envoi: false, msg: "Le paiement en ligne n'est pas disponible pour le moment." }); return; }
    setEtat({ envoi: true, msg: "" });
    try {
      const [prenom, ...reste] = f.buyerName.trim().split(/\s+/);
      const t = await carteRef.current.tokenize({
        amount: total.toFixed(2), currencyCode: "CAD", intent: "CHARGE",
        customerInitiated: true, sellerKeyedIn: false,
        billingContact: { givenName: prenom, familyName: reste.join(" "), email: f.buyerEmail.trim(), countryCode: "CA" },
      });
      if (t.status !== "OK") {
        setEtat({ envoi: false, msg: t.errors?.[0]?.message ? "Vérifiez les informations de la carte." : "Paiement annulé." });
        return;
      }
      const { data, error } = await supabase.functions.invoke("gift-card", {
        body: {
          action: "purchase", sourceId: t.token, idempotencyKey: idem.current,
          amount: montant, ...f, physical: physique,
          address: physique ? { ...adr, nom: adr.nom || f.recipientName } : null,
        },
      });
      let res = data;
      if (error && error.context?.json) res = await error.context.json().catch(() => null);
      if (!res?.ok) {
        // Un paiement refusé peut être réessayé : nouvelle clé d'idempotence
        if (!res?.paid) idem.current = crypto.randomUUID();
        setEtat({ envoi: false, msg: res?.error || "Le paiement n'a pas pu être complété. Aucun montant n'a été prélevé." });
        return;
      }
      setFini({ ...res, recipientName: f.recipientName, buyerName: f.buyerName, physique });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e2) {
      console.error(e2);
      setEtat({ envoi: false, msg: "Une erreur est survenue. Réessayez ou appelez-nous au " + INFOS.tel + "." });
    }
  };

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
              : <>La carte cadeau de <strong>{montantTxt(fini.amount)}</strong> vient d'être envoyée à <strong>{fini.recipientEmail}</strong> avec votre message et son code unique.</>}
            {fini.physique && <> La carte physique partira par la poste dans les prochains jours ouvrables.</>}
          </p>
          <p className="petit">Total payé : {montantTxt(fini.total)}. Un reçu Square vous est envoyé par courriel.{fini.environment === "sandbox" && " (Mode test Square : aucun montant réel prélevé.)"}</p>
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
              <li>Paiement sécurisé par Square</li>
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
            {config?.environment === "sandbox" && config?.configured && (
              <p className="alerte cc-test">Mode test Square (sandbox) : utilisez la carte 4111 1111 1111 1111, une date future, CVV 111 et le code postal G0W 2L0.</p>
            )}
            {indisponible ? (
              <p className="alerte">Le paiement en ligne des cartes cadeaux sera activé sous peu. En attendant, appelez-nous au <a href={INFOS.telHref}>{INFOS.tel}</a> ou passez en boutique.</p>
            ) : (
              <div id="cc-paiement" className={`cc-paiement ${pret ? "" : "cc-paiement-charge"}`} />
            )}
            <button className="btn btn-orange btn-plein btn-grand" disabled={etat.envoi || !pret}>
              {etat.envoi ? "Paiement en cours…" : `Payer ${montantTxt(total)}`}
            </button>
            {etat.msg && <div className="alerte" role="alert">{etat.msg}</div>}
            <p className="petit cc-securite">Paiement traité par Square. Vos informations de carte ne transitent jamais par nos serveurs.</p>
          </fieldset>
        </form>
      </section>
    </>
  );
}
