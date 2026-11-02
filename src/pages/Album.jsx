import { useEffect, useState } from "react";
import { ALBUM } from "../data/site.js";
import Apparition from "../components/Apparition.jsx";
import { Txt } from "../components/Editable.jsx";
import { useContenu } from "../lib/contenu.jsx";
import { Fermer, Fleche } from "../components/Icons.jsx";

export default function Album() {
  useContenu();
  const [ouvert, setOuvert] = useState(null);

  useEffect(() => {
    if (ouvert == null) return;
    const k = (e) => {
      if (e.key === "Escape") setOuvert(null);
      if (e.key === "ArrowRight") setOuvert((i) => (i + 1) % ALBUM.length);
      if (e.key === "ArrowLeft") setOuvert((i) => (i - 1 + ALBUM.length) % ALBUM.length);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [ouvert]);

  return (
    <>
      <section className="page-tete">
        <div className="topo-fond" aria-hidden="true" />
        <div className="conteneur page-tete-in">
          <Txt k="album.surtitre" as="p" className="sur-titre sur-titre-orange">Album photo</Txt>
          <Txt k="album.titre" as="h1">Sur le terrain</Txt>
          <Txt k="album.intro" as="p">La boutique, l'atelier, et nos clients en action. Envoyez-nous vos photos de chasse et de pêche sur Facebook !</Txt>
        </div>
      </section>
      <section className="section conteneur">
        <div className="album">
          {ALBUM.map((a, i) => (
            <Apparition key={a.src + i} className="album-item" delai={(i % 3) * 60}>
              <button onClick={() => setOuvert(i)} aria-label={`Agrandir : ${a.alt}`}>
                <img src={a.src} alt={a.alt} loading="lazy" />
              </button>
            </Apparition>
          ))}
        </div>
      </section>
      {ouvert != null && (
        <div className="visionneuse" onClick={() => setOuvert(null)}>
          <button className="icone-btn fermer" aria-label="Fermer"><Fermer /></button>
          <button className="visionneuse-nav precedent" onClick={(e) => { e.stopPropagation(); setOuvert((ouvert - 1 + ALBUM.length) % ALBUM.length); }} aria-label="Précédente"><Fleche /></button>
          <figure onClick={(e) => e.stopPropagation()}>
            <img src={ALBUM[ouvert].src} alt={ALBUM[ouvert].alt} />
            <figcaption>{ALBUM[ouvert].alt}</figcaption>
          </figure>
          <button className="visionneuse-nav" onClick={(e) => { e.stopPropagation(); setOuvert((ouvert + 1) % ALBUM.length); }} aria-label="Suivante"><Fleche /></button>
        </div>
      )}
    </>
  );
}
