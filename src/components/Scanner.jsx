import { useEffect, useRef, useState } from "react";
import { Fermer } from "./Icons.jsx";

const ZXING = "https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js";

const chargerZXing = () =>
  window.ZXing
    ? Promise.resolve(window.ZXing)
    : new Promise((ok, ko) => {
        const s = document.createElement("script");
        s.src = ZXING;
        s.onload = () => ok(window.ZXing);
        s.onerror = ko;
        document.head.appendChild(s);
      });

// Scanner de code à barres par caméra (ZXing), avec saisie manuelle en secours
export default function Scanner({ onCode, fermer }) {
  const video = useRef(null);
  const [statut, setStatut] = useState("Initialisation de la caméra…");
  const [manuel, setManuel] = useState("");

  useEffect(() => {
    let lecteur = null;
    let fini = false;
    chargerZXing()
      .then((ZXing) => {
        if (fini) return;
        lecteur = new ZXing.BrowserMultiFormatReader();
        setStatut("Caméra active — placez le code à barres devant l'objectif.");
        lecteur.decodeFromVideoDevice(null, video.current, (res) => {
          if (res && !fini) {
            fini = true;
            setStatut("Code détecté : " + res.getText());
            onCode(res.getText());
            setTimeout(fermer, 700);
          }
        }).catch(() => setStatut("Caméra non disponible. Tapez le code manuellement ci-dessous."));
      })
      .catch(() => setStatut("Bibliothèque de scan non chargée. Tapez le code manuellement."));
    return () => { fini = true; try { lecteur?.reset(); } catch { /* déjà arrêté */ } };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const valider = (e) => {
    e.preventDefault();
    if (manuel.trim()) { onCode(manuel.trim()); fermer(); }
  };

  return (
    <div className="modal-fond scanner-fond" onClick={fermer}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Scanner un code à barres">
        <button className="icone-btn fermer" onClick={fermer} aria-label="Fermer"><Fermer /></button>
        <h2 className="modal-titre">Scanner un code</h2>
        <div className="scanner-video"><video ref={video} muted playsInline /></div>
        <p className="petit">{statut}</p>
        <form className="form-ligne" onSubmit={valider}>
          <input value={manuel} onChange={(e) => setManuel(e.target.value)} placeholder="Ou tapez le code manuellement" inputMode="numeric" />
          <button className="btn btn-fonce">OK</button>
        </form>
      </div>
    </div>
  );
}
