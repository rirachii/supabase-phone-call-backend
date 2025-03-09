// Edge function for handling Stripe webhook events
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import Stripe from 'https://esm.sh/stripe@12.4.0?no-check'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize clients
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )
    
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
    })

    // Get the request body for webhook verification
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')
    
    if (!signature) {
      console.error('Missing Stripe signature')
      return new Response(
        JSON.stringify({ error: 'Missing Stripe signature' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    // Verify the signature
    let event
    try {
      const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (error) {
      console.error('Webhook signature verification failed:', error)
      return new Response(
        JSON.stringify({ error: `Webhook Error: ${error.message}` }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    // Process different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        
        // Extract metadata
        const { user_id, plan_id } = session.metadata || {}
        
        if (!user_id || !plan_id) {
          console.error('Missing user_id or plan_id in session metadata')
          return new Response(
            JSON.stringify({ error: 'Missing metadata' }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400
            }
          )
        }
        
        // Get subscription plan details
        const { data: plan, error: planError } = await supabaseClient
          .from('subscription_plans')
          .select('*')
          .eq('id', plan_id)
          .single()
        
        if (planError || !plan) {
          console.error('Error fetching plan:', planError)
          return new Response(
            JSON.stringify({ error: 'Plan not found' }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 404
            }
          )
        }
        
        // Calculate period end based on interval
        const periodStart = new Date(session.created * 1000)
        const periodEnd = new Date(periodStart)
        
        if (plan.interval === 'monthly') {
          periodEnd.setMonth(periodEnd.getMonth() + 1)
        } else {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1)
        }
        
        // Create subscription record
        const { error: subscriptionError } = await supabaseClient
          .from('user_subscriptions')
          .insert({
            user_id,
            plan_id,
            status: 'active',
            stripe_sub_id: session.subscription,
            current_period_start: periodStart.toISOString(),
            current_period_end: periodEnd.toISOString(),
            payment_method: { type: 'card' },
            cancel_at_period_end: false
          })
        
        if (subscriptionError) {
          console.error('Error creating subscription:', subscriptionError)
          return new Response(
            JSON.stringify({ error: 'Error creating subscription' }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500
            }
          )
        }
        
        // Get the subscription ID from the database
        const { data: newSubscription } = await supabaseClient
          .from('user_subscriptions')
          .select('id')
          .eq('user_id', user_id)
          .eq('stripe_sub_id', session.subscription)
          .single()
        
        // Initialize usage record
        if (newSubscription) {
          await supabaseClient
            .from('user_call_usage')
            .insert({
              user_id,
              subscription_id: newSubscription.id,
              billing_period_start: periodStart.toISOString(),
              billing_period_end: periodEnd.toISOString(),
              calls_used: 0,
              minutes_used: 0,
              calls_remaining: plan.call_limit,
              minutes_remaining: plan.minutes_limit
            })
        }
        
        break
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object
        
        // Update subscription in database
        await supabaseClient
          .from('user_subscriptions')
          .update({
            status: subscription.status,
            cancel_at_period_end: subscription.cancel_at_period_end,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('stripe_sub_id', subscription.id)
        
        break
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        
        // Mark subscription as canceled
        await supabaseClient
          .from('user_subscriptions')
          .update({
            status: 'canceled',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_sub_id', subscription.id)
        
        break
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object
        
        // Only process subscription invoices
        if (invoice.subscription) {
          // Get the stripe subscription
          const stripeSubscription = await stripe.subscriptions.retrieve(invoice.subscription)
          
          // Update subscription period
          await supabaseClient
            .from('user_subscriptions')
            .update({
              status: 'active',
              current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('stripe_sub_id', invoice.subscription)
          
          // Get subscription details to reset usage
          const { data: userSub } = await supabaseClient
            .from('user_subscriptions')
            .select('id, user_id, plan_id, subscription_plans(call_limit, minutes_limit)')
            .eq('stripe_sub_id', invoice.subscription)
            .single()
          
          if (userSub) {
            // Reset usage for the new billing period
            const periodStart = new Date(stripeSubscription.current_period_start * 1000)
            const periodEnd = new Date(stripeSubscription.current_period_end * 1000)
            
            await supabaseClient
              .from('user_call_usage')
              .insert({
                user_id: userSub.user_id,
                subscription_id: userSub.id,
                billing_period_start: periodStart.toISOString(),
                billing_period_end: periodEnd.toISOString(),
                calls_used: 0,
                minutes_used: 0,
                calls_remaining: userSub.subscription_plans.call_limit,
                minutes_remaining: userSub.subscription_plans.minutes_limit
              })
          }
        }
        
        break
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object
        
        // Only process subscription invoices
        if (invoice.subscription) {
          // Update subscription status
          await supabaseClient
            .from('user_subscriptions')
            .update({
              status: 'past_due',
              updated_at: new Date().toISOString()
            })
            .eq('stripe_sub_id', invoice.subscription)
        }
        
        break
      }
    }
    
    return new Response(
      JSON.stringify({ received: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Unhandled error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
