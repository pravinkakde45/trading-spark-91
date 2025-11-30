-- Create enum types
CREATE TYPE public.order_type AS ENUM ('market', 'limit', 'stop', 'stop_limit');
CREATE TYPE public.order_side AS ENUM ('buy', 'sell');
CREATE TYPE public.order_status AS ENUM ('pending', 'open', 'filled', 'partial', 'cancelled', 'rejected');
CREATE TYPE public.broker_type AS ENUM ('alpaca', 'binance', 'kite', 'sandbox');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  sandbox_mode BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create broker_credentials table (for encrypted API keys)
CREATE TABLE public.broker_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  broker broker_type NOT NULL,
  api_key TEXT NOT NULL,
  api_secret TEXT NOT NULL,
  is_testnet BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, broker)
);

ALTER TABLE public.broker_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own credentials"
  ON public.broker_credentials FOR ALL
  USING (auth.uid() = user_id);

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  broker broker_type NOT NULL,
  symbol TEXT NOT NULL,
  side order_side NOT NULL,
  type order_type NOT NULL,
  quantity DECIMAL(20, 8) NOT NULL,
  price DECIMAL(20, 8),
  stop_price DECIMAL(20, 8),
  filled_quantity DECIMAL(20, 8) DEFAULT 0,
  average_fill_price DECIMAL(20, 8),
  status order_status DEFAULT 'pending',
  broker_order_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  filled_at TIMESTAMPTZ
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create positions table
CREATE TABLE public.positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  broker broker_type NOT NULL,
  symbol TEXT NOT NULL,
  quantity DECIMAL(20, 8) NOT NULL,
  average_entry_price DECIMAL(20, 8) NOT NULL,
  current_price DECIMAL(20, 8),
  market_value DECIMAL(20, 2),
  cost_basis DECIMAL(20, 2),
  unrealized_pnl DECIMAL(20, 2),
  unrealized_pnl_percent DECIMAL(10, 4),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, broker, symbol)
);

ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own positions"
  ON public.positions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own positions"
  ON public.positions FOR ALL
  USING (auth.uid() = user_id);

-- Create portfolio_history table
CREATE TABLE public.portfolio_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  broker broker_type NOT NULL,
  total_value DECIMAL(20, 2) NOT NULL,
  cash_balance DECIMAL(20, 2) DEFAULT 0,
  positions_value DECIMAL(20, 2) DEFAULT 0,
  total_pnl DECIMAL(20, 2) DEFAULT 0,
  total_pnl_percent DECIMAL(10, 4) DEFAULT 0,
  timestamp TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.portfolio_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own portfolio history"
  ON public.portfolio_history FOR SELECT
  USING (auth.uid() = user_id);

-- Create watchlist table
CREATE TABLE public.watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, symbol)
);

ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own watchlist"
  ON public.watchlist FOR ALL
  USING (auth.uid() = user_id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  RETURN new;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_broker_credentials_updated_at
  BEFORE UPDATE ON public.broker_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for orders and positions
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.positions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.portfolio_history;