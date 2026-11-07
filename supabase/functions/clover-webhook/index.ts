// Webhook Clover Hosted Checkout — confirme les paiements avant toute livraison.
//
// URL à coller dans Clover (Paramètres › Commerce électronique › Hosted Checkout › Webhook) :
//   https://<projet>.supabase.co/functions/v1/clover-webhook
// Secret : CLOVER_WEBHOOK_SECRET (le « signing secret » généré par Clover), dans Bolt › Secrets.
//
// Clover envoie l'en-tête « Clover-Signature: t=<horodatage>,v1=<signature> » où
// signature = HMAC-SHA256(secret, "<t>.<corps brut>"). Toute requête non signée est refusée.
// Sur PAYMENT / APPROVED, la session (champ data) est retrouvée dans gift_cards ou orders
// puis finalisée par la fonction concernée (code + courriels, ou commande payée + confirmation).

import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const env = (k: string, d = "") => (Deno.env.get(k) ?? d).trim();
const rep = (status: number, msg: string) => new Response(msg, { status });

async function hmacHex(secret: string, message: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const egal = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return rep(405, "Méthode non permise");
  const brut = await req.text();

  const secret = env("CLOVER_WEBHOOK_SECRET");
  if (!secret) { console.error("CLOVER_WEBHOOK_SECRET manquant : webhook refusé"); return rep(500, "Webhook non configuré"); }

  const entete = req.headers.get("clover-signature") ?? req.headers.get("Clover-Signature") ?? "";
  const parts = Object.fromEntries(entete.split(",").map((p) => p.trim().split("=", 2) as [string, string]));
  const t = parts.t ?? "";
  const v1 = (parts.v1 ?? "").toLowerCase();
  if (!t || !v1) { console.error("Signature absente", entete); return rep(401, "Signature absente"); }
  const attendu = await hmacHex(secret, `${t}.${brut}`);
  if (!egal(attendu, v1)) { console.error("Signature invalide"); return rep(401, "Signature invalide"); }
  // Rejeu : horodatage de plus de 15 minutes refusé (t en secondes ou millisecondes)
  const ts = Number(t) > 1e12 ? Number(t) / 1000 : Number(t);
  if (Number.isFinite(ts) && Math.abs(Date.now() / 1000 - ts) > 900) { console.error("Horodatage trop ancien", t); return rep(401, "Expiré"); }

  let evt: Record<string, unknown>;
  try { evt = JSON.parse(brut); } catch { return rep(400, "JSON invalide"); }
  console.log("Webhook Clover", JSON.stringify({ type: evt.type, status: evt.status, id: evt.id, data: evt.data }));

  if (env("CLOVER_MERCHANT_ID") && evt.merchantId && evt.merchantId !== env("CLOVER_MERCHANT_ID")) return rep(200, "Autre marchand ignoré");
  if (evt.type !== "PAYMENT" || evt.status !== "APPROVED") return rep(200, "Ignoré");

  const session = String(evt.data ?? "");
  const paymentId = String(evt.id ?? "");
  if (!session) return rep(200, "Sans session");

  const url = env("SUPABASE_URL");
  const db = createClient(url, env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
  const appel = async (fonction: string, id: string) => {
    const r = await fetch(`${url}/functions/v1/${fonction}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env("SUPABASE_ANON_KEY")}`, apikey: env("SUPABASE_ANON_KEY"), "x-internal-key": env("SUPABASE_SERVICE_ROLE_KEY") },
      body: JSON.stringify({ action: "finalize", id, paymentId }),
    });
    const texte = await r.text();
    console.log(`finalize ${fonction}`, r.status, texte.slice(0, 300));
    return r.ok;
  };

  const { data: carte } = await db.from("gift_cards").select("id").eq("checkout_session_id", session).maybeSingle();
  if (carte) return (await appel("gift-card", carte.id)) ? rep(200, "Carte finalisée") : rep(500, "Échec finalisation");

  const { data: commande } = await db.from("orders").select("id").eq("checkout_session_id", session).maybeSingle();
  if (commande) return (await appel("shop-checkout", commande.id)) ? rep(200, "Commande finalisée") : rep(500, "Échec finalisation");

  console.error("Session inconnue", session);
  return rep(200, "Session inconnue");
});
