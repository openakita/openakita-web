# ADR-0002：以只读摘要接入 OpenAkita Pass

- 状态：已接受
- 日期：2026-08-17
- 关联：Phase 2 P2.1、`docs/contracts/hub-api-v1.md`

## 背景

二期 P2.1 要求用户使用同一 OpenAkita Account 进入 Pass，并在官网 Hub 看到 API 余额、当期用量和入口。Pass 已经是额度、消费日志和显示换算规则的权威系统；官网不能复制这些事实，也不能把 Pass token 或管理能力交给浏览器。

## 决策

1. Pass 提供按 Account OIDC `sub` 查询的最小只读摘要接口，使用独立 `openakita-web-bff` Basic 机器身份；
2. 官网 BFF 增加独立 Pass 客户端，与 Account、Marketplace 请求并发执行，失败只降级 `pass` 模块；
3. 额度和用量保持整数 quota，显示类型、`quota_per_unit`、币种符号及汇率由 Pass 返回；
4. 未创建 Pass 投影返回 HTTP 200 `not_provisioned`；消费日志关闭时返回 `usage_available=false`，不把零占位冒充实际用量；
5. 浏览器只调用同源 `/api/v1/hub`。官网不保存 Pass token，不直连 Pass 数据库；
6. 官网只展示摘要和 Pass 控制台/充值深链接，不创建 API Key、不改余额、不处理支付。

机器 Secret 必须与 Account OIDC Client Secret、Marketplace Secret、Account 状态传播 Secret 分离。BFF 和 Pass 两端都校验这一边界。

## 结果

- 用户获得一致的统一入口和可独立降级的 Pass 摘要；
- Pass 继续掌握所有额度、计费和显示口径；
- Hub v1 以新增顶层模块保持向后兼容；
- 任何充值、钱包扣款或支付闭环都需要新的 ADR、威胁模型、幂等设计和契约版本，不能在本决策上隐式扩展。

## 备选方案

- 官网直接调用 Pass：会把跨域认证和数据裁剪责任交给浏览器，拒绝；
- 官网读取 Pass 数据库：破坏系统权威和部署边界，拒绝；
- 复制余额到 Account：产生双写和一致性问题，拒绝。
