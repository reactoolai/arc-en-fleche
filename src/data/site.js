export const INFOS = {
  rue: "413, rue St-Alphonse",
  ville: "Saint-Bruno-Lac-Saint-Jean (Québec)",
  codePostal: "G0W 2L0",
  tel: "418 343-3301",
  telHref: "tel:+14183433301",
  courriel: "info@arcenfleche.com",
  facebook: "https://www.facebook.com/profile.php?id=100063644495251",
  carte: "https://www.google.com/maps?q=413+Rue+St-Alphonse+Saint-Bruno+QC+G0W2L0&output=embed",
  itineraire: "https://www.google.com/maps/dir/?api=1&destination=413+Rue+St-Alphonse+Saint-Bruno+QC+G0W2L0",
};

// [jour JS (0 = dimanche), ouverture, fermeture] en heures décimales
export const HORAIRE = [
  { label: "Lundi – Mercredi", plage: "9 h à 17 h 30", jours: [1, 2, 3], de: 9, a: 17.5 },
  { label: "Jeudi – Vendredi", plage: "9 h à 21 h", jours: [4, 5], de: 9, a: 21 },
  { label: "Samedi", plage: "9 h à 16 h", jours: [6], de: 9, a: 16 },
  { label: "Dimanche", plage: "Fermé", jours: [0], de: null, a: null },
];

export const LIVRAISON = { seuil: 150, frais: 12.95 };

export const SERVICES = [
  { nom: "Changement de corde et câbles", prix: "À partir de 45 $", desc: "Arcs à poulies et arbalètes — corde installée, synchronisation vérifiée, cire appliquée.", delai: "24 à 48 h", icone: "corde" },
  { nom: "Réglage et mise au point d'arc", prix: "À partir de 60 $", desc: "Tillering, alignement du repose-flèche, réglage du viseur et test en allée de tir.", delai: "48 h", icone: "arc" },
  { nom: "Empennage et coupe de flèches", prix: "2,50 $ / flèche", desc: "Coupe à votre allonge, empennage à neuf, inserts collés.", delai: "Sur place", icone: "fleche" },
  { nom: "Entretien de moulinet", prix: "À partir de 35 $", desc: "Démontage complet, nettoyage, graissage, remplacement des roulements usés.", delai: "3 à 5 jours", icone: "moulinet" },
  { nom: "Mise au point de carabine", prix: "À partir de 50 $", desc: "Montage de lunette, ajustement au collimateur et zérotage.", delai: "48 h", icone: "cible" },
  { nom: "Réparation d'arbalète", prix: "Sur évaluation", desc: "Diagnostic gratuit — gâchette, rail, arbrier, remplacement de pièces d'origine.", delai: "Variable", icone: "arbalete" },
];

export const MARQUES = [
  "Penn", "Shimano", "Abu Garcia", "Daiwa", "Pflueger", "Fenwick", "Berkley", "Rapala", "Blue Fox",
  "Flambeau", "Plano", "Easton", "Allen", "Weaver", "Browning", "Crosman", "Daisy", "Thermacell",
  "Buck Expert", "Buck Hunter", "Spypoint", "Mustad", "Eagle Claw", "Remington", "Heddon", "Minn Kota",
];

export const ALBUM = [
  { src: "/images/orignal.webp", alt: "Orignal récolté en forêt boréale", w: 4, h: 3 },
  { src: "/images/archere.webp", alt: "Archère en position de tir en forêt", w: 3, h: 4 },
  { src: "/images/chevreuil-neige.webp", alt: "Deux chasseurs en dossard orange avec un chevreuil dans la neige", w: 1, h: 1 },
  { src: "/images/hero-etang.webp", alt: "Tir à l'arc au bord d'un étang", w: 4, h: 3 },
  { src: "/images/equipe-foret.webp", alt: "L'équipe Arc En Flèche lors d'un parcours 3D", w: 3, h: 4 },
  { src: "/images/dindon.webp", alt: "Dindon sauvage récolté au printemps", w: 3, h: 2 },
  { src: "/images/archer.webp", alt: "Archer en t-shirt Arc En Flèche en forêt", w: 3, h: 4 },
  { src: "/images/releve.webp", alt: "Jeune archère à côté d'une cible 3D", w: 3, h: 4 },
  { src: "/images/competition.webp", alt: "Famille d'archers lors d'une compétition", w: 3, h: 4 },
  { src: "/images/comptoir.webp", alt: "L'équipe au comptoir de la boutique", w: 3, h: 4 },
  { src: "/images/equipe-boutique.webp", alt: "L'équipe devant la boutique de Saint-Bruno", w: 3, h: 4 },
];
