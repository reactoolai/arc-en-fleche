/*
# Suivi des dépenses des cartes cadeaux

- Table gift_card_transactions : historique de chaque utilisation en boutique
  (montant dépensé, solde avant/après, note, employé, date) et des corrections.
- admin_redeem_gift_card(carte, montant, note) : déduit un montant du solde (atomique, verrou
  sur la carte, refuse un montant supérieur au solde ou une carte non active).
- admin_adjust_gift_card(carte, nouveau_solde, note) : correction manuelle du solde, tracée.
Réservé aux administrateurs (is_admin()).
*/
CREATE TABLE IF NOT EXISTS gift_card_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_card_id uuid NOT NULL REFERENCES gift_cards(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'redeem' CHECK (kind IN ('redeem', 'correction')),
  amount numeric(10,2) NOT NULL,
  balance_before numeric(10,2) NOT NULL,
  balance_after numeric(10,2) NOT NULL,
  note text,
  created_by uuid DEFAULT auth.uid(),
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gift_card_transactions_card_idx ON gift_card_transactions (gift_card_id, created_at DESC);

ALTER TABLE gift_card_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gift_card_transactions_admin_select" ON gift_card_transactions;
CREATE POLICY "gift_card_transactions_admin_select" ON gift_card_transactions FOR SELECT
  TO authenticated USING (is_admin());

CREATE OR REPLACE FUNCTION admin_redeem_gift_card(p_card uuid, p_amount numeric, p_note text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g gift_cards%ROWTYPE;
  v_montant numeric(10,2) := round(p_amount, 2);
  v_nouveau numeric(10,2);
  v_nom text;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Accès réservé aux administrateurs'; END IF;
  SELECT * INTO g FROM gift_cards WHERE id = p_card FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Carte introuvable'; END IF;
  IF g.status <> 'active' THEN RAISE EXCEPTION 'Cette carte n''est pas active (statut : %)', g.status; END IF;
  IF v_montant IS NULL OR v_montant <= 0 THEN RAISE EXCEPTION 'Entrez un montant supérieur à 0'; END IF;
  IF v_montant > g.balance THEN RAISE EXCEPTION 'Montant supérieur au solde disponible (% $)', g.balance; END IF;

  v_nouveau := g.balance - v_montant;
  SELECT coalesce(full_name, email) INTO v_nom FROM profiles WHERE id = auth.uid();
  UPDATE gift_cards SET balance = v_nouveau, status = CASE WHEN v_nouveau = 0 THEN 'used' ELSE 'active' END WHERE id = p_card;
  INSERT INTO gift_card_transactions (gift_card_id, kind, amount, balance_before, balance_after, note, created_by_name)
  VALUES (p_card, 'redeem', v_montant, g.balance, v_nouveau, nullif(trim(p_note), ''), v_nom);
  RETURN json_build_object('balance', v_nouveau, 'status', CASE WHEN v_nouveau = 0 THEN 'used' ELSE 'active' END);
END;
$$;

CREATE OR REPLACE FUNCTION admin_adjust_gift_card(p_card uuid, p_balance numeric, p_note text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g gift_cards%ROWTYPE;
  v_solde numeric(10,2) := round(p_balance, 2);
  v_nom text;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Accès réservé aux administrateurs'; END IF;
  IF coalesce(trim(p_note), '') = '' THEN RAISE EXCEPTION 'Indiquez la raison de la correction'; END IF;
  SELECT * INTO g FROM gift_cards WHERE id = p_card FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Carte introuvable'; END IF;
  IF g.status NOT IN ('active', 'used') THEN RAISE EXCEPTION 'Cette carte ne peut pas être corrigée (statut : %)', g.status; END IF;
  IF v_solde IS NULL OR v_solde < 0 OR v_solde > g.amount THEN RAISE EXCEPTION 'Le solde doit être entre 0 et % $', g.amount; END IF;

  SELECT coalesce(full_name, email) INTO v_nom FROM profiles WHERE id = auth.uid();
  UPDATE gift_cards SET balance = v_solde, status = CASE WHEN v_solde = 0 THEN 'used' ELSE 'active' END WHERE id = p_card;
  INSERT INTO gift_card_transactions (gift_card_id, kind, amount, balance_before, balance_after, note, created_by_name)
  VALUES (p_card, 'correction', v_solde - g.balance, g.balance, v_solde, trim(p_note), v_nom);
  RETURN json_build_object('balance', v_solde, 'status', CASE WHEN v_solde = 0 THEN 'used' ELSE 'active' END);
END;
$$;

REVOKE ALL ON FUNCTION admin_redeem_gift_card(uuid, numeric, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION admin_adjust_gift_card(uuid, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_redeem_gift_card(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_adjust_gift_card(uuid, numeric, text) TO authenticated;
