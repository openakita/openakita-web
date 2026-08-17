# 第七周交付：Marketplace Hub 摘要闭环

- 完成日期：2026-08-17
- 涉及项目：`openakita-marketplace`、`openakita-web`
- 契约版本：Hub API v1，无破坏性字段变化

## Marketplace 侧

1. 新增 `GET /api/v1/service/users/{account_sub}/library-summary`；
2. 使用独立 `openakita-web-bff` Basic 机器身份，只允许调用这一条只读路由；
3. 从既有 PostgreSQL 领取、安装和版本事实实时计算摘要，不新增业务表或第二事实来源；
4. 排除撤销领取，最近资源按 `acquired_at DESC, acquisition_id DESC` 排序；
5. 多设备存在旧版本时，更新数按资源去重；显式 `update_available` 状态同样计入；
6. subject 不存在时返回 200 零摘要，参数和机器鉴权使用冻结错误码；
7. OpenAPI、Compose 与环境变量示例同步更新。

## 官网 BFF 侧

1. 新增独立 Marketplace client，使用专用机器凭据并透传 `X-Request-ID`；
2. Hub 在 2.5 秒总预算内并发读取 Account 资料、Account 权益和 Marketplace 摘要；
3. Marketplace 超时、网络错误、4xx/5xx 或响应不一致时，只将 Marketplace 模块降级为 `unavailable`；
4. Marketplace 响应不直接透传：BFF 裁剪字段，并根据配置的公开 Origin 构造资源详情链接；
5. 图标只允许来自 Marketplace 或显式配置的 HTTPS 资源 Origin；
6. 响应不会包含机器凭据、下游错误正文、Account token、Cookie 或完整邮箱。

## 配置对应关系

Marketplace API：

```text
MARKETPLACE_WEB_BFF_MACHINE_ID=openakita-web-bff
MARKETPLACE_WEB_BFF_MACHINE_SECRET=<shared-dedicated-secret>
```

官网 BFF：

```text
WEB_BFF_MARKETPLACE_MACHINE_ID=openakita-web-bff
WEB_BFF_MARKETPLACE_MACHINE_SECRET=<shared-dedicated-secret>
WEB_BFF_MARKETPLACE_BASE_URL=https://marketplace.example/
```

两个 Secret 的值必须一致，但不得与 Account、支付、签名或 Marketplace 浏览器会话密钥复用。

## 自动化覆盖

- 缺少、错误和合法机器身份；
- subject 与 `recent_limit` 边界；
- 下游数据库错误正文不泄漏；
- PostgreSQL 零资源、撤销资源、最近排序和多设备更新去重；
- BFF Basic Auth、请求 ID、subject 一致性和响应校验；
- Marketplace 成功映射、可信图标、同源详情链接；
- Marketplace 单模块失败而 Account/权益继续返回。
