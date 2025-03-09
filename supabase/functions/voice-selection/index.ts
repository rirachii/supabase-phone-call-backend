// Edge function for voice selection and playback
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
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Parse the request URL
    const url = new URL(req.url)
    const path = url.pathname.split('/').filter(Boolean)
    const action = path[path.length - 1]
    
    // Route to the appropriate handler based on the action
    switch (action) {
      case 'available': 
        return await getAvailableVoices(req, supabaseClient)
      case 'sample': 
        return await generateVoiceSample(req, supabaseClient)
      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        )
    }
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

// Handler for getting available voices
async function getAvailableVoices(req, supabaseClient) {
  // Parse query parameters
  const url = new URL(req.url)
  const provider_id = url.searchParams.get('provider_id')
  const language = url.searchParams.get('language')
  
  let query = supabaseClient
    .from('voice_options')
    .select(`
      id,
      name,
      gender,
      language,
      accent,
      description,
      sample_mp3_url,
      is_premium,
      provider_id,
      call_service_providers(name)
    `)
    .eq('is_active', true)
  
  // Add filters if provided
  if (provider_id) {
    query = query.eq('provider_id', provider_id)
  }
  
  if (language) {
    query = query.eq('language', language)
  }
  
  // Execute query
  const { data, error } = await query
  
  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
  
  return new Response(
    JSON.stringify({ voices: data }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    }
  )
}

// Handler for generating voice samples
async function generateVoiceSample(req, supabaseClient) {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405
      }
    )
  }
  
  // Parse request body
  const body = await req.json()
  const { voice_id, text } = body
  
  if (!voice_id || !text) {
    return new Response(
      JSON.stringify({ error: 'Voice ID and text are required' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
  
  try {
    // Get voice details and provider
    const { data: voice, error: voiceError } = await supabaseClient
      .from('voice_options')
      .select(`
        *, 
        call_service_providers(api_credentials)
      `)
      .eq('id', voice_id)
      .single()
    
    if (voiceError || !voice) {
      return new Response(
        JSON.stringify({ error: 'Voice not found' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      )
    }
    
    // Call provider API to generate sample - this is VAPI-specific
    const apiResponse = await fetch('https://api.vapi.ai/voice/sample', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${voice.call_service_providers.api_credentials.api_key}`
      },
      body: JSON.stringify({
        voice_id: voice.voice_id,
        text: text
      })
    })
    
    if (!apiResponse.ok) {
      const errorData = await apiResponse.json()
      return new Response(
        JSON.stringify({ error: 'Provider API error', details: errorData }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: apiResponse.status
        }
      )
    }
    
    const sampleData = await apiResponse.json()
    
    return new Response(
      JSON.stringify({ 
        sample_url: sampleData.sample_url,
        voice_id: voice_id,
        voice_name: voice.name
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Error generating voice sample:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
}
