import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCatalog } from "../lib/store.jsx";
import { ALBUM, HORAIRE, INFOS, MARQUES, SERVICES } from "../data/site.js";
import { etatOuverture } from "../lib/format.js";
import { CarteProduit, PhotoProduit, SqueletteCartes } from "../components/Produit.jsx";
import Apparition from "../components/Apparition.jsx";
import { BoutonPhoto, Txt } from "../components/Editable.jsx";
import { useContenu } from "../lib/contenu.jsx";
import { Epingle, Fleche, Horloge, IconeService, Telephone } from "../components/Icons.jsx";

const ONGLETS = [
  { cle: "peche", label: "Pêche", cat: 5 },
  { cle: "chasse", label: "Chasse", cat: 13 },
  { cle: "attractifs", label: "Attractifs", cat: 12 },
  { cle: "archerie", label: "Archerie", cat: 9 },
];

export default function Accueil() {
  const { produits, chargement } = useCatalog();
  const [onglet, setOnglet] = useState("peche");
  const { image: img } = useContenu();
  const etat = etatOuverture();

  const vedettes = useMemo(() => {
    const cat = ONGLETS.find((o) => o.cle === onglet).cat;
    const avecPhoto = produits.filter((p) => p.cat === cat && p.images.length && p.stock && p.prix > 0);
    // un seul exemplaire par nom pour éviter 8 fois le même leurre en couleurs différentes
    const vus = new Set();
    return avecPhoto
      .sort((a, b) => b.prix - a.prix)
      .filter((p) => (vus.has(p.nom) ? false : vus.add(p.nom)))
      .slice(0, 8);
  }, [produits, onglet]);

  const apercuPeche = useMemo(
    () => produits.filter((p) => p.cat === 5 && p.images.length && /moulinet|canne/i.test(p.nom)).slice(0, 3),
    [produits]
  );

  return (
    <>
      {/* ---------- Héros ---------- */}
      <section className="heros">
        <img className="heros-img" src={img("accueil.heros", "/images/hero-etang.webp")} alt="Archère en position de tir au bord d'un étang du Lac-Saint-Jean" fetchpriority="high" />
        <div className="heros-voile" />
        <div className="heros-topo" aria-hidden="true" />
        <BoutonPhoto k="accueil.heros" style={{ top: 140 }} />
        <div className="conteneur heros-in">
          <p className="heros-lieu"><Epingle s={16} /> <Txt k="accueil.lieu">Saint-Bruno · Lac-Saint-Jean</Txt></p>
          <h1>
            <Txt k="accueil.titre1" className="ligne">Équipé pour</Txt>
            <Txt k="accueil.titre2" className="ligne ligne-orange">le territoire.</Txt>
          </h1>
          <Txt k="accueil.intro" as="p" className="heros-txt">
            Archerie, chasse et pêche depuis 35 ans. Un atelier sur place, des conseils de gens qui chassent
            vraiment, et plus de {produits.length > 0 ? Math.floor(produits.length / 10) * 10 : 490} articles prêts pour la saison.
          </Txt>
          <div className="heros-actions">
            <Link to="/boutique" className="btn btn-orange btn-grand">Magasiner la boutique <Fleche s={18} /></Link>
            <Link to="/atelier" className="btn btn-contour-clair btn-grand">Atelier de réparation</Link>
          </div>
        </div>
        <div className="heros-bas conteneur">
          <div className={`etat etat-pilule ${etat.ouvert ? "etat-ouvert" : ""}`}><i />{etat.texte}</div>
          <a href={INFOS.telHref} className="heros-tel"><Telephone s={16} /> {INFOS.tel}</a>
        </div>
      </section>

      {/* ---------- Marques ---------- */}
      <section className="marques" aria-label="Marques en boutique">
        <div className="marques-piste">
          {[...MARQUES, ...MARQUES].map((m, i) => <span key={i}>{m}</span>)}
        </div>
      </section>

      {/* ---------- Terrains ---------- */}
      <section className="section conteneur">
        <Apparition className="titre-section">
          <Txt k="accueil.dep.surtitre" as="p" className="sur-titre">Nos départements</Txt>
          <Txt k="accueil.dep.titre" as="h2">Choisissez votre terrain</Txt>
        </Apparition>
        <div className="bento">
          <Apparition as={Link} to="/boutique?cat=12" className="tuile tuile-grande" delai={0}>
            <img src={img("accueil.tuile1", "/images/orignal.webp")} alt="Orignal récolté en forêt boréale" loading="lazy" />
            <BoutonPhoto k="accueil.tuile1" />
            <div className="tuile-txt">
              <Txt k="accueil.tuile1.surtitre" className="sur-titre">Orignal &amp; chevreuil</Txt>
              <Txt k="accueil.tuile1.titre" as="h3">Salines, attractifs et minéraux</Txt>
              <span className="tuile-lien"><Txt k="accueil.tuile1.lien">Buck Expert, Buck Hunter, Maniaque de prospection</Txt> <Fleche s={16} /></span>
            </div>
          </Apparition>
          <Apparition as={Link} to="/boutique?cat=9" className="tuile" delai={80}>
            <img src={img("accueil.tuile2", "/images/archere.webp")} alt="Archère en position de tir" loading="lazy" />
            <BoutonPhoto k="accueil.tuile2" />
            <div className="tuile-txt">
              <Txt k="accueil.tuile2.surtitre" className="sur-titre">Archerie</Txt>
              <Txt k="accueil.tuile2.titre" as="h3">Carquois, étuis et accessoires</Txt>
            </div>
          </Apparition>
          <Apparition as={Link} to="/boutique?cat=13" className="tuile" delai={160}>
            <img src={img("accueil.tuile3", "/images/chevreuil-neige.webp")} alt="Chasseurs en dossard orange avec un chevreuil" loading="lazy" />
            <BoutonPhoto k="accueil.tuile3" />
            <div className="tuile-txt">
              <Txt k="accueil.tuile3.surtitre" className="sur-titre">Chasse</Txt>
              <Txt k="accueil.tuile3.titre" as="h3">Appeaux, optique et entretien d'armes</Txt>
            </div>
          </Apparition>
          <Apparition as={Link} to="/boutique?cat=5" className="tuile tuile-peche" delai={240}>
            <div className="tuile-produits">
              {apercuPeche.map((p) => <PhotoProduit key={p.id} p={p} eager />)}
            </div>
            <div className="tuile-txt">
              <span className="sur-titre">Pêche · {produits.filter((p) => p.cat === 5).length || 300}+ articles</span>
              <Txt k="accueil.tuile4.titre" as="h3">Moulinets, cannes, leurres et lignes</Txt>
            </div>
          </Apparition>
        </div>
      </section>

      {/* ---------- Vedettes ---------- */}
      <section className="section section-papier">
        <div className="conteneur">
          <div className="titre-section titre-ligne">
            <div>
              <Txt k="accueil.vedettes.surtitre" as="p" className="sur-titre">En boutique maintenant</Txt>
              <Txt k="accueil.vedettes.titre" as="h2">Le meilleur de l'inventaire</Txt>
            </div>
            <div className="onglets onglets-ligne" role="tablist">
              {ONGLETS.map((o) => (
                <button key={o.cle} role="tab" aria-selected={onglet === o.cle} className={onglet === o.cle ? "actif" : ""} onClick={() => setOnglet(o.cle)}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grille-produits grille-4">
            {chargement ? <SqueletteCartes n={8} /> : vedettes.map((p) => <CarteProduit key={p.id} p={p} />)}
          </div>
          <div className="centre">
            <Link to={`/boutique?cat=${ONGLETS.find((o) => o.cle === onglet).cat}`} className="btn btn-fonce">
              Voir tout le département <Fleche s={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- Chiffres ---------- */}
      <section className="chiffres">
        <div className="conteneur chiffres-in">
          <Apparition className="chiffre"><Txt k="accueil.chiffre1" as="strong">35</Txt><Txt k="accueil.chiffre1.txt">ans au service des chasseurs du Lac</Txt></Apparition>
          <Apparition className="chiffre" delai={80}><Txt k="accueil.chiffre2" as="strong">17</Txt><Txt k="accueil.chiffre2.txt">ans d'expérience en technique d'archerie</Txt></Apparition>
          <Apparition className="chiffre" delai={160}><strong>{produits.length || 490}</strong><Txt k="accueil.chiffre3.txt">articles en inventaire</Txt></Apparition>
          <Apparition className="chiffre" delai={240}><Txt k="accueil.chiffre4" as="strong">48 h</Txt><Txt k="accueil.chiffre4.txt">pour la plupart des réparations</Txt></Apparition>
        </div>
      </section>

      {/* ---------- Atelier ---------- */}
      <section className="section-sombre atelier-accueil">
        <div className="topo-fond" aria-hidden="true" />
        <div className="conteneur atelier-grille">
          <Apparition className="atelier-photo">
            <img src={img("accueil.atelier", "/images/comptoir.webp")} alt="L'équipe Arc En Flèche au comptoir de la boutique" loading="lazy" />
            <BoutonPhoto k="accueil.atelier" />
            <div className="atelier-badge"><Txt k="accueil.badge1" as="strong">Diagnostic</Txt><Txt k="accueil.badge2">gratuit</Txt></div>
          </Apparition>
          <div>
            <Apparition>
              <Txt k="accueil.atelier.surtitre" as="p" className="sur-titre sur-titre-orange">L'atelier</Txt>
              <Txt k="accueil.atelier.titre" as="h2" className="h2-clair">On répare ce que<br />les autres remplacent.</Txt>
              <Txt k="accueil.atelier.txt" as="p" className="txt-clair">Changement de corde, réglage d'arc, empennage, entretien de moulinet et réparation d'arbalète. Vous l'apportez au comptoir, on l'évalue devant vous.</Txt>
            </Apparition>
            <ul className="services-mini">
              {SERVICES.slice(0, 4).map((s, i) => (
                <Apparition as="li" key={s.nom + i} delai={i * 70}>
                  <span className="services-ico"><IconeService nom={s.icone} s={26} /></span>
                  <span><strong>{s.nom}</strong><small>{s.delai}</small></span>
                  <em>{s.prix}</em>
                </Apparition>
              ))}
            </ul>
            <Txt k="accueil.citation" as="blockquote">« Apportez-le. Si ça se répare, on le répare. »</Txt>
            <Link to="/atelier" className="btn btn-orange">Tous les services et tarifs <Fleche s={16} /></Link>
          </div>
        </div>
      </section>

      {/* ---------- Album ---------- */}
      <section className="section conteneur">
        <div className="titre-section titre-ligne">
          <div>
            <Txt k="accueil.album.surtitre" as="p" className="sur-titre">Sur le terrain</Txt>
            <Txt k="accueil.album.titre" as="h2">Nos clients en action</Txt>
          </div>
          <Link to="/album" className="lien-fleche">Tout l'album <Fleche s={16} /></Link>
        </div>
        <div className="mosaique">
          {ALBUM.slice(0, 5).map((a, i) => (
            <Apparition as={Link} to="/album" key={a.src + i} className={`mosaique-${i}`} delai={i * 60}>
              <img src={a.src} alt={a.alt} loading="lazy" />
            </Apparition>
          ))}
        </div>
      </section>

      {/* ---------- Visite ---------- */}
      <section className="section section-papier">
        <div className="conteneur visite">
          <div>
            <Txt k="accueil.visite.surtitre" as="p" className="sur-titre">Visitez-nous</Txt>
            <Txt k="accueil.visite.titre" as="h2">Au cœur du Lac-Saint-Jean</Txt>
            <Txt k="accueil.visite.txt" as="p" className="txt">À dix minutes d'Alma, sur le chemin de vos territoires de chasse. Des conseils francs, un atelier sur place et une allée de tir pour tester votre équipement.</Txt>
            <div className={`etat ${etat.ouvert ? "etat-ouvert" : ""}`}><i />{etat.texte}</div>
            <ul className="visite-infos">
              <li><Epingle s={18} /><span>{INFOS.rue}<br />{INFOS.ville} {INFOS.codePostal}</span></li>
              <li><Telephone s={18} /><a href={INFOS.telHref}>{INFOS.tel}</a></li>
              <li><Horloge s={18} />
                <span className="visite-heures">
                  {HORAIRE.map((h) => <span key={h.label}><b>{h.label}</b> {h.plage}</span>)}
                </span>
              </li>
            </ul>
            <a href={INFOS.itineraire} target="_blank" rel="noreferrer" className="btn btn-fonce">Obtenir l'itinéraire <Fleche s={16} /></a>
          </div>
          <div className="carte-geo">
            <iframe src={INFOS.carte} loading="lazy" referrerPolicy="no-referrer-when-downgrade" title={`Carte — ${INFOS.rue}`} />
          </div>
        </div>
      </section>
    </>
  );
}
