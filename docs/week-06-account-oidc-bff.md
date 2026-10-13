# 第六周交付：Account OIDC 与官网 Go BFF

- 完成日期：2026-08-17
- 实施范围：一期第六周
- 运行边界：同仓库、独立 Go Module、独立进程与容器

## 已完成

1. 在 `bff/` 建立 Go 1.26 Module，并提供独立启动入口与 `Dockerfile.bff`；
2. 通过 Account Discovery 接入 Authorization Code Flow，强制 PKCE S256、一次性 state、nonce 和 RS256 ID Token 校验；
3. Redis 原子消费 OIDC state，以 256 bit 随机会话令牌的 SHA-256 摘要索引会话；
4. Account token bundle 使用带 key ID 的 AES-256-GCM 信封加密，支持滚动保留旧密钥；
5. 实现 `/auth/login`、`/auth/callback`、`/auth/logout` 与退出回调，退出写操作要求同源 Origin 和会话绑定 CSRF token；
6. 实现 `/api/v1/session` 与登录保护的 `/account`；
7. 实现 `/api/v1/hub` 的 Account 资料、权益并发聚合和模块级降级；Marketplace 模块在第 7 周接口完成前明确返回 `unavailable`；
8. 实现 access token 提前刷新和单会话分布式刷新锁；refresh token 被拒绝时立即销毁官网会话；
9. 增加生产配置安全校验、请求 ID、无缓存响应、安全响应头、健康检查和不含敏感字段的结构化请求日志。

## 安全边界

- 浏览器只持有 `HttpOnly` 随机会话 Cookie，拿不到 Account access/refresh/ID token；
- Cookie 在生产使用 `__Host-oa_web_session; Secure; HttpOnly; SameSite=Lax; Path=/`；
- `return_to` 仅接受同源相对路径，非法输入回退 `/`；
- OIDC code、state、Cookie、token 和完整邮箱不会写入日志或 Hub 响应；
- userinfo 的 `sub` 必须与已验证 ID Token 和服务端会话一致；
- Account 明确返回 401 时销毁会话，userinfo 返回 403 时按禁用账户返回整体 403；
- Redis 丢失只导致重新登录，不会丢失 Account 或 Marketplace 业务事实。

## 自动化覆盖

- AES-GCM 加解密、AAD 绑定和短密钥拒绝；
- OIDC 固定 scope、PKCE S256、token 请求 verifier 和 nonce 拒绝；
- state 一次性消费与刷新锁所有权；
- 匿名/登录 Session API、受保护页面和开放重定向防护；
- Account 成功而权益失败时的部分 Hub 响应；
- 权益统计、敏感值不泄漏、refresh token 拒绝后会话销毁；
- Logout 的 Origin 与 CSRF 校验；
- 生产 HTTPS、回调同源和 Redis TLS/认证配置约束。

## 第七周接口点

第六周不伪造 Marketplace 数据。第七周只需新增只读 Marketplace client，并把当前 Marketplace `unavailable` 信封替换为独立并发结果；Account、会话和浏览器契约不需要改变。
