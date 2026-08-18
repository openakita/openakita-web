# OpenAkita Web BFF

官网 BFF 是独立 Go 运行单元。它只负责 OIDC 登录、加密服务端会话、受保护的 `/account` 页面，以及 Account、Marketplace、Pass 的只读 Hub 摘要；静态首页和教程不依赖它。

## 本地启动

前置条件：Go 1.26、Redis、已在 OpenAkita Account 注册的 confidential OIDC client，以及已构建的官网页面。

```powershell
npm ci
npm run build
Copy-Item .\bff\.env.example .\bff\.env.local
```

配置 `.env.local` 后，将变量加载到当前终端，再运行：

```powershell
Set-Location .\bff
go run .\cmd\openakita-web-bff
```

加密密钥采用 `kid:base64url-32-bytes`，逗号分隔。第一个 key ID 用于新写入，旧 key 可保留用于滚动解密；不得提交真实密钥。

## 路由

- `GET /auth/login`、`GET /auth/callback`：Authorization Code + PKCE S256；
- `POST /auth/logout`、`GET /auth/logout/callback`：本地会话撤销与 Account 单点退出；
- `GET /api/v1/session`：静态公共页面的最小登录状态；
- `GET /api/v1/hub`：并发聚合 Account 资料、Account 权益、Marketplace 资源库和 Pass 额度/当月用量摘要；
- `GET /account`：必须登录的 Hub HTML；
- `GET /health`、`GET /ready`：进程存活和 Redis 就绪检查；旧的 `/health/live`、`/health/ready` 保持兼容；
- `GET /metrics`：低基数 Prometheus 指标，只应向运维网络开放。

## 验收

```powershell
go test ./...
go vet ./...
go build -o .\bin\openakita-web-bff.exe .\cmd\openakita-web-bff
```

Redis 限流集成测试在配置 `WEB_BFF_TEST_REDIS_URL` 时运行，否则自动跳过。生产限流阈值分别由 `WEB_BFF_AUTH_RATE_LIMIT_PER_MINUTE` 和 `WEB_BFF_API_RATE_LIMIT_PER_MINUTE` 控制。

生产环境必须使用 HTTPS、带认证的 `rediss://`、`__Host-` Secure Cookie，并在 `WEB_BFF_TRUSTED_PROXIES` 中精确配置可信代理 CIDR。只有来自可信代理的请求才会采用转发客户端地址。BFF 启动时会拒绝不满足这些约束的配置。

Marketplace 使用专用的 `openakita-web-bff` Basic 机器身份。该凭据只能读取最小资源库摘要，必须与 Marketplace 出站访问 Account 的机器凭据完全分离。

Pass 同样使用独立的 `openakita-web-bff` Basic 机器身份，只能读取最小额度/用量摘要。`WEB_BFF_PASS_MACHINE_SECRET` 不得与 Account OIDC Client Secret、Marketplace Secret 或 Pass 的 Account 状态传播 Secret 复用。官网只提供 Pass 控制台与充值深链接，不执行充值、余额变更或 API Key 创建。
