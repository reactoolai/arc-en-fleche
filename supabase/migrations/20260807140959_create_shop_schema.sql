/*
# Arc En Flèche — Base de données de la boutique

## Vue d'ensemble
Crée le schéma complet pour la boutique d'archerie/chasse/pêche Arc En Flèche:
catégories, sous-catégories, produits, profils utilisateurs, et système de rôles admin.

## Nouvelles tables

1. `profiles` — Profils utilisateurs (clients et admins)
   - `id` (uuid, PK, lié à auth.users)
   - `email` (text)
   - `full_name` (text, nullable)
   - `phone` (text, nullable)
   - `is_admin` (boolean, default false) — détermine l'accès admin
   - `created_at` (timestamp)

2. `categories` — Départements de la boutique (Courroies, Archerie, Pêche, etc.)
   - `id` (serial, PK)
   - `nom` (text, unique, not null)
   - `description` (text)
   - `sort_order` (int, default 0) — ordre d'affichage
   - `created_at` (timestamp)

3. `subcategories` — Sous-catégories (ex: Sam Hunting 3 points, Standard, etc.)
   - `id` (serial, PK)
   - `category_id` (int, FK vers categories)
   - `nom` (text, not null)
   - `sort_order` (int, default 0)
   - `created_at` (timestamp)

4. `products` — Inventaire de produits
   - `id` (serial, PK)
   - `subcategory_id` (int, FK vers subcategories)
   - `category_id` (int, FK vers categories) — dénormalisé pour requêtes faciles
   - `nom` (text, not null)
   - `description` (text)
   - `prix` (numeric(10,2), not null) — prix en CAD
   - `source` (text) — "Sam Hunting" ou "Arc En Flèche"
   - `tag` (text, nullable) — "Meilleur vendeur", "Nouveau", etc.
   - `stock` (boolean, default true) — en stock ou rupture
   - `images` (text[]) — URLs des photos produit
   - `created_at` (timestamp)

5. `orders` — Commandes clients
   - `id` (uuid, PK)
   - `user_id` (uuid, FK vers auth.users)
   - `items` (jsonb) — détail des articles commandés
   - `total` (numeric(10,2))
   - `status` (text, default 'pending')
   - `created_at` (timestamp)

## Sécurité (RLS)
- `profiles`: lecture publique, modification par le propriétaire du profil
- `categories`, `subcategories`, `products`: lecture publique (anon + authenticated),
  écriture réservée aux admins (is_admin = true sur le profil)
- `orders`: lecture/écriture par le propriétaire de la commande uniquement

## Notes importantes
1. Les tables catalogues (categories, subcategories, products) sont lisibles par tous
   (visiteurs anonymes inclus) car c'est une boutique publique.
2. L'écriture du catalogue est réservée aux admins via une fonction SECURITY DEFINER
   qui vérifie le statut admin.
3. Le panier utilise le localStorage côté client — pas de table panier en base.
*/

-- ============================================
-- PROFILES
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  phone text,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_read_all" ON profiles;
CREATE POLICY "profiles_read_all" ON profiles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

-- ============================================
-- CATEGORIES
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
  id serial PRIMARY KEY,
  nom text UNIQUE NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_read_all" ON categories;
CREATE POLICY "categories_read_all" ON categories FOR SELECT
  TO anon, authenticated USING (true);

