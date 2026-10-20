import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth, useCart, useCatalog } from "../lib/store.jsx";
import { INFOS, LIVRAISON } from "../data/site.js";
import { prix, sansAccents } from "../lib/format.js";
import { Compte, Fermer, Fleche, Menu, Recherche, Sac, Telephone } from "./Icons.jsx";
import { PhotoProduit } from "./Produit.jsx";

export default function Entete() {
  const { pathname } = useLocation();
  const accueil = pathname === "/";
  const [defile, setDefile] = useState(false);
  const [mega, setMega] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [recherche, setRecherche] = useState(false);
  const { cats } = useCatalog();
  const { nombre, setOuvert } = useCart();
  const { user, admin, ouvrir } = useAuth();

  useEffect(() => {
    const f = () => setDefile(window.scrollY > 40);
    f();
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);

  useEffect(() => { setMega(false); setMobile(false); setRecherche(false); }, [pathname]);

  useEffect(() => {
    const k = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setRecherche(true); }
      if (e.key === "Escape") { setRecherche(false); setMobile(false); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  const transparent = accueil && !defile && !mega;
  const catsTriees = [...cats].filter((c) => c.n > 0).sort((a, b) => b.n - a.n);

  return (
    <>
      <div className="bandeau">
        <span>Livraison gratuite dès {LIVRAISON.seuil} $ partout au Québec</span>
        <span className="bandeau-sep">·</span>
        <span>Retrait gratuit en boutique à Saint-Bruno</span>
      </div>
      <header className={`entete ${transparent ? "entete-transparent" : ""}`} onMouseLeave={() => setMega(false)}>
        <div className="entete-in">
          <Link to="/" className="logo" aria-label="Arc En Flèche — accueil">
            <img src="/images/logo-clair.png" alt="" />
            <span className="logo-txt">
              <strong>Arc En Flèche</strong>
              <small>Archerie · Chasse · Pêche</small>
            </span>
          </Link>
          <nav className="nav" aria-label="Navigation principale">
            <NavLink to="/boutique" onMouseEnter={() => setMega(true)} onFocus={() => setMega(true)}>Boutique</NavLink>
            <NavLink to="/atelier" onMouseEnter={() => setMega(false)}>Atelier</NavLink>
            <NavLink to="/a-propos" onMouseEnter={() => setMega(false)}>À propos</NavLink>
            <NavLink to="/album" onMouseEnter={() => setMega(false)}>Album</NavLink>
            <NavLink to="/contact" onMouseEnter={() => setMega(false)}>Contact</NavLink>
          </nav>
          <div className="entete-actions">
            <a className="entete-tel" href={INFOS.telHref}><Telephone s={16} /> {INFOS.tel}</a>
            <button className="icone-btn" onClick={() => setRecherche(true)} aria-label="Rechercher un produit"><Recherche /></button>
            {user ? (
              <Link className="icone-btn" to={admin ? "/admin" : "/compte"} aria-label={admin ? "Administration" : "Mon compte"} title={admin ? "Administration" : "Mon compte"}>
                <Compte />{admin && <span className="point-admin" />}
              </Link>
            ) : (
              <button className="icone-btn" onClick={() => ouvrir("login")} aria-label="Connexion"><Compte /></button>
            )}
            <button className="icone-btn panier-btn" onClick={() => setOuvert(true)} aria-label={`Panier, ${nombre} article(s)`}>
              <Sac />{nombre > 0 && <span className="compteur">{nombre}</span>}
            </button>
            <button className="icone-btn burger" onClick={() => setMobile(true)} aria-label="Ouvrir le menu"><Menu /></button>
          </div>
        </div>

        <div className={`mega ${mega ? "mega-ouvert" : ""}`} onMouseEnter={() => setMega(true)}>
          <div className="mega-in">
            <div>
              <div className="sur-titre">Départements</div>
              <ul className="mega-liste">
                {catsTriees.map((c) => (
                  <li key={c.id}>
                    <Link to={`/boutique?cat=${c.id}`}>
                      <span>{c.nom}</span><em>{c.n}</em>
                    </Link>
                  </li>
                ))}
                <li><Link to="/boutique" className="mega-tout">Tout l'inventaire <Fleche s={16} /></Link></li>
              </ul>
            </div>
            <Link to="/boutique?cat=5" className="mega-tuile" style={{ backgroundImage: "url(/images/hero-etang.webp)" }}>
              <span className="sur-titre">Saison de pêche</span>
              <strong>Moulinets, cannes et leurres</strong>
            </Link>
            <Link to="/boutique?cat=12" className="mega-tuile" style={{ backgroundImage: "url(/images/orignal.webp)" }}>
              <span className="sur-titre">Orignal &amp; chevreuil</span>
              <strong>Salines, attractifs et appeaux</strong>
            </Link>
          </div>
        </div>
      </header>

      {mobile && <MenuMobile fermer={() => setMobile(false)} cats={catsTriees} />}
      {recherche && <Recherches fermer={() => setRecherche(false)} />}
    </>
  );
}

function MenuMobile({ fermer, cats }) {
  const { user, admin, ouvrir, deconnexion } = useAuth();
  return (
    <div className="tiroir-fond" onClick={fermer}>
      <aside className="menu-mobile" onClick={(e) => e.stopPropagation()} aria-label="Menu">
        <button className="icone-btn fermer" onClick={fermer} aria-label="Fermer le menu"><Fermer /></button>
        <img src="/images/logo-clair.png" alt="Arc En Flèche" className="menu-mobile-logo" />
        <nav>
          <Link to="/">Accueil</Link>
          <Link to="/boutique">Boutique</Link>
          <div className="menu-mobile-cats">
            {cats.map((c) => <Link key={c.id} to={`/boutique?cat=${c.id}`}>{c.nom} <em>{c.n}</em></Link>)}
          </div>
          <Link to="/atelier">Atelier</Link>
          <Link to="/a-propos">À propos</Link>
          <Link to="/album">Album photo</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/panier">Panier</Link>
          {user ? (
            <>
              <Link to="/compte">Mon compte</Link>
              {admin && <Link to="/admin">Administration</Link>}
              <button onClick={() => { deconnexion(); fermer(); }}>Déconnexion</button>
            </>
          ) : (
            <button onClick={() => { fermer(); ouvrir("login"); }}>Connexion</button>
          )}
        </nav>
        <a className="btn btn-orange" href={INFOS.telHref}><Telephone s={16} /> {INFOS.tel}</a>
      </aside>
    </div>
  );
}

function Recherches({ fermer }) {
  const { produits } = useCatalog();
  const [q, setQ] = useState("");
  const nav = useNavigate();
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = ""; }; }, []);

  const res = useMemo(() => {
    const t = sansAccents(q).trim().split(/\s+/).filter(Boolean);
    if (!t.length) return [];
    return produits.filter((p) => {
      const s = sansAccents(`${p.nom} ${p.desc} ${p.marque || ""}`);
      return t.every((m) => s.includes(m));
    }).slice(0, 8);
  }, [q, produits]);

  const soumettre = (e) => { e.preventDefault(); if (q.trim()) nav(`/boutique?q=${encodeURIComponent(q.trim())}`); };

  return (
    <div className="recherche-fond" onClick={fermer}>
      <div className="recherche" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Recherche">
        <form onSubmit={soumettre} className="recherche-champ">
          <Recherche s={22} />
          <input ref={ref} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Moulinet Penn, appeau orignal, piles AA…" aria-label="Rechercher" />
          <button type="button" className="icone-btn" onClick={fermer} aria-label="Fermer"><Fermer /></button>
        </form>
        {q && (
          <div className="recherche-res">
            {res.length === 0 && <p className="vide">Aucun résultat pour « {q} ». Appelez-nous : on l'a peut-être en arrière-boutique.</p>}
            {res.map((p) => (
              <Link key={p.id} to={`/produit/${p.id}`} className="recherche-ligne">
                <span className="recherche-img"><PhotoProduit p={p} /></span>
                <span className="recherche-txt"><strong>{p.nom}</strong>{p.desc && <small>{p.desc}</small>}</span>
                <span className="recherche-prix">{p.prix > 0 ? prix(p.prix) : ""}</span>
              </Link>
            ))}
            {res.length > 0 && <button className="recherche-tout" onClick={soumettre}>Voir tous les résultats <Fleche s={16} /></button>}
          </div>
        )}
        {!q && (
          <div className="recherche-suggest">
            <span className="sur-titre">Populaire</span>
            {["Moulinet", "Canne à pêche", "Appeau", "Bloc de sel", "Thermacell", "Jig a jo", "Carquois"].map((s) => (
              <button key={s} onClick={() => setQ(s)}>{s}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
