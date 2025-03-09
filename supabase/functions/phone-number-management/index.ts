// Edge function for managing phone numbers with Twilio
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get Twilio credentials
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID') ?? ''
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN') ?? ''
    
    if (!accountSid || !authToken) {
      return new Response(
        JSON.stringify({ error: 'Twilio credentials not configured' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      )
    }
    
    // Parse the request URL
    const url = new URL(req.url)
    const path = url.pathname.split('/').filter(Boolean)
    const action = path[path.length - 1]
    
    // Route to the appropriate handler based on the action
    switch (action) {
      case 'available': 
        return await getAvailablePhoneNumbers(req, supabaseClient, accountSid, authToken)
      case 'purchase': 
        return await purchasePhoneNumber(req, supabaseClient, accountSid, authToken)
      case 'release': 
        return await releasePhoneNumber(req, supabaseClient, accountSid, authToken)
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

// Handler for getting available phone numbers
async function getAvailablePhoneNumbers(req, supabaseClient, accountSid, authToken) {
  // Parse query parameters
  const url = new URL(req.url)
  const country = url.searchParams.get('country') || 'US'
  const areaCode = url.searchParams.get('areaCode')
  const limit = url.searchParams.get('limit') || '10'
  
  // Construct request URL to Twilio API
  let twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/AvailablePhoneNumbers/${country}/Local.json?PageSize=${limit}`
  
  if (areaCode) {
    twilioUrl += `&AreaCode=${areaCode}`
  }

  // Call Twilio API
  const twilioResponse = await fetch(twilioUrl, {
    headers: {
      'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`
    }
  })
  
  if (!twilioResponse.ok) {
    const errorData = await twilioResponse.json()
    return new Response(
      JSON.stringify({ error: 'Error fetching available numbers', details: errorData }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: twilioResponse.status
      }
    )
  }
  
  const data = await twilioResponse.json()
  
  // Format the response for our application
  const formattedNumbers = data.available_phone_numbers.map(number => ({
    phone_number: number.phone_number,
    friendly_name: number.friendly_name,
    region: number.region || null,
    postal_code: number.postal_code || null,
    capabilities: {
      voice: number.capabilities.voice,
      sms: number.capabilities.sms,
      mms: number.capabilities.mms
    }
  }))
  
  return new Response(
    JSON.stringify({ numbers: formattedNumbers }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    }
  )
}

// Handler for purchasing a phone number
async function purchasePhoneNumber(req, supabaseClient, accountSid, authToken) {
  // Parse request body
  const body = await req.json()
  const { phone_number, user_id } = body
  
  if (!phone_number || !user_id) {
    return new Response(
      JSON.stringify({ error: 'Missing required parameters' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
  
  // Get provider ID for Twilio
  const { data: provider } = await supabaseClient
    .from('call_service_providers')
    .select('id')
    .eq('name', 'Twilio')
    .single()
  
  if (!provider) {
    return new Response(
      JSON.stringify({ error: 'Twilio provider not found in database' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
  
  // Purchase number from Twilio
  const twilioResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      PhoneNumber: phone_number
    })
  })
  
  if (!twilioResponse.ok) {
    const errorData = await twilioResponse.json()
    return new Response(
      JSON.stringify({ error: 'Error purchasing number', details: errorData }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: twilioResponse.status
      }
    )
  }
  
  const twilioData = await twilioResponse.json()
  
  // Parse phone number details
  const numberParts = extractPhoneNumberParts(twilioData.phone_number)
  
  // Save to database - first to provider_phone_numbers
  const { data: providerPhoneNumber, error: providerPhoneError } = await supabaseClient
    .from('provider_phone_numbers')
    .insert({
      provider_id: provider.id,
      phone_id: twilioData.sid,
      country_code: numberParts.countryCode,
      area_code: numberParts.areaCode,
      phone_number: numberParts.phoneNumber,
      full_number: twilioData.phone_number,
      capabilities: {
        voice: twilioData.capabilities.voice,
        sms: twilioData.capabilities.sms,
        mms: twilioData.capabilities.mms
      }
    })
    .select('id')
    .single()
  
  if (providerPhoneError) {
    console.error('Error saving provider phone number:', providerPhoneError)
    
    // Attempt to release the number from Twilio
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers/${twilioData.sid}.json`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`
      }
    })
    
    return new Response(
      JSON.stringify({ error: 'Error saving phone number to database', details: providerPhoneError }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
  
  // Then save to user_phone_numbers
  const { data: userPhoneNumber, error: userPhoneError } = await supabaseClient
    .from('user_phone_numbers')
    .insert({
      user_id,
      provider_id: provider.id,
      phone_id: twilioData.sid,
      country_code: numberParts.countryCode,
      area_code: numberParts.areaCode,
      phone_number: numberParts.phoneNumber,
      full_number: twilioData.phone_number,
      is_active: true,
      is_default: false,
      capabilities: {
        voice: twilioData.capabilities.voice,
        sms: twilioData.capabilities.sms,
        mms: twilioData.capabilities.mms
      }
    })
    .select()
    .single()
  
  if (userPhoneError) {
    console.error('Error saving user phone number:', userPhoneError)
    return new Response(
      JSON.stringify({ error: 'Error assigning phone number to user', details: userPhoneError }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
  
  return new Response(
    JSON.stringify({
      success: true,
      phone_number: userPhoneNumber
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    }
  )
}

// Handler for releasing a phone number
async function releasePhoneNumber(req, supabaseClient, accountSid, authToken) {
  // Parse request body
  const body = await req.json()
  const { phone_id, user_id } = body
  
  if (!phone_id || !user_id) {
    return new Response(
      JSON.stringify({ error: 'Missing required parameters' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
  
  // First check if user owns this number
  const { data: userPhone, error: userPhoneError } = await supabaseClient
    .from('user_phone_numbers')
    .select('id')
    .eq('user_id', user_id)
    .eq('phone_id', phone_id)
    .single()
  
  if (userPhoneError || !userPhone) {
    return new Response(
      JSON.stringify({ error: 'Phone number not found for this user' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      }
    )
  }
  
  // Release the number from Twilio
  const twilioResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers/${phone_id}.json`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`
    }
  })
  
  if (!twilioResponse.ok) {
    const errorText = await twilioResponse.text()
    return new Response(
      JSON.stringify({ error: 'Error releasing number from Twilio', details: errorText }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: twilioResponse.status
      }
    )
  }
  
  // Update database records
  await supabaseClient
    .from('user_phone_numbers')
    .delete()
    .eq('phone_id', phone_id)
    .eq('user_id', user_id)
  
  await supabaseClient
    .from('provider_phone_numbers')
    .delete()
    .eq('phone_id', phone_id)
  
  return new Response(
    JSON.stringify({
      success: true,
      message: 'Phone number released successfully'
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    }
  )
}

// Helper function to extract parts from a phone number
function extractPhoneNumberParts(fullNumber) {
  // Remove any non-digit characters
  const digits = fullNumber.replace(/\D/g, '')
  
  // For international format, first digit(s) are country code
  const countryCode = digits.startsWith('1') ? '1' : digits.substring(0, 2)
  
  // Area code is next 3 digits for North America
  const areaCode = countryCode === '1' ? digits.substring(1, 4) : digits.substring(2, 5)
  
  // Rest is the phone number
  const phoneNumber = countryCode === '1' ? digits.substring(4) : digits.substring(5)
  
  return {
    countryCode,
    areaCode,
    phoneNumber
  }
}
