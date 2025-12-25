-- =============================================
-- PHASE 2: Tables Subscriptions & Tokens
-- =============================================

-- Create enum for plan types
CREATE TYPE plan_type AS ENUM ('free', 'simple', 'plus');

-- Create enum for subscription status
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing', 'incomplete');

-- Create enum for token transaction types
CREATE TYPE token_transaction_type AS ENUM ('purchase', 'usage', 'bonus', 'referral', 'monthly_reset');

-- Create enum for referral status
CREATE TYPE referral_status AS ENUM ('pending', 'completed', 'expired');

-- =============================================
-- SUBSCRIPTIONS TABLE
-- =============================================
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type plan_type NOT NULL DEFAULT 'free',
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  sends_remaining INTEGER NOT NULL DEFAULT 0,
  sends_limit INTEGER NOT NULL DEFAULT 0,
  tokens_remaining INTEGER NOT NULL DEFAULT 0,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  status subscription_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriptions
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
  ON public.subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions"
  ON public.subscriptions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all subscriptions"
  ON public.subscriptions FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- TOKEN TRANSACTIONS TABLE
-- =============================================
CREATE TABLE public.token_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type token_transaction_type NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.token_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for token_transactions
CREATE POLICY "Users can view own token transactions"
  ON public.token_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all token transactions"
  ON public.token_transactions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- REFERRALS TABLE
-- =============================================
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  referral_code TEXT NOT NULL UNIQUE,
  reward_tokens INTEGER NOT NULL DEFAULT 20,
  status referral_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referrals
CREATE POLICY "Users can view own referrals as referrer"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id);

CREATE POLICY "Users can view referrals where they are referred"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referred_id);

CREATE POLICY "Admins can view all referrals"
  ON public.referrals FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- Function to create subscription for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan_type, status, sends_remaining, sends_limit)
  VALUES (NEW.id, 'free', 'active', 5, 5);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create subscription on user creation
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_first_name TEXT;
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  -- Get first name from profiles
  SELECT first_name INTO v_first_name FROM public.profiles WHERE id = p_user_id;
  
  -- Generate code
  v_code := UPPER(COALESCE(LEFT(v_first_name, 4), 'USER')) || '-' || 
            UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
  
  -- Check if exists and regenerate if needed
  SELECT EXISTS(SELECT 1 FROM public.referrals WHERE referral_code = v_code) INTO v_exists;
  WHILE v_exists LOOP
    v_code := UPPER(COALESCE(LEFT(v_first_name, 4), 'USER')) || '-' || 
              UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
    SELECT EXISTS(SELECT 1 FROM public.referrals WHERE referral_code = v_code) INTO v_exists;
  END LOOP;
  
  RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to use send credits
CREATE OR REPLACE FUNCTION public.use_send_credit(p_user_id UUID, p_count INTEGER DEFAULT 1)
RETURNS BOOLEAN AS $$
DECLARE
  v_sends_remaining INTEGER;
  v_tokens_remaining INTEGER;
BEGIN
  -- Get current credits
  SELECT sends_remaining, tokens_remaining 
  INTO v_sends_remaining, v_tokens_remaining
  FROM public.subscriptions 
  WHERE user_id = p_user_id;
  
  -- Check if enough credits
  IF v_sends_remaining >= p_count THEN
    UPDATE public.subscriptions 
    SET sends_remaining = sends_remaining - p_count,
        updated_at = now()
    WHERE user_id = p_user_id;
    RETURN TRUE;
  ELSIF v_tokens_remaining >= p_count THEN
    UPDATE public.subscriptions 
    SET tokens_remaining = tokens_remaining - p_count,
        updated_at = now()
    WHERE user_id = p_user_id;
    
    -- Log token usage
    INSERT INTO public.token_transactions (user_id, amount, type, description)
    VALUES (p_user_id, -p_count, 'usage', 'Email send credit used');
    
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to add tokens
CREATE OR REPLACE FUNCTION public.add_tokens(
  p_user_id UUID, 
  p_amount INTEGER, 
  p_type token_transaction_type,
  p_description TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Update tokens
  UPDATE public.subscriptions 
  SET tokens_remaining = tokens_remaining + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Log transaction
  INSERT INTO public.token_transactions (user_id, amount, type, description)
  VALUES (p_user_id, p_amount, p_type, p_description);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to complete referral
CREATE OR REPLACE FUNCTION public.complete_referral(p_referral_code TEXT, p_referred_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_referral RECORD;
BEGIN
  -- Find pending referral
  SELECT * INTO v_referral 
  FROM public.referrals 
  WHERE referral_code = p_referral_code 
    AND status = 'pending'
    AND referrer_id != p_referred_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Update referral
  UPDATE public.referrals 
  SET referred_id = p_referred_id,
      status = 'completed',
      completed_at = now()
  WHERE id = v_referral.id;
  
  -- Add tokens to referrer
  PERFORM public.add_tokens(
    v_referral.referrer_id, 
    v_referral.reward_tokens, 
    'referral',
    'Referral bonus for code ' || p_referral_code
  );
  
  -- Add bonus tokens to referred user (10 tokens welcome bonus)
  PERFORM public.add_tokens(
    p_referred_id, 
    10, 
    'referral',
    'Welcome bonus from referral'
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for updated_at on subscriptions
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Add indexes for performance
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id);
CREATE INDEX idx_token_transactions_user_id ON public.token_transactions(user_id);
CREATE INDEX idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_referral_code ON public.referrals(referral_code);