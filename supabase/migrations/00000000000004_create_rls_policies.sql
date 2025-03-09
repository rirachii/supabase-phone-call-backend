-- Create Row Level Security (RLS) policies for all tables

-- 1. user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own profile" 
  ON public.user_profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON public.user_profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON public.user_profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Admin policy
CREATE POLICY "Admin can access all profiles" 
  ON public.user_profiles
  USING (auth.jwt() ->> 'role' = 'admin');

-- 2. subscription_plans
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view subscription plans" 
  ON public.subscription_plans FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Admin can manage subscription plans" 
  ON public.subscription_plans
  USING (auth.jwt() ->> 'role' = 'admin');

-- 3. user_subscriptions
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own subscriptions" 
  ON public.user_subscriptions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can manage all subscriptions" 
  ON public.user_subscriptions
  USING (auth.jwt() ->> 'role' = 'admin');

-- 4. user_call_usage
ALTER TABLE public.user_call_usage ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own call usage" 
  ON public.user_call_usage FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can manage all call usage" 
  ON public.user_call_usage
  USING (auth.jwt() ->> 'role' = 'admin');

-- 5. call_service_providers
ALTER TABLE public.call_service_providers ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view call providers" 
  ON public.call_service_providers FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Admin can manage call providers" 
  ON public.call_service_providers
  USING (auth.jwt() ->> 'role' = 'admin');

-- 6. provider_phone_numbers
ALTER TABLE public.provider_phone_numbers ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view provider phone numbers" 
  ON public.provider_phone_numbers FOR SELECT 
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admin can manage phone numbers" 
  ON public.provider_phone_numbers
  USING (auth.jwt() ->> 'role' = 'admin');

-- 7. user_phone_numbers
ALTER TABLE public.user_phone_numbers ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own phone numbers" 
  ON public.user_phone_numbers FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own phone numbers" 
  ON public.user_phone_numbers FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own phone numbers" 
  ON public.user_phone_numbers FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own phone numbers" 
  ON public.user_phone_numbers FOR DELETE 
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can manage all phone numbers" 
  ON public.user_phone_numbers
  USING (auth.jwt() ->> 'role' = 'admin');

-- 8. voice_options
ALTER TABLE public.voice_options ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view available voices" 
  ON public.voice_options FOR SELECT 
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admin can manage voices" 
  ON public.voice_options
  USING (auth.jwt() ->> 'role' = 'admin');

-- 9. call_templates
ALTER TABLE public.call_templates ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view public templates" 
  ON public.call_templates FOR SELECT 
  USING (is_public = true);

CREATE POLICY "Users can view own templates" 
  ON public.call_templates FOR SELECT 
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create templates" 
  ON public.call_templates FOR INSERT 
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own templates" 
  ON public.call_templates FOR UPDATE 
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own templates" 
  ON public.call_templates FOR DELETE 
  USING (auth.uid() = created_by);

CREATE POLICY "Admin can manage all templates" 
  ON public.call_templates
  USING (auth.jwt() ->> 'role' = 'admin');

-- 10. call_queue
ALTER TABLE public.call_queue ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own call queue" 
  ON public.call_queue FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into call queue" 
  ON public.call_queue FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own queued calls" 
  ON public.call_queue FOR UPDATE 
  USING (auth.uid() = user_id AND status = 'queued');

CREATE POLICY "Users can delete own queued calls" 
  ON public.call_queue FOR DELETE 
  USING (auth.uid() = user_id AND status = 'queued');

CREATE POLICY "Admin can manage all call queue entries" 
  ON public.call_queue
  USING (auth.jwt() ->> 'role' = 'admin');

-- 11. user_call_history
ALTER TABLE public.user_call_history ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own call history" 
  ON public.user_call_history FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can manage all call history" 
  ON public.user_call_history
  USING (auth.jwt() ->> 'role' = 'admin');
