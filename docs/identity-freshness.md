# Account identity freshness

The encrypted BFF session tracks `identity_version` and `identity_checked_at`.
Ordinary session reads use a 20-second freshness window. `/api/v1/session?refresh=1`,
the account page and hub read fresh userinfo without rotating a still-valid
access token. The header and hub refresh when a hidden tab becomes visible.
Hub account data comes from the same synchronized session as the header.

The existing distributed refresh lock serializes profile reads and token
rotation. Rotated credentials are saved before userinfo is fetched; a failed
profile read cannot lose the new refresh token. Updating an existing session
cannot recreate it after logout. Subject changes are rejected and older identity
versions cannot overwrite newer email/verification state. Transient failures
return 503 and preserve the session for retry. Local logout remains available
when Account is unreachable.

Deploy Account's versioned userinfo first, then the website BFF/frontend. Existing
sessions without a freshness timestamp are refreshed on their next request.
