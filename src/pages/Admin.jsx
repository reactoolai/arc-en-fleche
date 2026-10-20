import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth, useCatalog } from "../lib/store.jsx";
import { supabase } from "../lib/supabase.js";
import { prix, sansAccents } from "../lib/format.js";
import PHOTOS from "../data/productImages.js";
import { PhotoProduit } from "../components/Produit.jsx";
import Scanner from "../components/Scanner.jsx";
import { Fermer, Recherche } from "../components/Icons.jsx";

const ONGLETS = [["produits", "Produits"], ["inventaire", "Inventaire"], ["fournisseurs", "Fournisseurs"], ["categories", "Catégories"], ["sous", "Sous-catégories"]];

export default function Admin() {
  const { user, admin, ouvrir } = useAuth();
  const cat = useCatalog();
  const [onglet, setOnglet] = useState("produits");
  const [fournisseurs, setFournisseurs] = useState([]);

  const chargerFournisseurs = useCallback(async () => {
    const { data } = await supabase.from("suppliers").select("*").order("created_at", { ascending: false });
    setFournisseurs(data || []);
  }, []);
  useEffect(() => { if (admin) chargerFournisseurs(); }, [admin, chargerFournisseurs]);

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
      <p className="txt">{cat.produits.length} produits · {fournisseurs.length} fournisseurs · {cat.cats.length} catégories</p>
      <div className="onglets onglets-ligne onglets-defile">
        {ONGLETS.map(([k, l]) => <button key={k} className={onglet === k ? "actif" : ""} onClick={() => setOnglet(k)}>{l}</button>)}
      </div>
      {onglet === "produits" && <Produits fournisseurs={fournisseurs} />}
      {onglet === "inventaire" && <Inventaire fournisseurs={fournisseurs} />}
      {onglet === "fournisseurs" && <Fournisseurs liste={fournisseurs} recharger={chargerFournisseurs} />}
      {onglet === "categories" && <Categories />}
      {onglet === "sous" && <SousCategories />}
    </div>
  );
}

/* ---------- Outils communs ---------- */

// Vérifie si un SKU existe déjà (produits ou inventaire)
async function verifierSku(sku, idEdite) {
  const val = (sku || "").trim();
  if (!val) return "";
  const { data } = await supabase.rpc("check_sku_exists", { p_sku: val });
  if (data && data.exists && data.item_id !== idEdite) {
    return `Ce SKU existe déjà dans ${data.in_table === "products" ? "produits" : "inventaire"} : « ${data.item_nom} »`;
  }
  return "";
}

function useChampSku(idEdite) {
  const [alerte, setAlerte] = useState("");
  const verifier = useCallback((v) => { verifierSku(v, idEdite).then(setAlerte); }, [idEdite]);
  return [alerte, verifier, setAlerte];
}

function ChampSku({ valeur, onChange, alerte, onScan }) {
  return (
    <label className="champ-large">Code / SKU (code à barres)
      <span className="form-ligne">
        <input value={valeur} onChange={(e) => onChange(e.target.value)} placeholder="Scannez ou tapez le code" inputMode="numeric" />
        <button type="button" className="btn btn-contour" onClick={onScan}>📷 Scanner</button>
      </span>
      {alerte && <span className="alerte">{alerte}</span>}
    </label>
  );
}

const Liste = ({ children }) => <ul className="admin-liste">{children}</ul>;

/* ---------- Produits (boutique) ---------- */

const PRODUIT_VIDE = { nom: "", prix: "", category_id: "", subcategory_id: "", description: "", tag: "", source: "Arc En Flèche", stock: true, images: "", sku: "", prix_achat: "", qty: "", supplier_id: "", emplacement: "" };

