-- Insert seed data for initial application setup

-- Subscription plans
INSERT INTO public.subscription_plans 
  (name, description, price, interval, features, call_limit, minutes_limit)
VALUES 
  ('Free', 'Basic access with limited features', 0.00, 'monthly', 
   '["5 calls per month", "3 minutes per call", "Basic templates"]'::jsonb, 5, 15),
  
  ('Basic', 'Perfect for personal use', 9.99, 'monthly', 
   '["20 calls per month", "5 minutes per call", "All templates", "Call scheduling"]'::jsonb, 20, 100),
  
  ('Business', 'Ideal for small businesses', 29.99, 'monthly', 
   '["100 calls per month", "10 minutes per call", "All templates", "Call scheduling", "Custom caller ID", "Priority support"]'::jsonb, 100, 1000),
  
  ('Enterprise', 'For large organizations with high volume needs', 99.99, 'monthly', 
   '["Unlimited calls", "Unlimited minutes", "All features", "Dedicated support", "API access", "Custom integrations"]'::jsonb, NULL, NULL);

-- Call service providers (for demo)
INSERT INTO public.call_service_providers
  (name, type, api_credentials, concurrency_limit, priority)
VALUES
  ('VAPI', 'voice', '{"api_key": "demo_key_vapi"}'::jsonb, 10, 1),
  ('Twilio', 'phone', '{"account_sid": "demo_sid", "auth_token": "demo_token"}'::jsonb, 5, 2);

-- Voice options
INSERT INTO public.voice_options
  (provider_id, voice_id, name, gender, language, accent, description, is_premium)
VALUES
  ((SELECT id FROM public.call_service_providers WHERE name = 'VAPI'), 'en-US-Wavenet-A', 'Alex', 'male', 'en-US', 'American', 'Deep male voice with American accent', FALSE),
  ((SELECT id FROM public.call_service_providers WHERE name = 'VAPI'), 'en-US-Wavenet-B', 'Emma', 'female', 'en-US', 'American', 'Friendly female voice with American accent', FALSE),
  ((SELECT id FROM public.call_service_providers WHERE name = 'VAPI'), 'en-GB-Wavenet-A', 'James', 'male', 'en-GB', 'British', 'Professional male voice with British accent', FALSE),
  ((SELECT id FROM public.call_service_providers WHERE name = 'VAPI'), 'en-GB-Wavenet-B', 'Sophia', 'female', 'en-GB', 'British', 'Articulate female voice with British accent', FALSE),
  ((SELECT id FROM public.call_service_providers WHERE name = 'VAPI'), 'en-AU-Wavenet-A', 'Noah', 'male', 'en-AU', 'Australian', 'Casual male voice with Australian accent', TRUE),
  ((SELECT id FROM public.call_service_providers WHERE name = 'VAPI'), 'en-AU-Wavenet-B', 'Olivia', 'female', 'en-AU', 'Australian', 'Warm female voice with Australian accent', TRUE);

-- Sample call templates (public ones)
INSERT INTO public.call_templates
  (name, description, category, tags, is_public, provider_id, params, params_order)
VALUES
  ('Appointment Reminder', 'Generic appointment reminder call', 'Reminders', 
   '["appointment", "reminder", "scheduling"]'::jsonb, TRUE, 
   (SELECT id FROM public.call_service_providers WHERE name = 'VAPI'),
   '{"prompt": "Hello {{customer_name}}, this is a reminder about your appointment scheduled for {{appointment_time}}. Please arrive 10 minutes early. To confirm this appointment, press 1. To reschedule, press 2.", "variables": ["customer_name", "appointment_time"]}'::jsonb,
   '["customer_name", "appointment_time"]'::jsonb),
   
  ('Payment Due Reminder', 'Reminder for upcoming payment', 'Finance', 
   '["payment", "invoice", "reminder"]'::jsonb, TRUE, 
   (SELECT id FROM public.call_service_providers WHERE name = 'VAPI'),
   '{"prompt": "Hello {{customer_name}}, this is a reminder that your payment of {{amount}} is due on {{due_date}}. To make a payment now, press 1. For more information, press 2.", "variables": ["customer_name", "amount", "due_date"]}'::jsonb,
   '["customer_name", "amount", "due_date"]'::jsonb),
   
  ('Service Confirmation', 'Confirmation for scheduled service', 'Services', 
   '["service", "confirmation", "scheduling"]'::jsonb, TRUE, 
   (SELECT id FROM public.call_service_providers WHERE name = 'VAPI'),
   '{"prompt": "Hello {{customer_name}}, this is to confirm your {{service_type}} service scheduled for {{service_time}}. Our technician {{technician_name}} will arrive during this time. To confirm this appointment, press 1. To reschedule, press 2.", "variables": ["customer_name", "service_type", "service_time", "technician_name"]}'::jsonb,
   '["customer_name", "service_type", "service_time", "technician_name"]'::jsonb);

-- Sample provider phone numbers
INSERT INTO public.provider_phone_numbers
  (provider_id, phone_id, country_code, area_code, phone_number, full_number, capabilities)
VALUES
  ((SELECT id FROM public.call_service_providers WHERE name = 'Twilio'), 'PN123456789', '1', '415', '5550100', '+14155550100', 
   '{"voice": true, "sms": true}'::jsonb),
  ((SELECT id FROM public.call_service_providers WHERE name = 'Twilio'), 'PN123456790', '1', '415', '5550101', '+14155550101', 
   '{"voice": true, "sms": true}'::jsonb),
  ((SELECT id FROM public.call_service_providers WHERE name = 'Twilio'), 'PN123456791', '1', '415', '5550102', '+14155550102', 
   '{"voice": true, "sms": true}'::jsonb);