-- ============================================
-- SUBCATEGORIES
-- ============================================
CREATE TABLE IF NOT EXISTS subcategories (
  id serial PRIMARY KEY,
  category_id int NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  nom text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subcategories_read_all" ON subcategories;
CREATE POLICY "subcategories_read_all" ON subcategories FOR SELECT
  TO anon, authenticated USING (true);

-- ============================================
-- PRODUCTS
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id serial PRIMARY KEY,
  subcategory_id int REFERENCES subcategories(id) ON DELETE SET NULL,
  category_id int NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  nom text NOT NULL,
  description text,
  prix numeric(10,2) NOT NULL,
  source text DEFAULT 'Arc En Flèche',
  tag text,
  stock boolean NOT NULL DEFAULT true,
  images text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_read_all" ON products;
CREATE POLICY "products_read_all" ON products FOR SELECT
  TO anon, authenticated USING (true);

-- ============================================
-- ORDERS
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  items jsonb NOT NULL DEFAULT '[]',
  total numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_select_own" ON orders;
CREATE POLICY "orders_select_own" ON orders FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "orders_insert_own" ON orders;
CREATE POLICY "orders_insert_own" ON orders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============================================
-- FONCTION: Vérifier si l'utilisateur est admin
-- ============================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

-- ============================================
-- FONCTIONS CRUD ADMIN (SECURITY DEFINER)
-- ============================================

-- Créer une catégorie
CREATE OR REPLACE FUNCTION admin_create_category(p_nom text, p_description text, p_sort_order int DEFAULT 0)
RETURNS categories
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result categories;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé: administrateur requis';
  END IF;
  INSERT INTO categories (nom, description, sort_order)
  VALUES (p_nom, p_description, p_sort_order)
  RETURNING * INTO result;
  RETURN result;
END;
$$;

-- Modifier une catégorie
CREATE OR REPLACE FUNCTION admin_update_category(p_id int, p_nom text, p_description text, p_sort_order int)
RETURNS categories
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result categories;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé: administrateur requis';
  END IF;
  UPDATE categories SET nom = p_nom, description = p_description, sort_order = p_sort_order
  WHERE id = p_id
  RETURNING * INTO result;
  RETURN result;
END;
$$;

-- Supprimer une catégorie
CREATE OR REPLACE FUNCTION admin_delete_category(p_id int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé: administrateur requis';
  END IF;
  DELETE FROM categories WHERE id = p_id;
END;
$$;

-- Créer une sous-catégorie
CREATE OR REPLACE FUNCTION admin_create_subcategory(p_category_id int, p_nom text, p_sort_order int DEFAULT 0)
RETURNS subcategories
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result subcategories;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé: administrateur requis';
  END IF;
  INSERT INTO subcategories (category_id, nom, sort_order)
  VALUES (p_category_id, p_nom, p_sort_order)
  RETURNING * INTO result;
  RETURN result;
END;
$$;

-- Modifier une sous-catégorie
CREATE OR REPLACE FUNCTION admin_update_subcategory(p_id int, p_category_id int, p_nom text, p_sort_order int)
RETURNS subcategories
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result subcategories;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé: administrateur requis';
  END IF;
  UPDATE subcategories SET category_id = p_category_id, nom = p_nom, sort_order = p_sort_order
  WHERE id = p_id
  RETURNING * INTO result;
  RETURN result;
END;
$$;

-- Supprimer une sous-catégorie
CREATE OR REPLACE FUNCTION admin_delete_subcategory(p_id int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé: administrateur requis';
  END IF;
  DELETE FROM subcategories WHERE id = p_id;
END;
$$;

-- Créer un produit
CREATE OR REPLACE FUNCTION admin_create_product(
  p_subcategory_id int,
  p_category_id int,
  p_nom text,
  p_description text,
  p_prix numeric(10,2),
  p_source text DEFAULT 'Arc En Flèche',
  p_tag text DEFAULT NULL,
  p_stock boolean DEFAULT true,
  p_images text[] DEFAULT '{}'
)
RETURNS products
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result products;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé: administrateur requis';
  END IF;
  INSERT INTO products (subcategory_id, category_id, nom, description, prix, source, tag, stock, images)
  VALUES (p_subcategory_id, p_category_id, p_nom, p_description, p_prix, p_source, p_tag, p_stock, p_images)
  RETURNING * INTO result;
  RETURN result;
END;
$$;

-- Modifier un produit
CREATE OR REPLACE FUNCTION admin_update_product(
  p_id int,
  p_subcategory_id int,
  p_category_id int,
  p_nom text,
  p_description text,
  p_prix numeric(10,2),
  p_source text,
  p_tag text,
  p_stock boolean,
  p_images text[]
)
RETURNS products
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result products;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé: administrateur requis';
  END IF;
  UPDATE products SET
    subcategory_id = p_subcategory_id,
    category_id = p_category_id,
    nom = p_nom,
    description = p_description,
    prix = p_prix,
    source = p_source,
    tag = p_tag,
    stock = p_stock,
    images = p_images
  WHERE id = p_id
  RETURNING * INTO result;
  RETURN result;
END;
$$;

-- Supprimer un produit
CREATE OR REPLACE FUNCTION admin_delete_product(p_id int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé: administrateur requis';
  END IF;
  DELETE FROM products WHERE id = p_id;
END;
$$;

-- ============================================
-- TRIGGER: Créer un profil automatiquement à l'inscription
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- INDEX
-- ============================================
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_subcategory ON products(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_subcategories_category ON subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
