import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { prix, sansAccents } from "../lib/format.js";

const STATUTS = { active: "Active", used: "Utilisée", cancelled: "Annulée", pending: "Paiement non complété", failed: "Échec du paiement" };
const date = (d) => (d ? new Date(d).toLocaleDateString("fr-CA", { day: "numeric", month: "short", year: "numeric" }) : "");

export default function CartesCadeauxAdmin() {
  const [cartes, setCartes] = useState(null);
  const [q, setQ] = useState("");
  const [erreur, setErreur] = useState("");
  const [tout, setTout] = useState(false);

  const charger = useCallback(async () => {
    const { data, error } = await supabase.from("gift_cards").select("*").order("created_at", { ascending: false }).limit(500);
    setErreur(error ? error.message : "");
    setCartes(data || []);
  }, []);
  useEffect(() => { charger(); }, [charger]);

  const maj = async (c, champs) => {
    const { error } = await supabase.from("gift_cards").update(champs).eq("id", c.id);
    if (error) setErreur(error.message); else charger();
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

  return (
    <div>
      <p className="txt">{cartes ? `${vendues.length} carte(s) vendue(s) · ${prix(actives.reduce((s, c) => s + Number(c.balance), 0))} de solde actif · ${aExpedier} carte(s) physique(s) à poster` : "Chargement…"}</p>
      <div className="admin-outils">
        <input placeholder="Code, nom ou courriel…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn btn-contour btn-petit" onClick={charger}>Actualiser</button>
        <label className="petit"><input type="checkbox" checked={tout} onChange={(e) => setTout(e.target.checked)} /> Afficher les paiements non complétés</label>
      </div>
      {erreur && <div className="alerte">{erreur}</div>}
      {cartes && liste.length === 0 && <p className="petit">Aucune carte cadeau pour l'instant.</p>}
      <ul className="admin-liste">
        {liste.map((c) => (
          <li key={c.id}>
            <div className="admin-info">
              <strong><span style={{ fontFamily: "ui-monospace, Menlo, monospace", color: "var(--orange-2)" }}>{c.code || "— sans code —"}</span> · {STATUTS[c.status]}{c.payment_environment === "sandbox" && " · TEST"}</strong>
              <small>{date(c.created_at)} · {c.buyer_name} → {c.recipient_name} ({c.recipient_email}){c.status === "active" && !c.recipient_email_sent_at ? " · courriel NON envoyé" : ""}</small>
              {c.physical && (
                <small>
                  {c.shipped_at ? <b className="ok">Postée le {date(c.shipped_at)}</b> : <b>À poster</b>} · {c.shipping_address?.nom}, {c.shipping_address?.rue}, {c.shipping_address?.ville} ({c.shipping_address?.province}) {c.shipping_address?.codePostal}
                </small>
              )}
              {c.message && <small>« {c.message} »</small>}
            </div>
            <span className="admin-prix">{prix(c.balance)}{Number(c.balance) !== Number(c.amount) && <small className="petit"> / {prix(c.amount)}</small>}</span>
            {c.physical && !c.shipped_at && <button className="btn btn-contour btn-petit" onClick={() => maj(c, { shipped_at: new Date().toISOString() })}>Postée</button>}
            {c.status === "active" && <button className="btn btn-fonce btn-petit" onClick={() => {
              const v = prompt(`Nouveau solde pour ${c.code} (0 = utilisée au complet)`, String(c.balance));
              if (v == null) return;
              const n = Math.max(0, Number(String(v).replace(",", ".")) || 0);
              maj(c, { balance: n, status: n === 0 ? "used" : "active" });
            }}>Solde</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}
