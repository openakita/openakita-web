# 第五周交付：我的 OpenAkita 前端 Hub

- 完成日期：2026-08-17
- PRD范围：一期第2.5节、`GET /api/v1/hub`浏览器契约
- 状态：前端完成；第六周接入OIDC与真实官网BFF

## 1. 周范围

第一周实施计划把OIDC/BFF开发安排在第六周、Marketplace摘要联调安排在第七周。因此第五周只实现“我的 OpenAkita”页面和浏览器端只读聚合体验，不提前实现登录、服务端会话或下游调用。

本周新增：

```text
/account/
```

生产代理仍应按一期架构把`/account`、`/auth/*`和`/api/v1/*`交给官网BFF。Vite产出的`account/index.html`是BFF后续服务或引用的Hub页面壳。

## 2. 页面模块

Hub固定包含三个独立模块：

| 模块 | 展示 | 操作边界 |
| --- | --- | --- |
| 账户状态 | 头像、名称、掩码邮箱、邮箱验证提示 | 仅链接到Account登录与安全 |
| Marketplace摘要 | 已获取数、待更新数、最多3条最近资源 | 仅链接到Marketplace目录或资源库 |
| 统一权益 | 有效权益总数、按产品汇总、更新时间 | 仅链接到Account权益与License |

Hub不执行修改密码、领取资源、安装资源或激活License等写操作。

## 3. 状态模型

页面加载后只调用：

```text
GET /api/v1/hub
credentials: same-origin
Accept: application/json
```

请求超时为4秒，略高于BFF冻结的2.5秒聚合预算。页面支持：

- `loading`：每个模块独立骨架屏；
- `ok`：渲染经过裁剪的只读摘要；
- `ok + empty`：零资源或零权益属于正常空态；
- `unavailable`：仅失败模块显示降级说明和重试按钮；
- `401`：只接受同源`/auth/login`地址并返回`/account`；
- `403`：显示账户不可用，不提供重复请求按钮；
- `429`：显示限流提示并允许稍后重试；
- 网络、非JSON或BFF 5xx：保留公共页面壳，显示整体降级提示。

单模块重试会重新请求聚合端点，但不会在请求开始前清空其他已成功模块的数据。

## 4. 安全与隐私

实现约束：

1. 浏览器不访问`localStorage`、`sessionStorage`或`document.cookie`保存账户数据；
2. 页面不直连Account或Marketplace接口；
3. 所有下游文本使用`textContent`和DOM节点渲染，不使用`innerHTML`；
4. 外部链接只允许HTTPS且禁止用户名、密码形式URL；
5. Marketplace动态链接必须与配置的Marketplace Origin一致；
6. 登录地址只允许同源`/auth/login`；
7. 图片只允许HTTPS，加载失败回退到本地文字头像；
8. 即使BFF错误返回完整邮箱，前端也会再次掩码；
9. `/account`设置`noindex,nofollow,noarchive`；
10. 受保护页面不加载公共访问统计脚本。

## 5. 一期边界

页面只包含账户、Marketplace和统一权益摘要。后续阶段能力没有加入页面、浏览器数据模型、夹具或导航。

## 6. 契约夹具与验收

测试夹具位于：

```text
build-tools/fixtures/hub/
```

固定覆盖：

- `success.json`：三个模块全部成功；
- `empty.json`：零资源、零权益和待验证邮箱；
- `partial.json`：仅Marketplace模块不可用；
- `unauthorized.json`：会话失效并返回安全登录地址。

本地可运行：

```powershell
npm run build
npm run preview:hub-fixtures
```

然后访问：

```text
http://127.0.0.1:4180/account/?hub_fixture=success
http://127.0.0.1:4180/account/?hub_fixture=empty
http://127.0.0.1:4180/account/?hub_fixture=partial
http://127.0.0.1:4180/account/?hub_fixture=unavailable
```

确定性校验：

```powershell
npm run typecheck
npm run build
npm run verify:hub
```

验收结果：

- 15个正式页面和13个运行时文件通过构建与链接校验；
- 15个页面通过共享外壳一致性校验；
- 三个Hub模块与四类契约夹具通过范围、状态和存储守卫；
- 200、401、403、429、503 HTTP夹具响应正确；
- 桌面端与390px移动端无横向溢出；
- 正常空态、单模块降级和整体错误态均按预期显示；
- 浏览器控制台没有Hub运行错误。

## 7. 第六周输入

第六周在`bff/` Go Module中实现：

- OIDC Discovery、Authorization Code + PKCE S256；
- Redis一次性state与服务端官网会话；
- `/auth/login`、`/auth/callback`、`/auth/logout`；
- `GET /api/v1/session`；
- 先以Account资料与权益完成`GET /api/v1/hub`，Marketplace模块可在第七周联调前保持独立降级。

第六周不得把Account token下发给本周页面，也不得改变已冻结的浏览器契约。
