# 第一周交付：架构与接口冻结

- 完成日期：2026-08-17
- 范围：OpenAkita 官网静态站与一期 Go BFF
- 状态：已完成，可进入第二周静态构建治理

## 1. 已冻结决策

| 决策 | 结果 |
| --- | --- |
| 官网内容技术路径 | 保留Vite静态多页面构建 |
| BFF语言 | Go 1.26 |
| 仓库 | BFF放入`openakita-web/bff`，不另建仓库 |
| 运行边界 | 静态站与BFF分进程、分镜像、分健康检查 |
| 会话存储 | Redis，只保存OIDC状态和可丢失的服务端会话 |
| 浏览器凭据 | 仅不透明HttpOnly Cookie |
| Account调用 | OIDC用户access token读取userinfo与entitlements |
| Marketplace调用 | 专用机器身份按Account sub读取只读摘要 |
| Hub契约 | `/api/v1/session`和`/api/v1/hub` |
| 一期Pass | 完全不出现，通过二期独立模块扩展 |

详细记录：

- `docs/adr/0001-static-site-go-bff.md`
- `docs/architecture/website-bff.md`
- `docs/contracts/hub-api-v1.md`

## 2. 现状盘点结论

### 官网

- 现有域名声明为`openakita.ai`；
- 当前是Vite辅助的多页面静态站；
- 14个正式官网HTML页面均复制了Header/Footer；仓库根目录另有1个不发布的`memu_reference.html`设计参考文件；
- Vite配置尚未声明多页面构建输入；
- 登录、会话和Hub能力尚未实现。

以上问题进入第二周“Vite多页面构建治理”和第三周“公共页面外壳重构”，不在第一周直接改业务代码。

### Account

现有能力可复用：

- OIDC Discovery；
- Authorization Code + PKCE；
- token交换与刷新；
- RS256/JWKS与ID token nonce；
- userinfo；
- `GET /api/v1/me/entitlements`；
- RP-Initiated Logout。

Account实施依赖：

1. 注册`openakita-web` first-party confidential client；
2. 允许`openid profile email offline_access entitlements`；
3. 配置精确的登录回调和退出回调白名单；
4. 生产Issuer、JWKS和HTTPS可用。

### Marketplace

现有`GET /api/v1/library`只接受`marketplace_session` Cookie，不能由官网BFF跨产品复用。

冻结的新增依赖：

```text
GET /api/v1/service/users/{account_sub}/library-summary?recent_limit=3
```

使用专用机器身份，只返回资源数、待更新数和最近资源。该实现进入Marketplace后续迭代，但接口语义已在`docs/contracts/hub-api-v1.md`冻结。

## 3. 职责矩阵

| 能力 | 官网静态站 | 官网BFF | Account | Marketplace |
| --- | --- | --- | --- | --- |
| 品牌、下载、教程 | 权威 | 不负责 | 不负责 | 不负责 |
| 登录按钮和账户菜单UI | 负责 | 提供状态 | 认证权威 | 不负责 |
| OIDC回调与官网会话 | 不负责 | 负责 | 发放/撤销token | 不负责 |
| 用户资料 | 只展示 | 裁剪聚合 | 权威 | 本地投影 |
| 统一权益摘要 | 只展示 | 只读聚合 | 权威 | 投影来源之一 |
| 已获取资源摘要 | 只展示 | 只读聚合 | 不负责 | 权威 |
| 资源领取/安装 | 链接跳转 | 不负责 | 不负责 | 负责 |
| 密码、身份绑定、License | 链接跳转 | 不负责 | 负责 | 不负责 |

## 4. 开始第二周前的输入

第二周不依赖下游接口实现，可以立即开始。第六周OIDC开发前必须准备：

- Account本地/预发布Client ID与测试Secret；
- 精确回调URL和公开Origin；
- Redis开发实例；
- BFF本地端口与代理规则。

第七周Marketplace摘要联调前必须准备：

- Marketplace摘要接口；
- `openakita-web-bff`机器凭据；
- subject不存在、零资源和下游故障测试数据。

## 5. 变更控制

从本交付完成起，下列变化必须更新契约并记录ADR：

- 将BFF移出官网仓库；
- 改变静态站与BFF故障隔离原则；
- 在浏览器保存Account token；
- 让官网直接读取Marketplace数据库或Cookie；
- 改变资源数/待更新数统计口径；
- 在一期引入Pass字段；
- 对`/api/v1/hub`做破坏性字段调整。

## 6. 第一周验收结果

- [x] Go BFF技术设计；
- [x] 代码目录和发布边界；
- [x] 部署拓扑与故障隔离；
- [x] OIDC登录、回调、刷新和退出流程；
- [x] Cookie、Redis会话、CSRF与token保护策略；
- [x] 官网浏览器API v1；
- [x] Account下游接口映射；
- [x] Marketplace摘要新增契约与统计口径；
- [x] 系统职责矩阵；
- [x] 实施依赖和变更控制。
