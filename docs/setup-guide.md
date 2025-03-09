# Setup Guide for Supabase Phone Call Backend

This guide will walk you through the process of setting up your Supabase backend for a phone call application.

## Prerequisites

Before you begin, make sure you have:

1. A Supabase project created at [https://supabase.com](https://supabase.com)
2. [Supabase CLI](https://supabase.com/docs/guides/cli) installed on your machine
3. A Stripe account for payment processing
4. A VAPI account for voice AI integration
5. A Twilio account for phone number management

## Step 1: Clone the Repository

```bash
git clone https://github.com/rirachii/supabase-phone-call-backend.git
cd supabase-phone-call-backend
```

## Step 2: Link to Your Supabase Project

```bash
supabase login
supabase link --project-ref your-project-ref
```

You can find your project reference in the URL of your Supabase dashboard: `https://app.supabase.com/project/your-project-ref`

## Step 3: Apply Database Migrations

The migrations will create all the necessary tables, indexes, triggers, and RLS policies:

```bash
supabase db push
```

This will create:
- All database tables for users, subscriptions, calls, etc.
- Indexes for optimal query performance
- Triggers for automating timestamp updates and usage tracking
- RLS policies for secure data access
- Seed data with initial subscription plans and other configurations

## Step 4: Set Environment Variables

1. Copy the environment example file to create your own:

```bash
cp .env.example .env
```

2. Edit the `.env` file with your actual credentials:
   - Supabase URL and API keys
   - Stripe API keys
   - Twilio credentials
   - VAPI API key
   - Your frontend application URL

3. Apply the environment variables to your Supabase project:

```bash
supabase secrets set --env-file .env
```

## Step 5: Deploy Edge Functions

Deploy all the edge functions to your Supabase project:

```bash
supabase functions deploy process-call-queue
supabase functions deploy vapi-webhook
supabase functions deploy manage-subscriptions
supabase functions deploy stripe-webhook
supabase functions deploy phone-number-management
supabase functions deploy voice-selection
```

## Step 6: Set Up Webhook Endpoints

### Stripe Webhook

1. Go to your [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click "Add Endpoint"
3. Enter your Supabase function URL:
   `https://[your-project-ref].functions.supabase.co/stripe-webhook`
4. Add the following events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the signing secret and update it in your environment variables

### VAPI Webhook

1. Go to your VAPI dashboard
2. Configure the webhook URL:
   `https://[your-project-ref].functions.supabase.co/vapi-webhook`
3. Save your configuration

## Step 7: Set Up Scheduled Function for Subscription Management

The `manage-subscriptions` function should run daily to check for expiring subscriptions:

```bash
supabase functions schedule add manage-subscriptions "0 0 * * *"
```

This command will schedule the function to run at midnight every day (in Cron format).

## Step 8: Test Your Setup

Once everything is set up, you can test your backend:

1. Check if you can access subscription plans:
```bash
curl https://[your-project-ref].supabase.co/rest/v1/subscription_plans \
  -H "apikey: [your-anon-key]" \
  -H "Authorization: Bearer [your-anon-key]"
```

2. Test one of your functions:
```bash
curl https://[your-project-ref].functions.supabase.co/voice-selection/available \
  -H "Authorization: Bearer [your-anon-key]"
```

## Troubleshooting

- **Function deployment errors**: Check your environment variables and make sure they're correctly set.
- **Database migration errors**: Ensure you have the correct permissions and that your Supabase project is properly linked.
- **Webhook issues**: Verify your webhook URLs and make sure the signing secrets are correctly configured.

## Next Steps

Now that your backend is set up, you can integrate it with your frontend application. Check the examples directory for sample API calls to help with your integration.
