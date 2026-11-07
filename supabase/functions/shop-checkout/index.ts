// Boutique Arc En Flèche — paiement en ligne du panier avec Clover.
//
// Le navigateur n'envoie que les ID de produits, les quantités et le jeton de carte Clover.
// Les prix, la livraison et les taxes sont recalculés ici à partir de la base.
//
// Secrets (Bolt › Database › Secrets) : CLOVER_MERCHANT_ID, CLOVER_PUBLIC_TOKEN,
// CLOVER_PRIVATE_TOKEN, CLOVER_ENVIRONMENT (défaut production). SUPABASE_* fournis automatiquement.

import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const LIVRAISON = { seuil: 150, frais: 12.95 };
const TPS = 0.05;
const TVQ = 0.09975;

const env = (k: string, d = "") => (Deno.env.get(k) ?? d).trim();
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const txt = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const r2 = (n: number) => Math.round(n * 100) / 100;
const courrielOk = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
const payEnv = () => (env("CLOVER_ENVIRONMENT", "production").toLowerCase() === "sandbox" ? "sandbox" : "production");
const cloverBase = () => (payEnv() === "sandbox" ? "https://scl-sandbox.dev.clover.com" : "https://scl.clover.com");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "Méthode non permise" }, 405);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ ok: false, error: "Requête invalide" }, 400); }

  const merchantId = env("CLOVER_MERCHANT_ID");
  const publicToken = env("CLOVER_PUBLIC_TOKEN");
  const privateToken = env("CLOVER_PRIVATE_TOKEN");
  const configure = Boolean(merchantId && publicToken && privateToken);

  if (body.action === "config") {
    return json({ ok: true, provider: "clover", configured: configure, environment: payEnv(), publicToken: configure ? publicToken : null, merchantId: configure ? merchantId : null, taxes: { tps: TPS, tvq: TVQ }, livraison: LIVRAISON });
  }
  if (body.action !== "purchase") return json({ ok: false, error: "Action inconnue" }, 400);
  if (!configure) return json({ ok: false, error: "Le paiement en ligne n'est pas encore activé." }, 503);

  // Client connecté (même règle qu'avant : un compte est requis pour commander)
  const url = env("SUPABASE_URL");
  const auth = req.headers.get("Authorization") ?? "";
  const { data: u } = await createClient(url, env("SUPABASE_ANON_KEY"), { global: { headers: { Authorization: auth } }, auth: { persistSession: false } }).auth.getUser();
  const user = u?.user;
  if (!user) return json({ ok: false, error: "Connectez-vous pour commander." }, 401);

  const db = createClient(url, env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });

  // Client et livraison
  const client = {
    nom: txt(body.nom, 80), courriel: txt(body.courriel, 160).toLowerCase(), tel: txt(body.tel, 30), notes: String(body.notes ?? "").trim().slice(0, 500),
  };
  if (!client.nom || !courrielOk(client.courriel) || client.tel.replace(/\D/g, "").length < 10)
    return json({ ok: false, error: "Veuillez remplir votre nom, un courriel valide et votre téléphone." }, 400);
  const mode = body.mode === "livraison" ? "livraison" : "retrait";
  let adresse: Record<string, string> | null = null;
  if (mode === "livraison") {
    const a = (body.adresse ?? {}) as Record<string, unknown>;
    adresse = { rue: txt(a.rue, 140), ville: txt(a.ville, 80), province: "QC", codePostal: txt(a.codePostal, 7).toUpperCase() };
    if (!adresse.rue || !adresse.ville || !/^[A-Z]\d[A-Z] ?\d[A-Z]\d$/.test(adresse.codePostal))
      return json({ ok: false, error: "Adresse de livraison incomplète (rue, ville et code postal valide)." }, 400);
  }

  // Articles : prix et disponibilité lus dans la base
  const demandes = (Array.isArray(body.items) ? body.items : []).slice(0, 100)
    .map((x: { productId?: unknown; quantity?: unknown }) => ({ id: Number(x?.productId), q: Math.floor(Number(x?.quantity)) }))
    .filter((x) => Number.isInteger(x.id) && x.q >= 1 && x.q <= 99);
  if (!demandes.length) return json({ ok: false, error: "Votre panier est vide." }, 400);
  const { data: produits, error: errP } = await db.from("products").select("id, nom, description, prix, stock").in("id", demandes.map((d) => d.id));
  if (errP) return json({ ok: false, error: "Catalogue indisponible, réessayez." }, 500);
  const parId = new Map((produits ?? []).map((p) => [p.id, p]));
  const lignes = [];
  for (const d of demandes) {
    const p = parId.get(d.id);
    if (!p) return json({ ok: false, error: "Un article de votre panier n'existe plus. Retirez-le et réessayez." }, 409);
    const prix = Number(p.prix) || 0;
    const nom = String(p.nom).trim() + (p.description ? ` (${String(p.description).trim()})` : "");
    if (p.stock === false) return json({ ok: false, error: `« ${nom} » est en rupture de stock. Retirez-le pour continuer.` }, 409);
    if (prix <= 0) return json({ ok: false, error: `« ${nom} » est à prix sur demande : appelez-nous pour cet article.` }, 409);
    lignes.push({ productId: p.id, name: nom, quantity: d.q, unitPrice: prix, total: r2(prix * d.q) });
  }
  const sousTotal = r2(lignes.reduce((t, l) => t + l.total, 0));
  const livraison = mode === "livraison" && sousTotal < LIVRAISON.seuil ? LIVRAISON.frais : 0;
  const base = sousTotal + livraison;
  const tps = r2(base * TPS);
  const tvq = r2(base * TVQ);
  const total = r2(base + tps + tvq);

  // Le navigateur affiche un total : s'il diffère (prix changé entre-temps), on ne prélève rien.
  const attendu = Number(body.totalAffiche);
  if (Number.isFinite(attendu) && Math.abs(attendu - total) > 0.01)
    return json({ ok: false, error: `Le total a changé (prix mis à jour) : ${total.toFixed(2)} $. Rechargez le panier et réessayez.`, total }, 409);

  const sourceId = txt(body.sourceId, 400);
  if (!sourceId) return json({ ok: false, error: "Informations de paiement manquantes." }, 400);
  const idem = txt(body.idempotencyKey, 64) || crypto.randomUUID();
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();

  // Paiement Clover
  const rep = await fetch(`${cloverBase()}/v1/charges`, {
    method: "POST",
    headers: { Authorization: `Bearer ${privateToken}`, "Content-Type": "application/json", Accept: "application/json", "idempotency-key": idem, ...(ip ? { "x-forwarded-for": ip } : {}) },
    body: JSON.stringify({
      amount: Math.round(total * 100), currency: "cad", source: sourceId, ecomind: "ecom", receipt_email: client.courriel,
      description: `Commande en ligne — ${lignes.reduce((n, l) => n + l.quantity, 0)} article(s) — ${client.nom}`.slice(0, 120),
    }),
  });
  const data = await rep.json().catch(() => ({}));
  if (!rep.ok || !data?.id || data.paid !== true || (data.status && data.status !== "succeeded")) {
    const err = data?.error ?? {};
    console.error("Clover refusé", rep.status, JSON.stringify(data));
    const msg = err.type === "card_error" || err.code === "card_declined" || rep.status === 402
      ? "Paiement refusé par votre institution financière. Vérifiez la carte ou essayez-en une autre."
      : "Le paiement n'a pas pu être complété. Aucun montant n'a été prélevé.";
    return json({ ok: false, error: msg, detail: err.code ?? err.decline_code ?? null }, 402);
  }
  const paymentId = String(data.id);

  // Commande enregistrée (une seule par paiement)
  const { data: deja } = await db.from("orders").select("id").eq("payment_id", paymentId).maybeSingle();
  const notes = [mode === "retrait" ? "Retrait en boutique" : `Livraison : ${adresse!.rue}, ${adresse!.ville} (QC) ${adresse!.codePostal}`, "PAYÉE EN LIGNE (Clover)", client.notes].filter(Boolean).join(" — ");
  let orderId = deja?.id as string | undefined;
  if (!orderId) {
    const { data: o, error } = await db.from("orders").insert({
      user_id: user.id, items: lignes, total, status: "paid", customer_name: client.nom, customer_email: client.courriel,
      customer_phone: client.tel, notes, subtotal: sousTotal, shipping: livraison, tps, tvq, delivery_mode: mode,
      shipping_address: adresse, payment_provider: "clover", payment_id: paymentId, payment_environment: payEnv(), paid_at: new Date().toISOString(),
    }).select("id").single();
    if (error || !o) {
      console.error("Insertion orders échouée", error);
      return json({ ok: false, paid: true, error: `Votre paiement est accepté (réf. ${paymentId}), mais la commande n'a pas pu être enregistrée. Appelez-nous au 418 343-3301, nous la traiterons immédiatement.` }, 500);
    }
    orderId = o.id;
  }
  const numero = String(orderId).slice(0, 8).toUpperCase();

  // Confirmation au client et à l'équipe : même gabarit que les commandes existantes (send-email)
  let courriel = true;
  try {
    const r = await fetch(`${url}/functions/v1/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env("SUPABASE_ANON_KEY")}`, apikey: env("SUPABASE_ANON_KEY") },
      body: JSON.stringify({
        type: "order", orderNumber: numero,
        customer: { name: client.nom, email: client.courriel, phone: client.tel, notes: `${notes} — Sous-total ${sousTotal.toFixed(2)} $, livraison ${livraison.toFixed(2)} $, TPS ${tps.toFixed(2)} $, TVQ ${tvq.toFixed(2)} $` },
        items: lignes, total,
      }),
    });
    const d = await r.json().catch(() => ({}));
    courriel = r.ok && d?.ok !== false;
  } catch (e) { courriel = false; console.error("send-email", e); }

  return json({ ok: true, orderId, numero, total, sousTotal, livraison, tps, tvq, emailSent: courriel, environment: payEnv() });
});
