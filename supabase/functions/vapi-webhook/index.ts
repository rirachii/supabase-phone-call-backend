// Edge function for handling VAPI webhooks
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

    // Parse webhook payload
    const payload = await req.json()
    const { call_id, status, duration, transcript, recording_url } = payload
    
    if (!call_id) {
      return new Response(
        JSON.stringify({ error: 'Missing call_id in webhook payload' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }
    
    // Get the call from queue
    const { data: callData, error: callError } = await supabaseClient
      .from('call_queue')
      .select('id, user_id, provider_id, template_id, caller_number_id, voice_id')
      .eq('call_id', call_id)
      .single()
    
    if (callError || !callData) {
      console.error('Call not found:', call_id)
      return new Response(
        JSON.stringify({ error: 'Call not found' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        }
      )
    }
    
    // Update call queue status
    const callStatus = status === 'completed' ? 'completed' : 'failed'
    
    await supabaseClient
      .from('call_queue')
      .update({ 
        status: callStatus,
        updated_at: new Date().toISOString()
      })
      .eq('call_id', call_id)
    
    // Add to call history
    const historyData = {
      user_id: callData.user_id,
      call_queue_id: callData.id,
      call_id: call_id,
      provider_id: callData.provider_id,
      caller_number_id: callData.caller_number_id,
      voice_id: callData.voice_id,
      transcript: transcript,
      status: callStatus,
      duration: duration || 0,
      recording_url: recording_url,
      call_data: payload
    }
    
    const { error: historyError } = await supabaseClient
      .from('user_call_history')
      .insert(historyData)
    
    if (historyError) {
      console.error('Error adding to call history:', historyError)
      return new Response(
        JSON.stringify({ error: 'Error adding to call history', details: historyError.message }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }
    
    return new Response(
      JSON.stringify({ success: true }),
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
