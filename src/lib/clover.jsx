import { useEffect, useRef, useState } from "react";

// SDK iFrame Clover (production ou sandbox), chargé une seule fois.
// Les numéros de carte sont saisis dans des iFrames Clover : ils ne passent jamais par nos serveurs.
let sdk = null;
let instance = null;

function chargerClover(environment) {
  if (!sdk) {
    sdk = new Promise((ok, ko) => {
      if (window.Clover) return ok(window.Clover);
      const s = document.createElement("script");
      s.src = environment === "sandbox" ? "https://checkout.sandbox.dev.clover.com/sdk.js" : "https://checkout.clover.com/sdk.js";
      s.onload = () => ok(window.Clover);
      s.onerror = () => { sdk = null; ko(new Error("clover")); };
      document.head.appendChild(s);
    });
  }
  return sdk;
}

const STYLE = {
  body: { fontFamily: "Barlow, system-ui, sans-serif" },
  input: { fontSize: "16px", color: "#0d1410", padding: "0 14px", height: "48px" },
  "input::placeholder": { color: "#a9b3ab" },
};
const TYPES = ["CARD_NUMBER", "CARD_DATE", "CARD_CVV", "CARD_POSTAL_CODE"];
const SUFFIXES = ["num", "date", "cvv", "postal"];

// Monte les 4 champs Clover dans #<prefixe>-num, -date, -cvv, -postal quand `actif` est vrai.
export function useChampsClover(config, actif, prefixe) {
  const [pret, setPret] = useState(false);
  const [erreur, setErreur] = useState("");
  const ref = useRef(null);
  useEffect(() => {
    if (!config?.configured || !actif) return;
    let annule = false;
    const ids = SUFFIXES.map((s) => `${prefixe}-${s}`);
    (async () => {
      try {
        const Clover = await chargerClover(config.environment);
        if (annule) return;
        if (!instance) instance = new Clover(config.publicToken, { merchantId: config.merchantId, locale: "fr-CA" });
        const elements = instance.elements();
        TYPES.forEach((t, i) => {
          const el = document.getElementById(ids[i]);
          if (el) { el.innerHTML = ""; elements.create(t, STYLE).mount("#" + ids[i]); }
        });
        ref.current = instance;
        setPret(true);
      } catch (e) {
        console.error(e);
        if (!annule) setErreur("Le formulaire de paiement n'a pas pu se charger. Rechargez la page ou appelez-nous.");
      }
    })();
    return () => {
      annule = true; setPret(false); ref.current = null;
      ids.forEach((id) => { const el = document.getElementById(id); if (el) el.innerHTML = ""; });
    };
  }, [config, actif, prefixe]);

  // Renvoie { token } ou { erreur }
  const jeton = async () => {
    if (!ref.current) return { erreur: "Le paiement en ligne n'est pas disponible pour le moment." };
    const t = await ref.current.createToken();
    if (t?.token) return { token: t.token };
    const premiere = t?.errors ? Object.values(t.errors).find(Boolean) : null;
    return { erreur: premiere ? `Vérifiez la carte : ${premiere}` : "Vérifiez les informations de la carte." };
  };

  return { pret, erreur, jeton };
}

export function ChampsClover({ prefixe, pret }) {
  return (
    <div className={`cc-paiement ${pret ? "" : "cc-paiement-charge"}`}>
      <label className="cc-champ-l">Numéro de carte<div id={`${prefixe}-num`} className="cc-champ" /></label>
      <div className="cc-paiement-3">
        <label className="cc-champ-l">Expiration<div id={`${prefixe}-date`} className="cc-champ" /></label>
        <label className="cc-champ-l">CVV<div id={`${prefixe}-cvv`} className="cc-champ" /></label>
        <label className="cc-champ-l">Code postal<div id={`${prefixe}-postal`} className="cc-champ" /></label>
      </div>
    </div>
  );
}
