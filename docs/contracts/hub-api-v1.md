# OpenAkita 官网 BFF Hub API v1

- 状态：一期契约已冻结；二期 P2.1 已按向后兼容方式增加 Pass 模块
- 日期：2026-08-17
- 面向调用方：官网静态页面与“我的 OpenAkita”页面
- 媒体类型：`application/json; charset=utf-8`

## 1. 通用规则

- 所有时间使用UTC RFC 3339；
- 所有响应包含`X-Request-ID`；
- 用户响应必须设置`Cache-Control: no-store`；
- 浏览器不得向Account、Marketplace或Pass直接发送token；
- 未知响应字段必须被客户端忽略，以允许向后兼容扩展；
- 错误使用稳定机器码，不透传下游错误正文。

## 2. 登录状态

### `GET /api/v1/session`

用于所有静态页面渲染登录/头像状态。该接口不触发登录跳转。

未登录响应：

```json
{
  "authenticated": false,
  "login_url": "/auth/login?return_to=%2F"
}
```

已登录响应：

```json
{
  "authenticated": true,
  "user": {
    "sub": "usr_123",
    "display_name": "Akita User",
    "email_label": "a***@example.com",
    "email_verified": true,
    "avatar_url": "https://account.example/avatar.png"
  },
  "csrf_token": "opaque-session-bound-token",
  "links": {
    "hub": "/account",
    "marketplace_library": "https://marketplace.example/library",
    "account_security": "https://account.example/portal?view=security",
    "account_entitlements": "https://account.example/portal?view=entitlements",
    "pass_console": "https://pass.example/console",
    "pass_topup": "https://pass.example/console/topup"
  }
}
```

规则：

- 返回的邮箱只能是掩码展示值；
- `avatar_url`只允许Account配置的HTTPS来源，客户端必须有安全回退头像；
- 会话过期也返回`authenticated=false`并清除过期Cookie；
- `login_url`中的`return_to`由当前页面在客户端编码，但BFF仍必须再次校验。

## 3. Hub摘要

### `GET /api/v1/hub`

要求有效官网会话。四个模块独立返回，HTTP 200不代表每个模块都成功。

成功或部分降级响应：

```json
{
  "generated_at": "2026-08-17T08:00:00Z",
  "account": {
    "status": "ok",
    "data": {
      "sub": "usr_123",
      "display_name": "Akita User",
      "email_label": "a***@example.com",
      "email_verified": true,
      "requires_email_binding": false,
      "avatar_url": "https://account.example/avatar.png"
    }
  },
  "marketplace": {
    "status": "ok",
    "data": {
      "acquired_count": 4,
      "update_available_count": 1,
      "recent": [
        {
          "resource_id": "res_123",
          "slug": "github-assistant",
          "name": "GitHub 协作助手",
          "resource_type": "plugin",
          "icon_url": "https://marketplace.example/icons/github.png",
          "acquired_at": "2026-08-16T08:00:00Z",
          "detail_url": "https://marketplace.example/resources/github-assistant"
        }
      ]
    }
  },
  "entitlements": {
    "status": "ok",
    "data": {
      "active_count": 4,
      "products": [
        {
          "product_code": "marketplace",
          "active_count": 3,
          "expires_at": null
        }
      ],
      "updated_at": "2026-08-17T07:59:58Z"
    }
  },
  "pass": {
    "status": "ok",
    "data": {
      "account_status": "active",
      "available_quota": 2500000,
      "warning_threshold_quota": 1000000,
      "current_month_used_quota": 750000,
      "current_month_request_count": 42,
      "usage_available": true,
      "period_start": "2026-08-01T00:00:00Z",
      "period_end": "2026-09-01T00:00:00Z",
      "display": {
        "type": "CNY",
        "quota_per_unit": 1000000,
        "currency_symbol": "¥",
        "currency_exchange_rate": 1
      },
      "alerts": []
    }
  },
  "links": {
    "marketplace_explore": "https://marketplace.example/catalog",
    "marketplace_library": "https://marketplace.example/library",
    "account_security": "https://account.example/portal?view=security",
    "account_entitlements": "https://account.example/portal?view=entitlements",
    "pass_console": "https://pass.example/console",
    "pass_topup": "https://pass.example/console/topup"
  }
}
```

