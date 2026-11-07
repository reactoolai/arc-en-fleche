/*
# Clover Hosted Checkout + webhook

- gift_cards : une carte est d'abord « pending » (sans code) ; le code n'est généré
  qu'après confirmation du paiement par le webhook Clover.
- orders : statut « awaiting_payment » jusqu'au webhook, puis « paid ».
*/
ALTER TABLE gift_cards ALTER COLUMN code DROP NOT NULL;
ALTER TABLE gift_cards DROP CONSTRAINT IF EXISTS gift_cards_status_check;
ALTER TABLE gift_cards ADD CONSTRAINT gift_cards_status_check CHECK (status IN ('pending', 'active', 'used', 'cancelled', 'failed'));
ALTER TABLE gift_cards ADD COLUMN IF NOT EXISTS checkout_session_id text;
ALTER TABLE gift_cards ADD COLUMN IF NOT EXISTS paid_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS gift_cards_checkout_session_key ON gift_cards (checkout_session_id) WHERE checkout_session_id IS NOT NULL;

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
ALTER TABLE orders ADD COLUMN IF NOT EXISTS checkout_session_id text;
CREATE UNIQUE INDEX IF NOT EXISTS orders_checkout_session_key ON orders (checkout_session_id) WHERE checkout_session_id IS NOT NULL;
