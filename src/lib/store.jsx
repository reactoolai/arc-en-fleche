import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase.js";
import { marque, nettoyer } from "./format.js";
import PHOTOS from "../data/productImages.js";

/* ---------- Catalogue (Supabase) ---------- */

const CatalogCtx = createContext(null);

const normaliser = (p) => {
  const nom = nettoyer(p.nom);
  const desc = nettoyer(p.description);
  const dbImgs = (p.images || []).filter(Boolean);
  const auto = PHOTOS[p.id];
  return {
    id: p.id,
    nom,
    desc,
    prix: parseFloat(p.prix) || 0,
    cat: p.category_id,
    sub: p.subcategory_id,
    tag: p.tag,
    source: p.source,
    stock: p.stock !== false,
    images: dbImgs.length ? dbImgs : auto ? [auto] : [],
    marque: marque(nom, desc),
    cree: p.created_at,
    brut: p,
  };
};

export function CatalogProvider({ children }) {
  const [state, setState] = useState({ chargement: true, erreur: null, cats: [], subs: [], produits: [] });

  const charger = useCallback(async () => {
    try {
      const [c, s, p] = await Promise.all([
        supabase.from("categories").select("*").order("sort_order").order("nom"),
        supabase.from("subcategories").select("*").order("sort_order"),
        supabase.from("products").select("*").order("created_at", { ascending: false }),
      ]);
      if (c.error || s.error || p.error) throw c.error || s.error || p.error;
      const produits = (p.data || []).map(normaliser);
      const cats = (c.data || []).map((x) => ({
        ...x,
        n: produits.filter((pr) => pr.cat === x.id).length,
        subs: (s.data || []).filter((sb) => sb.category_id === x.id),
      }));
      setState({ chargement: false, erreur: null, cats, subs: s.data || [], produits });
    } catch (e) {
      console.error(e);
      setState((st) => ({ ...st, chargement: false, erreur: "Impossible de charger le catalogue pour le moment." }));
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  const value = useMemo(() => ({
    ...state,
    recharger: charger,
    parId: (id) => state.produits.find((p) => p.id === Number(id)),
    catParId: (id) => state.cats.find((c) => c.id === Number(id)),
  }), [state, charger]);

  return <CatalogCtx.Provider value={value}>{children}</CatalogCtx.Provider>;
}

export const useCatalog = () => useContext(CatalogCtx);

/* ---------- Panier (localStorage) ---------- */

const CartCtx = createContext(null);
const CLE = "aef-panier-v2";

const lire = () => {
  try { return JSON.parse(localStorage.getItem(CLE)) || {}; } catch { return {}; }
};

export function CartProvider({ children }) {
  const [items, setItems] = useState(lire);
  const [ouvert, setOuvert] = useState(false);
  const [dernier, setDernier] = useState(null);

  useEffect(() => {
    try { localStorage.setItem(CLE, JSON.stringify(items)); } catch { /* stockage indisponible */ }
  }, [items]);

  const ajouter = useCallback((id, n = 1) => {
    setItems((it) => ({ ...it, [id]: (it[id] || 0) + n }));
    setDernier(id);
    setOuvert(true);
  }, []);
  const changer = useCallback((id, q) => {
    setItems((it) => {
      const c = { ...it };
      if (q <= 0) delete c[id]; else c[id] = q;
      return c;
    });
  }, []);
  const vider = useCallback(() => setItems({}), []);

  const nombre = Object.values(items).reduce((t, q) => t + q, 0);

  return (
    <CartCtx.Provider value={{ items, ajouter, changer, vider, nombre, ouvert, setOuvert, dernier }}>
      {children}
    </CartCtx.Provider>
  );
}

export const useCart = () => useContext(CartCtx);

export const lignesPanier = (items, parId) =>
  Object.entries(items)
    .map(([id, q]) => ({ p: parId(id), q }))
    .filter((l) => l.p);

/* ---------- Authentification ---------- */

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profil, setProfil] = useState(null);
  const [modal, setModal] = useState(null); // null | "login" | "signup"

  const chargerProfil = useCallback(async (u) => {
    if (!u) { setProfil(null); return; }
    const { data } = await supabase.from("profiles").select("*").eq("id", u.id).maybeSingle();
    setProfil(data || null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      chargerProfil(session?.user || null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null);
      // éviter d'appeler Supabase de façon synchrone dans le callback
      setTimeout(() => chargerProfil(session?.user || null), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [chargerProfil]);

  const value = {
    user, profil, admin: !!profil?.is_admin,
    modal, ouvrir: (m = "login") => setModal(m), fermer: () => setModal(null),
    rechargerProfil: () => chargerProfil(user),
    deconnexion: async () => { await supabase.auth.signOut(); setUser(null); setProfil(null); },
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
