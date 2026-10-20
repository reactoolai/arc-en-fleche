import { useState } from "react";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../lib/store.jsx";
import { Fermer } from "./Icons.jsx";

const MESSAGES = {
  "Invalid login credentials": "Courriel ou mot de passe invalide.",
  "User already registered": "Un compte existe déjà avec ce courriel.",
  "Email not confirmed": "Confirmez d'abord votre courriel (vérifiez vos courriels).",
};

export default function Connexion() {
  const { modal, ouvrir, fermer } = useAuth();
  const [f, setF] = useState({ nom: "", courriel: "", mdp: "" });
  const [etat, setEtat] = useState({ chargement: false, erreur: "", info: "" });
  if (!modal) return null;
  const inscription = modal === "signup";
  const oubli = modal === "reset";

  const envoyer = async (e) => {
    e.preventDefault();
    setEtat({ chargement: true, erreur: "", info: "" });
    try {
      if (oubli) {
        const { error } = await supabase.auth.resetPasswordForEmail(f.courriel, { redirectTo: window.location.origin + "/compte" });
        if (error) throw error;
        setEtat({ chargement: false, erreur: "", info: "Courriel envoyé. Suivez le lien pour choisir un nouveau mot de passe." });
        return;
      }
      if (!f.courriel || !f.mdp) throw new Error("Entrez votre courriel et votre mot de passe.");
      if (inscription) {
        if (!f.nom) throw new Error("Entrez votre nom complet.");
        const { data, error } = await supabase.auth.signUp({ email: f.courriel, password: f.mdp, options: { data: { full_name: f.nom } } });
        if (error) throw error;
        if (!data.session) {
          setEtat({ chargement: false, erreur: "", info: "Compte créé ! Vérifiez vos courriels pour le confirmer." });
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: f.courriel, password: f.mdp });
        if (error) throw error;
      }
      setF({ nom: "", courriel: "", mdp: "" });
      setEtat({ chargement: false, erreur: "", info: "" });
      fermer();
    } catch (err) {
      setEtat({ chargement: false, erreur: MESSAGES[err.message] || err.message || "Erreur de connexion.", info: "" });
    }
  };

  const champ = (k) => ({ value: f[k], onChange: (e) => setF({ ...f, [k]: e.target.value }) });

  return (
    <div className="modal-fond" onClick={fermer}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Connexion">
        <button className="icone-btn fermer" onClick={fermer} aria-label="Fermer"><Fermer /></button>
        <img src="/images/logo-fonce.png" alt="Arc En Flèche" className="modal-logo" />
        {!oubli && (
          <div className="onglets">
            <button className={!inscription ? "actif" : ""} onClick={() => ouvrir("login")}>Connexion</button>
            <button className={inscription ? "actif" : ""} onClick={() => ouvrir("signup")}>Créer un compte</button>
          </div>
        )}
        {oubli && <h2 className="modal-titre">Mot de passe oublié</h2>}
        <form onSubmit={envoyer} className="form">
          {inscription && <input placeholder="Nom complet" autoComplete="name" {...champ("nom")} />}
          <input type="email" placeholder="Courriel" autoComplete="email" {...champ("courriel")} />
          {!oubli && <input type="password" placeholder="Mot de passe" autoComplete={inscription ? "new-password" : "current-password"} {...champ("mdp")} />}
          {etat.erreur && <div className="alerte">{etat.erreur}</div>}
          {etat.info && <div className="alerte alerte-ok">{etat.info}</div>}
          <button className="btn btn-fonce btn-plein" disabled={etat.chargement}>
            {etat.chargement ? "Un instant…" : oubli ? "Envoyer le lien" : inscription ? "Créer mon compte" : "Se connecter"}
          </button>
          {!inscription && !oubli && <button type="button" className="lien-discret" onClick={() => ouvrir("reset")}>Mot de passe oublié ?</button>}
          {oubli && <button type="button" className="lien-discret" onClick={() => ouvrir("login")}>Retour à la connexion</button>}
        </form>
      </div>
    </div>
  );
}
