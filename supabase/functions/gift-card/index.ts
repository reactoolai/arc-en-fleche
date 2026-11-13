// Cartes cadeaux Arc En Flèche — paiement Clover, création de la carte, courriels.
//
// Secrets (Bolt › Database › Secrets) — aucune clé n'est écrite dans le code :
//   CLOVER_ENVIRONMENT      "production" (défaut) ou "sandbox"
//   CLOVER_MERCHANT_ID      Merchant ID Clover (13 caractères)
//   CLOVER_PRIVATE_TOKEN    Jeton privé e-commerce (secret) — crée les sessions Hosted Checkout
//   CLOVER_WEBHOOK_SECRET   Secret de signature du webhook (utilisé par la fonction clover-webhook)
//
// Parcours : « Payer » → carte enregistrée « pending » → page de paiement Clover (Hosted Checkout)
// → webhook Clover signé (fonction clover-webhook) → action « finalize » ici : code unique + courriels.
// Rien n'est envoyé tant que Clover n'a pas confirmé le paiement.
//   RESEND_API_KEY          Déjà utilisé par la fonction send-email
//   GIFT_EMAIL_FROM         (facultatif) Expéditeur ; sinon premier domaine vérifié chez Resend
//   GIFT_TEAM_EMAIL         Courriel(s) de l'équipe, séparés par des virgules (défaut : info@arcenfleche.com)
//   SITE_URL                Défaut : https://arcenfleche.com
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY  fournis automatiquement

import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRESETS = [100, 200, 500, 1000];
const MIN = 25;
const MAX = 5000;
const FRAIS_PHYSIQUE = 5.99;

const env = (k: string, d = "") => (Deno.env.get(k) ?? d).trim();
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const payEnv = () => (env("CLOVER_ENVIRONMENT", "production").toLowerCase() === "sandbox" ? "sandbox" : "production");
const cloverApi = () => (payEnv() === "sandbox" ? "https://apisandbox.dev.clover.com" : "https://api.clover.com");
const siteUrl = () => env("SITE_URL", "https://arcenfleche.com").replace(/\/$/, "");

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const argent = (n: number) =>
  n.toLocaleString("fr-CA", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }) + " $";
const courrielOk = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
const txt = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

// Code lisible, sans caractères ambigus (0/O, 1/I/L) : AEF-XXXX-XXXX-XXXX
function genererCode() {
  const A = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const b = crypto.getRandomValues(new Uint8Array(12));
  const c = [...b].map((x) => A[x % A.length]).join("");
  return `AEF-${c.slice(0, 4)}-${c.slice(4, 8)}-${c.slice(8, 12)}`;
}

/* ---------------- Validation de la commande ---------------- */

function valider(b: Record<string, unknown>) {
  const montant = Math.round(Number(b.amount) * 100) / 100;
  if (!Number.isFinite(montant) || montant < MIN || montant > MAX)
    throw new Error(`Le montant doit être entre ${MIN} $ et ${MAX} $.`);
  if (!PRESETS.includes(montant) && montant % 1 !== 0) throw new Error("Le montant personnalisé doit être un nombre entier.");

  const c = {
    amount: montant,
    recipientName: txt(b.recipientName, 80),
    recipientEmail: txt(b.recipientEmail, 160).toLowerCase(),
    buyerName: txt(b.buyerName, 80),
    buyerEmail: txt(b.buyerEmail, 160).toLowerCase(),
    message: String(b.message ?? "").trim().slice(0, 400),
    physical: b.physical === true,
    address: null as null | Record<string, string>,
  };
  if (!c.recipientName) throw new Error("Indiquez le nom du destinataire.");
  if (!courrielOk(c.recipientEmail)) throw new Error("Le courriel du destinataire est invalide.");
  if (!c.buyerName) throw new Error("Indiquez votre nom.");
  if (!courrielOk(c.buyerEmail)) throw new Error("Votre courriel est invalide.");
  if (c.physical) {
    const a = (b.address ?? {}) as Record<string, unknown>;
    c.address = {
      nom: txt(a.nom, 80) || c.recipientName,
      rue: txt(a.rue, 140),
      ville: txt(a.ville, 80),
      province: txt(a.province, 40) || "QC",
      codePostal: txt(a.codePostal, 10).toUpperCase(),
    };
    if (!c.address.rue || !c.address.ville || !/^[A-Z]\d[A-Z] ?\d[A-Z]\d$/.test(c.address.codePostal))
      throw new Error("Adresse postale incomplète (rue, ville et code postal valide).");
  }
  return c;
}