模块降级格式：

```json
{
  "status": "unavailable",
  "error": {
    "code": "temporarily_unavailable",
    "retryable": true
  }
}
```

模块`status`一期只有：

- `ok`：调用成功，包括计数为零的正常空状态；
- `unavailable`：超时、熔断、网络或下游5xx。

正常空状态不得使用`unavailable`。客户端必须允许用户单独重试失败模块。

### 整体错误

| HTTP状态 | `error` | 含义 |
| --- | --- | --- |
| 401 | `authentication_required` | 官网会话不存在、过期或已撤销 |
| 403 | `account_disabled` | Account明确禁用该用户 |
| 429 | `rate_limited` | BFF保护性限流 |
| 500 | `internal_error` | BFF自身不可恢复错误，不能用于下游单模块失败 |

401响应附带安全的相对登录入口：

```json
{
  "error": "authentication_required",
  "login_url": "/auth/login?return_to=%2Faccount"
}
```

## 4. 登录与退出路由

### `GET /auth/login?return_to=<relative-path>`

- 默认`return_to=/`；
- `/account`访问触发登录时固定回到`/account`；
- 参数非法时忽略并使用`/`，不能把非法值拼入Account URL；
- 成功响应为302到Account authorize endpoint。

### `GET /auth/callback?code=<code>&state=<state>`

- 成功建立服务端会话并303到已保存的`return_to`；
- Account返回`error`、缺少code/state、state过期或重复使用时进入同源错误页；
- 错误页只显示稳定用户文案和请求ID。

### `POST /auth/logout`

要求：官网会话、合法Origin和`X-CSRF-Token`。

行为：

1. 撤销并删除官网会话；
2. 删除官网Cookie；
3. 返回Account `end_session_endpoint`的同源允许跳转URL，或303进入该URL；
4. Account退出后只允许回到已注册的官网退出回调地址。

## 5. Account下游契约

BFF依赖以下现有接口：

```text
GET  /.well-known/openid-configuration
GET  /oauth/authorize
POST /oauth/token
GET  /oauth/userinfo
GET  /api/v1/me/entitlements
GET  /oauth/end-session
```

固定scope：

```text
openid profile email offline_access entitlements
```

字段映射：

| Hub字段 | Account来源 |
| --- | --- |
| `sub` | userinfo `sub` |
| `display_name` | userinfo `name` |
| `email_label` | userinfo `email`经BFF掩码 |
| `email_verified` | userinfo `email_verified` |
| `avatar_url` | userinfo `picture` |
| `requires_email_binding` | 邮箱为空或`email_verified=false` |
| `active_count` | entitlements中`status=active`的数量 |
| `products` | 使用Account `product_access`聚合；每个产品的`active_count`为其`entitlement_codes`去重后的数量 |

Account调用使用用户access token；这是OIDC Relying Party读取当前用户数据，不是服务机器写入。任何Account写操作都不在官网BFF范围内。

## 6. Marketplace下游契约

Marketplace必须新增只读接口：

### `GET /api/v1/service/users/{account_sub}/library-summary`

查询参数：

| 参数 | 必填 | 规则 |
| --- | --- | --- |
| `recent_limit` | 否 | 默认3，范围0到5 |

请求头：

```text
Authorization: Basic <machine-id:machine-secret>
X-Request-ID: <request-id>
Accept: application/json
```

成功响应：

```json
{
  "account_sub": "usr_123",
  "acquired_count": 4,
  "update_available_count": 1,
  "recent": [
    {
      "resource_id": "res_123",
      "slug": "github-assistant",
      "name": "GitHub 协作助手",
      "resource_type": "plugin",
      "icon_url": "https://marketplace.example/icons/github.png",
      "acquired_at": "2026-08-16T08:00:00Z"
    }
  ],
  "generated_at": "2026-08-17T08:00:00Z"
}
```

统计口径：

