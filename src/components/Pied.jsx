import { Link } from "react-router-dom";
import { HORAIRE, INFOS } from "../data/site.js";
import { useCatalog } from "../lib/store.jsx";
import { etatOuverture } from "../lib/format.js";
import { useContenu } from "../lib/contenu.jsx";
import { Txt } from "./Editable.jsx";
import { Facebook } from "./Icons.jsx";

export default function Pied() {
  const { cats } = useCatalog();
  useContenu();
  const etat = etatOuverture();
  return (
    <footer className="pied">
      <div className="pied-topo" aria-hidden="true" />
      <div className="pied-cta">
        <div className="conteneur pied-cta-in">
          <h2><Txt k="pied.cta1">Pas certain de ce qu'il vous faut ?</Txt><br /><Txt k="pied.cta2" className="pied-cta-orange">Passez nous voir, on en jase.</Txt></h2>
          <div className="pied-cta-actions">
            <a className="btn btn-orange" href={INFOS.telHref}>Appeler {INFOS.tel}</a>
            <a className="btn btn-contour-clair" href={INFOS.itineraire} target="_blank" rel="noreferrer">Itinéraire</a>
          </div>
        </div>
      </div>
      <div className="conteneur pied-grille">
        <div className="pied-marque">
          <img src="/images/logo-clair.png" alt="Arc En Flèche" />
          <Txt k="pied.description" as="p">Spécialiste en vente et réparation d'articles de chasse, de pêche, d'arcs et d'arbalètes, au cœur du Lac-Saint-Jean.</Txt>
          <a className="pied-fb" href={INFOS.facebook} target="_blank" rel="noreferrer" aria-label="Arc En Flèche sur Facebook"><Facebook /> Suivez-nous</a>
        </div>
        <div>
          <h3>Boutique</h3>
          <ul>
            {cats.filter((c) => c.n > 0).slice(0, 7).map((c) => <li key={c.id}><Link to={`/boutique?cat=${c.id}`}>{c.nom}</Link></li>)}
            <li><Link to="/boutique">Tout l'inventaire</Link></li>
          </ul>
        </div>
        <div>
          <h3>Arc En Flèche</h3>
          <ul>
            <li><Link to="/atelier">Atelier de réparation</Link></li>
            <li><Link to="/a-propos">Notre histoire</Link></li>
            <li><Link to="/album">Album photo</Link></li>
            <li><Link to="/contact">Contact</Link></li>
            <li><Link to="/compte">Mon compte</Link></li>
          </ul>
        </div>
        <div>
          <h3>Heures</h3>
          <p className={`etat ${etat.ouvert ? "etat-ouvert" : ""}`}><i />{etat.texte}</p>
          <ul className="pied-heures">
            {HORAIRE.map((h) => <li key={h.label}><span>{h.label}</span><span>{h.plage}</span></li>)}
          </ul>
          <address>
            {INFOS.rue}<br />{INFOS.ville}<br />{INFOS.codePostal}<br />
            <a href={INFOS.telHref}>{INFOS.tel}</a> · <a href={`mailto:${INFOS.courriel}`}>{INFOS.courriel}</a>
          </address>
        </div>
      </div>
      <div className="conteneur pied-bas">
        <span>© {new Date().getFullYear()} Arc En Flèche. Tous droits réservés.</span>
        <Txt k="pied.devise">Précision · Passion · Tradition</Txt>
        <a className="pied-propulse" href="https://reactool.ai" target="_blank" rel="noreferrer">Propulsé par <img src="/images/reactool-ai.png" alt="Reactool.AI" /></a>
      </div>
    </footer>
  );
}
