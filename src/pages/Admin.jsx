import { useMemo, useState } from "react";
import { useAuth, useCatalog } from "../lib/store.jsx";
import { supabase } from "../lib/supabase.js";
import { prix, sansAccents } from "../lib/format.js";
import PHOTOS from "../data/productImages.js";
import { PhotoProduit } from "../components/Produit.jsx";
import { Fermer, Recherche } from "../components/Icons.jsx";

const VIDE = { nom: "", prix: "", category_id: "", subcategory_id: "", description: "", tag: "", source: "Arc En Flèche", stock: true, images: "" };

export default function Admin() {
  const { user, admin, ouvrir } = useAuth();
  const cat = useCatalog();
  const [onglet, setOnglet] = useState("produits");

  if (!user || !admin) {
    return (
      <div className="conteneur section vide-boite">
        <h1>Administration</h1>
        <p>{user ? "Ce compte n'a pas accès à l'administration." : "Connectez-vous avec le compte administrateur."}</p>
        {!user && <button className="btn btn-orange" onClick={() => ouvrir("login")}>Se connecter</button>}
      </div>
    );
  }

  return (
    <div className="conteneur section page-admin">
      <h1 className="h1-page">Administration</h1>
      <p className="txt">{cat.produits.length} produits · {cat.cats.length} catégories · {cat.subs.length} sous-catégories</p>
      <div className="onglets onglets-ligne">
        {[["produits", "Produits"], ["categories", "Catégories"], ["sous", "Sous-catégories"]].map(([k, l]) => (
          <button key={k} className={onglet === k ? "actif" : ""} onClick={() => setOnglet(k)}>{l}</button>
        ))}
      </div>
      {onglet === "produits" && <Produits />}
      {onglet === "categories" && <Categories />}
      {onglet === "sous" && <SousCategories />}
    </div>
  );
}

