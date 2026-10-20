const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" };
const I = ({ s = 20, children, ...p }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden="true" {...base} {...p}>{children}</svg>
);

export const Recherche = (p) => <I {...p}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></I>;
export const Sac = (p) => <I {...p}><path d="M5 8h14l-1.2 12H6.2L5 8Z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></I>;
export const Compte = (p) => <I {...p}><circle cx="12" cy="8" r="3.6" /><path d="M4.5 20c.8-3.6 3.8-5.4 7.5-5.4s6.7 1.8 7.5 5.4" /></I>;
export const Menu = (p) => <I {...p}><path d="M4 7h16M4 12h16M4 17h10" /></I>;
export const Fermer = (p) => <I {...p}><path d="M6 6l12 12M18 6 6 18" /></I>;
export const Fleche = (p) => <I {...p}><path d="M4 12h15M13 6l6 6-6 6" /></I>;
export const Telephone = (p) => <I {...p}><path d="M5 4h3.5l1.6 4.2-2.1 1.4a11 11 0 0 0 6.4 6.4l1.4-2.1L20 15.5V19a1 1 0 0 1-1 1A15 15 0 0 1 4 5a1 1 0 0 1 1-1Z" /></I>;
export const Epingle = (p) => <I {...p}><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11Z" /><circle cx="12" cy="10" r="2.3" /></I>;
export const Horloge = (p) => <I {...p}><circle cx="12" cy="12" r="8" /><path d="M12 7.5V12l3 2" /></I>;
export const Camion = (p) => <I {...p}><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17.5" cy="17.5" r="1.8" /></I>;
export const Outil = (p) => <I {...p}><path d="M14.5 6.5a4 4 0 0 0 5 5L12 19a2.1 2.1 0 0 1-3-3l7.5-7.5Z" /><path d="M14.5 6.5 17 4l3 3-2.5 2.5" /></I>;
export const Feuille = (p) => <I {...p}><path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14Z" /><path d="M5 19 13 11" /></I>;
export const Cible = (p) => <I {...p}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1.2" /></I>;
export const Plus = (p) => <I {...p}><path d="M12 5v14M5 12h14" /></I>;
export const Moins = (p) => <I {...p}><path d="M5 12h14" /></I>;
export const Coche = (p) => <I {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></I>;
export const Facebook = ({ s = 18 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H8v3h2.5V21h3Z" /></svg>
);
export const Filtre = (p) => <I {...p}><path d="M4 6h16M7 12h10M10 18h4" /></I>;
export const Corbeille = (p) => <I {...p}><path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13" /></I>;

export const IconeService = ({ nom, s = 30 }) => {
  const m = {
    corde: <I s={s}><path d="M6 3c6 5 6 13 0 18" /><path d="M6 3v18" strokeDasharray="2 2.4" /><path d="M18 12h-9" /></I>,
    arc: <I s={s}><path d="M7 3c7 4 7 14 0 18" /><path d="M7 3v18" /><path d="M3 12h15m-3-3 3 3-3 3" /></I>,
    fleche: <I s={s}><path d="M3 21 17 7" /><path d="M14 4h6v6" /><path d="m3 17 4 4M5 15l4 4" /></I>,
    moulinet: <I s={s}><circle cx="12" cy="11" r="5" /><circle cx="12" cy="11" r="1.5" /><path d="M12 16v4M8 20h8M17 11h4" /></I>,
    cible: <I s={s}><circle cx="12" cy="12" r="8" /><path d="M12 2v5M12 17v5M2 12h5M17 12h5" /><circle cx="12" cy="12" r="1.3" /></I>,
    arbalete: <I s={s}><path d="M4 8c4-3 12-3 16 0" /><path d="M4 8l8 4 8-4" /><path d="M12 12v9M10 21h4M12 4v8" /></I>,
  };
  return m[nom] || <Cible s={s} />;
};
