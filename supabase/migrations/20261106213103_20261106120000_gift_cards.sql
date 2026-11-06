/*
# Cartes cadeaux Arc En Flèche

Table `gift_cards` : une ligne par carte vendue, créée UNIQUEMENT par la fonction
edge `gift-card` (clé service_role) après un paiement Square réussi.

1. New Tables
- `gift_cards`
- `id` (uuid, primary key, auto-generated)
- `code` (text, unique, not null) — code lisible AEF-XXXX-XXXX-XXXX
- `amount` (numeric, not null, > 0) — valeur de la carte
- `balance` (numeric, not null) — solde restant
- `currency` (text, default 'CAD')
- `physical` (boolean, default false) — carte physique demandée
- `physical_fee` (numeric, default 0) — frais de carte physique
- `total_charged` (numeric, not null) — total facturé via Square
- `buyer_name` / `buyer_email` (text, not null) — acheteur
- `recipient_name` / `recipient_email` (text, not null) — destinataire
- `message` (text, nullable) — message personnalisé
- `shipping_address` (jsonb, nullable) — adresse postale si carte physique
- `status` (text, default 'active', check active/used/cancelled)
- `square_payment_id` (text, unique) — ID de paiement Square
- `square_receipt_url` (text, nullable) — URL du reçu Square
- `square_environment` (text, nullable) — sandbox ou production
- `recipient_email_sent_at` / `team_notified_at` / `shipped_at` (timestamptz, nullable)
- `created_at` (timestamptz, default now())

2. Indexes
- `gift_cards_created_at_idx` on `created_at DESC`

3. Security (RLS)
- Enable RLS on `gift_cards`.
- No anon access: visitors cannot read or create cards.
- Admins (profiles.is_admin) can SELECT and UPDATE.
- INSERT/DELETE only via service_role (edge function), not via Data API.
- Grant service_role full CRUD for the edge function.
*/

CREATE TABLE IF NOT EXISTS gift_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  balance numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'CAD',
  physical boolean NOT NULL DEFAULT false,
  physical_fee numeric(10,2) NOT NULL DEFAULT 0,
  total_charged numeric(10,2) NOT NULL,
  buyer_name text NOT NULL,
  buyer_email text NOT NULL,
  recipient_name text NOT NULL,
  recipient_email text NOT NULL,
  message text,
  shipping_address jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'cancelled')),
  square_payment_id text UNIQUE,
  square_receipt_url text,
  square_environment text,
  recipient_email_sent_at timestamptz,
  team_notified_at timestamptz,
  shipped_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gift_cards_created_at_idx ON gift_cards (created_at DESC);

ALTER TABLE gift_cards ENABLE ROW LEVEL SECURITY;

GRANT SELECT, UPDATE ON gift_cards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON gift_cards TO service_role;

DROP POLICY IF EXISTS "gift_cards_admin_select" ON gift_cards;
CREATE POLICY "gift_cards_admin_select" ON gift_cards FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin));

DROP POLICY IF EXISTS "gift_cards_admin_update" ON gift_cards;
CREATE POLICY "gift_cards_admin_update" ON gift_cards FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin));
