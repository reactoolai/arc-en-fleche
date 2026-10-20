import { HORAIRE } from "../data/site.js";

export const prix = (v) =>
  (Number(v) || 0).toLocaleString("fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " $";

export const nettoyer = (s) => {
  const t = String(s || "")
    .replace(/\s+/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\s+([,.])/g, "$1")
    .trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
};

export const sansAccents = (s) =>
  String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const MARQUES_DETECT = [
  ["penn", "Penn"], ["shimano", "Shimano"], ["abu ?garcia", "Abu Garcia"], ["daiwa|revros|exceler", "Daiwa"],
  ["pflueger", "Pflueger"], ["fenwick", "Fenwick"], ["berkley|trilene|powerbait", "Berkley"], ["rapala", "Rapala"],
  ["blue fox|bleu fox", "Blue Fox"], ["flambeau", "Flambeau"], ["plano", "Plano"], ["easton", "Easton"],
  ["allen", "Allen"], ["weaver|waever", "Weaver"], ["browning", "Browning"], ["crosman", "Crosman"],
  ["daisy", "Daisy"], ["thermacell", "Thermacell"], ["buck ?expert", "Buck Expert"], ["buck ?hunter|buckhunter", "Buck Hunter"],
  ["spypoint", "Spypoint"], ["mustad", "Mustad"], ["eagles? claw", "Eagle Claw"], ["remington", "Remington"],
  ["heddon", "Heddon"], ["minn kota", "Minn Kota"], ["quantum", "Quantum"], ["compac", "Compac"],
  ["lucky strike", "Lucky Strike"], ["malades? de p[eê]che|produits de p[eê]che bm", "Malades de pêche"],
  ["maniaque de prospection", "Maniaque de prospection"], ["kwik.?site", "Kwik-Site"], ["mazzlock", "Mazzlock"],
  ["stoeger", "Stoeger"], ["outers", "Outers"], ["cold steel", "Cold Steel"], ["schrade", "Schrade"],
  ["chinook", "Chinook"], ["october mountain", "October Mountain"], ["cordell", "Cordell"], ["fair-?play", "Fair-Play"],
  ["opemisca", "Opemisca"], ["windigo", "Windigo"], ["ma-?jik", "Ma-Jik"], ["williams", "Williams"],
  ["frontiersman|feontiersman", "Frontiersman"], ["spypoint", "Spypoint"], ["northbackcountry", "North Backcountry"],
  ["limb ?saver", "LimbSaver"], ["flambeau", "Flambeau"], ["water gremlin", "Water Gremlin"], ["scotty", "Scotty"],
  ["emery", "Emery"], ["silvercast", "Silvercast"], ["cuda", "Cuda"], ["sun optics", "Sun Optics"], ["axiom", "Axiom"],
];

export const marque = (nom, desc) => {
  const s = sansAccents(nom + " " + (desc || ""));
  for (const [re, m] of MARQUES_DETECT) if (new RegExp(re).test(s)) return m;
  return null;
};

// Heure courante au Québec
const heureQuebec = (d = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto", weekday: "short", hour: "numeric", minute: "numeric", hour12: false,
  }).formatToParts(d);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  const jours = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { jour: jours[get("weekday")], h: (Number(get("hour")) % 24) + Number(get("minute")) / 60 };
};

const fmtH = (h) => {
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  return `${hh} h${mm ? " " + String(mm).padStart(2, "0") : ""}`;
};

export const etatOuverture = () => {
  const { jour, h } = heureQuebec();
  const auj = HORAIRE.find((x) => x.jours.includes(jour));
  if (auj && auj.de != null && h >= auj.de && h < auj.a) {
    return { ouvert: true, texte: `Ouvert maintenant · jusqu'à ${fmtH(auj.a)}` };
  }
  if (auj && auj.de != null && h < auj.de) return { ouvert: false, texte: `Fermé · ouvre à ${fmtH(auj.de)}` };
  for (let i = 1; i <= 7; i++) {
    const j = (jour + i) % 7;
    const x = HORAIRE.find((y) => y.jours.includes(j));
    if (x && x.de != null) {
      const nom = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"][j];
      return { ouvert: false, texte: `Fermé · ouvre ${i === 1 ? "demain" : nom} à ${fmtH(x.de)}` };
    }
  }
  return { ouvert: false, texte: "Fermé" };
};
