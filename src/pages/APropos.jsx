import { Link } from "react-router-dom";
import Apparition from "../components/Apparition.jsx";
import { Cible, Feuille, Fleche, Outil } from "../components/Icons.jsx";

export default function APropos() {
  return (
    <>
      <section className="page-tete">
        <div className="topo-fond" aria-hidden="true" />
        <div className="conteneur page-tete-in">
          <p className="sur-titre sur-titre-orange">Notre histoire</p>
          <h1>Une nouvelle page s'écrit<br />chez Arc En Flèche.</h1>
        </div>
      </section>

      <section className="section conteneur histoire">
        <Apparition className="histoire-txt">
          <p className="lettrine">En juillet 2026, Arc En Flèche entame un nouveau chapitre avec l'acquisition de la boutique de Saint-Bruno. Cette aventure est portée avec fierté par <strong>Marc-Olivier Côté</strong>, technicien en archerie depuis 17 ans, en collaboration avec <strong>Claudia Maltais</strong> et <strong>Pierre-Luc Dufour</strong>, archer passionné.</p>
          <p>Après 35 belles années au service de sa clientèle, <strong>Ginette Maltais</strong> passe le flambeau. Elle demeure toutefois près de nous pour partager son expérience et sa passion aussi longtemps qu'elle le souhaitera.</p>
          <p>Notre engagement reste le même : offrir un service de qualité et faire d'Arc En Flèche une référence en archerie, chasse et pêche au Lac-Saint-Jean.</p>
          <div className="signature">
            <span>35 ans</span><span>3 passionnés</span><span>1 boutique</span>
          </div>
        </Apparition>
        <div className="histoire-photos">
          <Apparition><img src="/images/equipe-boutique.webp" alt="L'équipe d'Arc En Flèche devant la boutique de Saint-Bruno" loading="lazy" /></Apparition>
          <Apparition delai={120}><img src="/images/comptoir.webp" alt="L'équipe au comptoir de la boutique" loading="lazy" /></Apparition>
        </div>
      </section>

      <section className="section section-papier">
        <div className="conteneur">
          <p className="sur-titre">Nos valeurs</p>
          <h2>Ce qui ne changera pas</h2>
          <div className="valeurs">
            <Apparition className="valeur"><Cible s={34} /><h3>Le bon conseil</h3><p>On vous vend l'équipement qui convient à votre pratique et à votre budget — pas le plus cher sur la tablette.</p></Apparition>
            <Apparition className="valeur" delai={100}><Outil s={34} /><h3>Réparer d'abord</h3><p>Un équipement bien entretenu dure des décennies. Notre atelier est là pour ça, diagnostic gratuit.</p></Apparition>
            <Apparition className="valeur" delai={200}><Feuille s={34} /><h3>Acheter local</h3><p>On privilégie les fabricants d'ici : salines, attractifs et leurres faits au Québec.</p></Apparition>
          </div>
        </div>
      </section>

      <section className="section conteneur">
        <div className="bandeau-cta bandeau-cta-photo" style={{ backgroundImage: "url(/images/equipe-foret.webp)" }}>
          <div>
            <p className="sur-titre sur-titre-orange">Venez nous rencontrer</p>
            <h2 className="h2-clair">Votre prochaine saison commence ici.</h2>
          </div>
          <Link to="/contact" className="btn btn-orange btn-grand">Nous joindre <Fleche s={18} /></Link>
        </div>
      </section>
    </>
  );
}
