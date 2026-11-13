/*
# Cartes cadeaux : suivi de l'envoi des courriels
- emails_done_at : fin de la tentative d'envoi (réussie ou non)
- email_error : dernière erreur d'envoi, visible dans l'admin
*/
ALTER TABLE gift_cards ADD COLUMN IF NOT EXISTS emails_done_at timestamptz;
ALTER TABLE gift_cards ADD COLUMN IF NOT EXISTS email_error text;
