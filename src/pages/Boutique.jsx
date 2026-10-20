import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useCatalog } from "../lib/store.jsx";
import { sansAccents } from "../lib/format.js";
import { CarteProduit, SqueletteCartes } from "../components/Produit.jsx";
import { Fermer, Filtre, Recherche } from "../components/Icons.jsx";

const PAR_PAGE = 24;
const TRIS = {
  pertinence: "En vedette",
  "prix-asc": "Prix croissant",
  "prix-desc": "Prix décroissant",
  nom: "Nom (A–Z)",
};

export default function Boutique() {
  const { cats, produits, chargement, erreur } = useCatalog();
  const [params, setParams] = useSearchParams();
  const cat = params.get("cat") ? Number(params.get("cat")) : null;
  const sub = params.get("sub") ? Number(params.get("sub")) : null;
  const q = params.get("q") || "";
  const tri = params.get("tri") || "pertinence";
  const enStock = params.get("stock") === "1";
  const [saisie, setSaisie] = useState(q);
  const [limite, setLimite] = useState(PAR_PAGE);
  const [filtresMobile, setFiltresMobile] = useState(false);

  useEffect(() => { setSaisie(q); }, [q]);
  useEffect(() => { setLimite(PAR_PAGE); }, [cat, sub, q, tri, enStock]);

  // recherche « en direct » pendant la frappe
  useEffect(() => {
    const t = setTimeout(() => { if (saisie !== q) maj({ q: saisie || null }); }, 250);
    return () => clearTimeout(t);
  }, [saisie]); // eslint-disable-line react-hooks/exhaustive-deps

  const maj = (o) => {
    const n = new URLSearchParams(params);
    Object.entries(o).forEach(([k, v]) => (v == null || v === "" ? n.delete(k) : n.set(k, v)));
    setParams(n, { replace: true });
  };

  const courante = cats.find((c) => c.id === cat);

  const liste = useMemo(() => {
    let l = produits;
    if (cat) l = l.filter((p) => p.cat === cat);
    if (sub) l = l.filter((p) => p.sub === sub);
    if (enStock) l = l.filter((p) => p.stock);
    const mots = sansAccents(q).trim().split(/\s+/).filter(Boolean);
    if (mots.length) l = l.filter((p) => { const s = sansAccents(`${p.nom} ${p.desc} ${p.marque || ""}`); return mots.every((m) => s.includes(m)); });
    const c = [...l];
    if (tri === "prix-asc") c.sort((a, b) => a.prix - b.prix);
    if (tri === "prix-desc") c.sort((a, b) => b.prix - a.prix);
    if (tri === "nom") c.sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
    if (tri === "pertinence") c.sort((a, b) => (b.images.length > 0) - (a.images.length > 0));
    return c;
  }, [produits, cat, sub, q, tri, enStock]);

  const titre = q ? `Résultats pour « ${q} »` : courante ? courante.nom : "Toute la boutique";

  const Filtres = () => (
    <div className="filtres">
      <p className="sur-titre">Départements</p>
      <ul>
        <li><button className={!cat ? "actif" : ""} onClick={() => maj({ cat: null, sub: null })}><span>Tout l'inventaire</span><em>{produits.length}</em></button></li>
        {cats.filter((c) => c.n > 0).map((c) => (
          <li key={c.id}>
            <button className={cat === c.id ? "actif" : ""} onClick={() => maj({ cat: c.id, sub: null })}><span>{c.nom}</span><em>{c.n}</em></button>
            {cat === c.id && c.subs.length > 0 && (
              <ul className="filtres-subs">
                {c.subs.map((s) => {
                  const n = produits.filter((p) => p.sub === s.id).length;
                  if (!n) return null;
                  return <li key={s.id}><button className={sub === s.id ? "actif" : ""} onClick={() => maj({ sub: sub === s.id ? null : s.id })}><span>{s.nom}</span><em>{n}</em></button></li>;
                })}
              </ul>
            )}
          </li>
        ))}
      </ul>
      <label className="interrupteur">
        <input type="checkbox" checked={enStock} onChange={(e) => maj({ stock: e.target.checked ? "1" : null })} />
        <span /> En stock seulement
      </label>
    </div>
  );

  return (
    <div className="page-boutique">
      <section className="boutique-tete">
        <div className="topo-fond" aria-hidden="true" />
        <div className="conteneur">
          <nav className="fil" aria-label="Fil d'Ariane"><Link to="/">Accueil</Link> / <Link to="/boutique">Boutique</Link>{courante && <> / {courante.nom}</>}</nav>
          <h1>{titre}</h1>
          <div className="boutique-recherche">
            <Recherche s={20} />
            <input value={saisie} onChange={(e) => setSaisie(e.target.value)} placeholder={produits.length ? `Chercher parmi ${produits.length} articles…` : "Chercher un article…"} aria-label="Rechercher dans la boutique" />
            {saisie && <button className="icone-btn" onClick={() => setSaisie("")} aria-label="Effacer"><Fermer s={18} /></button>}
          </div>
          <div className="puces">
            <button className={!cat ? "actif" : ""} onClick={() => maj({ cat: null, sub: null })}>Tout</button>
            {cats.filter((c) => c.n > 0).sort((a, b) => b.n - a.n).map((c) => (
              <button key={c.id} className={cat === c.id ? "actif" : ""} onClick={() => maj({ cat: c.id, sub: null })}>{c.nom}</button>
            ))}
          </div>
        </div>
      </section>

      <div className="conteneur boutique-corps">
        <aside className="boutique-cote"><Filtres /></aside>
        <div>
          <div className="barre-outils">
            <span className="resultats">{chargement ? "Chargement…" : `${liste.length} article${liste.length > 1 ? "s" : ""}`}</span>
            <button className="btn btn-contour btn-petit filtres-btn" onClick={() => setFiltresMobile(true)}><Filtre s={16} /> Filtres</button>
            <label className="tri">
              Trier
              <select value={tri} onChange={(e) => maj({ tri: e.target.value === "pertinence" ? null : e.target.value })}>
                {Object.entries(TRIS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
          </div>
          {erreur && <div className="alerte">{erreur}</div>}
          {!chargement && liste.length === 0 && (
            <div className="vide-boite">
              <h3>Rien trouvé… pour l'instant</h3>
              <p>Tout notre inventaire n'est pas encore en ligne. Appelez-nous au <a href="tel:+14183433301">418 343-3301</a>, on vérifie en arrière-boutique.</p>
              <button className="btn btn-fonce" onClick={() => setParams({})}>Voir toute la boutique</button>
            </div>
          )}
          <div className="grille-produits">
            {chargement ? <SqueletteCartes n={12} /> : liste.slice(0, limite).map((p) => <CarteProduit key={p.id} p={p} />)}
          </div>
          {liste.length > limite && (
            <div className="centre plus">
              <p>{limite} sur {liste.length} articles</p>
              <div className="barre"><i style={{ width: (limite / liste.length) * 100 + "%" }} /></div>
              <button className="btn btn-fonce" onClick={() => setLimite((l) => l + PAR_PAGE * 2)}>Afficher plus d'articles</button>
            </div>
          )}
        </div>
      </div>

      {filtresMobile && (
        <div className="tiroir-fond visible" onClick={() => setFiltresMobile(false)}>
          <aside className="tiroir tiroir-gauche" onClick={(e) => e.stopPropagation()}>
            <div className="tiroir-tete"><h2>Filtres</h2><button className="icone-btn" onClick={() => setFiltresMobile(false)} aria-label="Fermer"><Fermer /></button></div>
            <div className="tiroir-defile"><Filtres /></div>
            <div className="tiroir-pied"><button className="btn btn-orange btn-plein" onClick={() => setFiltresMobile(false)}>Voir {liste.length} articles</button></div>
          </aside>
        </div>
      )}
    </div>
  );
}
