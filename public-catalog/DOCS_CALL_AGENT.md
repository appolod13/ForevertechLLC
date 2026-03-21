
# Call Agent System Documentation

## Overview
The Call Agent System allows support agents and authorized users to make and receive voice calls directly from the browser using the ForeverTeck dashboard. It integrates with Twilio for telephony and includes a fallback "Mock Mode" for testing without active credentials.

## Architecture

```mermaid
graph TD
    Client[Frontend (CallAgent.tsx)] -->|Get Token| Server[Mirror Site API (Node.js :3000)]
    Server -->|Sign| Twilio[Twilio API]
    Client -->|WebRTC| TwilioVoice[Twilio Voice Gateway]
    TwilioVoice -->|PSTN| Phone[Customer Phone]
    
    Server -->|Webhook| TwiML[Call Routing Logic]
    Server -->|Store| Logs[call-logs.json]
```

## Features

### 1. Agent Console (`/support` -> Agent View)
- **Softphone Interface**: Dialpad, mute/unmute, hangup controls.
- **Status Indicator**: Shows connection state (Ready, In Call, Offline).
- **Recent Logs**: Displays call history with duration and status.

### 2. Backend Services (`mirror_site`)
- **Token Generation**: `/api/voice/token` issues short-lived JWTs for browser clients.
- **Call Routing**: `/api/voice/twiml` handles incoming/outgoing call logic (TwiML).
- **IVR System**: Auto-attendant for incoming calls (Press 1 for Sales, 2 for Support).
- **Logging**: Persists call metadata to `call-logs.json`.

## Configuration

### Environment Variables
To enable real calling, configure these in `.env` (backend):
```bash
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_API_KEY=SK...
TWILIO_API_SECRET=...
TWILIO_APP_SID=AP...  # TwiML App SID
TWILIO_PHONE_NUMBER=+1555...
```

### Mock Mode
If credentials are missing, the system automatically falls back to **Mock Mode**:
- **Token**: Returns `mock-token-for-testing`.
- **Dialing**: Simulates connection delays and success states.
- **Logging**: Records "simulated" calls in the history.

## API Reference

### Generate Token
```http
POST /api/voice/token
{ "identity": "agent-name" }
```

### Initiate Outbound Call (Server-Side Trigger)
```http
POST /api/support/call
{ "phoneNumber": "+1555...", "reason": "Follow-up" }
```

### Get Logs
```http
GET /api/voice/logs
```

## Testing
1. Go to `/support` and click "Switch to Agent View".
2. The status should show "Ready (Mock Mode)" if no env vars are set.
3. Enter any number and click Dial.
4. Verify the status changes to "Calling..." then "In Call".
5. Click "Hangup" to end the session.
6. Check "Recent Calls" to see the log entry.
