import { useState } from "react";
import { ALBUM, HORAIRE, INFOS, SERVICES } from "../data/site.js";
import { JOURS, grouperSemaine, semaineDepuis, televerserPhoto, useContenu } from "../lib/contenu.jsx";

/* ---------- Admin : contenu du site (coordonnées, heures, atelier, album) ---------- */

const ORDRE = [1, 2, 3, 4, 5, 6, 0];
const ICONES = [["corde", "Corde"], ["arc", "Arc"], ["fleche", "Flèche"], ["moulinet", "Moulinet"], ["arbalete", "Arbalète"], ["cible", "Cible"]];
const SERVICE_VIDE = { nom: "", prix: "", desc: "", delai: "", icone: "arc" };

function Etat({ msg }) {
  return msg ? <span className={msg.startsWith("Erreur") ? "alerte" : "petit"}>{msg}</span> : null;
}

// Petit hook : envoie une section et affiche le résultat sous le bouton
function useEnvoi() {
  const { sauver } = useContenu();
  const [msg, setMsg] = useState("");
  const envoyer = async (patch) => {
    setMsg("Enregistrement…");
    const ok = await sauver(patch);
    setMsg(ok ? "Enregistré ✓ — visible sur le site." : "Erreur : la table site_content n'est pas encore installée ou l'accès est refusé.");
  };
  return [msg, envoyer];
}

export default function AdminSite() {
  const { edition, setEdition, charge } = useContenu();
  return (
    <div className="admin-site">
      <div className="admin-bloc">
        <h2>Textes et photos des pages</h2>
        <p className="petit">Activez le mode édition, puis naviguez sur le site : cliquez sur n'importe quel texte encadré pour l'écrire directement, ou sur « 📷 Changer la photo ». Chaque modification est enregistrée dès que vous cliquez ailleurs.</p>
        <div><button className="btn btn-orange" onClick={() => setEdition(!edition)}>{edition ? "✓ Terminer l'édition" : "✏️ Activer le mode édition"}</button></div>
      </div>
      {/* remonte les formulaires une fois le contenu enregistré chargé */}
      <Coordonnees key={`c${charge}`} />
      <Heures key={`h${charge}`} />
      <Services key={`s${charge}`} />
      <AlbumEdit key={`a${charge}`} />
    </div>
  );
}

function Coordonnees() {
  const [f, setF] = useState(() => ({ rue: INFOS.rue, ville: INFOS.ville, codePostal: INFOS.codePostal, tel: INFOS.tel, courriel: INFOS.courriel, facebook: INFOS.facebook }));
  const [msg, envoyer] = useEnvoi();
  const champ = (k) => ({ value: f[k] || "", onChange: (e) => setF({ ...f, [k]: e.target.value }) });
  return (
    <form className="admin-bloc form" onSubmit={(e) => { e.preventDefault(); envoyer({ infos: f }); }}>
      <h2>Adresse et coordonnées</h2>
      <div className="form-2">
        <label className="champ-large">Adresse (rue)<input {...champ("rue")} /></label>
        <label>Ville<input {...champ("ville")} /></label>
        <label>Code postal<input {...champ("codePostal")} /></label>
        <label>Téléphone<input {...champ("tel")} /></label>
        <label>Courriel<input type="email" {...champ("courriel")} /></label>
        <label className="champ-large">Page Facebook (lien)<input {...champ("facebook")} /></label>
      </div>
      <p className="petit">La carte Google et le bouton « Itinéraire » suivent automatiquement la nouvelle adresse.</p>
      <div className="actions-ligne actions-gauche"><button className="btn btn-orange">Enregistrer les coordonnées</button><Etat msg={msg} /></div>
    </form>
  );
}

function Heures() {
  const { donnees } = useContenu();
  const [semaine, setSemaine] = useState(() => donnees.semaine || semaineDepuis(HORAIRE));
  const [msg, envoyer] = useEnvoi();
  const maj = (j, patch) => setSemaine((s) => s.map((x, i) => (i === j ? { ...x, ...patch } : x)));
  const apercu = grouperSemaine(semaine);
  return (
    <form className="admin-bloc form" onSubmit={(e) => { e.preventDefault(); envoyer({ semaine, horaire: apercu }); }}>
      <h2>Heures d'ouverture</h2>
      <ul className="heures-edit">
        {ORDRE.map((j) => (
          <li key={j}>
            <strong>{JOURS[j]}</strong>
            <label className="interrupteur"><input type="checkbox" checked={semaine[j].ouvert} onChange={(e) => maj(j, { ouvert: e.target.checked })} /><span /> {semaine[j].ouvert ? "Ouvert" : "Fermé"}</label>
            <input type="time" value={semaine[j].de} disabled={!semaine[j].ouvert} onChange={(e) => maj(j, { de: e.target.value })} aria-label={`${JOURS[j]} ouverture`} />
            <input type="time" value={semaine[j].a} disabled={!semaine[j].ouvert} onChange={(e) => maj(j, { a: e.target.value })} aria-label={`${JOURS[j]} fermeture`} />
          </li>
        ))}
      </ul>
      <p className="petit">Affiché sur le site : {apercu.map((h) => `${h.label} ${h.plage}`).join(" · ")}</p>
      <div className="actions-ligne actions-gauche"><button className="btn btn-orange">Enregistrer les heures</button><Etat msg={msg} /></div>
    </form>
  );
}

