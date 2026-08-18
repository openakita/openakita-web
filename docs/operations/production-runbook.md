# OpenAkita 官网生产运行手册

## 发布单元

官网包含两个独立发布单元：

- `openakita-web-static`：Vite 静态内容，由非 root Nginx 在 8081 提供；
- `openakita-web-bff`：Go 动态账户能力，由非 root 用户在 8080 提供。

边缘 Nginx 仅将 `/auth/*`、`/account`、`/api/v1/session` 和 `/api/v1/hub` 转发到 BFF，其余流量始终转发到静态容器。BFF 或下游故障不能阻止首页、下载和教程访问。

## 发布前检查

1. `npm run build` 通过全部页面、公共外壳、Marketplace 和 Hub 校验；
2. BFF `go test ./...`、`go vet ./...` 和二进制构建通过；
3. `Dockerfile.static` 与 `Dockerfile.bff` 均可构建，容器以非 root 用户运行；
4. Account 已注册精确登录/退出回调，scope 为 `openid profile email offline_access entitlements`；
5. Marketplace 与 BFF 配置相同的专用机器 Secret，且没有复用其他凭据；
6. Pass 与 BFF 配置相同的独立摘要 Secret，且与 Account、Marketplace、状态传播凭据均不同；
7. Pass 已启用消费日志；若主动关闭，Hub 会明确显示“用量暂不可用”，不能将零值当成真实用量；
8. Redis 使用带认证的 `rediss://`，会话加密 key 为 32 字节 base64url，首个 key ID 是当前写入 key；
9. `WEB_BFF_TRUSTED_PROXIES` 只包含真实边缘代理或容器网关，不接受全网 CIDR；
10. Prometheus 已抓取仅运维网络可访问的 `/metrics`，告警规则已加载。

生产变量模板见 `deploy/.env.production.example`。该文件只能复制为部署系统的 Secret，不得提交真实值。

## 健康与指标

| 地址 | 含义 | 是否依赖下游 |
| --- | --- | --- |
| 静态容器 `/health` | 静态 Nginx 存活 | 否 |
| BFF `/health` | Go 进程存活 | 否 |
| BFF `/ready` | 配置已通过且 Redis 可用 | 仅 Redis |
| BFF `/metrics` | Prometheus 指标 | 必须限制在运维网络 |

核心指标前缀为 `openakita_web_bff_`，覆盖 HTTP 请求、OIDC 结果、会话刷新、Account/Marketplace/Pass 下游延迟、Hub 模块降级、Redis 错误和限流。标签只使用固定路由和稳定结果码，不包含 subject、邮箱、请求 ID、URL 参数或 token。

## 发布顺序

1. 先发布 BFF 新镜像，但不切换边缘流量；
2. 等待 `/health` 和 `/ready` 连续成功；
3. 用测试 Account 完成登录、Hub 四模块、Pass 未开通/已开通状态和退出链；
4. 切换动态路由到新 BFF，观察 5xx、OIDC 失败、Redis 错误和模块降级；
5. 独立发布静态镜像并验证 15 个页面；
6. 保留上一个健康镜像标签，至少观察一个完整会话刷新窗口。

## 回滚

- BFF 回滚只切回上一个 BFF 镜像，不回滚静态内容；
- 静态回滚只切回上一个静态镜像，不删除 Redis 会话；
- 加密 key 轮换时旧 key 必须保留到最长会话 TTL 结束，不能在回滚窗口内删除；
- Marketplace 摘要故障无需整体回滚，Hub 会单模块降级；
- Pass 摘要故障无需整体回滚，Hub 会单模块降级；
- Redis 故障会导致动态登录能力不可用，但静态站应继续返回 200。

## 事故处置

### Redis 错误

保持静态流量，暂停新的 BFF 发布，检查 TLS、认证、容量和连接数。Redis 数据不可恢复时允许清空官网会话并要求重新登录，不需要修复业务数据。

### Account 故障

登录和资料/权益可能失败。确认官网内容正常，不得临时绕过 ID Token、nonce、issuer 或 subject 校验。

### Marketplace 故障

只允许 Marketplace 卡片降级。禁止让官网直接查询 Marketplace 数据库或改用 Marketplace 浏览器 Cookie。

### Pass 故障

只允许 Pass 卡片降级。先按 `system=pass, operation=summary` 检查 BFF 下游指标，再核对双方独立机器 Secret、Pass 日志开关和摘要接口健康。禁止把 Pass 数据库接入官网、透传浏览器 token，或为恢复展示而绕过机器身份校验。用量不可用但余额可读时，应保留余额并显示明确的用量不可用提示。

### 异常登录流量

检查 `openakita_web_bff_rate_limited_total` 和边缘访问日志。限流由 Redis 在所有实例间共享；调整阈值必须同时记录变更原因和观察窗口。
