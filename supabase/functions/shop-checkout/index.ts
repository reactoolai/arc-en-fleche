// Boutique Arc En Flèche — paiement en ligne du panier avec Clover.
//
// Le navigateur n'envoie que les ID de produits et les quantités : prix, livraison et taxes
// sont recalculés ici à partir de la base. Parcours : commande « awaiting_payment » →
// page de paiement Clover (Hosted Checkout) → webhook signé (clover-webhook) → « finalize » :
// commande « paid » + confirmation par courriel. Rien n'est confirmé avant le webhook.
//
// Secrets (Bolt › Database › Secrets) : CLOVER_MERCHANT_ID, CLOVER_PRIVATE_TOKEN,
// CLOVER_WEBHOOK_SECRET, CLOVER_ENVIRONMENT (défaut production). SUPABASE_* fournis automatiquement.

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
const cloverApi = () => (payEnv() === "sandbox" ? "https://apisandbox.dev.clover.com" : "https://api.clover.com");
const siteUrl = () => env("SITE_URL", "https://arcenfleche.com").replace(/\/$/, "");
const db = () => createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });

// Finalisation après confirmation Clover : commande payée + confirmation (gabarit send-email existant)
async function finaliser(id: string, paymentId: string) {
  const base = db();
  const { data: o } = await base.from("orders").select("*").eq("id", id).maybeSingle();
  if (!o) return json({ ok: false, error: "Commande introuvable" }, 404);
  if (o.status !== "awaiting_payment") return json({ ok: true, deja: true, status: o.status });
  const notes = String(o.notes ?? "").replace("PAIEMENT EN ATTENTE (Clover)", "PAYÉE EN LIGNE (Clover)");
  const { error } = await base.from("orders").update({ status: "paid", payment_id: paymentId, paid_at: new Date().toISOString(), notes })
    .eq("id", id).eq("status", "awaiting_payment");
  if (error) { console.error("Mise à jour commande", error); return json({ ok: false, error: error.message }, 500); }
  const numero = String(id).slice(0, 8).toUpperCase();
  const url = env("SUPABASE_URL");
  try {
    const r = await fetch(`${url}/functions/v1/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env("SUPABASE_ANON_KEY")}`, apikey: env("SUPABASE_ANON_KEY") },
      body: JSON.stringify({
        type: "order", orderNumber: numero,
        customer: { name: o.customer_name, email: o.customer_email, phone: o.customer_phone,
          notes: `${notes} — Sous-total ${Number(o.subtotal).toFixed(2)} $, livraison ${Number(o.shipping).toFixed(2)} $, TPS ${Number(o.tps).toFixed(2)} $, TVQ ${Number(o.tvq).toFixed(2)} $ — Paiement Clover ${paymentId}` },
        items: o.items, total: Number(o.total),
      }),
    });
    console.log("send-email", r.status, (await r.text()).slice(0, 200));
  } catch (e) { console.error("send-email", e); }
  return json({ ok: true });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "Méthode non permise" }, 405);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ ok: false, error: "Requête invalide" }, 400); }

  const merchantId = env("CLOVER_MERCHANT_ID");
  const privateToken = env("CLOVER_PRIVATE_TOKEN");
  const configure = Boolean(merchantId && privateToken);

  if (body.action === "config") {
    return json({ ok: true, provider: "clover-hosted", configured: configure, webhook: Boolean(env("CLOVER_WEBHOOK_SECRET")), environment: payEnv(), taxes: { tps: TPS, tvq: TVQ }, livraison: LIVRAISON });
  }
  if (body.action === "finalize") {
    if (req.headers.get("x-internal-key") !== env("SUPABASE_SERVICE_ROLE_KEY")) return json({ ok: false, error: "Interdit" }, 403);
    return finaliser(txt(body.id, 40), txt(body.paymentId, 80));
  }
  if (body.action === "status") {
    const { data: o } = await db().from("orders").select("id, status, total, payment_environment, delivery_mode").eq("id", txt(body.id, 40)).maybeSingle();
    if (!o) return json({ ok: false, error: "Introuvable" }, 404);
    return json({ ok: true, status: o.status, total: Number(o.total), numero: String(o.id).slice(0, 8).toUpperCase(), mode: o.delivery_mode, environment: o.payment_environment });
  }
  if (body.action !== "checkout") return json({ ok: false, error: "Action inconnue" }, 400);
  if (!configure) return json({ ok: false, error: "Le paiement en ligne n'est pas encore activé." }, 503);

  // Client connecté (même règle qu'avant : un compte est requis pour commander)
  const url = env("SUPABASE_URL");
  const auth = req.headers.get("Authorization") ?? "";
  const { data: u } = await createClient(url, env("SUPABASE_ANON_KEY"), { global: { headers: { Authorization: auth } }, auth: { persistSession: false } }).auth.getUser();
  const user = u?.user;
  if (!user) return json({ ok: false, error: "Connectez-vous pour commander." }, 401);

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
  const { data: produits, error: errP } = await db().from("products").select("id, nom, description, prix, stock").in("id", demandes.map((d) => d.id));
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
  const assiette = sousTotal + livraison;
  const tps = r2(assiette * TPS);
  const tvq = r2(assiette * TVQ);
  const total = r2(assiette + tps + tvq);

  // Le navigateur affiche un total : s'il diffère (prix changé entre-temps), on ne prélève rien.
  const attendu = Number(body.totalAffiche);
  if (Number.isFinite(attendu) && Math.abs(attendu - total) > 0.01)
    return json({ ok: false, error: `Le total a changé (prix mis à jour) : ${total.toFixed(2)} $. Rechargez le panier et réessayez.`, total }, 409);

  // 1) Commande enregistrée « en attente de paiement »
  const base = db();
  const notes = [mode === "retrait" ? "Retrait en boutique" : `Livraison : ${adresse!.rue}, ${adresse!.ville} (QC) ${adresse!.codePostal}`, "PAIEMENT EN ATTENTE (Clover)", client.notes].filter(Boolean).join(" — ");
  const { data: o, error } = await base.from("orders").insert({
    user_id: user.id, items: lignes, total, status: "awaiting_payment", customer_name: client.nom, customer_email: client.courriel,
    customer_phone: client.tel, notes, subtotal: sousTotal, shipping: livraison, tps, tvq, delivery_mode: mode,
    shipping_address: adresse, payment_provider: "clover", payment_environment: payEnv(),
  }).select("id").single();
  if (error || !o) { console.error("Insertion orders", error); return json({ ok: false, error: "Impossible de préparer le paiement, réessayez." }, 500); }

  // 2) Session de paiement Clover (Hosted Checkout) — articles, livraison et taxes en lignes
  const lineItems = lignes.map((l) => ({ name: l.name.slice(0, 127), price: Math.round(l.unitPrice * 100), unitQty: l.quantity }));
  if (livraison > 0) lineItems.push({ name: "Livraison au Québec", price: Math.round(livraison * 100), unitQty: 1 });
  lineItems.push({ name: "TPS (5 %)", price: Math.round(tps * 100), unitQty: 1 });
  lineItems.push({ name: "TVQ (9,975 %)", price: Math.round(tvq * 100), unitQty: 1 });
  const site = siteUrl();
  const [prenom, ...reste] = client.nom.split(" ");
  const rep = await fetch(`${cloverApi()}/invoicingcheckoutservice/v1/checkouts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${privateToken}`, "X-Clover-Merchant-Id": merchantId, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      customer: { email: client.courriel, firstName: prenom, lastName: reste.join(" ") || prenom, phoneNumber: client.tel },
      shoppingCart: { lineItems },
      redirectUrls: { success: `${site}/panier?commande=${o.id}`, failure: `${site}/panier?echec=${o.id}`, cancel: `${site}/panier?annule=${o.id}` },
    }),
  });
  const data = await rep.json().catch(() => ({}));
  if (!rep.ok || !data?.href || !data?.checkoutSessionId) {
    console.error("Clover checkout refusé", rep.status, JSON.stringify(data));
    await base.from("orders").update({ status: "cancelled" }).eq("id", o.id);
    return json({ ok: false, error: "La page de paiement Clover n'a pas pu s'ouvrir. Réessayez ou appelez-nous au 418 343-3301.", detail: rep.status }, 502);
  }
  await base.from("orders").update({ checkout_session_id: data.checkoutSessionId }).eq("id", o.id);
  return json({ ok: true, id: o.id, href: data.href, total });
});