function Services() {
  const [liste, setListe] = useState(() => structuredClone(SERVICES));
  const [msg, envoyer] = useEnvoi();
  const maj = (i, k, v) => setListe((l) => l.map((s, j) => (j === i ? { ...s, [k]: v } : s)));
  const deplacer = (i, d) => setListe((l) => { const c = [...l]; [c[i], c[i + d]] = [c[i + d], c[i]]; return c; });
  return (
    <form className="admin-bloc form" onSubmit={(e) => { e.preventDefault(); envoyer({ services: liste.filter((s) => s.nom.trim()) }); }}>
      <h2>Services de l'atelier</h2>
      {liste.map((s, i) => (
        <div key={i} className="service-edit">
          <div className="form-2">
            <label>Nom du service<input value={s.nom} onChange={(e) => maj(i, "nom", e.target.value)} /></label>
            <label>Prix<input value={s.prix} placeholder="À partir de 45 $" onChange={(e) => maj(i, "prix", e.target.value)} /></label>
            <label>Délai<input value={s.delai} placeholder="48 h" onChange={(e) => maj(i, "delai", e.target.value)} /></label>
            <label>Icône
              <select value={s.icone} onChange={(e) => maj(i, "icone", e.target.value)}>
                {ICONES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
          </div>
          <label>Description<textarea rows={2} value={s.desc} onChange={(e) => maj(i, "desc", e.target.value)} /></label>
          <div className="actions-ligne actions-gauche">
            <button type="button" className="btn btn-contour btn-petit" disabled={i === 0} onClick={() => deplacer(i, -1)}>↑</button>
            <button type="button" className="btn btn-contour btn-petit" disabled={i === liste.length - 1} onClick={() => deplacer(i, 1)}>↓</button>
            <button type="button" className="btn btn-danger btn-petit" onClick={() => setListe((l) => l.filter((_, j) => j !== i))}>Retirer ce service</button>
          </div>
        </div>
      ))}
      <div className="actions-ligne actions-gauche">
        <button type="button" className="btn btn-contour" onClick={() => setListe((l) => [...l, { ...SERVICE_VIDE }])}>+ Ajouter un service</button>
        <button className="btn btn-orange">Enregistrer les services</button>
        <Etat msg={msg} />
      </div>
    </form>
  );
}

function AlbumEdit() {
  const [liste, setListe] = useState(() => structuredClone(ALBUM));
  const [envoi, setEnvoi] = useState(false);
  const [msg, envoyer] = useEnvoi();
  const deplacer = (i, d) => setListe((l) => { const c = [...l]; [c[i], c[i + d]] = [c[i + d], c[i]]; return c; });

  const ajouter = async (fichiers) => {
    setEnvoi(true);
    const nouvelles = [];
    for (const f of fichiers) {
      try { nouvelles.push({ src: await televerserPhoto(f, "album"), alt: "", w: 4, h: 3 }); } catch { /* fichier ignoré */ }
    }
    setListe((l) => [...nouvelles, ...l]);
    setEnvoi(false);
  };

  return (
    <form className="admin-bloc form" onSubmit={(e) => { e.preventDefault(); envoyer({ album: liste }); }}>
      <h2>Album photo</h2>
      <label>Ajouter des photos (une ou plusieurs)
        <input type="file" accept="image/*" multiple onChange={(e) => { ajouter(Array.from(e.target.files || [])); e.target.value = ""; }} />
      </label>
      {envoi && <p className="petit">Téléversement en cours…</p>}
      <p className="petit">Les 5 premières photos apparaissent aussi sur la page d'accueil. N'oubliez pas d'enregistrer.</p>
      <div className="album-edit">
        {liste.map((a, i) => (
          <figure key={a.src + i}>
            <img src={a.src} alt="" />
            <input value={a.alt} placeholder="Description de la photo" onChange={(e) => setListe((l) => l.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))} />
            <div>
              <button type="button" className="btn btn-contour btn-petit" disabled={i === 0} onClick={() => deplacer(i, -1)}>←</button>
              <button type="button" className="btn btn-contour btn-petit" disabled={i === liste.length - 1} onClick={() => deplacer(i, 1)}>→</button>
              <button type="button" className="btn btn-danger btn-petit" onClick={() => setListe((l) => l.filter((_, j) => j !== i))}>Retirer</button>
            </div>
          </figure>
        ))}
      </div>
      <div className="actions-ligne actions-gauche"><button className="btn btn-orange" disabled={envoi}>Enregistrer l'album</button><Etat msg={msg} /></div>
    </form>
  );
}
