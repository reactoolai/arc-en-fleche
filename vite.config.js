import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Pages avec leurs propres balises de partage (Facebook, Messenger, LinkedIn, X…).
// Les robots des réseaux sociaux n'exécutent pas le JavaScript : on génère donc
// au build un dist/<page>/index.html dont le <head> contient les bonnes balises.
const SITE = "https://arcenfleche.com";
const PAGES_PARTAGE = {
  "cartes-cadeaux": {
    title: "Cartes cadeaux Arc En Flèche — Offrez la prochaine sortie",
    description: "Offrez une carte cadeau Arc En Flèche de 100 $ à 1000 $ ou du montant de votre choix : archerie, chasse, pêche et atelier. Envoyée par courriel avec votre message, ou par la poste.",
    image: `${SITE}/images/og-cartes-cadeaux.jpg`,
    alt: "Carte cadeau Arc En Flèche de 200 $ — Offrez la prochaine sortie",
  },
};

const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

function pagesPartage() {
  return {
    name: "pages-partage",
    apply: "build",
    closeBundle() {
      const dist = resolve(__dirname, "dist");
      const base = readFileSync(resolve(dist, "index.html"), "utf8");
      for (const [chemin, m] of Object.entries(PAGES_PARTAGE)) {
        const url = `${SITE}/${chemin}`;
        const head = [
          `<title>${esc(m.title)}</title>`,
          `<meta name="description" content="${esc(m.description)}" />`,
          `<link rel="canonical" href="${url}" />`,
          `<meta property="og:type" content="website" />`,
          `<meta property="og:site_name" content="Arc En Flèche" />`,
          `<meta property="og:locale" content="fr_CA" />`,
          `<meta property="og:url" content="${url}" />`,
          `<meta property="og:title" content="${esc(m.title)}" />`,
          `<meta property="og:description" content="${esc(m.description)}" />`,
          `<meta property="og:image" content="${m.image}" />`,
          `<meta property="og:image:secure_url" content="${m.image}" />`,
          `<meta property="og:image:type" content="image/jpeg" />`,
          `<meta property="og:image:width" content="1200" />`,
          `<meta property="og:image:height" content="630" />`,
          `<meta property="og:image:alt" content="${esc(m.alt)}" />`,
          `<meta name="twitter:card" content="summary_large_image" />`,
          `<meta name="twitter:title" content="${esc(m.title)}" />`,
          `<meta name="twitter:description" content="${esc(m.description)}" />`,
          `<meta name="twitter:image" content="${m.image}" />`,
          `<meta name="twitter:image:alt" content="${esc(m.alt)}" />`,
        ].join("\n    ");
        const html = base
          .replace(/<title>[\s\S]*?<\/title>\s*/, "")
          .replace(/\s*<meta (name="description"|property="og:[^"]+"|name="twitter:[^"]+")[^>]*>/g, "")
          .replace(/<meta name="theme-color"/, `${head}\n    <meta name="theme-color"`);
        mkdirSync(resolve(dist, chemin), { recursive: true });
        writeFileSync(resolve(dist, chemin, "index.html"), html);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), pagesPartage()],
  server: { port: 5173 },
});
