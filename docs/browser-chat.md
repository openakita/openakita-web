# Browser chat

`/chat/` is an English-first, English/Chinese browser chat workspace, with a
conversation sidebar and composer modeled on OpenAkita Desktop. It supports text
conversations through user-owned OpenAI, Anthropic Claude and xAI Grok API keys.
No tools, agents, attachments or code execution are enabled.

## Connections and history

Users can add, edit and delete multiple named endpoints and choose a model ID.
"Load models" queries the selected provider with the user's API key. Provider
model lists may include models that do not support chat, so users must select a
text chat model available to their account. Arbitrary model IDs are also accepted.
Only official provider base URLs are supported; the server owns this allowlist.

API keys remain in tab memory and are submitted in same-origin HTTPS request
bodies. They are neither written to browser storage nor persisted by the BFF.
Users re-enter them after refreshing. Conversation history and endpoint metadata
are stored in localStorage on the current origin, with up to 40 conversations,
100 messages per conversation and 30 endpoints. The latest 49 completed turns
are included in a request. Users can search, delete, copy or export conversations.
Provider fees and provider data retention policies still apply. The BFF request
logger records route/status/timing, never request bodies or provider error bodies.

## HTTP contract

- `GET /api/v1/chat/capabilities`: availability and provider IDs.
- `POST /api/v1/chat/models`: `{provider, api_key}` returns `{models: string[]}`.
- `POST /api/v1/chat/completions`: `{provider, api_key, model, messages}` returns
  SSE `data: {"text":"..."}`, then `data: {"done":true}`. Stream failures return
  `data: {"error":"code"}` without a done event; errors before streaming use JSON.
  Messages are alternating user/assistant text, beginning and ending with user.

POST requests require application/json and an exact matching Origin. Host must
be `openakita.ai` or `www.openakita.ai`; forwarded-host headers are ignored.
Loopback hosts work only with WEB_BFF_ENV=development. All other hosts, including
openakita.cn, return 404. Requests are limited to 512 KiB, 100 messages and 20
POST requests per client IP per minute across both routes. Provider requests
have a 180-second maximum, do not follow redirects, and cancel when the browser
disconnects. Unknown fields (including tools and custom URLs) are rejected.

## Production integration

Apply `deploy/nginx/openakita.ai.conf` for the `.ai` origin. Its chat API proxy
disables response buffering and extends the read timeout for SSE. The BFF extends
the write deadline only for the completion request; other endpoints retain their
existing timeouts. The existing BFF can serve chat for `.ai` even if its Account
public origin is configured for `.cn`: chat uses the actual Host and Origin,
independently of Account callback configuration.

Apply `deploy/nginx/openakita.cn.conf` for `.cn`; it rejects `/chat`, `/chat/*`
and `/api/v1/chat/*` before proxying. The shared navigation initially hides Web
Chat, then reveals it only for `.ai` and local preview. The chat JS independently
rejects `.cn` without reading saved conversations or making any API request.
The `.ai` and `.cn` Nginx upstream names are distinct so both files can be loaded
on one host. Provision each origin's certificates before enabling its config.

The two homepage primary download buttons become localized Web Chat links on
`.ai` and local preview. All seven site languages have explicit Web Chat copy,
shared by the navigation and homepage actions. `.cn` retains its original
download labels, URLs, icons and translation behavior.

No deployment is performed as part of this source change.

## Verification

Run `npm run build` for type checking, the production build and all static checks.
Run `go test ./...` and `go vet ./...` in bff. Chat tests cover each provider's
wire format, domain/origin rejection, credential redaction, invalid/oversized
input, interruption, provider errors, rate limits and upstream cancellation.

After building, `npm run preview:chat-fixtures` opens a local fixture server at
http://127.0.0.1:4184/chat/. It uses mock providers and arbitrary test keys, with
`fixture:error` simulating authentication failure and `fixture:slow` simulating
slow generation. It is not shipped in production. For a real local BFF, use
`npm run dev`: Vite proxies chat requests to 127.0.0.1:8080 while preserving the
browser Host. Real-provider end-to-end verification requires each user's valid
API key and network access to those APIs.

Provider protocol references:

- [OpenAI chat completions](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create)
- [Anthropic Messages](https://platform.claude.com/docs/en/api/messages/create)
- [xAI streaming](https://docs.x.ai/developers/model-capabilities/text/streaming)
