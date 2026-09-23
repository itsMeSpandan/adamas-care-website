# WhatsApp Cloud API Setup (Grace Salon)

The app integrates with Meta's official **WhatsApp Cloud API** for:

- **OTP verification** — 6-digit codes sent to the user's WhatsApp at signup (`sendWhatsAppOtp`)
- **Booking confirmations** — template message after a successful booking (`sendWhatsAppBookingConfirmation`)
- **Waitlist notifications** — text message when a waitlisted slot opens (`sendWhatsAppSlotAvailable`)

All sends are best-effort: failures are logged to the `WhatsAppMessageLog` table and never block a booking. Every message is visible in **Admin → WhatsApp Logs** (`/admin/whatsapp-logs`).

---

## 1. Environment variables

Add to `.env` (never committed — see `.gitignore`):

```bash
WHATSAPP_PHONE_NUMBER_ID="123456789012345"   # Meta → WhatsApp → API Setup
WHATSAPP_ACCESS_TOKEN="EAAx..."              # System-user / temp token
WHATSAPP_TEMPLATE_NAME="booking_confirmation" # optional, defaults to booking_confirmation
WHATSAPP_API_VERSION="v25.0"                 # optional, defaults to v25.0
WHATSAPP_TEST_RECIPIENT="+919876543210"      # optional, recipient for scripts/test-whatsapp.ts
```

See `.env.example` for the canonical list.

## 2. Meta-side setup

1. Create an app at [developers.facebook.com](https://developers.facebook.com) → **Business** type → add the **WhatsApp** product.
2. **API Setup** page: claim a test number (free, allows 5 verified recipients) or add a real business phone number.
3. Copy the **Phone Number ID** and generate an **Access token** into `.env`.
4. **Recipients**: on a test number, every recipient must first verify via OTP in the "To" dropdown on the API Setup page, or sends fail with `131030`.
5. **Templates**: booking confirmations use a `template` message, which must exist and be approved in **Account Tools → Message Templates**. Create `booking_confirmation` (language: English) with **6 body parameters**, in this order:

   ```
   {{1}} customer name
   {{2}} services booked
   {{3}} employee name
   {{4}} date
   {{5}} time
   {{6}} total price
   ```

   OTP and waitlist messages are plain `text` messages — no template needed.

> **Business verification**: unverified businesses hit low limits and some features can be blocked. Complete verification in **Meta Business Suite → Settings → Business Info** (Legal Name, Country, Website are all required) before going to production.

## 3. Verify the integration

```bash
# Sends a real test message to the recipient in .env (or override inline):
RECIPIENT=+917003944516 npx tsx scripts/test-whatsapp.ts
```

The script prints the masked config, the exact Graph URL, and a human-readable hint for common failures (`131030` allow-list, `133010` registration, `190` token, etc.).

### Checking account health (read-only)

```bash
# Phone number status — look for status=CONNECTED and code_verification_status=VERIFIED
curl -s "https://graph.facebook.com/v25.0/$WHATSAPP_PHONE_NUMBER_ID?fields=display_phone_number,code_verification_status,platform_type,status,is_on_biz_app&access_token=$WHATSAPP_ACCESS_TOKEN"

# WABA health — look for can_send_message=AVAILABLE
curl -s "https://graph.facebook.com/v25.0/<WABA_ID>?fields=account_review_status,business_verification_status,health_status&access_token=$WHATSAPP_ACCESS_TOKEN"
```

### Troubleshooting matrix

| Symptom | Code | Cause / fix |
| --- | --- | --- |
| `Account not registered` | `133010` | Number still provisioning (`status=PENDING`), or WABA is blocked. Check the health endpoint above; fix Business Suite settings, then retry. |
| `Cannot create certificate` | subcode `2388001` | Business fails WhatsApp policy requirements — usually missing business verification / incomplete Business Info. |
| Recipient rejects | `131030` | Recipient not on the test number allow-list. |
| 24h window | `131047` | Free-text window closed; use an approved template. |
| Token rejected | `190` | Generate a new access token (tokens expire). |
| `Template name does not exist` | `132001` | Create/approve `booking_confirmation` in Message Templates. |

## 4. How the app uses it

| Flow | File | Function |
| --- | --- | --- |
| Signup OTP | `app/api/auth/register/route.ts`, `app/api/auth/verify-email/route.ts` | `sendWhatsAppOtp` |
| Booking confirmation | `app/api/bookings/[id]/route.ts` | `sendWhatsAppBookingConfirmation` |
| Waitlist slot alert | `app/api/bookings/[id]/route.ts`, `app/api/waitlist/[id]/claim/route.ts` | `sendWhatsAppSlotAvailable` |
| Message audit log | `WhatsAppMessageLog` table → `/admin/whatsapp-logs` | `logWhatsAppMessage` |

If `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_ACCESS_TOKEN` are unset, `isWhatsAppConfigured()` returns false and every send is skipped with a `[WhatsApp] Not configured` warning — the app works fine without WhatsApp, just no messages.
