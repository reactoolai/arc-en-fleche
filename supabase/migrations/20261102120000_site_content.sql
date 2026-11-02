/*
# Contenu du site modifiable par l'administrateur

Une seule ligne (cle = 'site') contient en JSON : coordonnées, heures,
services de l'atelier, album photo, textes et photos des pages.
Lecture publique, écriture réservée aux administrateurs (is_admin()).
*/

CREATE TABLE IF NOT EXISTS site_content (
  cle text PRIMARY KEY,
  valeur jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_content_read_all" ON site_content;
CREATE POLICY "site_content_read_all" ON site_content FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "site_content_admin_insert" ON site_content;
CREATE POLICY "site_content_admin_insert" ON site_content FOR INSERT
  TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "site_content_admin_update" ON site_content;
CREATE POLICY "site_content_admin_update" ON site_content FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());