/* ---------------- Courriels (Resend) ---------------- */

// Expéditeur : GIFT_EMAIL_FROM, sinon le premier domaine vérifié du compte Resend
let expediteur: string | null = null;
async function trouverExpediteur(): Promise<string> {
  if (expediteur) return expediteur;
  const defini = env("GIFT_EMAIL_FROM");
  if (defini) return (expediteur = defini);
  try {
    const r = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}` } });
    const d = await r.json();
    const dom = (d?.data ?? []).find((x: { status?: string }) => x.status === "verified");
    if (dom?.name) return (expediteur = `Arc En Flèche <cartes-cadeaux@${dom.name}>`);
  } catch (e) { console.error("Resend domains", e); }
  return "Arc En Flèche <onboarding@resend.dev>";
}

async function envoyerCourriel(to: string[], subject: string, html: string, replyTo?: string) {
  const cle = env("RESEND_API_KEY");
  if (!cle) throw new Error("RESEND_API_KEY manquant");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: await trouverExpediteur(),
      to,
      subject,
      html,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
}

type Carte = ReturnType<typeof valider> & { code: string; total: number; receiptUrl?: string; paymentId: string };

function courrielDestinataire(c: Carte) {
  const site = siteUrl();
  const message = c.message
    ? `<tr><td style="padding:28px 36px 0">
        <div style="background:#f8f4ec;border-left:4px solid #ff6a1a;border-radius:10px;padding:20px 22px;font-family:Georgia,serif;font-size:17px;line-height:1.55;color:#2a2f2b;font-style:italic">${esc(c.message).replace(/\n/g, "<br>")}</div>
        <p style="margin:10px 0 0;text-align:right;font:600 14px Arial,sans-serif;color:#7a5532">— ${esc(c.buyerName)}</p>
      </td></tr>`
    : "";
  const physique = c.physical
    ? `<p style="margin:14px 0 0;font:14px/1.5 Arial,sans-serif;color:#6f7a72">Une carte physique vous sera aussi envoyée par la poste.</p>`
    : "";
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Carte cadeau Arc En Flèche</title></head>
<body style="margin:0;background:#e8dfcf;padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden">
  <tr><td style="background:#0d1410;padding:26px 36px;text-align:center">
    <p style="margin:0;font:700 13px Arial,sans-serif;letter-spacing:4px;text-transform:uppercase;color:#ff6a1a">Vous avez reçu un cadeau</p>
  </td></tr>
  <tr><td style="padding:32px 36px 0;font:17px/1.55 Arial,sans-serif;color:#0d1410">
    <p style="margin:0 0 6px;font:800 28px/1.15 Arial,sans-serif;text-transform:uppercase">Bonjour ${esc(c.recipientName)},</p>
    <p style="margin:0"><strong>${esc(c.buyerName)}</strong> vous offre une carte cadeau Arc En Flèche d'une valeur de <strong>${argent(c.amount)}</strong>.</p>
  </td></tr>
  <tr><td style="padding:26px 36px 0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#131e18;background-image:linear-gradient(135deg,#24382c 0%,#131e18 55%,#0d1410 100%);border-radius:16px">
      <tr><td style="padding:24px 26px 6px" valign="top">
        <img src="${site}/images/logo-clair.png" width="96" height="96" alt="Arc En Flèche" style="display:block;border:0">
      </td><td style="padding:24px 26px 6px;text-align:right" valign="top">
        <p style="margin:0;font:700 12px Arial,sans-serif;letter-spacing:3px;text-transform:uppercase;color:#ff6a1a">Carte cadeau</p>
        <p style="margin:6px 0 0;font:800 46px/1 Arial,sans-serif;color:#f3ede2">${argent(c.amount)}</p>
      </td></tr>
      <tr><td colspan="2" style="padding:10px 26px 24px">
        <p style="margin:0;font:13px Arial,sans-serif;color:#a9b3ab;text-transform:uppercase;letter-spacing:2px">Pour</p>
        <p style="margin:2px 0 12px;font:700 20px Arial,sans-serif;color:#f3ede2">${esc(c.recipientName)}</p>
        <p style="margin:0;font:13px Arial,sans-serif;color:#a9b3ab;text-transform:uppercase;letter-spacing:2px">Code</p>
        <p style="margin:4px 0 0;font:700 22px 'Courier New',monospace;letter-spacing:2px;color:#ff6a1a">${esc(c.code)}</p>
      </td></tr>
    </table>
  </td></tr>
  ${message}
  <tr><td style="padding:28px 36px 8px;font:15px/1.6 Arial,sans-serif;color:#3a423c">
    <p style="margin:0 0 8px;font:800 18px Arial,sans-serif;text-transform:uppercase;color:#0d1410">Comment l'utiliser</p>
    <p style="margin:0">Présentez ce code en boutique ou mentionnez-le lors d'une commande. Il est valable sur tout l'inventaire et les services de l'atelier.</p>
    ${physique}
  </td></tr>
  <tr><td style="padding:22px 36px 34px" align="center">
    <a href="${site}/boutique" style="display:inline-block;background:#ff6a1a;color:#ffffff;text-decoration:none;font:700 15px Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;padding:15px 30px;border-radius:999px">Découvrir la boutique</a>
  </td></tr>
  <tr><td style="background:#f3ede2;padding:20px 36px;text-align:center;font:13px/1.6 Arial,sans-serif;color:#6f7a72">
    Arc En Flèche · 413, rue St-Alphonse, Saint-Bruno-Lac-Saint-Jean (Québec) G0W 2L0<br>
    418 343-3301 · <a href="${site}" style="color:#7a5532">arcenfleche.com</a>
  </td></tr>
</table></td></tr></table></body></html>`;
}

