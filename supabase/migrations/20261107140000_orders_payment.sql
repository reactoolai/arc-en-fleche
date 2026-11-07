/*
# Commandes boutique : paiement en ligne Clover

Ajoute le détail du paiement aux commandes. Les commandes payées sont créées
uniquement par la fonction edge `shop-checkout` (service_role) après un paiement Clover réussi.
*/
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal numeric(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping numeric(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tps numeric(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tvq numeric(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_mode text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_provider text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_id text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_environment text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS orders_payment_id_key ON orders (payment_id) WHERE payment_id IS NOT NULL;

-- Les administrateurs voient toutes les commandes
DROP POLICY IF EXISTS "orders_admin_select" ON orders;
CREATE POLICY "orders_admin_select" ON orders FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin));
