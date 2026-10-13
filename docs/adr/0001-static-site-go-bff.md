# ADR-0001：Vite 静态官网与同仓库 Go BFF

- 状态：已接受
- 日期：2026-08-17
- 适用阶段：OpenAkita 一期官网与 Marketplace 接入
- 决策范围：`openakita-web` 的代码组织、运行边界与部署形态

## 背景

OpenAkita 官网当前是 Vite 驱动的多页面静态站，已经承载品牌、下载、服务、应用场景、教程、条款和多语言内容。一期 PRD 要求新增统一登录、全局账户区和只读的“我的 OpenAkita”聚合页，同时要求 BFF 故障不能影响既有静态内容。

Account 已提供 OIDC Authorization Code、PKCE、userinfo、权益读取和 RP-Initiated Logout。Marketplace 已有自己的 OIDC 会话与用户资源库，但现有资源库接口只接受 Marketplace 自己的会话 Cookie，不能由官网安全复用。

## 决策

1. 保留 Vite 作为官网内容页的静态构建工具。
2. 在 `openakita-web` 仓库新增独立的 `bff/` Go Module，目标 Go 版本与 Account、Marketplace 保持一致（Go 1.26）。
3. 静态站和 BFF 分别构建、分别生成容器、分别部署；同一域名由反向代理按路径分流。
4. BFF 使用 Redis 保存一次性 OIDC 状态和服务端官网会话，不新增官网业务数据库。
5. 浏览器只持有不透明的 HttpOnly 会话 Cookie；Account access token、refresh token 和 ID token 均加密保存在 BFF 服务端。
6. 官网 BFF 以 OIDC access token读取 Account 的用户与权益接口；以专用机器身份读取 Marketplace 的用户资产摘要。
7. `/account` 由 BFF 做登录保护并提供 Hub 页面；首页、下载、服务、场景、教程、关于、条款和隐私页面继续由静态站提供。
8. BFF 与 Account、Marketplace 仅通过版本化 HTTP 契约通信，不共享代码、Cookie、数据库或内部包。

## 代码与发布边界

一个仓库包含两个独立产物：

```text
openakita-web/
  package.json                 # Vite 静态站
  vite.config.ts
  assets/
  ...静态页面...
  bff/
    go.mod
    cmd/openakita-web-bff/
    internal/
  Dockerfile.static
  Dockerfile.bff
```

运行时边界：

```text
静态站：/, /download/*, /services/*, /scenarios/*, /tutorials/*, /about/*
Go BFF：/auth/*, /account, /api/v1/session, /api/v1/hub, /health, /ready, /metrics
```

“同仓库”用于保证账户菜单、Hub 页面和 BFF 契约可以原子提交；“分进程、分镜像、分路由”用于保证故障隔离。

## 被否决的方案

### 新建 `openakita-web-bff` 仓库

一期 BFF 只服务官网，前后端需要同步修改。单独仓库会增加版本协调、流水线和权限维护成本，暂不采用。当 BFF 被多个站点复用、由独立团队维护或需要独立安全发布权限时再重新评估。

### 将 BFF 放入 Account 或 Marketplace

这会模糊产品职责，使官网发布依赖其他产品仓库，并诱发 Cookie、数据库或内部模型耦合，不采用。

### Node.js BFF

技术上可行，但团队现有 Account、Marketplace 的 OIDC、可观测性和生产部署经验集中在 Go。选择 Go 可以降低安全实现和运维差异。

### 全站迁移 Next.js

一期动态范围仅包含登录和轻量 Hub，全量迁移不能消除 OIDC、服务端会话和下游聚合工作，且会扩大静态内容回归范围，不纳入一期。

## 影响

正向影响：

- 静态内容与账户运行时故障隔离；
- 官网专属接口与页面可以同版本交付；
- 不向浏览器暴露 Account token；
- 二期可以增加 Pass 摘要客户端，而不改变一期边界。

需要承担的成本：

- 一个仓库需要维护 JavaScript 和 Go 两套构建；
- 需要 Redis、独立 BFF 容器和反向代理规则；
- Marketplace 必须补充只读机器接口；
- CI 必须分别验证静态站和 Go BFF。

## 复审条件

出现以下任一情况时复审本 ADR：

- 官网受保护动态页面显著多于静态内容页；
- BFF 被多个域名或产品共同复用；
- 需要独立团队和独立安全发布权限；
- Redis 会话无法满足可用性或合规要求；
- 官网开始承担订单、支付或其他业务事实。
