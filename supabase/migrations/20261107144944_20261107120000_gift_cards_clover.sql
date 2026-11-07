/*
# Cartes cadeaux : paiement Clover

Colonnes de paiement rendues indépendantes du fournisseur (Square → Clover).

1. Changes
- Rename `gift_cards.square_payment_id` → `payment_id` (si existant)
- Rename `gift_cards.square_receipt_url` → `receipt_url` (si existant)
- Rename `gift_cards.square_environment` → `payment_environment` (si existant)
- Add `payment_provider` text NOT NULL DEFAULT 'clover'

2. Security
- Aucun changement de RLS — les policies existantes s'appliquent toujours.
*/

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gift_cards' AND column_name = 'square_payment_id') THEN
    ALTER TABLE gift_cards RENAME COLUMN square_payment_id TO payment_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gift_cards' AND column_name = 'square_receipt_url') THEN
    ALTER TABLE gift_cards RENAME COLUMN square_receipt_url TO receipt_url;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gift_cards' AND column_name = 'square_environment') THEN
    ALTER TABLE gift_cards RENAME COLUMN square_environment TO payment_environment;
  END IF;
END $$;

ALTER TABLE gift_cards ADD COLUMN IF NOT EXISTS payment_provider text NOT NULL DEFAULT 'clover';
