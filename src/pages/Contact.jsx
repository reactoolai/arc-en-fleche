import { useState } from "react";
import { HORAIRE, INFOS } from "../data/site.js";
import { etatOuverture } from "../lib/format.js";
import { Epingle, Facebook, Horloge, Telephone } from "../components/Icons.jsx";

export default function Contact() {
  const [f, setF] = useState({ nom: "", tel: "", courriel: "", sujet: "Question générale", message: "" });
  const etat = etatOuverture();
  const champ = (k) => ({ value: f[k], onChange: (e) => setF({ ...f, [k]: e.target.value }) });

  const envoyer = (e) => {
    e.preventDefault();
    const corps = `${f.message}\n\n—\n${f.nom}\n${f.tel}\n${f.courriel}`;
    window.location.href = `mailto:${INFOS.courriel}?subject=${encodeURIComponent(f.sujet + " — " + f.nom)}&body=${encodeURIComponent(corps)}`;
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
          <button className="btn btn-orange btn-plein btn-grand">Envoyer le message</button>
          <p className="petit">Votre application de courriel s'ouvrira avec le message prêt à envoyer.</p>
        </form>
      </section>
    </>
  );
}
