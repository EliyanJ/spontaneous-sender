
-- 1. Restrict company_blacklist to authenticated users only
DROP POLICY IF EXISTS "Anyone can view blacklist" ON public.company_blacklist;
CREATE POLICY "Authenticated users can view blacklist"
  ON public.company_blacklist
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- 2. Add explicit immutability policies on email_logs
CREATE POLICY "Email logs are immutable"
  ON public.email_logs FOR UPDATE
  USING (false);

CREATE POLICY "Email logs cannot be deleted"
  ON public.email_logs FOR DELETE
  USING (false);

-- 3. Add input validation to add_to_blacklist
CREATE OR REPLACE FUNCTION public.add_to_blacklist(p_siren text, p_name text, p_reason blacklist_reason, p_permanent boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Validate SIREN format (9 digits)
    IF p_siren IS NULL OR length(trim(p_siren)) < 9 THEN
      RAISE EXCEPTION 'Invalid SIREN format';
    END IF;

    INSERT INTO public.company_blacklist (company_siren, company_name, blacklist_reason, is_permanent, expires_at)
    VALUES (
        trim(p_siren),
        p_name,
        p_reason,
        p_permanent,
        CASE WHEN p_permanent THEN NULL ELSE now() + interval '24 hours' END
    )
    ON CONFLICT (company_siren) DO UPDATE SET
        hit_count = company_blacklist.hit_count + 1,
        updated_at = now(),
        is_permanent = CASE WHEN company_blacklist.is_permanent THEN true ELSE EXCLUDED.is_permanent END,
        expires_at = CASE WHEN company_blacklist.is_permanent THEN NULL ELSE EXCLUDED.expires_at END;
END;
$function$;

-- 4. Add boundary checks to use_send_credit
CREATE OR REPLACE FUNCTION public.use_send_credit(p_user_id uuid, p_count integer DEFAULT 1)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sends_remaining INTEGER;
  v_tokens_remaining INTEGER;
BEGIN
  -- Validate input
  IF p_count <= 0 THEN
    RAISE EXCEPTION 'Credit count must be positive';
  END IF;

  SELECT sends_remaining, tokens_remaining 
  INTO v_sends_remaining, v_tokens_remaining
  FROM public.subscriptions 
  WHERE user_id = p_user_id;
  
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
    
    INSERT INTO public.token_transactions (user_id, amount, type, description)
    VALUES (p_user_id, -p_count, 'usage', 'Email send credit used');
    
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$function$;

-- 5. Add validation to add_tokens
CREATE OR REPLACE FUNCTION public.add_tokens(p_user_id uuid, p_amount integer, p_type token_transaction_type, p_description text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Prevent negative token additions (except usage type)
  IF p_amount = 0 THEN
    RAISE EXCEPTION 'Token amount cannot be zero';
  END IF;

  UPDATE public.subscriptions 
  SET tokens_remaining = GREATEST(tokens_remaining + p_amount, 0),
      updated_at = now()
  WHERE user_id = p_user_id;
  
  INSERT INTO public.token_transactions (user_id, amount, type, description)
  VALUES (p_user_id, p_amount, p_type, p_description);
END;
$function$;
