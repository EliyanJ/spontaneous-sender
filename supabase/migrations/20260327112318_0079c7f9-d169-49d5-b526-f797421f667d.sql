UPDATE public.subscriptions 
SET plan_type = 'plus', 
    status = 'active', 
    sends_remaining = 400, 
    sends_limit = 400, 
    updated_at = now() 
WHERE user_id = '5225f5d7-f616-454d-b7d7-4d3ddc723b55';