/*
# Journal des webhooks Clover

Chaque appel reçu par la fonction clover-webhook est enregistré (verdict de signature,
contenu) pour pouvoir diagnostiquer une confirmation de paiement qui n'arrive pas.
Aucun accès public : lecture réservée aux administrateurs, écriture par service_role.
*/
CREATE TABLE IF NOT EXISTS clover_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at timestamptz NOT NULL DEFAULT now(),
  verdict text NOT NULL,
  signature_header text,
  headers jsonb,
  body text
);
CREATE INDEX IF NOT EXISTS clover_webhook_events_received_idx ON clover_webhook_events (received_at DESC);
ALTER TABLE clover_webhook_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clover_webhook_events_admin_select" ON clover_webhook_events;
CREATE POLICY "clover_webhook_events_admin_select" ON clover_webhook_events FOR SELECT
  TO authenticated USING (is_admin());
