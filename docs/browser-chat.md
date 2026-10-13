# Browser chat

`/chat/` is a static chat workspace translated into Chinese, English, Japanese,
Korean, Russian, French and German. It shares the homepage language preference
(`openakita_language`) and synchronizes changes across tabs. There is no separate
chat language selector. It connects
directly from the user's browser to official OpenAI, Anthropic Claude, xAI Grok
and DeepSeek APIs with user-owned keys. It requires no OpenAkita chat backend or login.
No tools, attachments, agents or code execution are enabled.

## Connections, keys and history

Users can add, edit and delete named connections, select a model ID, and load
model lists from the selected provider. Only the official HTTPS base URLs are
supported. Claude model lists are paginated up to 1,000 unique IDs. Models still
need text chat support and access on the user's provider account.

Saving a connection remembers its API key in localStorage by default. Users
can disable "Remember API key on this device" and save to remove its stored
key while retaining it in tab memory until navigation or refresh. Remembered
keys are restored on returning to chat. Storage is unencrypted and scoped to
the browser origin; shared devices should use the memory-only option. Deleting
an endpoint or clearing site data removes its stored key. Older metadata-only
records remain compatible and require entering a key once to remember it.
Keys are sent only to the selected provider and do not pass through OpenAkita
servers. They are not embedded in the build or included in exports. History
and endpoint metadata stay in localStorage, with up to 40
conversations, 100 messages each and 30 connections. Existing stored records
remain compatible. Users can search, copy, retry, stop, delete and export chats.
The latest 49 completed turns are sent with a new message.

## Direct transport

Messages render GitHub-flavored Markdown (headings, emphasis, inline code,
links, images, nested lists, task lists, blockquotes and tables). Marked,
DOMPurify and Highlight.js are bundled locally. HTML is sanitized before DOM
insertion; model-provided scripts, event handlers, page classes and unsafe URLs
are removed. Common fenced languages are highlighted, unlabeled completed code
uses bounded language detection, and unknown or very large code stays readable
as plain source. Messages and code blocks use localized icon buttons with tooltips
and copy-success feedback. Desktop actions appear on message hover or keyboard
focus; touch devices keep them visible. Code blocks have their own copy button; copying or
exporting a conversation still uses the original Markdown. Streaming rendering
is coalesced, with a bounded cache for completed messages.
Waiting uses three muted, gently animated dots without a frame or background;
streamed replies show the same dots beside the model label. Generation statuses retain
localized screen-reader text and honor reduced-motion preferences. Animations
are removed on completion, cancellation or errors.
Conversation export and deletion live on the right of each sidebar list item,
with the same hover/keyboard/touch behavior. These actions target that item
without selecting it; deleting another item preserves the active conversation.

## Provider protocols

`assets/js/chat-provider.js` supplies browser requests and native SSE parsing:

- OpenAI: Bearer authentication, GET `/v1/models`, POST `/v1/chat/completions`,
  `max_completion_tokens: 4096`, `store: false`.
- Claude: x-api-key, anthropic-version and
  anthropic-dangerous-direct-browser-access headers; GET `/v1/models` and
  POST `/v1/messages`, `max_tokens: 4096`.
- Grok: Bearer authentication, GET `/v1/models` and POST `/v1/chat/completions`,
  `max_tokens: 4096`.
- DeepSeek: `https://api.deepseek.com`, Bearer authentication, GET `/models`
  and POST `/chat/completions`, `max_tokens: 4096`. The chat displays final text
  from `delta.content`; reasoning-only chunks and keep-alive comments are skipped.

Requests use CORS, omit cookies and reject redirects. Model requests have a
20-second deadline and conversations a 180-second deadline. A chat request is
limited to 512 KiB; responses have bounded frames, total bytes and visible text.
OpenAI-compatible `[DONE]` and Claude `message_stop` terminators are required.
Partial answers survive cancellation, interruption or output limits. Provider
error bodies are mapped to localized codes rather than displayed or logged.
Network/CORS policy, geography, quota and valid keys remain provider-dependent.
Grok's authenticated cross-origin error responses were readable in the tested
Chromium browser; this does not prove successful inference or all-browser CORS.
DeepSeek model loading with an invalid test key returned a readable authentication
error in Chromium. Preflights for model listing and chat completion allowed
`https://openakita.ai`, including the required Authorization and Content-Type
headers. Successful inference still requires a valid user-owned key.

## Domains and publishing

Chat initialization permits only openakita.ai, www.openakita.ai and loopback
preview hosts. On .cn it stops before reading history or making provider calls.
The homepage actions and navigation also gate on hostname; .cn keeps download
copy and links. Its Nginx config continues to reject chat page and API paths.
The BFF chat relay and development API proxy have been removed. Account and Hub
are independent BFF functions; the hidden account shell is not started on chat.

The [Pages workflow](../.github/workflows/pages.yml) runs `npm ci` and
`npm run build`, then publishes **dist/** after changes reach the official
repository's `main` branch. PRs run build checks only. A maintainer must first
switch Pages Source to GitHub Actions; see the
[publishing guide](operations/github-pages.md). The output includes
`chat/index.html`, scripts, CNAME and .nojekyll.
Publish the built output, not the repository source with shell placeholders.
No chat API proxy, chat certificate on the application server, or special
OpenAkita chat environment variables are required. Diagnostic/fixture files and
local secrets are excluded from the artifact. Server deployment remains a
separate operation; this source change does not publish GitHub Pages.

## Verification

`npm run build` runs the static website checks and provider protocol tests.
`node build-tools/verify-chat-provider.mjs` independently checks native requests,
split UTF-8/SSE, model paging, cancellations, domain gates and safe errors.
Run Go tests/vet in bff after removal of the obsolete relay.

`npm run preview:chat-fixtures` serves dist at http://127.0.0.1:4184/chat/ and
injects a local-only browser fetch fixture for the official provider URLs. All
website `/api/v1/*` routes return 404. Arbitrary test keys work; `fixture:error`
simulates an auth error and `fixture:slow` makes streaming slow for stop tests.
`node build-tools/serve-chat-fixtures.mjs --static` serves the exact dist output
with no fixtures or website APIs, for real-browser provider verification.
Successful live model generation requires a valid user key; never use site or
Account/Marketplace/Pass credentials for these checks.

Protocol references:

- [OpenAI Chat Completions](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create)
- [Claude streaming](https://platform.claude.com/docs/en/build-with-claude/streaming)
- [Claude browser SDK](https://platform.claude.com/docs/en/cli-sdks-libraries/sdks/typescript)
- [DeepSeek API](https://api-docs.deepseek.com/zh-cn/)
- [xAI streaming](https://docs.x.ai/developers/model-capabilities/text/streaming)
