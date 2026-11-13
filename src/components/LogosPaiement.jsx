import { PAIEMENTS } from "../data/site.js";

// Marques d'acceptation des moyens de paiement (page de paiement Clover)
const LOGOS = {
  visa: {
    nom: "Visa",
    svg: (
      <svg viewBox="0 0 64 40" aria-hidden="true">
        <text x="32" y="27.5" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontStyle="italic" fontSize="21" letterSpacing="-0.5" fill="#1a1f71">VISA</text>
        <path d="M11 31h14" stroke="#f7b600" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    ),
  },
  mastercard: {
    nom: "Mastercard",
    svg: (
      <svg viewBox="0 0 64 40" aria-hidden="true">
        <circle cx="25" cy="20" r="11.5" fill="#eb001b" />
        <circle cx="39" cy="20" r="11.5" fill="#f79e1b" />
        <path d="M32 10.9a11.5 11.5 0 0 1 0 18.2 11.5 11.5 0 0 1 0-18.2z" fill="#ff5f00" />
      </svg>
    ),
  },
  applepay: {
    nom: "Apple Pay",
    svg: (
      <svg viewBox="0 0 64 40" aria-hidden="true">
        <g transform="translate(9 10.2) scale(.78)" fill="#000">
          <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
        </g>
        <text x="29" y="27" fontFamily="-apple-system, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif" fontWeight="600" fontSize="17" fill="#000">Pay</text>
      </svg>
    ),
  },
  googlepay: {
    nom: "Google Pay",
    svg: (
      <svg viewBox="0 0 64 40" aria-hidden="true">
        <g transform="translate(8 11.5) scale(.72)">
          <path d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3.01h3.88c2.27-2.09 3.58-5.17 3.58-8.82z" fill="#4285f4" />
          <path d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.11A12 12 0 0 0 12 24z" fill="#34a853" />
          <path d="M5.28 14.28a7.2 7.2 0 0 1 0-4.56V6.61H1.27a12 12 0 0 0 0 10.78l4.01-3.11z" fill="#fbbc04" />
          <path d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.61l4.01 3.11C6.22 6.88 8.87 4.77 12 4.77z" fill="#ea4335" />
        </g>
        <text x="29.5" y="27" fontFamily="'Google Sans', 'Product Sans', Roboto, Arial, sans-serif" fontWeight="500" fontSize="17" fill="#5f6368">Pay</text>
      </svg>
    ),
  },
};

export default function LogosPaiement() {
  return (
    <ul className="paiements" aria-label="Moyens de paiement acceptés">
      {PAIEMENTS.filter((k) => LOGOS[k]).map((k) => (
        <li key={k} title={LOGOS[k].nom}><span className="sr">{LOGOS[k].nom}</span>{LOGOS[k].svg}</li>
      ))}
    </ul>
  );
}
