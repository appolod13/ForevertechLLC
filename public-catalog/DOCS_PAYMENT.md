
# Payment System & Wallet Documentation

## Overview
The automated payment system enables the AI Voice Agent to process payments securely during customer interactions. It includes a dedicated "AI Wallet" for storing tokenized card information and tracking transaction history.

## Architecture

```mermaid
graph TD
    User[Voice Agent] -->|Reads| Wallet[Wallet JSON (Encrypted)]
    User -->|DTMF (Phone)| Twilio[Twilio Voice]
    Twilio -->|Webhook| Server[Mirror Site API]
    Server -->|Process| PaymentLogic[Mock Payment Gateway]
    PaymentLogic -->|Update| Wallet
    Wallet -->|Sync| Frontend[Agent Console]
```

## Credential Management
Credentials are securely stored in the `.env` file of the `mirror_site` backend.

**Current Configuration (Test Environment):**
- **Provider**: Twilio (for Voice & DTMF collection)
- **Account SID**: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Auth Token**: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Mock Phone Number**: `+15005550006`

*Note: The system is configured to switch to Live credentials automatically if `TWILIO_ACCOUNT_SID` is updated to the Live SID provided in the specification.*

## Features

### 1. AI Wallet (`/api/payment/wallet`)
- **Card Storage**: Allows adding cards (simulated encryption).
- **Balance Tracking**: Real-time balance updates.
- **Transaction History**: Logs all voice payments with masked card numbers.

### 2. Voice Payment Flow
1.  **Trigger**: User presses `3` in the main IVR menu.
2.  **Collection**: System asks for a 16-digit card number followed by `#`.
3.  **Processing**:
    - Backend receives the digits.
    - Simulates a charge of $49.99.
    - Updates the AI Wallet balance.
    - Plays a success message.

### 3. Agent Console Integration
- The **Support Page** (`/support`) now includes a side-by-side view of the **Call Agent** and **Wallet Panel**.
- Agents can monitor the wallet balance increasing in real-time as calls are processed.

## API Reference

### Get Wallet Data
```http
GET /api/payment/wallet
```

### Add Card
```http
POST /api/payment/card
Content-Type: application/json
{
  "number": "1234567812345678",
  "expiry": "12/25",
  "cvv": "123",
  "name": "AI Assistant"
}
```

### Process Voice Payment (Webhook)
```http
POST /api/voice/payment/process
Content-Type: application/x-www-form-urlencoded
Digits=1234567812345678
```

## Testing Guide
1.  **Setup**: Ensure `mirror_site` is running with the updated `.env`.
2.  **Access**: Go to `http://localhost:3002/support` and switch to "Agent View".
3.  **Wallet**: Add a test card in the Wallet Panel.
4.  **Voice Call**:
    - Use the Call Agent to dial `+15005550006`.
    - When prompted, press `3` on the keypad.
    - Enter `1234567812345678` followed by `#`.
    - Hear "Payment Successful".
5.  **Verification**: Watch the "Current Balance" in the Wallet Panel increase by $49.99 automatically.
