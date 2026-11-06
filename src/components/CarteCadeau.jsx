// Visuel de la carte cadeau (aperçu en direct, page de confirmation, admin)
export const montantTxt = (n) =>
  (Number(n) || 0).toLocaleString("fr-CA", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }) + " $";

export default function CarteCadeau({ montant, pour, de, code, petite = false }) {
  return (
    <div className={`cc-carte ${petite ? "cc-carte-petite" : ""}`} aria-label={`Carte cadeau Arc En Flèche de ${montantTxt(montant)}`}>
      <div className="cc-topo" aria-hidden="true" />
      <div className="cc-cible" aria-hidden="true" />
      <div className="cc-haut">
        <img src="/images/logo-clair.png" alt="Arc En Flèche" className="cc-logo" />
        <div className="cc-montant">
          <span>Carte cadeau</span>
          <strong>{montant ? montantTxt(montant) : "— $"}</strong>
        </div>
      </div>
      <div className="cc-bas">
        <div>
          <span className="cc-etiq">Pour</span>
          <strong className="cc-nom">{pour || "Nom du destinataire"}</strong>
          <span className="cc-de">De la part de {de || "vous"}</span>
        </div>
        <span className="cc-code">{code || "AEF-••••-••••-••••"}</span>
      </div>
      <div className="cc-fleche" aria-hidden="true" />
    </div>
  );
}
