/*
# Cartes cadeaux Arc En Flèche

Table `gift_cards` : une ligne par carte vendue, créée UNIQUEMENT par la fonction
edge `gift-card` (clé service_role) après un paiement Square réussi.

## Sécurité (RLS)
- Aucun accès anonyme : les visiteurs ne peuvent ni lire ni créer de cartes.
- Les administrateurs (profiles.is_admin) peuvent lire et mettre à jour (solde, statut).
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

DROP POLICY IF EXISTS "gift_cards_admin_select" ON gift_cards;
CREATE POLICY "gift_cards_admin_select" ON gift_cards FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin));

DROP POLICY IF EXISTS "gift_cards_admin_update" ON gift_cards;
CREATE POLICY "gift_cards_admin_update" ON gift_cards FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin));
