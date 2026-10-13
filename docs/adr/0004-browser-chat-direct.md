# ADR-0004: Direct browser LLM connections

Status: Accepted

Date: 2026-10-13

## Context

The international website continues to use GitHub Pages. Its chat should work
without an OpenAkita inference server or edge proxy. Users bring their own keys.
Browser checks demonstrated cross-origin access to xAI's chat and models APIs
with Authorization, while negative CORS controls were correctly rejected.
This verifies browser transport, not successful paid inference with a valid key.

## Decision

Supersede ADR-0003's chat relay. The static chat page connects directly to the
official OpenAI, Anthropic and xAI HTTPS APIs. A small browser transport owns
authentication, model listing and provider-native SSE parsing. Claude requests
include its explicit direct-browser-access header. Credentials are never
embedded in the website build or persisted in browser storage. Redirects are
rejected, cookies are omitted, and error bodies are mapped to local messages.

Remove the chat routes/client from the BFF and the development proxy. Existing
Account, Hub and other BFF features are independent and remain available.
The chat page also skips initialization of the hidden Account header.

The hostname gate permits openakita.ai and www.openakita.ai, plus local preview.
On .cn it stops before reading chat storage or contacting providers. Domestic
Nginx chat-path blocking and the original download actions remain in place.
This gate controls website availability; it is not provider authorization.

## Consequences

GitHub Pages can serve the production dist artifact, including chat/index.html,
CNAME and .nojekyll. No chat API routing, OpenAkita credentials or chat Redis
service is needed. API traffic leaves from each user's browser and depends on
their network, provider CORS policy, key, quota and model access. CORS/network
errors and timeouts receive localized feedback; partial answers remain visible.
Future site-funded inference or server-managed keys requires a separate server design.

User-requested device persistence now stores keys in browser localStorage when
"Remember API key on this device" is enabled. It defaults on when saving a
connection, can be disabled by saving again, and is removed with its endpoint.
This is unencrypted device storage, not server-managed credential storage.
