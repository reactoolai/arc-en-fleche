import { useState } from "react";
import { HORAIRE, INFOS } from "../data/site.js";
import { etatOuverture } from "../lib/format.js";
import { supabase } from "../lib/supabase.js";
import { Epingle, Facebook, Horloge, Telephone } from "../components/Icons.jsx";

export default function Contact() {
  const [f, setF] = useState({ nom: "", tel: "", courriel: "", sujet: "Question générale", message: "" });
  const etat = etatOuverture();
  const champ = (k) => ({ value: f[k], onChange: (e) => setF({ ...f, [k]: e.target.value }) });

  const [statut, setStatut] = useState({ envoi: false, ok: false, msg: "" });

  const envoyer = async (e) => {
    e.preventDefault();
    setStatut({ envoi: true, ok: false, msg: "Envoi en cours…" });
    try {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: { type: "contact", name: f.nom, phone: f.tel, email: f.courriel, category: f.sujet, message: f.message },
      });
      if (error || !data?.ok) throw new Error();
      setF({ nom: "", tel: "", courriel: "", sujet: "Question générale", message: "" });
      setStatut({ envoi: false, ok: true, msg: "Message envoyé. Nous vous répondrons rapidement." });
    } catch {
      setStatut({ envoi: false, ok: false, msg: `Impossible d'envoyer le message pour le moment. Écrivez-nous à ${INFOS.courriel} ou appelez au ${INFOS.tel}.` });
    }
  };

  return (
    <>
      <section className="page-tete">
        <div className="topo-fond" aria-hidden="true" />
        <div className="conteneur page-tete-in">
          <p className="sur-titre sur-titre-orange">Contact</p>
          <h1>Parlons équipement.</h1>
          <p>Question sur un produit, une réparation ou une commande spéciale — on répond rapidement.</p>
        </div>
      </section>
      <section className="section conteneur contact">
        <div className="contact-infos">
          <div className={`etat ${etat.ouvert ? "etat-ouvert" : ""}`}><i />{etat.texte}</div>
          <ul className="visite-infos">
            <li><Epingle s={20} /><span>{INFOS.rue}<br />{INFOS.ville}<br />{INFOS.codePostal}</span></li>
            <li><Telephone s={20} /><a href={INFOS.telHref}>{INFOS.tel}</a></li>
            <li><span className="ico-txt">@</span><a href={`mailto:${INFOS.courriel}`}>{INFOS.courriel}</a></li>
            <li><Facebook s={20} /><a href={INFOS.facebook} target="_blank" rel="noreferrer">Arc En Flèche sur Facebook</a></li>
          </ul>
          <h3 className="h3-ligne"><Horloge s={18} /> Heures d'ouverture</h3>
          <ul className="heures">
            {HORAIRE.map((h) => <li key={h.label}><span>{h.label}</span><strong>{h.plage}</strong></li>)}
          </ul>
          <div className="carte-geo"><iframe src={INFOS.carte} loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Carte — 413, rue St-Alphonse, Saint-Bruno" /></div>
        </div>
        <form className="contact-form form" onSubmit={envoyer}>
          <h2 className="h2-petit">Écrivez-nous</h2>
          <div className="form-2">
            <input placeholder="Nom" required autoComplete="name" {...champ("nom")} />
            <input placeholder="Téléphone" autoComplete="tel" {...champ("tel")} />
          </div>
          <input type="email" placeholder="Courriel" required autoComplete="email" {...champ("courriel")} />
          <select {...champ("sujet")}>
            <option>Question générale</option>
            <option>Réparation / atelier</option>
            <option>Commande spéciale</option>
            <option>Disponibilité d'un produit</option>
          </select>
          <textarea rows={6} placeholder="Votre message" required {...champ("message")} />
          <button className="btn btn-orange btn-plein btn-grand" disabled={statut.envoi}>{statut.envoi ? "Envoi…" : "Envoyer le message"}</button>
          {statut.msg && <div className={statut.ok ? "alerte alerte-ok" : statut.envoi ? "petit" : "alerte"}>{statut.msg}</div>}
        </form>
      </section>
    </>
  );
}
