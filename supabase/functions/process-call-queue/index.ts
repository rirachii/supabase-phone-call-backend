// Edge function for processing the call queue
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

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
    // Initialize Supabase client with service key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get configuration
    const maxConcurrentCalls = 10

    // Get current in-progress calls
    const { data: inProgressCalls, error: inProgressError } = await supabaseClient
      .from('call_queue')
      .select('id')
      .eq('status', 'in-progress')
    
    if (inProgressError) {
      console.error('Error fetching in-progress calls:', inProgressError)
      return new Response(
        JSON.stringify({ error: inProgressError.message }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }
    
    // Calculate how many new calls we can process
    const availableSlots = maxConcurrentCalls - inProgressCalls.length
    
    if (availableSlots <= 0) {
      console.log('Maximum concurrent calls reached')
      return new Response(
        JSON.stringify({ message: 'Maximum concurrent calls reached' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Get queued calls
    const { data: queuedCalls, error: queuedError } = await supabaseClient
      .from('call_queue')
      .select(`
        id, 
        user_id,
        recipient_number,
        caller_number_id,
        template_id,
        voice_id,
        custom_variables,
        provider_id,
        user_phone_numbers(full_number),
        call_templates(params),
        voice_options(voice_id)
      `)
      .eq('status', 'queued')
      .is('scheduled_time', null) // Only process non-scheduled calls
      .or(`scheduled_time.lte.${new Date().toISOString()}`) // Or scheduled calls that are due
      .order('created_at', { ascending: true })
      .limit(availableSlots)
    
    if (queuedError) {
      console.error('Error fetching queued calls:', queuedError)
      return new Response(
        JSON.stringify({ error: queuedError.message }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }
    
    if (!queuedCalls || queuedCalls.length === 0) {
      console.log('No calls to process')
      return new Response(
        JSON.stringify({ message: 'No calls to process' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }
    
    // Process each call
    const results = await Promise.all(
      queuedCalls.map(async (call) => {
        try {
          // Update the call status to in-progress
          await supabaseClient
            .from('call_queue')
            .update({ status: 'in-progress', updated_at: new Date().toISOString() })
            .eq('id', call.id)

          // Fetch provider API credentials
          const { data: provider } = await supabaseClient
            .from('call_service_providers')
            .select('api_credentials')
            .eq('id', call.provider_id)
            .single()
          
          if (!provider) {
            throw new Error('Provider not found')
          }
          
          // Call VAPI API
          const vapiResponse = await fetch('https://api.vapi.ai/call/phone', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${provider.api_credentials.api_key}`
            },
            body: JSON.stringify({
              recipient_number: call.recipient_number,
              caller_number: call.user_phone_numbers?.full_number,
              assistant_id: call.call_templates?.params?.assistant_id,
              voice_id: call.voice_options?.voice_id,
              variables: call.custom_variables
            })
          })
          
          if (!vapiResponse.ok) {
            const errorData = await vapiResponse.json()
            throw new Error(`VAPI API error: ${JSON.stringify(errorData)}`)
          }
          
          const responseData = await vapiResponse.json()
          
          // Update call with VAPI call_id
          await supabaseClient
            .from('call_queue')
            .update({ 
              call_id: responseData.call_id,
              updated_at: new Date().toISOString()
            })
            .eq('id', call.id)
          
          return { 
            success: true, 
            call_id: call.id, 
            vapi_call_id: responseData.call_id 
          }
        } catch (error) {
          console.error(`Error processing call ${call.id}:`, error)
          
          // Update call status to failed
          await supabaseClient
            .from('call_queue')
            .update({ 
              status: 'failed', 
              last_error: error.message,
              retry_count: (call.retry_count || 0) + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', call.id)
          
          return { 
            success: false, 
            call_id: call.id, 
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
