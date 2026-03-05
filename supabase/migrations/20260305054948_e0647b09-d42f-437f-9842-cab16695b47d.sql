
-- Create rooms table
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  passcode TEXT NOT NULL,
  host_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting',
  purse_per_team BIGINT NOT NULL DEFAULT 900000000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read rooms" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Anyone can create rooms" ON public.rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Host can update room" ON public.rooms FOR UPDATE USING (true);

-- Create participants table
CREATE TABLE public.participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  team TEXT,
  role TEXT NOT NULL DEFAULT 'bidder',
  purse_left BIGINT,
  is_online BOOLEAN NOT NULL DEFAULT true,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read participants" ON public.participants FOR SELECT USING (true);
CREATE POLICY "Anyone can join" ON public.participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Participant can update self" ON public.participants FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete participants" ON public.participants FOR DELETE USING (true);

-- Create players table
CREATE TABLE public.players (
  id SERIAL PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  player_role TEXT NOT NULL,
  nationality TEXT NOT NULL DEFAULT 'India',
  base_price BIGINT NOT NULL DEFAULT 2000000,
  image_url TEXT,
  stats JSONB,
  auction_set INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'upcoming',
  sold_to_team TEXT,
  sold_price BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read players" ON public.players FOR SELECT USING (true);
CREATE POLICY "Anyone can insert players" ON public.players FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update players" ON public.players FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete players" ON public.players FOR DELETE USING (true);

-- Create auction_state table
CREATE TABLE public.auction_state (
  room_id UUID PRIMARY KEY REFERENCES public.rooms(id) ON DELETE CASCADE,
  current_player_id INT REFERENCES public.players(id),
  current_bid BIGINT NOT NULL DEFAULT 0,
  current_bidder_id TEXT,
  current_bidder_team TEXT,
  timer_ends_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'idle',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.auction_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read auction state" ON public.auction_state FOR SELECT USING (true);
CREATE POLICY "Anyone can insert auction state" ON public.auction_state FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update auction state" ON public.auction_state FOR UPDATE USING (true);

-- Create bids table
CREATE TABLE public.bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  player_id INT NOT NULL REFERENCES public.players(id),
  team TEXT NOT NULL,
  bidder_id TEXT NOT NULL,
  amount BIGINT NOT NULL,
  placed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read bids" ON public.bids FOR SELECT USING (true);
CREATE POLICY "Anyone can insert bids" ON public.bids FOR INSERT WITH CHECK (true);

-- Create chat_messages table
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  sender TEXT NOT NULL,
  sender_team TEXT,
  type TEXT NOT NULL DEFAULT 'chat',
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read chat" ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY "Anyone can send chat" ON public.chat_messages FOR INSERT WITH CHECK (true);

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_state;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bids;
ALTER PUBLICATION supabase_realtime ADD TABLE public.participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
