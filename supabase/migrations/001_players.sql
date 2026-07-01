-- ============================================
-- PIXEL RAID — Players Table (PocketBase → Supabase)
-- PocketBase source: players collection
-- ============================================

CREATE TABLE IF NOT EXISTS players (
  -- PocketBase: id (auto, text)
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- PocketBase: user (relation → _superusers)
  -- In Supabase we use auth.users directly
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- PocketBase: wallet_address (text, indexed)
  wallet_address TEXT UNIQUE,

  -- PocketBase: display_name (text)
  display_name TEXT NOT NULL DEFAULT 'Adventurer',

  -- PocketBase: level (number, default 1)
  level INTEGER NOT NULL DEFAULT 1,

  -- PocketBase: exp (number, default 0)
  exp INTEGER NOT NULL DEFAULT 0,

  -- PocketBase: gold (number, default 100)
  gold INTEGER NOT NULL DEFAULT 100,

  -- PocketBase: gem (number, default 5)
  gem INTEGER NOT NULL DEFAULT 5,

  -- PocketBase: current_stage (number, default 1)
  current_stage INTEGER NOT NULL DEFAULT 1,

  -- PocketBase: highest_stage (number, default 1, sort DESC, indexed)
  highest_stage INTEGER NOT NULL DEFAULT 1,

  -- PocketBase: total_battles (number, default 0)
  total_battles INTEGER NOT NULL DEFAULT 0,

  -- PocketBase: total_wins (number, default 0, sort DESC, indexed)
  total_wins INTEGER NOT NULL DEFAULT 0,

  -- PocketBase: win_streak (number, default 0)
  win_streak INTEGER NOT NULL DEFAULT 0,

  -- PocketBase: playtime_seconds (number, default 0)
  playtime_seconds INTEGER NOT NULL DEFAULT 0,

  -- PocketBase: last_seen (date, auto-now)
  last_seen TIMESTAMPTZ DEFAULT now(),

  -- Timestamps (PocketBase auto-managed)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes (matching PocketBase indexes)
CREATE INDEX IF NOT EXISTS idx_players_wallet_address ON players (wallet_address);
CREATE INDEX IF NOT EXISTS idx_players_highest_stage ON players (highest_stage DESC);
CREATE INDEX IF NOT EXISTS idx_players_total_wins ON players (total_wins DESC);

-- RLS policies (matching PocketBase rules: read=public, write=authenticated)
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Public read (anyone can view leaderboards)
CREATE POLICY "players_select_public" ON players
  FOR SELECT USING (true);

-- Insert: only authenticated users can create their own profile
CREATE POLICY "players_insert_auth" ON players
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Update: only authenticated users can update their own profile
CREATE POLICY "players_update_auth" ON players
  FOR UPDATE USING (auth.uid() = user_id);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
