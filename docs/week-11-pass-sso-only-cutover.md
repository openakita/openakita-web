# 第十一周交付：Pass SSO-only 受控切换

- 日期：2026-08-18
- 对应 PRD：Phase 2 P2.3
- 主要实现仓库：`D:\projects\go\stack-token-center`

## 本周目标

在存量认领达到批准门槛后，把 OpenAkita Account 正式设为 Pass 普通用户唯一
注册/登录入口，同时保留可审计、带 2FA、仅指定管理员可用的 break-glass
恢复能力，以及不触碰余额/API Key/账单的快速回退路径。

## 已完成

- 把 OIDC 可用状态与 SSO-only 正式切换状态分离，避免配置 OIDC 即意外关停
  迁移期本地入口；
- 增加持久化 cutover 状态、root 激活/回退接口和追加式安全审计；
- 激活前强制检查 OIDC 配置、迁移覆盖率、未完成或冲突 claim 和
  break-glass 2FA；
- 普通密码、注册、重置密码、短信/Passkey/旧社交登录及 Pass 侧身份管理入口
  在 SSO-only 下统一关闭；
- P2.2 存量认领窗口同步关闭：登录页隐藏认领表单，公共 API 拒绝启动认领，
  管理员不能再签发新的认领码；
- Profile 的密码、设备、会话和登录方式跳转 Account 安全门户，Pass 继续管理
  API Key、余额、用量、充值和账单；
- break-glass 只允许环境 allowlist 中启用本地 2FA 的 admin/root，所有尝试
  仅记录身份/IP/UA 摘要和机器原因码；
- 提供 OIDC 成功率与 break-glass 统计、安全事件查询、上线与回退 Runbook。

## 明确不包含

- P2.4 Marketplace 使用 Pass 余额支付；
- 自动转移或合并两个 Pass 用户的余额/API Key；
- 在未达到覆盖率或仍有进行中 claim 时强行切换；
- 公开 break-glass 登录页面。

## 验收重点

- migration 模式不会因 OIDC 已配置而自动关闭本地入口；
- readiness 不通过时 root 激活安全失败；
- SSO-only 后普通本地身份入口在 API 和 UI 双层关闭；
- 指定管理员必须通过密码加本地 2FA，其他用户均不能 break-glass；
- 回退恢复迁移期入口，但不改变已绑定主体和 Pass 业务资产。