- `acquired_count`：`status=active`的资源领取数，撤销记录不计入；
- `update_available_count`：存在至少一个活跃安装，其当前版本不同于资源最新已发布版本，或安装状态明确为`update_available`的去重资源数；
- `recent`：仅活跃领取，按`acquired_at DESC, acquisition_id DESC`排序；
- 没有Marketplace用户投影或领取记录时返回200和零值，不返回404；
- `detail_url`由官网BFF根据配置的Marketplace公开Origin和`slug`生成，Marketplace不接受调用方提供URL。

错误：

| HTTP状态 | `error` | 含义 |
| --- | --- | --- |
| 401 | `machine_credentials_required` | 未提供凭据 |
| 403 | `machine_not_allowed` | 客户端无权读取官网摘要 |
| 400 | `invalid_subject` | subject或参数不合法 |
| 500 | `summary_unavailable` | 查询失败 |

机器客户端固定为专用`openakita-web-bff`身份，只授予`marketplace.library-summary:read`能力，不能领取、下载、安装、审核或写入资源。

## 7. Pass 下游契约（二期 P2.1）

官网 BFF 使用专用机器身份读取：

```text
GET /api/internal/openakita/users/{account_sub}/summary
Authorization: Basic <openakita-web-bff:pass-machine-secret>
X-Request-ID: <request-id>
Accept: application/json
```

Pass 返回 `success` 信封，`data` 包含 Account `sub`、Pass 本地账户状态、原始整数额度、本月 UTC 用量、用量可用性、Pass 自有显示规则、稳定提醒码和生成时间。详细规范以 Pass 仓库 `contracts/web-summary/v1` 为准。

规则：

- Pass 只允许按 OIDC `sub` 查询，不接受邮箱、手机号或显示名；
- 未创建 Pass 本地投影时返回 HTTP 200 和 `account_status=not_provisioned`，不是故障；
- 额度及用量均为 Pass 原始整数 quota，官网不得硬编码 `quota_per_unit`、人民币或其他币种；
- `usage_available=false` 时用量零值只是占位，官网必须显示不可用状态；
- 官网仅展示摘要和控制台/充值深链接，不创建 API Key、不充值、不修改或冻结余额；
- Pass 401、403、超时或 5xx 只使 `pass` 模块降级，不影响 Account、Marketplace 和权益模块；
- Pass 机器 Secret 必须与 OIDC Client Secret、Marketplace Secret 和 Account 状态传播 Secret 完全分离。

`account_status`：`active`、`suspended`、`not_provisioned`。提醒码：`account_suspended`、`balance_depleted`、`low_balance`、`usage_unavailable`。

## 8. 兼容性规则

- v1可以增加可选字段和新的模块稳定错误码；
- 不能删除或改变已冻结字段语义；
- 计数口径变化必须新增契约版本或先经过ADR；
- Account、Marketplace和Pass响应模型不得直接透传给浏览器；
- Pass 以新增顶层模块加入 v1；旧客户端必须按“忽略未知字段”规则保持兼容。

## 9. 必需契约测试

官网BFF：

- 未登录/已登录session响应；
- return_to开放重定向防护；
- state一次性消费、PKCE和nonce校验；
- Account资料成功、权益失败时部分响应；
- Marketplace超时和5xx时模块降级；
- Pass正常、未开通、暂停、低余额、超时和5xx时独立展示/降级；
- refresh token失效后会话销毁；
- Hub响应不包含token、Cookie、原始邮箱和下游错误正文。

Marketplace：

- 合法/非法机器身份；
- 零资源、撤销资源和最近资源排序；
- 多设备安装时更新数按资源去重；
- `recent_limit`边界；
- subject不存在时返回零摘要。

Pass：

- 合法/非法专用机器身份；
- subject不存在时返回`not_provisioned`；
- 本月用量使用UTC半开区间且不混入历史月份；
- 消费日志关闭时返回`usage_available=false`而不是伪装成真实零用量；
- 响应不包含邮箱、密码、API Key、调用明细或账本流水；
- 显示规则来自Pass运行时配置，官网不得自行猜测换算率。
