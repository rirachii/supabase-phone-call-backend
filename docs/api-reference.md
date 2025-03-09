# API Reference

This document provides a reference for all the API endpoints available in the Supabase Phone Call Backend.

## Table of Contents

1. [Direct Database Access](#direct-database-access)
2. [Call Queue Processing](#call-queue-processing)
3. [VAPI Webhook](#vapi-webhook)
4. [Subscription Management](#subscription-management)
5. [Stripe Webhook](#stripe-webhook)
6. [Phone Number Management](#phone-number-management)
7. [Voice Selection](#voice-selection)

## Direct Database Access

Supabase provides RESTful APIs for all database tables. Here are some examples of how to access them:

### Get Subscription Plans

```http
GET https://{SUPABASE_URL}/rest/v1/subscription_plans
Authorization: Bearer {ANON_KEY}
apikey: {ANON_KEY}
```

### Create a Call Queue Entry

```http
POST https://{SUPABASE_URL}/rest/v1/call_queue
Authorization: Bearer {ANON_KEY}
apikey: {ANON_KEY}
Content-Type: application/json

{
  "user_id": "user-uuid",
  "recipient_number": "+15551234567",
  "caller_number_id": "phone-number-uuid",
  "template_id": "template-uuid",
  "voice_id": "voice-uuid",
  "custom_variables": {
    "customer_name": "John Doe",
    "appointment_time": "3:00 PM"
  }
}
```

### Get User's Call History

```http
GET https://{SUPABASE_URL}/rest/v1/user_call_history?user_id=eq.{USER_ID}&order=created_at.desc
Authorization: Bearer {ANON_KEY}
apikey: {ANON_KEY}
```

## Call Queue Processing

Processes the call queue and initiates calls with VAPI.

```http
POST https://{SUPABASE_URL}/functions/v1/process-call-queue
Authorization: Bearer {ANON_KEY}
Content-Type: application/json

{}
```

**Response:**

```json
{
  "results": [
    {
      "success": true,
      "call_id": "call-queue-uuid",
      "vapi_call_id": "vapi-call-uuid"
    }
  ]
}
```

## VAPI Webhook

Handles webhook responses from VAPI to update call statuses.

```http
POST https://{SUPABASE_URL}/functions/v1/vapi-webhook
Content-Type: application/json

{
  "call_id": "vapi-call-uuid",
  "status": "completed",
  "duration": 120,
  "transcript": "Hello, this is a test call...",
  "recording_url": "https://api.vapi.ai/recordings/12345.mp3"
}
```

**Response:**

```json
{
  "success": true
}
```

## Subscription Management

Manages subscription allocation and renewal. This function is typically called via a cron job.

```http
POST https://{SUPABASE_URL}/functions/v1/manage-subscriptions
Authorization: Bearer {SERVICE_ROLE_KEY}
Content-Type: application/json

{}
```

**Response:**

```json
{
  "results": [
    {
      "success": true,
      "subscription_id": "subscription-uuid",
      "status": "active"
    }
  ]
}
```

## Stripe Webhook

Handles Stripe webhook events for subscription management.

```http
POST https://{SUPABASE_URL}/functions/v1/stripe-webhook
Stripe-Signature: {STRIPE_SIGNATURE}
Content-Type: application/json

{
  "id": "evt_123456",
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_123456",
      "subscription": "sub_123456",
      "metadata": {
        "user_id": "user-uuid",
        "plan_id": "plan-uuid"
      }
    }
  }
}
```

**Response:**

```json
{
  "received": true
}
```

## Phone Number Management

Handles Twilio phone number operations.

### Get Available Phone Numbers

```http
GET https://{SUPABASE_URL}/functions/v1/phone-number-management/available?country=US&areaCode=415&limit=10
Authorization: Bearer {ANON_KEY}
```

**Response:**

```json
{
  "numbers": [
    {
      "phone_number": "+14155550100",
      "friendly_name": "(415) 555-0100",
      "region": "CA",
      "capabilities": {
        "voice": true,
        "sms": true,
        "mms": false
      }
    }
  ]
}
```

### Purchase a Phone Number

```http
POST https://{SUPABASE_URL}/functions/v1/phone-number-management/purchase
Authorization: Bearer {ANON_KEY}
Content-Type: application/json

{
  "phone_number": "+14155550100",
  "user_id": "user-uuid"
}
```

**Response:**

```json
{
  "success": true,
  "phone_number": {
    "id": "phone-number-uuid",
    "user_id": "user-uuid",
    "full_number": "+14155550100",
    "is_active": true
  }
}
```

### Release a Phone Number

```http
POST https://{SUPABASE_URL}/functions/v1/phone-number-management/release
Authorization: Bearer {ANON_KEY}
Content-Type: application/json

{
  "phone_id": "PN123456789",
  "user_id": "user-uuid"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Phone number released successfully"
}
```

## Voice Selection

Handles voice selection and preview functionality.

### Get Available Voices

```http
GET https://{SUPABASE_URL}/functions/v1/voice-selection/available?language=en-US
Authorization: Bearer {ANON_KEY}
```

**Response:**

```json
{
  "voices": [
    {
      "id": "voice-uuid",
      "name": "Alex",
      "gender": "male",
      "language": "en-US",
      "accent": "American",
      "description": "Deep male voice with American accent",
      "is_premium": false
    }
  ]
}
```

### Generate Voice Sample

```http
POST https://{SUPABASE_URL}/functions/v1/voice-selection/sample
Authorization: Bearer {ANON_KEY}
Content-Type: application/json

{
  "voice_id": "voice-uuid",
  "text": "Hello, this is a test of the voice sample."
}
```

**Response:**

```json
{
  "sample_url": "https://api.vapi.ai/samples/12345.mp3",
  "voice_id": "voice-uuid",
  "voice_name": "Alex"
}
```

## Authentication

All endpoints that access the database directly or through edge functions require authentication. You can authenticate using:

1. **User JWT Token**: For authenticated user requests
2. **Anon Key**: For public endpoints with RLS policies
3. **Service Role Key**: For admin operations or scheduled functions

Here's an example of how to authenticate a user:

```javascript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
})

// Use the session token for authenticated requests
const { access_token } = data.session
```

## Error Handling

All API endpoints return standard HTTP status codes:

- `200 OK`: Request successful
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

Error responses include a JSON body with error details:

```json
{
  "error": "Error message",
  "details": "Additional error information"
}
```

## Rate Limiting

Supabase implements rate limiting on API requests. The default limits are:

- 1000 requests per minute for authenticated requests
- 100 requests per minute for anonymous requests

If you exceed these limits, you'll receive a `429 Too Many Requests` response.
