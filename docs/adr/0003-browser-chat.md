# ADR-0003: International browser text chat

Status: Accepted

Date: 2026-10-12

## Context

The international openakita.ai website needs an English browser interface that
can start actual text conversations with user-configured LLM providers. The
openakita.cn origin must not expose this feature. Existing website APIs serve
Account, Marketplace and Pass summaries; none can perform LLM inference.

## Decision

Keep the existing static Vite website and Go BFF. Add an English-first bilingual
`/chat/` page with browser-local conversations and endpoint metadata. Add
separate `/api/v1/chat/*` APIs for capabilities, model listing and streaming text
completion. Users supply their own provider API keys, held only in tab memory
and transient BFF request memory. Chat does not use Account access tokens,
Marketplace credentials or Pass credentials and does not require Account login.

The BFF supports only server-owned official OpenAI, Anthropic and xAI HTTPS
destinations, refuses unknown request fields and redirects, and never enables
tools. It normalizes provider text streams into a minimal SSE contract. Request
limits, same-origin checks, cancellation and finite deadlines bound each relay.
Errors expose stable codes rather than raw provider bodies. Keys and messages
are not written to BFF storage or request logs; third-party retention remains
subject to the selected provider's policies.

Use the actual HTTP Host to enable chat only on openakita.ai and
www.openakita.ai. Do not use the Account public URL or forwarded-host headers
as chat authorization. This permits one BFF to serve existing domestic Account
flows and international chat without changing OIDC callback configuration.
Loopback access is supported only in development. Nginx separately blocks
domestic chat paths; the static navigation and chat application also gate by
hostname. These independent checks prevent a domestic page or API call from
enabling chat by manipulating UI state.

## Consequences

The website gains narrowly scoped outbound inference requests, independent of
the read-only Hub contract. Users must hold a valid API key and provider quota,
and re-enter keys after a refresh. There is no shared website-funded quota,
cross-device history, arbitrary API gateway, attachment handling, tool calling
or agent execution. Browser storage can be cleared or exported by the user.

The edge must route chat APIs to the BFF without buffering, and the BFF must
extend its write timeout only for completion streams. A future persisted-key,
site-funded inference or arbitrary-destination feature requires a new decision.