function courrielEquipe(c: Carte) {
  const ligne = (k: string, v: string) =>
    `<tr><td style="padding:8px 0;color:#6f7a72;width:170px;vertical-align:top">${k}</td><td style="padding:8px 0;font-weight:600">${v}</td></tr>`;
  const a = c.address;
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#f3ede2;padding:24px 12px;font:15px/1.5 Arial,sans-serif;color:#0d1410">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" align="center" style="max-width:600px;width:100%;background:#fff;border-radius:14px;overflow:hidden">
<tr><td style="background:#0d1410;color:#f3ede2;padding:20px 28px">
  <p style="margin:0;font:700 12px Arial;letter-spacing:3px;text-transform:uppercase;color:#ff6a1a">Nouvelle carte cadeau vendue</p>
  <p style="margin:6px 0 0;font:800 30px Arial">${argent(c.amount)}${c.physical ? " · carte physique" : ""}</p>
</td></tr>
<tr><td style="padding:20px 28px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${ligne("Code", `<span style="font-family:'Courier New',monospace;color:#e5550a">${esc(c.code)}</span>`)}
${ligne("Montant de la carte", argent(c.amount))}
${ligne("Total payé", argent(c.total) + (c.physical ? ` (dont ${argent(FRAIS_PHYSIQUE)} carte physique)` : ""))}
${ligne("Acheteur", `${esc(c.buyerName)}<br><a href="mailto:${esc(c.buyerEmail)}">${esc(c.buyerEmail)}</a>`)}
${ligne("Destinataire", `${esc(c.recipientName)}<br><a href="mailto:${esc(c.recipientEmail)}">${esc(c.recipientEmail)}</a>`)}
${ligne("Livraison", c.physical ? "Courriel + <strong>carte physique par la poste</strong>" : "Courriel seulement")}
${a ? ligne("Adresse postale", `${esc(a.nom)}<br>${esc(a.rue)}<br>${esc(a.ville)} (${esc(a.province)}) ${esc(a.codePostal)}`) : ""}
${c.message ? ligne("Message", esc(c.message).replace(/\n/g, "<br>")) : ""}
${ligne("Paiement Clover", `${esc(c.paymentId)}${c.receiptUrl ? ` · <a href="${esc(c.receiptUrl)}">reçu</a>` : ""}${payEnv() === "sandbox" ? " <strong style='color:#b03122'>(SANDBOX — test)</strong>" : ""}`)}
</table></td></tr></table></body></html>`;
}

/* ---------------- Handler ---------------- */

const db = () => createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });

// Finalisation (appelée seulement par clover-webhook, après vérification de la signature Clover)
async function finaliser(id: string, paymentId: string) {
  const base = db();
  const { data: g } = await base.from("gift_cards").select("*").eq("id", id).maybeSingle();
  if (!g) return json({ ok: false, error: "Carte introuvable" }, 404);
  if (g.status !== "pending") return json({ ok: true, deja: true, status: g.status });

  let code = "";
  let derniereErreur = "";
  for (let i = 0; i < 6 && !code; i++) {
    const essai = genererCode();
    const { error } = await base.from("gift_cards").update({
      code: essai, status: "active", payment_id: paymentId, paid_at: new Date().toISOString(),
    }).eq("id", id).eq("status", "pending");
    if (!error) code = essai;
    else { derniereErreur = error.message; if (error.code !== "23505") break; }
  }

  const c = {
    amount: Number(g.amount), recipientName: g.recipient_name, recipientEmail: g.recipient_email, buyerName: g.buyer_name,
    buyerEmail: g.buyer_email, message: g.message ?? "", physical: g.physical, address: g.shipping_address,
  } as ReturnType<typeof valider>;
  const carte: Carte = { ...c, code, total: Number(g.total_charged), paymentId };
  const equipe = env("GIFT_TEAM_EMAIL", "info@arcenfleche.com").split(",").map((x) => x.trim()).filter(Boolean);

  if (!code) {
    console.error("Code non généré", derniereErreur);
    await envoyerCourriel(equipe, `⚠ Carte cadeau payée mais code NON généré — ${argent(c.amount)} — ${c.buyerName}`,
      courrielEquipe({ ...carte, code: "NON GÉNÉRÉ — à créer manuellement" }) + `<p>Erreur : ${esc(derniereErreur)}</p>`).catch(console.error);
    return json({ ok: false, error: derniereErreur }, 500);
  }

  const maj: Record<string, string> = {};
  let okDest = true;
  try {
    await envoyerCourriel([c.recipientEmail], `${c.buyerName} vous offre une carte cadeau Arc En Flèche de ${argent(c.amount)}`, courrielDestinataire(carte), c.buyerEmail);
    maj.recipient_email_sent_at = new Date().toISOString();
  } catch (e) { okDest = false; console.error("Courriel destinataire", e); }
  try {
    await envoyerCourriel(equipe, `Nouvelle carte cadeau : ${argent(c.amount)}${c.physical ? " + carte physique" : ""} — ${c.buyerName} → ${c.recipientName}${payEnv() === "sandbox" ? " [TEST]" : ""}`,
      courrielEquipe(carte) + (okDest ? "" : "<p style='color:#b03122;font-weight:700'>⚠ Le courriel au destinataire n'a pas pu être envoyé : transmettez-lui le code manuellement.</p>"), c.buyerEmail);
    maj.team_notified_at = new Date().toISOString();
  } catch (e) { console.error("Courriel équipe", e); }
  if (Object.keys(maj).length) await base.from("gift_cards").update(maj).eq("id", id);
  return json({ ok: true, code: "généré", emailSent: okDest });
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
    const from = await trouverExpediteur();
    return json({ ok: true, provider: "clover-hosted", configured: configure, webhook: Boolean(env("CLOVER_WEBHOOK_SECRET")), emailFrom: from.replace(/^.*</, "").replace(">", ""), environment: payEnv(), physicalFee: FRAIS_PHYSIQUE, min: MIN, max: MAX, presets: PRESETS });
  }

  // Appel interne du webhook (clé service_role exigée)
  if (body.action === "finalize") {
    if (req.headers.get("x-internal-key") !== env("SUPABASE_SERVICE_ROLE_KEY")) return json({ ok: false, error: "Interdit" }, 403);
    return finaliser(txt(body.id, 40), txt(body.paymentId, 80));
  }

  // État d'une carte pour la page de confirmation (aucune donnée sensible, pas de code)
  if (body.action === "status") {
    const { data: g } = await db().from("gift_cards").select("status, amount, total_charged, recipient_email, recipient_name, buyer_name, physical, recipient_email_sent_at, team_notified_at, payment_environment").eq("id", txt(body.id, 40)).maybeSingle();
    if (!g) return json({ ok: false, error: "Introuvable" }, 404);
    return json({ ok: true, status: g.status, amount: Number(g.amount), total: Number(g.total_charged), recipientEmail: g.recipient_email, recipientName: g.recipient_name, buyerName: g.buyer_name, physique: g.physical, emailSent: Boolean(g.recipient_email_sent_at), termine: Boolean(g.recipient_email_sent_at || g.team_notified_at), environment: g.payment_environment });
  }

  if (body.action !== "checkout") return json({ ok: false, error: "Action inconnue" }, 400);
  if (!configure) return json({ ok: false, error: "Le paiement en ligne n'est pas encore activé. Appelez-nous au 418 343-3301." }, 503);

  let c: ReturnType<typeof valider>;
  try { c = valider(body); } catch (e) { return json({ ok: false, error: (e as Error).message }, 400); }
  const total = Math.round((c.amount + (c.physical ? FRAIS_PHYSIQUE : 0)) * 100) / 100;

  // 1) Carte enregistrée « en attente de paiement » (sans code)
  const base = db();
  const { data: g, error } = await base.from("gift_cards").insert({
    status: "pending", amount: c.amount, balance: c.amount, physical: c.physical, physical_fee: c.physical ? FRAIS_PHYSIQUE : 0,
    total_charged: total, buyer_name: c.buyerName, buyer_email: c.buyerEmail, recipient_name: c.recipientName,
    recipient_email: c.recipientEmail, message: c.message || null, shipping_address: c.address,
    payment_provider: "clover", payment_environment: payEnv(),
  }).select("id").single();
  if (error || !g) { console.error("Insertion pending", error); return json({ ok: false, error: "Impossible de préparer le paiement, réessayez." }, 500); }

  // 2) Session de paiement Clover (Hosted Checkout) — montants fixés ici, jamais par le navigateur
  const site = siteUrl();
  const [prenom, ...reste] = c.buyerName.split(" ");
  const lineItems = [{ name: `Carte cadeau Arc En Flèche ${argent(c.amount)} — pour ${c.recipientName}`.slice(0, 127), price: Math.round(c.amount * 100), unitQty: 1 }];
  if (c.physical) lineItems.push({ name: "Carte physique et envoi postal", price: Math.round(FRAIS_PHYSIQUE * 100), unitQty: 1 });
  const rep = await fetch(`${cloverApi()}/invoicingcheckoutservice/v1/checkouts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${privateToken}`, "X-Clover-Merchant-Id": merchantId, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      customer: { email: c.buyerEmail, firstName: prenom, lastName: reste.join(" ") || prenom },
      shoppingCart: { lineItems },
      redirectUrls: {
        success: `${site}/cartes-cadeaux/?merci=${g.id}`,
        failure: `${site}/cartes-cadeaux/?echec=${g.id}`,
        cancel: `${site}/cartes-cadeaux/?annule=${g.id}`,
      },
    }),
  });
  const data = await rep.json().catch(() => ({}));
  if (!rep.ok || !data?.href || !data?.checkoutSessionId) {
    console.error("Clover checkout refusé", rep.status, JSON.stringify(data));
    await base.from("gift_cards").update({ status: "failed" }).eq("id", g.id);
    return json({ ok: false, error: "La page de paiement Clover n'a pas pu s'ouvrir. Réessayez ou appelez-nous au 418 343-3301.", detail: rep.status }, 502);
  }
  await base.from("gift_cards").update({ checkout_session_id: data.checkoutSessionId }).eq("id", g.id);
  return json({ ok: true, id: g.id, href: data.href });
});

