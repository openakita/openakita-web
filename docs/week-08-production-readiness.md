# 第八周交付：生产就绪与上线收口

- 完成日期：2026-08-17
- 范围：一期官网静态站与 Go BFF
- 二期边界：未增加 Pass、钱包、余额或支付字段

## 已完成

1. BFF 增加 Prometheus 指标，覆盖 HTTP、OIDC、会话、下游调用、Hub 降级、Redis 错误和限流；
2. 指标使用固定低基数标签，不记录请求 ID、subject、邮箱、查询参数或敏感凭据；
3. 增加 Redis 固定窗口限流，认证链和动态 API 使用独立阈值，多实例共享状态；
4. 仅当请求的直接来源位于 `WEB_BFF_TRUSTED_PROXIES` 时解析代理链，防止客户端伪造转发地址绕过限流；
5. 同时提供 `/health`、`/ready` 与兼容的 `/health/live`、`/health/ready`；readiness 只依赖 Redis，不绑定 Account 或 Marketplace 的短暂健康；
6. 新增静态站非 root Nginx 镜像，与 BFF 镜像独立构建、健康检查和回滚；
7. 新增生产 Compose、边缘 Nginx 路径分流、Prometheus 告警和生产变量模板；
8. 新增发布、观测、回滚与下游故障处置运行手册。

## 故障隔离结果

- 静态页面不经过 BFF；
- Account 或 Marketplace 不参与 BFF readiness；
- Marketplace 失败只降级 Marketplace 卡片；
- Redis 失败会关闭动态账户能力，但静态容器继续服务；
- 静态与 BFF 可使用不同镜像标签独立回滚。

## 验收范围

- 限流允许/拒绝边界与 Redis 共享计数；
- 不可信 `X-Forwarded-For` 无法改变客户端限流桶；
- 指标路由标签稳定且不泄漏请求 ID；
- 生产配置拒绝非法可信代理和非正数限流；
- Go test/vet/build、Vite 15 页构建、静态/BFF 双镜像构建；
- Nginx 配置语法、容器非 root 用户、健康端点与静态页面冒烟。
