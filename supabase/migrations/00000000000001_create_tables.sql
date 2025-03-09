-- Create tables for phone call application

-- Table: subscription_plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    interval TEXT NOT NULL CHECK (interval IN ('monthly', 'yearly')),
    features JSONB,
    call_limit INTEGER,
    minutes_limit INTEGER,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table: user_profiles
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    first_name TEXT,
    last_name TEXT,
    phone_number TEXT,
    email TEXT,
    address JSONB,
    preferences JSONB,
    status TEXT NOT NULL CHECK (status IN ('active', 'inactive')) DEFAULT 'inactive',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table: user_subscriptions
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
    status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
    stripe_sub_id TEXT,
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    payment_method JSONB,
    subscription_id TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table: user_call_usage
CREATE TABLE IF NOT EXISTS public.user_call_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.user_subscriptions(id),
    billing_period_start TIMESTAMPTZ NOT NULL,
    billing_period_end TIMESTAMPTZ NOT NULL,
    calls_used INTEGER DEFAULT 0,
    minutes_used INTEGER DEFAULT 0,
    calls_remaining INTEGER,
    minutes_remaining INTEGER,
    last_updated TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table: call_service_providers
CREATE TABLE IF NOT EXISTS public.call_service_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    api_credentials JSONB,
    type TEXT NOT NULL,
    concurrency_limit INTEGER DEFAULT 5,
    priority INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table: provider_phone_numbers
CREATE TABLE IF NOT EXISTS public.provider_phone_numbers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES public.call_service_providers(id) ON DELETE CASCADE,
    phone_id TEXT,
    country_code TEXT NOT NULL,
    area_code TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    full_number TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    capabilities JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider_id, phone_id)
);

-- Table: user_phone_numbers
CREATE TABLE IF NOT EXISTS public.user_phone_numbers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES public.call_service_providers(id),
    phone_id TEXT,
    country_code TEXT NOT NULL,
    area_code TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    full_number TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    capabilities JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, full_number)
);

-- Table: voice_options
CREATE TABLE IF NOT EXISTS public.voice_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES public.call_service_providers(id) ON DELETE CASCADE,
    voice_id TEXT NOT NULL,
    name TEXT NOT NULL,
    gender TEXT CHECK (gender IN ('male', 'female', 'neutral')),
    language TEXT NOT NULL,
    accent TEXT,
    description TEXT,
    sample_mp3_url TEXT,
    is_premium BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider_id, voice_id)
);

-- Table: call_templates
CREATE TABLE IF NOT EXISTS public.call_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    tags JSONB,
    is_public BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES auth.users(id),
    provider_id UUID REFERENCES public.call_service_providers(id),
    assistant_id UUID,
    voice_id UUID REFERENCES public.voice_options(id),
    params JSONB,
    params_order JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table: call_queue
CREATE TABLE IF NOT EXISTS public.call_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    recipient_number TEXT NOT NULL,
    caller_number_id UUID REFERENCES public.user_phone_numbers(id),
    scheduled_time TIMESTAMPTZ,
    status TEXT NOT NULL CHECK (status IN ('queued', 'in-progress', 'completed', 'failed', 'canceled')) DEFAULT 'queued',
    call_id TEXT,
    provider_id UUID REFERENCES public.call_service_providers(id),
    template_id UUID REFERENCES public.call_templates(id),
    voice_id UUID REFERENCES public.voice_options(id),
    custom_variables JSONB,
    retry_count INTEGER DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table: user_call_history
CREATE TABLE IF NOT EXISTS public.user_call_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    call_queue_id UUID REFERENCES public.call_queue(id),
    call_id TEXT,
    provider_id UUID REFERENCES public.call_service_providers(id),
    assistant_id UUID,
    phone_number_id UUID REFERENCES public.provider_phone_numbers(id),
    caller_number_id UUID REFERENCES public.user_phone_numbers(id),
    voice_id UUID REFERENCES public.voice_options(id),
    transcript TEXT,
    status TEXT NOT NULL CHECK (status IN ('completed', 'failed', 'canceled')),
    duration INTEGER DEFAULT 0, -- Duration in seconds
    recording_url TEXT,
    call_summary TEXT,
    call_data JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
