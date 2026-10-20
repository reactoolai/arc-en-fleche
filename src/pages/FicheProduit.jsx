import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useCart, useCatalog } from "../lib/store.jsx";
import { INFOS, LIVRAISON } from "../data/site.js";
import { prix } from "../lib/format.js";
import { CarteProduit, PhotoProduit } from "../components/Produit.jsx";
import { Quantite } from "../components/TiroirPanier.jsx";
import { Camion, Coche, Epingle, Outil, Telephone } from "../components/Icons.jsx";

export default function FicheProduit() {
  const { id } = useParams();
  const { parId, catParId, produits, chargement } = useCatalog();
  const { ajouter } = useCart();
  const p = parId(id);
  const [q, setQ] = useState(1);
  const [img, setImg] = useState(0);
  useEffect(() => { setQ(1); setImg(0); }, [id]);

  useEffect(() => {
    if (p) document.title = `${p.nom}${p.desc ? " — " + p.desc : ""} | Arc En Flèche`;
    return () => { document.title = "Arc En Flèche — Archerie, chasse et pêche · Saint-Bruno, Lac-Saint-Jean"; };
  }, [p]);

  const variantes = useMemo(() => (p ? produits.filter((x) => x.nom.toLowerCase() === p.nom.toLowerCase() && x.id !== p.id) : []), [p, produits]);
  const similaires = useMemo(() => {
    if (!p) return [];
    const memeCat = produits.filter((x) => x.cat === p.cat && x.id !== p.id && x.nom.toLowerCase() !== p.nom.toLowerCase() && x.images.length);
    const vus = new Set();
    return memeCat.filter((x) => (vus.has(x.nom) ? false : vus.add(x.nom))).sort(() => 0.5 - Math.random()).slice(0, 4);
  }, [p, produits]);

  if (chargement) return <div className="conteneur section"><div className="fiche-squelette" /></div>;
  if (!p) {
    return (
      <div className="conteneur section vide-boite">
        <h1>Produit introuvable</h1>
        <p>Ce produit n'est plus en ligne. Il est peut-être encore en boutique : appelez-nous au <a href={INFOS.telHref}>{INFOS.tel}</a>.</p>
        <Link to="/boutique" className="btn btn-fonce">Retour à la boutique</Link>
      </div>
    );
  }

  const cat = catParId(p.cat);
  const achetable = p.stock && p.prix > 0;

  return (
    <div className="page-fiche">
      <div className="conteneur">
        <nav className="fil fil-fonce" aria-label="Fil d'Ariane">
          <Link to="/">Accueil</Link> / <Link to="/boutique">Boutique</Link>
          {cat && <> / <Link to={`/boutique?cat=${cat.id}`}>{cat.nom}</Link></>}
        </nav>
        <div className="fiche">
          <div className="fiche-galerie">
            <div className="fiche-photo"><PhotoProduit p={p} i={img} eager /></div>
            {p.images.length > 1 && (
              <div className="fiche-vignettes">
                {p.images.map((u, i) => (
                  <button key={u} className={i === img ? "actif" : ""} onClick={() => setImg(i)} aria-label={`Photo ${i + 1}`}>
                    <img src={u} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="fiche-info">
            <p className="sur-titre">{p.marque || cat?.nom}</p>
            <h1>{p.nom}</h1>
            {p.desc && <p className="fiche-desc">{p.desc}</p>}
            <div className="fiche-prix">{p.prix > 0 ? prix(p.prix) : "Prix en boutique"}</div>
            <p className={`stock ${p.stock ? "stock-ok" : ""}`}><i />{p.stock ? "En stock à Saint-Bruno" : "Rupture de stock — appelez-nous pour réserver"}</p>

            {variantes.length > 0 && (
              <div className="variantes">
                <p className="sur-titre">Autres couleurs / formats ({variantes.length})</p>
                <div className="variantes-liste">
                  <span className="variante actif" title={p.desc}><PhotoProduit p={p} /></span>
                  {variantes.slice(0, 11).map((v) => (
                    <Link key={v.id} to={`/produit/${v.id}`} className="variante" title={v.desc || v.nom}><PhotoProduit p={v} /></Link>
                  ))}
                </div>
              </div>
            )}

            <div className="fiche-achat">
              <Quantite q={q} set={(n) => setQ(Math.max(1, n))} />
              <button className="btn btn-orange btn-grand" disabled={!achetable} onClick={() => ajouter(p.id, q)}>
                {achetable ? `Ajouter au panier · ${prix(p.prix * q)}` : "Non disponible en ligne"}
              </button>
            </div>
            <ul className="fiche-avantages">
              <li><Epingle s={18} /> Retrait gratuit en boutique — {INFOS.rue}, Saint-Bruno</li>
              <li><Camion s={18} /> Livraison gratuite au Québec dès {LIVRAISON.seuil} $</li>
              <li><Outil s={18} /> Installation et réglage à notre atelier</li>
              <li><Telephone s={18} /> Une question ? <a href={INFOS.telHref}>{INFOS.tel}</a></li>
            </ul>
            {p.source === "Sam Hunting" && (
              <p className="fiche-note"><Coche s={16} /> Fait à la main au Québec — couleurs de paracorde personnalisables sur commande.</p>
            )}
          </div>
        </div>

        {similaires.length > 0 && (
          <section className="section-courte">
            <h2 className="h2-petit">Vous aimerez aussi</h2>
            <div className="grille-produits grille-4">
              {similaires.map((x) => <CarteProduit key={x.id} p={x} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
