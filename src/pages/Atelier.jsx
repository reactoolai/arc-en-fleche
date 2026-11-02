import { INFOS, SERVICES } from "../data/site.js";
import { useContenu } from "../lib/contenu.jsx";
import Apparition from "../components/Apparition.jsx";
import { BoutonPhoto, Txt, useImage } from "../components/Editable.jsx";
import { IconeService, Telephone } from "../components/Icons.jsx";

export default function Atelier() {
  useContenu();
  const fond = useImage("atelier.fond", "/images/archer.webp");
  return (
    <>
      <section className="page-tete page-tete-photo" style={{ backgroundImage: `url(${fond})` }}>
        <div className="page-tete-voile" />
        <BoutonPhoto k="atelier.fond" />
        <div className="conteneur page-tete-in">
          <Txt k="atelier.surtitre" as="p" className="sur-titre sur-titre-orange">Atelier de réparation</Txt>
          <Txt k="atelier.titre" as="h1">Diagnostic gratuit.<br />Travail garanti.</Txt>
          <Txt k="atelier.intro" as="p">Arcs, arbalètes et moulinets. Vous l'apportez au comptoir, on l'évalue devant vous, et la plupart des travaux courants sortent en 48 heures.</Txt>
        </div>
      </section>

      <section className="section conteneur">
        <div className="services">
          {SERVICES.map((s, i) => (
            <Apparition key={s.nom + i} className="service" delai={(i % 3) * 80}>
              <span className="service-ico"><IconeService nom={s.icone} /></span>
              <h3>{s.nom}</h3>
              <p>{s.desc}</p>
              <div className="service-pied"><strong>{s.prix}</strong><span>{s.delai}</span></div>
            </Apparition>
          ))}
        </div>
      </section>

      <section className="section-sombre section">
        <div className="topo-fond" aria-hidden="true" />
        <div className="conteneur">
          <Txt k="atelier.etapes.surtitre" as="p" className="sur-titre sur-titre-orange">Comment ça marche</Txt>
          <Txt k="atelier.etapes.titre" as="h2" className="h2-clair">Trois étapes, zéro surprise</Txt>
          <ol className="etapes">
            <Apparition as="li"><b>01</b><Txt k="atelier.etape1.titre" as="h3">Apportez-le</Txt><Txt k="atelier.etape1.txt" as="p">Pas de rendez-vous nécessaire pour l'évaluation. Passez au comptoir avec votre équipement.</Txt></Apparition>
            <Apparition as="li" delai={100}><b>02</b><Txt k="atelier.etape2.titre" as="h3">On diagnostique</Txt><Txt k="atelier.etape2.txt" as="p">Évaluation gratuite devant vous, prix ferme avant de commencer. Aucune surprise sur la facture.</Txt></Apparition>
            <Apparition as="li" delai={200}><b>03</b><Txt k="atelier.etape3.titre" as="h3">Vous repartez prêt</Txt><Txt k="atelier.etape3.txt" as="p">Test en allée de tir avant la remise. On vous appelle dès que c'est prêt.</Txt></Apparition>
          </ol>
        </div>
      </section>

      <section className="section conteneur">
        <div className="bandeau-cta">
          <div>
            <Txt k="atelier.cta.titre" as="h2" className="h2-petit">Une question sur une réparation ?</Txt>
            <Txt k="atelier.cta.txt" as="p">Appelez-nous, on vous dit tout de suite si ça vaut la peine.</Txt>
          </div>
          <a href={INFOS.telHref} className="btn btn-orange btn-grand"><Telephone s={18} /> {INFOS.tel}</a>
        </div>
      </section>
    </>
  );
}
