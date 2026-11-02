import { Link } from "react-router-dom";
import Apparition from "../components/Apparition.jsx";
import { BoutonPhoto, Txt } from "../components/Editable.jsx";
import { useContenu } from "../lib/contenu.jsx";
import { Cible, Feuille, Fleche, Outil } from "../components/Icons.jsx";

export default function APropos() {
  const { image } = useContenu();
  return (
    <>
      <section className="page-tete">
        <div className="topo-fond" aria-hidden="true" />
        <div className="conteneur page-tete-in">
          <Txt k="apropos.surtitre" as="p" className="sur-titre sur-titre-orange">Notre histoire</Txt>
          <Txt k="apropos.titre" as="h1">Une nouvelle page s'écrit<br />chez Arc En Flèche.</Txt>
        </div>
      </section>

      <section className="section conteneur histoire">
        <Apparition className="histoire-txt">
          <Txt k="apropos.p1" as="p" className="lettrine">En juillet 2026, Arc En Flèche entame un nouveau chapitre avec l'acquisition de la boutique de Saint-Bruno. Cette aventure est portée avec fierté par <strong>Marc-Olivier Côté</strong>, technicien en archerie depuis 17 ans, en collaboration avec <strong>Claudia Maltais</strong> et <strong>Pierre-Luc Dufour</strong>, archer passionné.</Txt>
          <Txt k="apropos.p2" as="p">Après 35 belles années au service de sa clientèle, <strong>Ginette Maltais</strong> passe le flambeau. Elle demeure toutefois près de nous pour partager son expérience et sa passion aussi longtemps qu'elle le souhaitera.</Txt>
          <Txt k="apropos.p3" as="p">Notre engagement reste le même : offrir un service de qualité et faire d'Arc En Flèche une référence en archerie, chasse et pêche au Lac-Saint-Jean.</Txt>
          <div className="signature">
            <Txt k="apropos.sig1">35 ans</Txt><Txt k="apropos.sig2">3 passionnés</Txt><Txt k="apropos.sig3">1 boutique</Txt>
          </div>
        </Apparition>
        <div className="histoire-photos">
          <Apparition className="photo-cadre"><BoutonPhoto k="apropos.photo1" /><img src={image("apropos.photo1", "/images/equipe-boutique.webp")} alt="L'équipe d'Arc En Flèche devant la boutique de Saint-Bruno" loading="lazy" /></Apparition>
          <Apparition className="photo-cadre" delai={120}><BoutonPhoto k="apropos.photo2" /><img src={image("apropos.photo2", "/images/comptoir.webp")} alt="L'équipe au comptoir de la boutique" loading="lazy" /></Apparition>
        </div>
      </section>

      <section className="section section-papier">
        <div className="conteneur">
          <Txt k="apropos.valeurs.surtitre" as="p" className="sur-titre">Nos valeurs</Txt>
          <Txt k="apropos.valeurs.titre" as="h2">Ce qui ne changera pas</Txt>
          <div className="valeurs">
            <Apparition className="valeur"><Cible s={34} /><Txt k="apropos.v1.titre" as="h3">Le bon conseil</Txt><Txt k="apropos.v1.txt" as="p">On vous vend l'équipement qui convient à votre pratique et à votre budget — pas le plus cher sur la tablette.</Txt></Apparition>
            <Apparition className="valeur" delai={100}><Outil s={34} /><Txt k="apropos.v2.titre" as="h3">Réparer d'abord</Txt><Txt k="apropos.v2.txt" as="p">Un équipement bien entretenu dure des décennies. Notre atelier est là pour ça, diagnostic gratuit.</Txt></Apparition>
            <Apparition className="valeur" delai={200}><Feuille s={34} /><Txt k="apropos.v3.titre" as="h3">Acheter local</Txt><Txt k="apropos.v3.txt" as="p">On privilégie les fabricants d'ici : salines, attractifs et leurres faits au Québec.</Txt></Apparition>
          </div>
        </div>
      </section>

      <section className="section conteneur">
        <div className="bandeau-cta bandeau-cta-photo" style={{ backgroundImage: `url(${image("apropos.bandeau", "/images/equipe-foret.webp")})` }}>
          <BoutonPhoto k="apropos.bandeau" />
          <div>
            <Txt k="apropos.cta.surtitre" as="p" className="sur-titre sur-titre-orange">Venez nous rencontrer</Txt>
            <Txt k="apropos.cta.titre" as="h2" className="h2-clair">Votre prochaine saison commence ici.</Txt>
          </div>
          <Link to="/contact" className="btn btn-orange btn-grand">Nous joindre <Fleche s={18} /></Link>
        </div>
      </section>
    </>
  );
}