function Produits() {
  const { produits, cats, subs, recharger } = useCatalog();
  const [q, setQ] = useState("");
  const [fc, setFc] = useState("");
  const [limite, setLimite] = useState(60);
  const [edit, setEdit] = useState(null); // null | "nouveau" | id
  const [f, setF] = useState(VIDE);
  const [msg, setMsg] = useState("");

  const liste = useMemo(() => {
    const mots = sansAccents(q).split(/\s+/).filter(Boolean);
    return produits.filter((p) => (!fc || p.cat === Number(fc)) && mots.every((m) => sansAccents(`${p.nom} ${p.desc} ${p.id}`).includes(m)));
  }, [produits, q, fc]);

  const ouvrirForm = (p) => {
    setMsg("");
    if (!p) { setEdit("nouveau"); setF(VIDE); return; }
    const b = p.brut;
    setEdit(p.id);
    setF({
      nom: b.nom, prix: String(b.prix), category_id: String(b.category_id), subcategory_id: String(b.subcategory_id || ""),
      description: b.description || "", tag: b.tag || "", source: b.source || "", stock: b.stock !== false, images: (b.images || []).join("\n"),
    });
  };

  const sauver = async (e) => {
    e.preventDefault();
    if (!f.nom || !f.prix || !f.category_id) { setMsg("Nom, prix et catégorie sont obligatoires."); return; }
    const args = {
      p_subcategory_id: f.subcategory_id ? parseInt(f.subcategory_id) : null,
      p_category_id: parseInt(f.category_id), p_nom: f.nom, p_description: f.description || "",
      p_prix: parseFloat(String(f.prix).replace(",", ".")), p_source: f.source || "Arc En Flèche", p_tag: f.tag || null,
      p_stock: f.stock, p_images: f.images.split("\n").map((s) => s.trim()).filter(Boolean),
    };
    const { error } = edit === "nouveau"
      ? await supabase.rpc("admin_create_product", args)
      : await supabase.rpc("admin_update_product", { p_id: edit, ...args });
    if (error) { setMsg(error.message); return; }
    setEdit(null);
    await recharger();
  };

  const supprimer = async (p) => {
    if (!window.confirm(`Supprimer « ${p.nom} » ? Cette action est définitive.`)) return;
    const { error } = await supabase.rpc("admin_delete_product", { p_id: p.id });
    if (error) alert(error.message); else recharger();
  };

  const champ = (k) => ({ value: f[k], onChange: (e) => setF({ ...f, [k]: e.target.value }) });

  return (
    <>
      <div className="admin-outils">
        <div className="boutique-recherche boutique-recherche-clair">
          <Recherche s={18} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher un produit (nom, couleur, #id)…" />
        </div>
        <select value={fc} onChange={(e) => setFc(e.target.value)}>
          <option value="">Toutes les catégories</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.nom} ({c.n})</option>)}
        </select>
        <button className="btn btn-orange" onClick={() => ouvrirForm(null)}>+ Ajouter un produit</button>
      </div>
      <p className="petit">{liste.length} produit(s). La photo « auto » vient de la bibliothèque du site ; ajoutez une URL d'image dans la fiche pour la remplacer.</p>
      <ul className="admin-liste">
        {liste.slice(0, limite).map((p) => (
          <li key={p.id}>
            <span className="admin-img"><PhotoProduit p={p} />{!p.brut.images?.length && PHOTOS[p.id] && <em>auto</em>}</span>
            <span className="admin-info">
              <strong>{p.nom}</strong>
              <small>#{p.id} · {cats.find((c) => c.id === p.cat)?.nom}{p.desc ? " · " + p.desc : ""} · <b className={p.stock ? "ok" : ""}>{p.stock ? "En stock" : "Rupture"}</b></small>
            </span>
            <span className="admin-prix">{prix(p.prix)}</span>
            <button className="btn btn-contour btn-petit" onClick={() => ouvrirForm(p)}>Modifier</button>
            <button className="btn btn-danger btn-petit" onClick={() => supprimer(p)}>Supprimer</button>
          </li>
        ))}
      </ul>
      {liste.length > limite && <div className="centre"><button className="btn btn-fonce" onClick={() => setLimite(limite + 100)}>Afficher plus</button></div>}

      {edit != null && (
        <div className="modal-fond" onClick={() => setEdit(null)}>
          <form className="modal modal-large form" onClick={(e) => e.stopPropagation()} onSubmit={sauver}>
            <button type="button" className="icone-btn fermer" onClick={() => setEdit(null)} aria-label="Fermer"><Fermer /></button>
            <h2 className="modal-titre">{edit === "nouveau" ? "Ajouter un produit" : `Modifier le produit #${edit}`}</h2>
            <div className="form-2">
              <label>Nom<input {...champ("nom")} /></label>
              <label>Prix ($)<input inputMode="decimal" {...champ("prix")} /></label>
              <label>Catégorie
                <select value={f.category_id} onChange={(e) => setF({ ...f, category_id: e.target.value, subcategory_id: "" })}>
                  <option value="">—</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </label>
              <label>Sous-catégorie
                <select {...champ("subcategory_id")}>
                  <option value="">—</option>
                  {subs.filter((s) => !f.category_id || s.category_id === Number(f.category_id)).map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
                </select>
              </label>
              <label>Étiquette (ex. Nouveau)<input {...champ("tag")} /></label>
              <label>Source<input {...champ("source")} /></label>
            </div>
            <label>Description / couleur<textarea rows={2} {...champ("description")} /></label>
            <label>URLs d'images (une par ligne — laisser vide pour la photo auto)<textarea rows={2} {...champ("images")} /></label>
            <label className="interrupteur"><input type="checkbox" checked={f.stock} onChange={(e) => setF({ ...f, stock: e.target.checked })} /><span /> En stock</label>
            {msg && <div className="alerte">{msg}</div>}
            <div className="actions-ligne">
              <button className="btn btn-orange">{edit === "nouveau" ? "Ajouter" : "Enregistrer"}</button>
              <button type="button" className="btn btn-contour" onClick={() => setEdit(null)}>Annuler</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function Categories() {
  const { cats, recharger } = useCatalog();
  const [nom, setNom] = useState("");
  const ajouter = async (e) => {
    e.preventDefault();
    if (!nom) return;
    const { error } = await supabase.rpc("admin_create_category", { p_nom: nom, p_description: "", p_sort_order: 0 });
    if (error) alert(error.message); else { setNom(""); recharger(); }
  };
  const supprimer = async (c) => {
    if (!window.confirm(`Supprimer la catégorie « ${c.nom} » et ses ${c.n} produits ?`)) return;
    const { error } = await supabase.rpc("admin_delete_category", { p_id: c.id });
    if (error) alert(error.message); else recharger();
  };
  return (
    <>
      <form className="admin-outils" onSubmit={ajouter}>
        <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nouvelle catégorie" />
        <button className="btn btn-orange">Ajouter</button>
      </form>
      <ul className="admin-liste">
        {cats.map((c) => (
          <li key={c.id}>
            <span className="admin-info"><strong>{c.nom}</strong><small>{c.n} produits · {c.subs.length} sous-catégories</small></span>
            <button className="btn btn-danger btn-petit" onClick={() => supprimer(c)}>Supprimer</button>
          </li>
        ))}
      </ul>
    </>
  );
}

function SousCategories() {
  const { cats, subs, recharger } = useCatalog();
  const [nom, setNom] = useState("");
  const [c, setC] = useState("");
  const ajouter = async (e) => {
    e.preventDefault();
    if (!nom || !c) return;
    const { error } = await supabase.rpc("admin_create_subcategory", { p_category_id: parseInt(c), p_nom: nom, p_sort_order: 0 });
    if (error) alert(error.message); else { setNom(""); recharger(); }
  };
  const supprimer = async (s) => {
    if (!window.confirm(`Supprimer la sous-catégorie « ${s.nom} » ?`)) return;
    const { error } = await supabase.rpc("admin_delete_subcategory", { p_id: s.id });
    if (error) alert(error.message); else recharger();
  };
  return (
    <>
      <form className="admin-outils" onSubmit={ajouter}>
        <select value={c} onChange={(e) => setC(e.target.value)}>
          <option value="">— Catégorie —</option>
          {cats.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}
        </select>
        <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nouvelle sous-catégorie" />
        <button className="btn btn-orange">Ajouter</button>
      </form>
      <ul className="admin-liste">
        {subs.map((s) => (
          <li key={s.id}>
            <span className="admin-info"><strong>{s.nom}</strong><small>{cats.find((x) => x.id === s.category_id)?.nom}</small></span>
            <button className="btn btn-danger btn-petit" onClick={() => supprimer(s)}>Supprimer</button>
          </li>
        ))}
      </ul>
    </>
  );
}
