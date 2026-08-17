# OpenAkita Web BFF

官网 BFF 是一期的独立 Go 运行单元。它只负责 OIDC 登录、加密服务端会话、受保护的 `/account` 页面，以及 Account 驱动的只读 Hub 摘要；静态首页和教程不依赖它。

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
- `GET /api/v1/hub`：并发聚合 Account 资料、Account 权益和 Marketplace 资源库摘要；
- `GET /account`：必须登录的 Hub HTML；
- `GET /health/live`、`GET /health/ready`：进程和 Redis 就绪检查。

## 验收

```powershell
go test ./...
go vet ./...
go build -o .\bin\openakita-web-bff.exe .\cmd\openakita-web-bff
```

生产环境必须使用 HTTPS、带认证的 `rediss://`、`__Host-` Secure Cookie，并配置可信代理。BFF 启动时会拒绝不满足这些约束的配置。

Marketplace 使用专用的 `openakita-web-bff` Basic 机器身份。该凭据只能读取最小资源库摘要，必须与 Marketplace 出站访问 Account 的机器凭据完全分离。
