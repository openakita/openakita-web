# openakita.cn deployment

The production host is `115.29.195.222`, with Compose in `/home/openakita-web`.
Use `https://openakita.cn` as the BFF public origin and register its exact
`/auth/callback` and `/auth/logout/callback` URLs on the Account `openakita-web`
client. Preserve existing client callbacks. `www.openakita.cn` redirects to the
primary origin, including over HTTPS.

Install `nginx/openakita.cn.conf` in `/etc/nginx/conf.d/` after issuing a
certificate for both names. HTTP ACME validation uses `/var/www/acme`.
The existing acme.sh cron renews the certificate, installs it into
`/etc/nginx/ssl/openakita-web/`, and runs `nginx -t && systemctl reload nginx`.

Compose includes a dedicated Redis instance with no published host ports.
Provision `runtime/redis/{redis.conf,ca.crt,redis.crt,redis.key}` on the host;
use `redis-tls.conf.example` with a randomly generated password and a server
certificate whose DNS SAN is `redis`. The BFF trusts this private CA through
`SSL_CERT_DIR` in addition to the system trust store. Keep the CA private key
protected on the host, outside the containers, and rotate internal certificates
before expiration. Keep the runtime directory and production env out of Git
and image build contexts. Back up the Redis volume and session encryption keys.

Use separate existing Account client, Marketplace summary, and Pass summary
credentials. Set `WEB_BFF_REDIS_URL` to the authenticated `rediss://` URL for
`redis:6379`, and use a generated 32-byte base64url session encryption key.

Check Compose health, both public hostnames, HTTP redirects, the certificate
SANs/expiry, and the authorization redirect after each deployment. Do not log
tokens, cookies, encryption keys, or machine credentials during verification.
