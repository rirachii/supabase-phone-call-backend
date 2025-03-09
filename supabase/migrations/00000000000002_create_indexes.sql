-- Create indexes for better query performance

-- subscription_plans indexes
CREATE INDEX IF NOT EXISTS idx_subscription_plans_interval ON public.subscription_plans(interval);

-- user_profiles indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON public.user_profiles(status);

-- user_subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_id ON public.user_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);

-- user_call_usage indexes
CREATE INDEX IF NOT EXISTS idx_user_call_usage_user_id ON public.user_call_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_call_usage_subscription_id ON public.user_call_usage(subscription_id);
CREATE INDEX IF NOT EXISTS idx_user_call_usage_billing_period ON public.user_call_usage(billing_period_start, billing_period_end);

-- call_service_providers indexes
CREATE INDEX IF NOT EXISTS idx_call_service_providers_name ON public.call_service_providers(name);

-- provider_phone_numbers indexes
CREATE INDEX IF NOT EXISTS idx_provider_phone_numbers_provider_id ON public.provider_phone_numbers(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_phone_numbers_is_active ON public.provider_phone_numbers(is_active);
CREATE INDEX IF NOT EXISTS idx_provider_phone_numbers_full_number ON public.provider_phone_numbers(full_number);

-- user_phone_numbers indexes
CREATE INDEX IF NOT EXISTS idx_user_phone_numbers_user_id ON public.user_phone_numbers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_phone_numbers_is_active ON public.user_phone_numbers(is_active);
CREATE INDEX IF NOT EXISTS idx_user_phone_numbers_is_default ON public.user_phone_numbers(is_default);

-- voice_options indexes
CREATE INDEX IF NOT EXISTS idx_voice_options_provider_id ON public.voice_options(provider_id);
CREATE INDEX IF NOT EXISTS idx_voice_options_language ON public.voice_options(language);
CREATE INDEX IF NOT EXISTS idx_voice_options_is_active ON public.voice_options(is_active);
CREATE INDEX IF NOT EXISTS idx_voice_options_is_premium ON public.voice_options(is_premium);

-- call_templates indexes
CREATE INDEX IF NOT EXISTS idx_call_templates_created_by ON public.call_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_call_templates_is_public ON public.call_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_call_templates_category ON public.call_templates(category);
CREATE INDEX IF NOT EXISTS idx_call_templates_provider_id ON public.call_templates(provider_id);

-- call_queue indexes
CREATE INDEX IF NOT EXISTS idx_call_queue_user_id ON public.call_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_call_queue_status ON public.call_queue(status);
CREATE INDEX IF NOT EXISTS idx_call_queue_scheduled_time ON public.call_queue(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_call_queue_created_at ON public.call_queue(created_at);

-- user_call_history indexes
CREATE INDEX IF NOT EXISTS idx_user_call_history_user_id ON public.user_call_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_call_history_call_queue_id ON public.user_call_history(call_queue_id);
CREATE INDEX IF NOT EXISTS idx_user_call_history_status ON public.user_call_history(status);
CREATE INDEX IF NOT EXISTS idx_user_call_history_created_at ON public.user_call_history(created_at);
