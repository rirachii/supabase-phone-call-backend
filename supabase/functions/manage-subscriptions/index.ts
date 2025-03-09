// Edge function for managing subscription renewals
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

    // Get all active subscriptions that need renewal
    const today = new Date()
    
    const { data: expiringSubscriptions, error } = await supabaseClient
      .from('user_subscriptions')
      .select(`
        id,
        user_id,
        plan_id,
        stripe_sub_id,
        status,
        current_period_end,
        subscription_plans(price, call_limit, minutes_limit)
      `)
      .eq('status', 'active')
      .lt('current_period_end', today.toISOString())
    
    if (error) {
      console.error('Error fetching expiring subscriptions:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }
    
    if (!expiringSubscriptions || expiringSubscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No subscriptions to renew' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }
    
    // Process each subscription
    const results = await Promise.all(
      expiringSubscriptions.map(async (subscription) => {
        try {
          // For subscriptions managed by Stripe, Stripe will handle the renewal
          // We just need to sync the subscription status from Stripe
          if (subscription.stripe_sub_id) {
            const stripeSubscription = await stripe.subscriptions.retrieve(
              subscription.stripe_sub_id
            )
            
            // Update the subscription in our database
            await supabaseClient
              .from('user_subscriptions')
              .update({
                status: stripeSubscription.status,
                current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
                current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
                cancel_at_period_end: stripeSubscription.cancel_at_period_end
              })
              .eq('id', subscription.id)
            
            // If still active, reset usage limits
            if (stripeSubscription.status === 'active') {
              await resetUsageLimits(
                supabaseClient,
                subscription.user_id, 
                subscription.id, 
                subscription.subscription_plans
              )
            }
            
            return {
              success: true,
              subscription_id: subscription.id,
              status: stripeSubscription.status
            }
          } else {
            // For manually managed subscriptions, update as canceled
            await supabaseClient
              .from('user_subscriptions')
              .update({
                status: 'canceled',
                updated_at: new Date().toISOString()
              })
              .eq('id', subscription.id)
            
            return {
              success: true,
              subscription_id: subscription.id,
              status: 'canceled'
            }
          }
        } catch (error) {
          console.error(`Error processing subscription ${subscription.id}:`, error)
          return {
            success: false,
            subscription_id: subscription.id,
            error: error.message
          }
        }
      })
    )
    
    return new Response(
      JSON.stringify({ results }),
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

// Helper function to reset usage limits for a new billing period
async function resetUsageLimits(supabaseClient, userId, subscriptionId, plan) {
  const newPeriodStart = new Date()
  const newPeriodEnd = new Date()
  newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1)
  
  // Create new usage record
  await supabaseClient
    .from('user_call_usage')
    .insert({
      user_id: userId,
      subscription_id: subscriptionId,
      billing_period_start: newPeriodStart.toISOString(),
      billing_period_end: newPeriodEnd.toISOString(),
      calls_used: 0,
      minutes_used: 0,
      calls_remaining: plan.call_limit,
      minutes_remaining: plan.minutes_limit
    })
}
