import { INFOS, SERVICES } from "../data/site.js";
import Apparition from "../components/Apparition.jsx";
import { IconeService, Telephone } from "../components/Icons.jsx";

export default function Atelier() {
  return (
    <>
      <section className="page-tete page-tete-photo" style={{ backgroundImage: "url(/images/archer.webp)" }}>
        <div className="page-tete-voile" />
        <div className="conteneur page-tete-in">
          <p className="sur-titre sur-titre-orange">Atelier de réparation</p>
          <h1>Diagnostic gratuit.<br />Travail garanti.</h1>
          <p>Arcs, arbalètes, moulinets, carabines. Vous l'apportez au comptoir, on l'évalue devant vous, et la plupart des travaux courants sortent en 48 heures.</p>
        </div>
      </section>

      <section className="section conteneur">
        <div className="services">
          {SERVICES.map((s, i) => (
            <Apparition key={s.nom} className="service" delai={(i % 3) * 80}>
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
          <p className="sur-titre sur-titre-orange">Comment ça marche</p>
          <h2 className="h2-clair">Trois étapes, zéro surprise</h2>
          <ol className="etapes">
            <Apparition as="li"><b>01</b><h3>Apportez-le</h3><p>Pas de rendez-vous nécessaire pour l'évaluation. Passez au comptoir avec votre équipement.</p></Apparition>
            <Apparition as="li" delai={100}><b>02</b><h3>On diagnostique</h3><p>Évaluation gratuite devant vous, prix ferme avant de commencer. Aucune surprise sur la facture.</p></Apparition>
            <Apparition as="li" delai={200}><b>03</b><h3>Vous repartez prêt</h3><p>Test en allée de tir avant la remise. On vous appelle dès que c'est prêt.</p></Apparition>
          </ol>
        </div>
      </section>

      <section className="section conteneur">
        <div className="bandeau-cta">
          <div>
            <h2 className="h2-petit">Une question sur une réparation ?</h2>
            <p>Appelez-nous, on vous dit tout de suite si ça vaut la peine.</p>
          </div>
          <a href={INFOS.telHref} className="btn btn-orange btn-grand"><Telephone s={18} /> {INFOS.tel}</a>
        </div>
      </section>
    </>
  );
}
