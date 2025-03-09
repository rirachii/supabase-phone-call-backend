-- Create triggers for database automation

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at column
CREATE TRIGGER update_subscription_plans_timestamp
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_user_profiles_timestamp
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_user_subscriptions_timestamp
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_call_service_providers_timestamp
BEFORE UPDATE ON public.call_service_providers
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_provider_phone_numbers_timestamp
BEFORE UPDATE ON public.provider_phone_numbers
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_user_phone_numbers_timestamp
BEFORE UPDATE ON public.user_phone_numbers
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_voice_options_timestamp
BEFORE UPDATE ON public.voice_options
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_call_templates_timestamp
BEFORE UPDATE ON public.call_templates
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_call_queue_timestamp
BEFORE UPDATE ON public.call_queue
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Function to update user call usage when a call is completed
CREATE OR REPLACE FUNCTION update_call_usage()
RETURNS TRIGGER AS $$
DECLARE
    user_usage_record UUID;
BEGIN
    -- Only process completed calls
    IF NEW.status = 'completed' THEN
        -- Find the current user usage record
        SELECT id INTO user_usage_record 
        FROM public.user_call_usage 
        WHERE user_id = NEW.user_id 
        AND NEW.created_at BETWEEN billing_period_start AND billing_period_end
        LIMIT 1;
        
        -- Update the usage
        IF FOUND THEN
            UPDATE public.user_call_usage 
            SET calls_used = calls_used + 1,
                minutes_used = minutes_used + CEIL(NEW.duration / 60.0),
                calls_remaining = GREATEST(0, calls_remaining - 1),
                minutes_remaining = GREATEST(0, minutes_remaining - CEIL(NEW.duration / 60.0)),
                last_updated = now()
            WHERE id = user_usage_record;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to track call usage
CREATE TRIGGER track_call_usage
AFTER INSERT OR UPDATE ON public.user_call_history
FOR EACH ROW EXECUTE FUNCTION update_call_usage();
