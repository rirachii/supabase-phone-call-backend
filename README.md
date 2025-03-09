# Supabase Phone Call Backend

A complete backend system for a phone call application using Supabase database and edge functions. This repository provides all the necessary components to build an automated phone call system with voice AI integration, Stripe payment processing, and Twilio phone number management.

## Features

- **Complete Database Schema**: Tables for users, subscriptions, call history, and more
- **Row-Level Security**: Secure data access with role-based permissions
- **Edge Functions**:
  - Call queue processing with VAPI integration
  - Webhook handlers for VAPI and Stripe
  - Subscription management and renewal
  - Phone number acquisition and management via Twilio
  - Voice selection and preview

- **Subscription Management**:
  - Tiered subscription plans
  - Stripe integration for payments
  - Usage tracking and limits
  - Automatic renewal

- **Phone System Integration**:
  - Integration with VAPI for AI voice calls
  - Phone number management via Twilio
  - Voice selection and customization
  - Call recording and transcription

## Project Structure

```
/
├── .env.example                  # Environment variables template
├── README.md                     # This file
├── docs/                         # Documentation
│   ├── api-reference.md          # API endpoint documentation
│   └── setup-guide.md            # Setup instructions
├── supabase/
│   ├── migrations/               # Database migrations
│   │   ├── 00000000000001_create_tables.sql        # Table creation
│   │   ├── 00000000000002_create_indexes.sql       # Index creation
│   │   ├── 00000000000003_create_triggers.sql      # Trigger creation
│   │   ├── 00000000000004_create_rls_policies.sql  # Row level security
│   │   └── 00000000000005_seed_data.sql            # Initial data
│   │
│   └── functions/                # Edge functions
│       ├── process-call-queue/   # Call queue processor
│       ├── vapi-webhook/         # VAPI webhook handler
│       ├── manage-subscriptions/ # Subscription management
│       ├── stripe-webhook/       # Stripe webhook handler
│       ├── phone-number-management/ # Phone number manager
│       └── voice-selection/      # Voice selection and preview
```

## Documentation

- [Setup Guide](./docs/setup-guide.md): Instructions for setting up the backend
- [API Reference](./docs/api-reference.md): Documentation for all API endpoints

## Getting Started

Follow these steps to get the backend up and running:

1. Clone this repository
2. Follow the [Setup Guide](./docs/setup-guide.md) to set up your Supabase project
3. Deploy the database migrations and edge functions
4. Configure webhooks for Stripe and VAPI
5. Set up the scheduled function for subscription management

## Prerequisites

- A Supabase project
- A Stripe account for payment processing
- A VAPI account for voice AI
- A Twilio account for phone number management

## Environment Variables

Copy the `.env.example` file to `.env` and fill in your credentials. See the [Setup Guide](./docs/setup-guide.md) for more details.

## Integration Examples

Here's a simple example of how to schedule a call using the Supabase client:

```javascript
const { data, error } = await supabase
  .from('call_queue')
  .insert({
    user_id: 'user-uuid',
    recipient_number: '+15551234567',
    caller_number_id: 'phone-number-uuid',
    template_id: 'template-uuid',
    voice_id: 'voice-uuid',
    custom_variables: {
      customer_name: 'John Doe',
      appointment_time: '3:00 PM'
    }
  });
```

## Contribution

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
