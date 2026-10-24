# Meta Webhook Gateway — external ingress, not public panel

**Status: implementation for sandbox tests only, not deployed or configured.**
This Worker is the single public ingress; Conv OS continues to listen on `127.0.0.1`.

## Actual behavior

- `GET /webhooks/meta`: Meta verification challenge only after feature flag + secret token are configured.
- `POST /webhooks/meta`: verifies `X-Hub-Signature-256` from the *original raw bytes* using HMAC SHA-256. Payload is size-limited to 256 KiB.
- Extracts only account IDs / message IDs needed for routing (Instagram, Page Messenger, WhatsApp Cloud API).
- Looks up previously **VERIFIED** ownership in D1 (never accepts account mappings from inbound events).
- Queues only tenant/account IDs, pseudonymous event hashes, channel, event type, timestamp; **no customer names, text, phone, media, attachments or full webhook body**.
- Outbound messaging and OAuth token exchange are **not implemented**, and there is no credential input form in the local panel.

## Predeployment requirements

1. Confirm an appropriate Meta App, Business Portfolio, permissions, App Review and legal terms.
2. Provision Cloudflare Worker, D1, Queue and separate secrets. Duplicate `wrangler.toml.example` to a gitignored `wrangler.toml`; update your resource IDs. Apply migration 0001.
3. Have the business owner complete verified official Instagram Login, Facebook Login or WhatsApp Embedded Signup (and test coexistence eligibility). Build a reviewed onboarding callback before inserting VERIFIED account mapping.
4. Keep `ENABLE_META_INBOUND=false` until audited, account ownership verified, consent/retention policy approved and queue consumer configured.
5. For connection to local Windows, use an outbound HTTPS-only authenticated pull consumer; do not expose local port, add public DNS or forward the web panel.
6. Verify queue replay protection/idempotence and retention before allowing customer metadata in production. D1 mapping and HMAC signature alone do not establish user consent.

## Cloudflare resources and secrets

Create D1 + queue using official Cloudflare dashboard or Wrangler; configure binding IDs in a PRIVATE environment. Insert no customer IDs into source control.

Set `META_APP_SECRET`, `META_VERIFY_TOKEN`, and distinct `HASH_KEY` as Worker secrets using Cloudflare Secrets. They must never appear in commit history, CI logs, GitHub variables, or chats.

Worker returns `200 accepted` to valid signed webhook requests even when no verified mapping exists. This prevents retries from becoming a channel for account enumeration. Unknown accounts are not queued.

## Limitations

- Data not yet available on local machine; no Queue pull/ACK adapter has been installed.
- Inbound data is metadata-only by design, so there is no live message inbox yet.
- Queue delivery may repeat. Deduplicate by `event_hash` in the consumer database.
- Only three known Meta event envelope shapes are interpreted. Media, comments and status changes require dedicated verified adapters.
- All production gates in `docs/foundation/status.json` remain BLOCKED.

Official references:
- Instagram Login scopes: https://www.postman.com/meta/instagram/folder/6raa77c/instagram-api-with-instagram-login
- Meta WhatsApp Embedded Signup: https://www.postman.com/meta/whatsapp-business-platform/documentation/du6gzjv/embedded-signup
- Cloudflare Queue pull: https://developers.cloudflare.com/queues/configuration/pull-consumers/
