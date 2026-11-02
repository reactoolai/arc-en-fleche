import { useRef } from "react";
import { Link } from "react-router-dom";
import { useContenu } from "../lib/contenu.jsx";

/* ---------- Texte modifiable directement sur la page (mode édition admin) ---------- */

export function Txt({ k, as: Tag = "span", className = "", children, ...rest }) {
  const { edition, texte, setTexte } = useContenu();
  const avant = useRef("");
  const val = texte(k);
  const classes = [className, val != null && "txt-libre", edition && "editable"].filter(Boolean).join(" ") || undefined;

  if (!edition) return <Tag className={classes} {...rest}>{val ?? children}</Tag>;
  return (
    <Tag
      key={`${val}`}
      className={classes}
      {...rest}
      contentEditable
      suppressContentEditableWarning
      title="Cliquez pour modifier ce texte"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onFocus={(e) => { avant.current = e.currentTarget.innerText; }}
      onKeyDown={(e) => { if (e.key === "Escape") e.currentTarget.blur(); }}
      onBlur={(e) => {
        const t = e.currentTarget.innerText.trim();
        if (t !== avant.current.trim()) setTexte(k, t);
      }}
    >
      {val ?? children}
    </Tag>
  );
}

// URL d'une photo de page (remplacée par l'admin ou valeur par défaut)
export const useImage = (k, defaut) => useContenu().image(k, defaut);

// Bouton « Changer la photo », à placer dans un parent en position relative
export function BoutonPhoto({ k, style }) {
  const { edition, choisirPhoto } = useContenu();
  if (!edition) return null;
  return (
    <button type="button" className="btn-photo" style={style} onClick={(e) => { e.preventDefault(); e.stopPropagation(); choisirPhoto(k); }}>
      📷 Changer la photo
    </button>
  );
}

/* ---------- Barre flottante de l'administrateur ---------- */

export function BarreEdition({ admin }) {
  const { edition, setEdition, statut } = useContenu();
  if (!admin) return null;
  return (
    <div className={`barre-edition ${edition ? "active" : ""}`}>
      <button type="button" onClick={() => setEdition(!edition)}>
        {edition ? "✓ Terminer l'édition" : "✏️ Modifier le site"}
      </button>
      {edition && <span>Cliquez sur un texte pour l'écrire, ou sur « Changer la photo ».{statut && <b> {statut}</b>}</span>}
      {!edition && <Link to="/admin?onglet=site">Heures, adresse, services, album</Link>}
    </div>
  );
}
