import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { prix, sansAccents } from "../lib/format.js";

const STATUTS = { active: "Active", used: "Utilisée au complet", cancelled: "Annulée", pending: "Paiement non complété", failed: "Échec du paiement" };
const date = (d) => (d ? new Date(d).toLocaleDateString("fr-CA", { day: "numeric", month: "short", year: "numeric" }) : "");
const dateHeure = (d) => (d ? new Date(d).toLocaleString("fr-CA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "");
const normCode = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const montantSaisi = (s) => Math.round((Number(String(s).replace(",", ".").replace(/[^\d.]/g, "")) || 0) * 100) / 100;
const erreurSql = (e) => e?.message || "Erreur";

export default function CartesCadeauxAdmin() {
  const [cartes, setCartes] = useState(null);
  const [q, setQ] = useState("");
  const [erreur, setErreur] = useState("");
  const [tout, setTout] = useState(false);
  const [code, setCode] = useState("");
  const [choisie, setChoisie] = useState(null);

  const charger = useCallback(async () => {
    const { data, error } = await supabase.from("gift_cards").select("*").order("created_at", { ascending: false }).limit(1000);
    setErreur(error ? error.message : "");
    setCartes(data || []);
    return data || [];
  }, []);
  useEffect(() => { charger(); }, [charger]);

  const chercher = (e) => {
    e?.preventDefault();
    const n = normCode(code);
    if (!n) return;
    const c = (cartes || []).find((x) => normCode(x.code) === n || normCode(x.code).endsWith(n));
    if (!c) { setErreur(`Aucune carte avec le code « ${code.trim()} ».`); setChoisie(null); return; }
    setErreur(""); setChoisie(c.id);
  };

  const liste = useMemo(() => {
    const t = sansAccents(q).replace(/[\s-]/g, "");
    const base = (cartes || []).filter((c) => tout || (c.status !== "pending" && c.status !== "failed"));
    if (!t) return base;
    return base.filter((c) => sansAccents(`${c.code}${c.buyer_name}${c.recipient_name}${c.buyer_email}${c.recipient_email}`).replace(/[\s-]/g, "").includes(t));
  }, [cartes, q, tout]);

  const vendues = (cartes || []).filter((c) => c.status !== "pending" && c.status !== "failed");
  const actives = vendues.filter((c) => c.status === "active");
  const aExpedier = vendues.filter((c) => c.physical && !c.shipped_at && c.status !== "cancelled").length;
  const carte = (cartes || []).find((c) => c.id === choisie);

  const marquerPostee = async (c) => {
    const { error } = await supabase.from("gift_cards").update({ shipped_at: new Date().toISOString() }).eq("id", c.id);
    if (error) setErreur(error.message); else charger();
  };

  return (
    <div>
      <p className="txt">{cartes ? `${vendues.length} carte(s) vendue(s) · ${prix(actives.reduce((s, c) => s + Number(c.balance), 0))} de solde actif à honorer · ${aExpedier} carte(s) physique(s) à poster` : "Chargement…"}</p>

      <form className="cca-encaisser" onSubmit={chercher}>
        <div>
          <strong>Utiliser une carte cadeau</strong>
          <small>Le client se présente en boutique : entrez son code pour voir le solde et déduire sa dépense.</small>
        </div>
        <div className="form-ligne">
          <input placeholder="AEF-XXXX-XXXX-XXXX" value={code} onChange={(e) => setCode(e.target.value)} autoCapitalize="characters" spellCheck={false} />
          <button className="btn btn-orange">Chercher</button>
        </div>
      </form>

      {erreur && <div className="alerte">{erreur}</div>}
      {carte && <FicheCarte key={carte.id} carte={carte} fermer={() => setChoisie(null)} recharger={charger} />}

      <h3 className="cca-titre">Toutes les cartes</h3>
      <div className="admin-outils">
        <input placeholder="Code, nom ou courriel…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn btn-contour btn-petit" onClick={charger}>Actualiser</button>
        <label className="petit"><input type="checkbox" checked={tout} onChange={(e) => setTout(e.target.checked)} /> Afficher les paiements non complétés</label>
      </div>
      {cartes && liste.length === 0 && <p className="petit">Aucune carte cadeau pour l'instant.</p>}
      <ul className="admin-liste">
        {liste.map((c) => (
          <li key={c.id} className={c.id === choisie ? "cca-choisie" : ""}>
            <div className="admin-info">
              <strong><span className="cca-code">{c.code || "— sans code —"}</span> · {STATUTS[c.status] || c.status}{c.payment_environment === "sandbox" && " · TEST"}</strong>
              <small>{date(c.created_at)} · {c.buyer_name} → {c.recipient_name} ({c.recipient_email}){c.status === "active" && !c.recipient_email_sent_at ? " · courriel NON envoyé" : ""}</small>
              {c.physical && (
                <small>
                  {c.shipped_at ? <b className="ok">Postée le {date(c.shipped_at)}</b> : <b>À poster</b>} · {c.shipping_address?.nom}, {c.shipping_address?.rue}, {c.shipping_address?.ville} ({c.shipping_address?.province}) {c.shipping_address?.codePostal}
                </small>
              )}
            </div>
            <span className="admin-prix">{prix(c.balance)}{Number(c.balance) !== Number(c.amount) && <small className="petit"> / {prix(c.amount)}</small>}</span>
            {c.physical && !c.shipped_at && c.status !== "pending" && c.status !== "failed" && <button className="btn btn-contour btn-petit" onClick={() => marquerPostee(c)}>Postée</button>}
            {(c.status === "active" || c.status === "used") && <button className="btn btn-fonce btn-petit" onClick={() => { setChoisie(c.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Gérer</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FicheCarte({ carte, fermer, recharger }) {
  const [hist, setHist] = useState(null);
  const [montant, setMontant] = useState("");
  const [note, setNote] = useState("");
  const [etat, setEtat] = useState({ envoi: false, msg: "", ok: false });
  const [correction, setCorrection] = useState(false);
  const [nouveauSolde, setNouveauSolde] = useState("");
  const [raison, setRaison] = useState("");

  const chargerHist = useCallback(async () => {
    const { data } = await supabase.from("gift_card_transactions").select("*").eq("gift_card_id", carte.id).order("created_at", { ascending: false });
    setHist(data || []);
  }, [carte.id]);
  useEffect(() => { chargerHist(); }, [chargerHist]);

  const solde = Number(carte.balance);
  const m = montantSaisi(montant);
  const apres = Math.max(0, Math.round((solde - m) * 100) / 100);

  const deduire = async (e) => {
    e.preventDefault();
    if (!(m > 0)) { setEtat({ envoi: false, ok: false, msg: "Entrez le montant dépensé." }); return; }
    if (m > solde) { setEtat({ envoi: false, ok: false, msg: `Le montant dépasse le solde (${prix(solde)}). Le client paie la différence autrement.` }); return; }
    if (!confirm(`Déduire ${prix(m)} de la carte ${carte.code} ?\nSolde restant : ${prix(apres)}`)) return;
    setEtat({ envoi: true, ok: false, msg: "" });
    const { data, error } = await supabase.rpc("admin_redeem_gift_card", { p_card: carte.id, p_amount: m, p_note: note || null });
    if (error) { setEtat({ envoi: false, ok: false, msg: erreurSql(error) }); return; }
    setMontant(""); setNote("");
    setEtat({ envoi: false, ok: true, msg: `${prix(m)} déduits. Solde restant : ${prix(data?.balance ?? apres)}.` });
    await recharger(); chargerHist();
  };

  const corriger = async (e) => {
    e.preventDefault();
    setEtat({ envoi: true, ok: false, msg: "" });
    const { data, error } = await supabase.rpc("admin_adjust_gift_card", { p_card: carte.id, p_balance: montantSaisi(nouveauSolde), p_note: raison });
    if (error) { setEtat({ envoi: false, ok: false, msg: erreurSql(error) }); return; }
    setCorrection(false); setNouveauSolde(""); setRaison("");
    setEtat({ envoi: false, ok: true, msg: `Solde corrigé : ${prix(data?.balance)}.` });
    await recharger(); chargerHist();
  };

  const utilisable = carte.status === "active";

  return (
    <section className="cca-fiche">
      <button className="icone-btn cca-fermer" onClick={fermer} aria-label="Fermer">×</button>
      <div className="cca-entete">
        <div>
          <span className="cca-code cca-code-grand">{carte.code}</span>
          <small>{STATUTS[carte.status] || carte.status} · pour {carte.recipient_name} · offerte par {carte.buyer_name} le {date(carte.paid_at || carte.created_at)}</small>
        </div>
        <div className="cca-solde">
          <span>Solde disponible</span>
          <strong>{prix(solde)}</strong>
          <small>sur {prix(carte.amount)}</small>
        </div>
      </div>

      {carte.email_error && <p className="alerte">Courriel non livré : {carte.email_error}. Transmettez le code au destinataire ({carte.recipient_email}).</p>}

      {utilisable ? (
        <form className="cca-deduire form" onSubmit={deduire}>
          <div className="form-2">
            <label>Montant dépensé ($)<input inputMode="decimal" placeholder="50,00" value={montant} onChange={(e) => setMontant(e.target.value)} autoFocus /></label>
            <label>Note (facture, articles…)<input placeholder="Facture #1234" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} /></label>
          </div>
          {m > 0 && (
            <div className={`cca-calcul ${m > solde ? "cca-calcul-depasse" : ""}`}>
              <span>{prix(solde)} − {prix(m)}</span>
              <strong>{m > solde ? `Dépasse de ${prix(m - solde)}` : `Reste ${prix(apres)}`}</strong>
            </div>
          )}
          <button className="btn btn-orange btn-plein" disabled={etat.envoi || !(m > 0) || m > solde}>{etat.envoi ? "Enregistrement…" : m > 0 && m <= solde ? `Déduire ${prix(m)}` : "Déduire"}</button>
        </form>
      ) : (
        <p className="alerte">{carte.status === "used" ? "Cette carte a été utilisée au complet (solde 0 $)." : "Cette carte n'est pas utilisable."}</p>
      )}
      {etat.msg && <div className={etat.ok ? "alerte alerte-ok" : "alerte"}>{etat.msg}</div>}

      <h4 className="cca-titre-hist">Historique</h4>
      {!hist ? <p className="petit">Chargement…</p> : (
        <ul className="cca-hist">
          {hist.map((t) => (
            <li key={t.id}>
              <span>{dateHeure(t.created_at)}{t.created_by_name ? ` · ${t.created_by_name}` : ""}{t.note ? ` · ${t.note}` : ""}</span>
              <strong className={t.kind === "correction" ? "cca-corr" : ""}>{t.kind === "correction" ? `Correction ${Number(t.amount) >= 0 ? "+" : "−"}${prix(Math.abs(t.amount))}` : `−${prix(t.amount)}`}</strong>
              <em>reste {prix(t.balance_after)}</em>
            </li>
          ))}
          <li>
            <span>{dateHeure(carte.paid_at || carte.created_at)} · Achat en ligne</span>
            <strong className="cca-corr">+{prix(carte.amount)}</strong>
            <em>solde initial</em>
          </li>
        </ul>
      )}

      {(carte.status === "active" || carte.status === "used") && (
        correction ? (
          <form className="form cca-correction" onSubmit={corriger}>
            <div className="form-2">
              <label>Nouveau solde ($)<input inputMode="decimal" value={nouveauSolde} onChange={(e) => setNouveauSolde(e.target.value)} placeholder={String(solde)} /></label>
              <label>Raison (obligatoire)<input value={raison} onChange={(e) => setRaison(e.target.value)} placeholder="Erreur de saisie, retour d'article…" /></label>
            </div>
            <div className="actions-ligne cca-actions">
              <button className="btn btn-fonce btn-petit" disabled={etat.envoi}>Corriger le solde</button>
              <button type="button" className="lien-discret" onClick={() => setCorrection(false)}>Annuler</button>
            </div>
          </form>
        ) : (
          <button className="lien-discret" onClick={() => setCorrection(true)}>Corriger le solde (erreur, retour d'article)</button>
        )
      )}
    </section>
  );
}