function Produits({ fournisseurs }) {
  const { produits, cats, subs, recharger } = useCatalog();
  const [q, setQ] = useState("");
  const [fc, setFc] = useState("");
  const [limite, setLimite] = useState(60);
  const [edit, setEdit] = useState(null); // null | "nouveau" | id
  const [f, setF] = useState(PRODUIT_VIDE);
  const [msg, setMsg] = useState("");
  const [scan, setScan] = useState(false);
  const [alerteSku, verifier, setAlerteSku] = useChampSku(edit === "nouveau" ? null : edit);

  const liste = useMemo(() => {
    const mots = sansAccents(q).split(/\s+/).filter(Boolean);
    return produits.filter((p) => (!fc || p.cat === Number(fc)) && mots.every((m) => sansAccents(`${p.nom} ${p.desc} ${p.id} ${p.brut.sku || ""}`).includes(m)));
  }, [produits, q, fc]);

  const ouvrirForm = (p) => {
    setMsg(""); setAlerteSku("");
    if (!p) { setEdit("nouveau"); setF(PRODUIT_VIDE); return; }
    const b = p.brut;
    setEdit(p.id);
    setF({
      nom: b.nom, prix: String(b.prix), category_id: String(b.category_id), subcategory_id: String(b.subcategory_id || ""),
      description: b.description || "", tag: b.tag || "", source: b.source || "", stock: b.stock !== false, images: (b.images || []).join("\n"),
      sku: b.sku || "", prix_achat: String(b.prix_achat || ""), qty: String(b.qty || ""), supplier_id: String(b.supplier_id || ""), emplacement: b.emplacement || "",
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
      p_sku: f.sku || null, p_prix_achat: parseFloat(String(f.prix_achat).replace(",", ".")) || 0, p_qty: parseInt(f.qty) || 0,
      p_supplier_id: f.supplier_id ? parseInt(f.supplier_id) : null, p_emplacement: f.emplacement || null,
    };
    const { error } = edit === "nouveau"
      ? await supabase.rpc("admin_create_product", args)
      : await supabase.rpc("admin_update_product", { p_id: edit, ...args });
    if (error) { setMsg(error.message.includes("duplicate") ? "Ce SKU est déjà utilisé." : error.message); return; }
    setEdit(null);
    await recharger();
  };

  const supprimer = async (p) => {
    if (!window.confirm(`Supprimer « ${p.nom} » ? Cette action est définitive.`)) return;
    const { error } = await supabase.rpc("admin_delete_product", { p_id: p.id });
    if (error) alert(error.message); else recharger();
  };

  const champ = (k) => ({ value: f[k], onChange: (e) => setF({ ...f, [k]: e.target.value }) });
  const setSku = (v) => { setF((x) => ({ ...x, sku: v })); verifier(v); };
  const apercus = f.images.split("\n").map((u) => u.trim()).filter(Boolean);

  return (
    <>
      <div className="admin-outils">
        <div className="boutique-recherche boutique-recherche-clair">
          <Recherche s={18} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher (nom, couleur, SKU, #id)…" />
        </div>
        <select value={fc} onChange={(e) => setFc(e.target.value)}>
          <option value="">Toutes les catégories</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.nom} ({c.n})</option>)}
        </select>
        <button className="btn btn-orange" onClick={() => ouvrirForm(null)}>+ Ajouter un produit</button>
      </div>
      <p className="petit">{liste.length} produit(s). La photo « auto » vient de la bibliothèque du site ; collez une URL d'image dans la fiche pour la remplacer.</p>
      <Liste>
        {liste.slice(0, limite).map((p) => (
          <li key={p.id}>
            <span className="admin-img"><PhotoProduit p={p} />{!p.brut.images?.length && PHOTOS[p.id] && <em>auto</em>}</span>
            <span className="admin-info">
              <strong>{p.nom}</strong>
              <small>#{p.id}{p.brut.sku ? " · SKU " + p.brut.sku : ""} · {cats.find((c) => c.id === p.cat)?.nom}{p.desc ? " · " + p.desc : ""} · Qté {p.brut.qty || 0} · <b className={p.stock ? "ok" : ""}>{p.stock ? "En stock" : "Rupture"}</b></small>
            </span>
            <span className="admin-prix">{prix(p.prix)}</span>
            <button className="btn btn-contour btn-petit" onClick={() => ouvrirForm(p)}>Modifier</button>
            <button className="btn btn-danger btn-petit" onClick={() => supprimer(p)}>Supprimer</button>
          </li>
        ))}
      </Liste>
      {liste.length > limite && <div className="centre"><button className="btn btn-fonce" onClick={() => setLimite(limite + 100)}>Afficher plus</button></div>}

      {edit != null && (
        <div className="modal-fond" onClick={() => setEdit(null)}>
          <form className="modal modal-large form" onClick={(e) => e.stopPropagation()} onSubmit={sauver}>
            <button type="button" className="icone-btn fermer" onClick={() => setEdit(null)} aria-label="Fermer"><Fermer /></button>
            <h2 className="modal-titre">{edit === "nouveau" ? "Ajouter un produit" : `Modifier le produit #${edit}`}</h2>
            <div className="form-2">
              <label>Nom du produit<input {...champ("nom")} /></label>
              <label>Prix vente ($)<input inputMode="decimal" placeholder="Ex : 49.99" {...champ("prix")} /></label>
              <ChampSku valeur={f.sku} onChange={setSku} alerte={alerteSku} onScan={() => setScan(true)} />
              <label>Catégorie
                <select value={f.category_id} onChange={(e) => setF({ ...f, category_id: e.target.value, subcategory_id: "" })}>
                  <option value="">— Choisir —</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </label>
              <label>Sous-catégorie
                <select {...champ("subcategory_id")}>
                  <option value="">— Aucune —</option>
                  {subs.filter((s) => !f.category_id || s.category_id === Number(f.category_id)).map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
                </select>
              </label>
              <label>Fournisseur
                <select {...champ("supplier_id")}>
                  <option value="">— Aucun —</option>
                  {fournisseurs.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
                </select>
              </label>
              <label>Prix achat unitaire ($)<input inputMode="decimal" placeholder="0.00" {...champ("prix_achat")} /></label>
              <label>Quantité en stock<input inputMode="numeric" placeholder="0" {...champ("qty")} /></label>
              <label>Emplacement<input placeholder="Allée A, étagère 3" {...champ("emplacement")} /></label>
              <label>Étiquette (facultatif)<input placeholder="Ex : Meilleur vendeur" {...champ("tag")} /></label>
              <label>Source<input placeholder="Sam Hunting ou Arc En Flèche" {...champ("source")} /></label>
            </div>
            <label>Description / couleur<textarea rows={2} placeholder="Décrivez le produit…" {...champ("description")} /></label>
            <label>Photos du produit (URL, une par ligne — laisser vide pour la photo auto)<textarea rows={2} {...champ("images")} /></label>
            {(apercus.length > 0 || (edit !== "nouveau" && PHOTOS[edit])) && (
              <div className="apercus">
                {apercus.length ? apercus.map((u) => <img key={u} src={u} alt="" />) : <span className="apercu-auto"><img src={PHOTOS[edit]} alt="" /><em>photo auto</em></span>}
              </div>
            )}
            <label className="interrupteur"><input type="checkbox" checked={f.stock} onChange={(e) => setF({ ...f, stock: e.target.checked })} /><span /> En stock (affiché en boutique)</label>
            {msg && <div className="alerte">{msg}</div>}
            <div className="actions-ligne actions-gauche">
              <button className="btn btn-orange">{edit === "nouveau" ? "Ajouter" : "Enregistrer"}</button>
              <button type="button" className="btn btn-contour" onClick={() => setEdit(null)}>Annuler</button>
            </div>
          </form>
        </div>
      )}
      {scan && <Scanner onCode={setSku} fermer={() => setScan(false)} />}
    </>
  );
}

/* ---------- Inventaire (articles internes) ---------- */

const ARTICLE_VIDE = { nom: "", sku: "", category_id: "", subcategory_id: "", supplier_id: "", qty: "", emplacement: "", prix_achat: "", prix_vente: "", images: [], description: "", source: "Arc En Flèche", tag: "", stock: true };

function Inventaire({ fournisseurs }) {
  const { cats, subs } = useCatalog();
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState(null);
  const [f, setF] = useState(ARTICLE_VIDE);
  const [msg, setMsg] = useState("");
  const [scan, setScan] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [alerteSku, verifier, setAlerteSku] = useChampSku(edit === "nouveau" ? null : edit);

  const charger = useCallback(async () => {
    const { data } = await supabase.from("inventory_items").select("*").order("created_at", { ascending: false });
    setItems(data || []);
  }, []);
  useEffect(() => { charger(); }, [charger]);

  const liste = useMemo(() => {
    const mots = sansAccents(q).split(/\s+/).filter(Boolean);
    return items.filter((i) => mots.every((m) => sansAccents(`${i.nom} ${i.sku || ""} ${i.emplacement || ""}`).includes(m)));
  }, [items, q]);

  const ouvrirForm = (i) => {
    setMsg(""); setAlerteSku("");
    if (!i) { setEdit("nouveau"); setF(ARTICLE_VIDE); return; }
    setEdit(i.id);
    setF({
      nom: i.nom, sku: i.sku || "", category_id: String(i.category_id || ""), subcategory_id: String(i.subcategory_id || ""),
      supplier_id: String(i.supplier_id || ""), qty: String(i.qty ?? ""), emplacement: i.emplacement || "",
      prix_achat: String(i.prix_achat ?? ""), prix_vente: String(i.prix_vente ?? ""), images: i.images || [],
      description: i.description || "", source: i.source || "", tag: i.tag || "", stock: i.stock !== false,
    });
  };

  const televerser = async (fichiers) => {
    setEnvoi(true);
    const urls = [...f.images];
    for (const file of fichiers) {
      const ext = file.name.split(".").pop();
      const chemin = `inv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("inventory-images").upload(chemin, file, { contentType: file.type });
      if (!error) {
        const { data } = supabase.storage.from("inventory-images").getPublicUrl(chemin);
        if (data?.publicUrl) urls.push(data.publicUrl);
      }
    }
    setF((x) => ({ ...x, images: urls }));
    setEnvoi(false);
  };

  const sauver = async (e) => {
    e.preventDefault();
    if (!f.nom) { setMsg("Le nom est obligatoire."); return; }
    const args = {
      p_nom: f.nom, p_sku: f.sku || null, p_category_id: f.category_id ? parseInt(f.category_id) : null,
      p_subcategory_id: f.subcategory_id ? parseInt(f.subcategory_id) : null,
      p_supplier_id: f.supplier_id ? parseInt(f.supplier_id) : null,
      p_qty: parseInt(f.qty) || 0, p_emplacement: f.emplacement || null,
      p_prix_achat: parseFloat(String(f.prix_achat).replace(",", ".")) || 0, p_prix_vente: parseFloat(String(f.prix_vente).replace(",", ".")) || 0,
      p_images: f.images || [], p_description: f.description || null, p_source: f.source || "Arc En Flèche",
      p_tag: f.tag || null, p_stock: f.stock,
    };
    const { error } = edit === "nouveau"
      ? await supabase.rpc("admin_create_inventory_item", args)
      : await supabase.rpc("admin_update_inventory_item", { p_id: edit, ...args });
    if (error) { setMsg(error.message.includes("duplicate") ? "Ce SKU est déjà utilisé." : error.message); return; }
    setEdit(null);
    charger();
  };

  const supprimer = async (i) => {
    if (!window.confirm(`Supprimer « ${i.nom} » de l'inventaire ?`)) return;
    const { error } = await supabase.rpc("admin_delete_inventory_item", { p_id: i.id });
    if (error) alert(error.message); else charger();
  };

  const champ = (k) => ({ value: f[k], onChange: (e) => setF({ ...f, [k]: e.target.value }) });
  const setSku = (v) => { setF((x) => ({ ...x, sku: v })); verifier(v); };
  const qte = parseInt(f.qty) || 0;
  const totalAchat = items.reduce((t, i) => t + (Number(i.prix_achat) || 0) * (i.qty || 0), 0);

  return (
    <>
      <div className="admin-outils">
        <div className="boutique-recherche boutique-recherche-clair">
          <Recherche s={18} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher (nom, SKU, emplacement)…" />
        </div>
        <button className="btn btn-orange" onClick={() => ouvrirForm(null)}>+ Ajouter un article</button>
      </div>
      <p className="petit">{items.length} article(s) · valeur d'achat totale {prix(totalAchat)}</p>
      {items.length === 0 && <div className="vide-boite"><p>Aucun article d'inventaire pour le moment.</p></div>}
      <Liste>
        {liste.map((i) => (
          <li key={i.id}>
            <span className="admin-img">{i.images?.[0] ? <img src={i.images[0]} alt="" /> : <span className="photo-vide" />}</span>
            <span className="admin-info">
              <strong>{i.nom}</strong>
              <small>SKU {i.sku || "—"} · {cats.find((c) => c.id === i.category_id)?.nom || "—"} · {fournisseurs.find((s) => s.id === i.supplier_id)?.nom || "—"} · {i.emplacement || "—"} · Qté {i.qty} · achat {prix(i.prix_achat)}</small>
            </span>
            <span className="admin-prix">{prix(i.prix_vente)}</span>
            <button className="btn btn-contour btn-petit" onClick={() => ouvrirForm(i)}>Modifier</button>
            <button className="btn btn-danger btn-petit" onClick={() => supprimer(i)}>Supprimer</button>
          </li>
        ))}
      </Liste>

      {edit != null && (
        <div className="modal-fond" onClick={() => setEdit(null)}>
          <form className="modal modal-large form" onClick={(e) => e.stopPropagation()} onSubmit={sauver}>
            <button type="button" className="icone-btn fermer" onClick={() => setEdit(null)} aria-label="Fermer"><Fermer /></button>
            <h2 className="modal-titre">{edit === "nouveau" ? "Ajouter un article" : "Modifier l'article"}</h2>
            <div className="form-2">
              <label className="champ-large">Nom / description *<input placeholder="Ex : Arc compound Bear Archery" {...champ("nom")} /></label>
              <ChampSku valeur={f.sku} onChange={setSku} alerte={alerteSku} onScan={() => setScan(true)} />
              <label>Catégorie
                <select value={f.category_id} onChange={(e) => setF({ ...f, category_id: e.target.value, subcategory_id: "" })}>
                  <option value="">— Choisir —</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </label>
              <label>Sous-catégorie
                <select {...champ("subcategory_id")}>
                  <option value="">— Aucune —</option>
                  {subs.filter((s) => !f.category_id || s.category_id === Number(f.category_id)).map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
                </select>
              </label>
              <label>Fournisseur
                <select {...champ("supplier_id")}>
                  <option value="">— Aucun —</option>
                  {fournisseurs.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
                </select>
              </label>
              <label>Quantité<input inputMode="numeric" placeholder="0" {...champ("qty")} /></label>
              <label>Emplacement<input placeholder="Allée A, étagère 3" {...champ("emplacement")} /></label>
              <label>Prix achat unitaire ($)<input inputMode="decimal" placeholder="0.00" {...champ("prix_achat")} /></label>
              <label>Prix vente unitaire ($)<input inputMode="decimal" placeholder="0.00" {...champ("prix_vente")} /></label>
              <label>Valeur achat totale (auto)<input readOnly value={prix((parseFloat(f.prix_achat) || 0) * qte)} /></label>
              <label>Valeur vente totale (auto)<input readOnly value={prix((parseFloat(f.prix_vente) || 0) * qte)} /></label>
              <label>Étiquette<input {...champ("tag")} /></label>
              <label>Source<input {...champ("source")} /></label>
            </div>
            <label>Description<textarea rows={2} placeholder="Décrivez l'article…" {...champ("description")} /></label>
            <label>Photos de l'article (une ou plusieurs)
              <input type="file" accept="image/*" multiple onChange={(e) => televerser(Array.from(e.target.files || []))} />
            </label>
            {envoi && <p className="petit">Téléversement en cours…</p>}
            {f.images.length > 0 && (
              <div className="apercus">
                {f.images.map((u, i) => (
                  <span key={u} className="apercu-auto">
                    <img src={u} alt="" />
                    <button type="button" onClick={() => setF((x) => ({ ...x, images: x.images.filter((_, j) => j !== i) }))} aria-label="Retirer la photo">×</button>
                  </span>
                ))}
              </div>
            )}
            <label className="interrupteur"><input type="checkbox" checked={f.stock} onChange={(e) => setF({ ...f, stock: e.target.checked })} /><span /> Stock affiché en boutique</label>
            {msg && <div className="alerte">{msg}</div>}
            <div className="actions-ligne actions-gauche">
              <button className="btn btn-orange" disabled={envoi}>{edit === "nouveau" ? "Ajouter" : "Enregistrer"}</button>
              <button type="button" className="btn btn-contour" onClick={() => setEdit(null)}>Annuler</button>
            </div>
          </form>
        </div>
      )}
      {scan && <Scanner onCode={setSku} fermer={() => setScan(false)} />}
    </>
  );
}

/* ---------- Fournisseurs ---------- */

const FOURNISSEUR_VIDE = { nom: "", adresse: "", ville: "", province: "", code_postal: "", telephone: "", courriel: "", contact_personne: "", notes: "" };

function Fournisseurs({ liste, recharger }) {
  const [edit, setEdit] = useState(null);
  const [f, setF] = useState(FOURNISSEUR_VIDE);
  const [msg, setMsg] = useState("");

  const ouvrirForm = (s) => {
    setMsg("");
    if (!s) { setEdit("nouveau"); setF(FOURNISSEUR_VIDE); return; }
    setEdit(s.id);
    setF(Object.fromEntries(Object.keys(FOURNISSEUR_VIDE).map((k) => [k, s[k] || ""])));
  };

  const sauver = async (e) => {
    e.preventDefault();
    if (!f.nom) { setMsg("Le nom est obligatoire."); return; }
    const args = {
      p_nom: f.nom, p_adresse: f.adresse || null, p_ville: f.ville || null, p_province: f.province || null,
      p_code_postal: f.code_postal || null, p_telephone: f.telephone || null, p_courriel: f.courriel || null,
      p_contact_personne: f.contact_personne || null, p_notes: f.notes || null,
    };
    const { error } = edit === "nouveau"
      ? await supabase.rpc("admin_create_supplier", args)
      : await supabase.rpc("admin_update_supplier", { p_id: edit, ...args });
    if (error) { setMsg(error.message); return; }
    setEdit(null);
    recharger();
  };

  const supprimer = async (s) => {
    if (!window.confirm(`Supprimer le fournisseur « ${s.nom} » ?`)) return;
    const { error } = await supabase.rpc("admin_delete_supplier", { p_id: s.id });
    if (error) alert(error.message); else recharger();
  };

  const champ = (k) => ({ value: f[k], onChange: (e) => setF({ ...f, [k]: e.target.value }) });

  return (
    <>
      <div className="admin-outils"><button className="btn btn-orange" onClick={() => ouvrirForm(null)}>+ Ajouter un fournisseur</button></div>
      {liste.length === 0 && <div className="vide-boite"><p>Aucun fournisseur pour le moment.</p></div>}
      <Liste>
        {liste.map((s) => (
          <li key={s.id}>
            <span className="admin-info">
              <strong>{s.nom}</strong>
              <small>{[s.contact_personne, s.telephone, s.courriel, s.ville].filter(Boolean).join(" · ") || "—"}</small>
            </span>
            <button className="btn btn-contour btn-petit" onClick={() => ouvrirForm(s)}>Modifier</button>
            <button className="btn btn-danger btn-petit" onClick={() => supprimer(s)}>Supprimer</button>
          </li>
        ))}
      </Liste>
      {edit != null && (
        <div className="modal-fond" onClick={() => setEdit(null)}>
          <form className="modal modal-large form" onClick={(e) => e.stopPropagation()} onSubmit={sauver}>
            <button type="button" className="icone-btn fermer" onClick={() => setEdit(null)} aria-label="Fermer"><Fermer /></button>
            <h2 className="modal-titre">{edit === "nouveau" ? "Ajouter un fournisseur" : "Modifier le fournisseur"}</h2>
            <div className="form-2">
              <label>Nom *<input placeholder="Nom du fournisseur" {...champ("nom")} /></label>
              <label>Téléphone<input placeholder="418 343-3301" {...champ("telephone")} /></label>
              <label className="champ-large">Adresse<input {...champ("adresse")} /></label>
              <label>Ville<input {...champ("ville")} /></label>
              <label>Province<input placeholder="QC" {...champ("province")} /></label>
              <label>Code postal<input placeholder="G0W 2L0" {...champ("code_postal")} /></label>
              <label>Courriel<input type="email" placeholder="info@fournisseur.com" {...champ("courriel")} /></label>
              <label className="champ-large">Personne de contact<input placeholder="Nom du contact" {...champ("contact_personne")} /></label>
            </div>
            <label>Notes<textarea rows={2} placeholder="Notes libres…" {...champ("notes")} /></label>
            {msg && <div className="alerte">{msg}</div>}
            <div className="actions-ligne actions-gauche">
              <button className="btn btn-orange">{edit === "nouveau" ? "Ajouter" : "Enregistrer"}</button>
              <button type="button" className="btn btn-contour" onClick={() => setEdit(null)}>Annuler</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

/* ---------- Catégories ---------- */

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
      <Liste>
        {cats.map((c) => (
          <li key={c.id}>
            <span className="admin-info"><strong>{c.nom}</strong><small>{c.n} produits · {c.subs.length} sous-catégories</small></span>
            <button className="btn btn-danger btn-petit" onClick={() => supprimer(c)}>Supprimer</button>
          </li>
        ))}
      </Liste>
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
      <Liste>
        {subs.map((s) => (
          <li key={s.id}>
            <span className="admin-info"><strong>{s.nom}</strong><small>{cats.find((x) => x.id === s.category_id)?.nom}</small></span>
            <button className="btn btn-danger btn-petit" onClick={() => supprimer(s)}>Supprimer</button>
          </li>
        ))}
      </Liste>
    </>
  );
}
