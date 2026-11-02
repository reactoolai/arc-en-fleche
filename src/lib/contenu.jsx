import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabase.js";
import { useAuth } from "./store.jsx";
import { fmtH } from "./format.js";
import { ALBUM, HORAIRE, INFOS, SERVICES } from "../data/site.js";

/* ---------- Contenu du site modifiable (Supabase : table site_content) ---------- */

const DEFAUTS = structuredClone({ infos: INFOS, horaire: HORAIRE, services: SERVICES, album: ALBUM });
const BUCKET = "inventory-images";
export const JOURS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const ORDRE = [1, 2, 3, 4, 5, 6, 0]; // lundi d'abord

const remplacer = (tab, val) => tab.splice(0, tab.length, ...structuredClone(val));

// Liens téléphone / carte recalculés à partir des coordonnées
const liens = (i) => {
  const chiffres = (i.tel || "").replace(/\D/g, "");
  const adresse = encodeURIComponent(`${i.rue}, ${i.ville} ${i.codePostal}`);
  return {
    telHref: `tel:+${chiffres.length === 10 ? "1" + chiffres : chiffres}`,
    carte: `https://www.google.com/maps?q=${adresse}&output=embed`,
    itineraire: `https://www.google.com/maps/dir/?api=1&destination=${adresse}`,
  };
};

// Les modules de données sont mutés sur place pour que tous les composants
// qui les importent voient les valeurs enregistrées (ils s'abonnent via useContenu).
function appliquer(v) {
  const infos = { ...DEFAUTS.infos, ...(v.infos || {}) };
  Object.assign(INFOS, infos, v.infos ? liens(infos) : {});
  remplacer(HORAIRE, v.horaire?.length ? v.horaire : DEFAUTS.horaire);
  remplacer(SERVICES, v.services || DEFAUTS.services);
  remplacer(ALBUM, v.album || DEFAUTS.album);
}

const hDec = (t) => { const [h, m] = (t || "0:0").split(":").map(Number); return h + (m || 0) / 60; };
const hTxt = (d) => `${String(Math.floor(d)).padStart(2, "0")}:${String(Math.round((d % 1) * 60)).padStart(2, "0")}`;

// HORAIRE (groupes) → 7 jours éditables
export const semaineDepuis = (horaire) =>
  JOURS.map((_, j) => {
    const g = horaire.find((x) => x.jours.includes(j));
    return g && g.de != null ? { ouvert: true, de: hTxt(g.de), a: hTxt(g.a) } : { ouvert: false, de: "09:00", a: "17:00" };
  });

// 7 jours → groupes de jours consécutifs ayant les mêmes heures
export const grouperSemaine = (semaine) => {
  const groupes = [];
  for (const j of ORDRE) {
    const s = semaine[j];
    const cle = s.ouvert ? `${s.de}-${s.a}` : "ferme";
    const dernier = groupes[groupes.length - 1];
    if (dernier && dernier.cle === cle) dernier.jours.push(j);
    else groupes.push({ cle, jours: [j], s });
  }
  return groupes.map(({ jours, s }) => ({
    label: jours.length > 1 ? `${JOURS[jours[0]]} – ${JOURS[jours[jours.length - 1]]}` : JOURS[jours[0]],
    plage: s.ouvert ? `${fmtH(hDec(s.de))} à ${fmtH(hDec(s.a))}` : "Fermé",
    jours, de: s.ouvert ? hDec(s.de) : null, a: s.ouvert ? hDec(s.a) : null,
  }));
};

export async function televerserPhoto(file, prefixe = "site") {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const chemin = `${prefixe}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(chemin, file, { contentType: file.type });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(chemin).data.publicUrl;
}

const ContenuCtx = createContext(null);

export function ContenuProvider({ children }) {
  const { admin } = useAuth();
  const [donnees, setDonnees] = useState({});
  const [edition, setEdition] = useState(false);
  const [statut, setStatut] = useState("");
  const [charge, setCharge] = useState(false);
  const courant = useRef({});
  const fichier = useRef(null);
  const cible = useRef(null);

  useEffect(() => {
    supabase.from("site_content").select("valeur").eq("cle", "site").maybeSingle().then(({ data }) => {
      setCharge(true);
      if (!data?.valeur) return;
      courant.current = data.valeur;
      appliquer(data.valeur);
      setDonnees(data.valeur);
    });
  }, []);

  const sauver = useCallback(async (patch) => {
    const nv = { ...courant.current, ...patch };
    courant.current = nv;
    appliquer(nv);
    setDonnees(nv);
    setStatut("Enregistrement…");
    const { error } = await supabase.from("site_content").upsert({ cle: "site", valeur: nv, updated_at: new Date().toISOString() });
    setStatut(error ? `Erreur : ${error.message}` : "Enregistré ✓");
    return !error;
  }, []);

  const setTexte = useCallback((k, val) => sauver({ textes: { ...courant.current.textes, [k]: val } }), [sauver]);
  const setImage = useCallback((k, url) => sauver({ images: { ...courant.current.images, [k]: url } }), [sauver]);

  const choisirPhoto = useCallback((k) => { cible.current = k; fichier.current?.click(); }, []);
  const surFichier = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !cible.current) return;
    setStatut("Téléversement de la photo…");
    try { await setImage(cible.current, await televerserPhoto(f)); }
    catch (err) { setStatut(`Erreur : ${err.message}`); }
  };

  const value = useMemo(() => ({
    donnees, statut, charge, sauver, setTexte, choisirPhoto,
    edition: edition && admin, setEdition,
    texte: (k) => donnees.textes?.[k],
    image: (k, defaut) => donnees.images?.[k] || defaut,
  }), [donnees, statut, charge, sauver, setTexte, choisirPhoto, edition, admin]);

  return (
    <ContenuCtx.Provider value={value}>
      {children}
      {admin && <input ref={fichier} type="file" accept="image/*" hidden onChange={surFichier} />}
    </ContenuCtx.Provider>
  );
}

export const useContenu = () => useContext(ContenuCtx);
