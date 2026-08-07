/*
# Make first user admin

Automatically grants admin privileges to the very first user who registers,
so the shop owner can manage the catalog immediately after creating their account.
All subsequent users get is_admin = false (regular clients).
*/

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count int;
BEGIN
  SELECT COUNT(*) INTO user_count FROM profiles;
  INSERT INTO profiles (id, email, full_name, is_admin)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', user_count = 0);
  RETURN NEW;
END;
$$;
