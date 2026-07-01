-- ============================================
-- PIXEL RAID — Fix RLS for wallet-based auth
-- Problem: old policies require auth.uid() = user_id
-- but game connects via wallet, not Supabase auth
-- ============================================

-- Drop old restrictive policies
DROP POLICY IF EXISTS "players_insert_auth" ON players;
DROP POLICY IF EXISTS "players_update_auth" ON players;

-- Insert: allow anon inserts (wallet-based, no Supabase auth needed)
CREATE POLICY "players_insert_anon" ON players
  FOR INSERT WITH CHECK (true);

-- Update: allow anon updates (game saves progress via wallet)
CREATE POLICY "players_update_anon" ON players
  FOR UPDATE USING (true);

-- Delete: keep disabled (no deletes from client)
