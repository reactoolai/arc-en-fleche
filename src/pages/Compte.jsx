import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/store.jsx";
import { supabase } from "../lib/supabase.js";
import { prix } from "../lib/format.js";

export default function Compte() {
  const { user, profil, admin, ouvrir, deconnexion, rechargerProfil } = useAuth();
  const [f, setF] = useState({ nom: "", tel: "" });
  const [ok, setOk] = useState(false);
  const [commandes, setCommandes] = useState([]);
  const [mdp, setMdp] = useState("");
  const [mdpOk, setMdpOk] = useState("");

  useEffect(() => { setF({ nom: profil?.full_name || "", tel: profil?.phone || "" }); }, [profil]);
  useEffect(() => {
    if (!user) return;
    supabase.from("orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => setCommandes(data || []));
  }, [user]);

  if (!user) {
    return (
      <div className="conteneur section vide-boite">
        <h1>Mon compte</h1>
        <p>Connectez-vous pour gérer votre profil et retrouver vos commandes.</p>
        <button className="btn btn-orange" onClick={() => ouvrir("login")}>Se connecter</button>
      </div>
    );
  }

  const sauver = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from("profiles").update({ full_name: f.nom, phone: f.tel }).eq("id", user.id);
    if (!error) { setOk(true); rechargerProfil(); setTimeout(() => setOk(false), 3000); }
  };
  const changerMdp = async (e) => {
    e.preventDefault();
    if (mdp.length < 6) { setMdpOk("Minimum 6 caractères."); return; }
    const { error } = await supabase.auth.updateUser({ password: mdp });
    setMdpOk(error ? error.message : "Mot de passe mis à jour.");
    if (!error) setMdp("");
  };

  return (
    <div className="conteneur section page-compte">
      <h1 className="h1-page">Mon compte</h1>
      <p className="txt">{user.email}{admin && <> · <Link to="/admin">Administration de la boutique →</Link></>}</p>
      <div className="compte-grille">
        <form className="boite form" onSubmit={sauver}>
          <h2 className="h2-petit">Profil</h2>
          <input placeholder="Nom complet" value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} />
          <input placeholder="Téléphone" value={f.tel} onChange={(e) => setF({ ...f, tel: e.target.value })} />
          <button className="btn btn-fonce">Enregistrer</button>
          {ok && <span className="alerte alerte-ok">Profil enregistré !</span>}
        </form>
        <form className="boite form" onSubmit={changerMdp}>
          <h2 className="h2-petit">Mot de passe</h2>
          <input type="password" placeholder="Nouveau mot de passe" value={mdp} onChange={(e) => setMdp(e.target.value)} autoComplete="new-password" />
          <button className="btn btn-fonce">Changer</button>
          {mdpOk && <span className="alerte alerte-ok">{mdpOk}</span>}
        </form>
        <div className="boite compte-commandes">
          <h2 className="h2-petit">Mes commandes</h2>
          {commandes.length === 0 ? <p className="petit">Aucune commande pour le moment.</p> : (
            <ul>
              {commandes.map((o) => (
                <li key={o.id}>
                  <span>{new Date(o.created_at).toLocaleDateString("fr-CA")}</span>
                  <span>{(o.items || []).length} article(s)</span>
                  <strong>{prix(o.total)}</strong>
                  <em>{o.status === "pending" ? "En attente" : o.status === "completed" ? "Complétée" : o.status}</em>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <button className="btn btn-contour" onClick={deconnexion}>Déconnexion</button>
    </div>
  );
}
