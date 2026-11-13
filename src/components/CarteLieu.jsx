import { useState } from "react";
import { INFOS } from "../data/site.js";
import { useContenu } from "../lib/contenu.jsx";
import { Fleche, Moins, Plus } from "./Icons.jsx";

// Carte stylisée de la boutique : tuiles OpenStreetMap inversées et teintées aux couleurs du site,
// repère orange animé et fiche d'adresse. Aucune clé d'API ni bibliothèque externe.
const T = 256; // taille d'une tuile
const N = 5; // grille N × N autour de la boutique
const pixel = (lat, lon, z) => {
  const n = 2 ** z;
  const r = (lat * Math.PI) / 180;
  return { x: ((lon + 180) / 360) * n * T, y: ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n * T };
};

export default function CarteLieu() {
  useContenu();
  const [z, setZ] = useState(12);
  const { x, y } = pixel(INFOS.lat, INFOS.lon, z);
  const tx = Math.floor(x / T), ty = Math.floor(y / T);
  const debut = Math.floor(N / 2);
  // position de la boutique dans la grille → la grille est décalée pour la centrer
  const dx = (tx - (tx - debut)) * T + (x - tx * T);
  const dy = (ty - (ty - debut)) * T + (y - ty * T);
  const tuiles = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const X = tx - debut + i, Y = ty - debut + j;
    tuiles.push({ cle: `${z}/${X}/${Y}`, src: `https://tile.openstreetmap.org/${z}/${X}/${Y}.png` });
  }
  return (
    <div className="lieu" role="group" aria-label={`Carte : ${INFOS.rue}, ${INFOS.ville}`}>
      <div className="lieu-tuiles" style={{ width: N * T, height: N * T, transform: `translate(${-dx}px, ${-dy}px)` }} aria-hidden="true">
        {tuiles.map((t) => <img key={t.cle} src={t.src} alt="" width={T} height={T} loading="lazy" draggable="false" />)}
      </div>
      <div className="lieu-voile" aria-hidden="true" />
      <div className="lieu-repere" aria-hidden="true"><i /><i /><span><img src="/images/logo-clair.png" alt="" /></span></div>
      <div className="lieu-zoom">
        <button onClick={() => setZ((v) => Math.min(16, v + 1))} disabled={z >= 16} aria-label="Zoom avant"><Plus s={16} /></button>
        <button onClick={() => setZ((v) => Math.max(8, v - 1))} disabled={z <= 8} aria-label="Zoom arrière"><Moins s={16} /></button>
      </div>
      <div className="lieu-fiche">
        <span className="sur-titre sur-titre-orange">Arc En Flèche</span>
        <strong>{INFOS.rue}</strong>
        <span>{INFOS.ville} {INFOS.codePostal}</span>
        <a className="btn btn-orange btn-petit" href={INFOS.itineraire} target="_blank" rel="noreferrer">Itinéraire <Fleche s={14} /></a>
      </div>
      <a className="lieu-credit" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a>
    </div>
  );
}
