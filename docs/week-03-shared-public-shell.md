# 第三周交付：官网公共外壳与账户区

- 完成日期：2026-08-17
- 范围：14个静态官网页面的Header、Footer、产品导航、语言选择和账户区
- 状态：已完成，可进入首页与既有内容页的Marketplace衔接

## 1. 交付结果

第三周按照一期PRD第2.2节完成公共外壳单一来源改造：

1. Header与Footer分别收敛到一个HTML partial；
2. 14个正式页面只保留Header/Footer语义占位符，不再复制公共HTML；
3. Vite在开发和生产构建阶段注入完整外壳，最终产物仍是可直接发布的静态HTML；
4. 产品导航统一为“首页、下载、Marketplace、服务、应用场景、教程、关于”；
5. Marketplace公开地址由`config/site.json`集中维护；
6. 语言选择器进入Header模板，七种语言的导航、账户区和无障碍文案统一更新；
7. 新增匿名、已登录和BFF不可用三种账户区状态；
8. 新增键盘、焦点、移动导航和账户菜单行为；
9. 新增构建期公共外壳一致性校验。

## 2. 构建期模板

公共模板位于：

```text
partials/site-header.html
partials/site-footer.html
```

正式页面使用：

```html
<div data-site-header></div>
<main id="main-content" tabindex="-1">...</main>
<div data-site-footer></div>
```

`vite.config.ts`中的`openakita-inject-static-shell`插件在Vite核心HTML转换前注入模板，因此模板中的图片和样式资源仍由Vite解析、生成内容哈希。`partials/`不作为页面入口，也不会进入发布页面清单。

注入阶段要求每个正式页面恰好有一个Header占位符和一个Footer占位符。缺少或重复占位符会直接使构建失败。

## 3. 产品导航与配置

导航顺序固定为：

```text
首页 | 下载 | Marketplace | 服务 | 应用场景 | 教程 | 关于
```

Marketplace地址由以下文件集中配置：

```json
{
  "marketplace_url": "https://marketplace.fzstack.com/"
}
```

构建要求该值为以`/`结尾的绝对HTTPS URL。官网页面通过`body[data-page]`确定当前栏目，并为对应导航项增加`aria-current="page"`。

Header不再展示GitHub产品导航项；GitHub、Gitee、X和Discord继续保留在全站Footer社区入口中。

## 4. 账户区渐进增强

账户区遵守`docs/contracts/hub-api-v1.md`，不在浏览器保存Account access token或refresh token。

### 4.1 默认与未登录状态

- 静态HTML直接提供“登录/注册”链接；
- `return_to`根据当前同源路径和查询参数生成；
- BFF返回的登录地址必须仍是同源`/auth/login`，否则使用安全默认值；
- JavaScript或BFF不可用时，静态内容与登录入口仍然存在。

### 4.2 已登录状态

页面以同源凭据请求：

```text
GET /api/v1/session
```

成功后显示头像或安全回退首字母、显示名称、脱敏账户标识以及以下菜单：

```text
我的 OpenAkita
Marketplace：已获取资源
登录与安全
权益与 License
退出登录
```

菜单跳转只接受同源地址或HTTPS地址。头像只接受HTTPS地址，加载失败时恢复为首字母头像。

退出使用：

```text
POST /auth/logout
X-CSRF-Token: <session csrf token>
```

账户区只消费BFF裁剪后的会话模型，不读取Account或Marketplace Cookie，不接触下游token。

### 4.3 BFF不可用状态

会话请求预算为1.8秒。超时、非JSON响应或服务不可用时：

- 保持“登录/注册”静态入口；
- 不隐藏或阻塞任何内容页面；
- 通过`aria-live`向辅助技术报告账户服务暂不可用；
- 不跳转到错误页，不展示下游错误正文。

## 5. 无障碍与交互

- 每页提供“跳至主要内容”链接和唯一`main-content`目标；
- 移动导航按钮具备`aria-controls`和实时`aria-expanded`；
- 导航打开/关闭文案随语言和状态变化；
- Escape关闭移动导航并恢复焦点；
- 当前导航项使用`aria-current="page"`；
- 语言选择器有显式`label`和可访问名称；
- 账户按钮使用`aria-haspopup="menu"`；
- 账户菜单支持方向键、Home、End和Escape；
- Escape关闭账户菜单后把焦点恢复到触发按钮；
- 点击菜单外部或焦点离开账户区时关闭菜单；
- 所有按钮、链接和选择器使用统一的`:focus-visible`焦点样式。

## 6. 自动校验

新增：

```powershell
npm run verify:shell
```

`build-tools/verify-shell.mjs`检查：

- 14个源页面恰好各有一组Header/Footer占位符；
- 源页面不存在复制的公共Header/Footer；
- 每页存在唯一、可聚焦的`main-content`；
- 每个产物页面恰好包含一个Header、Footer、导航和账户区；
- 导航项目数量、顺序和账户状态结构符合约定；
- 构建产物不存在未解析占位符或配置token；
- 14个产物页面的Header和Footer逐字节一致。

第二周的链接校验器已将`/auth/*`和`/account`明确建模为Go BFF路由；其他缺失的本地链接仍会使构建失败。

## 7. 验收证据

```text
npm run typecheck      PASS
npm run build          PASS
npm run verify:dist    PASS（14页、12个运行时文件）
npm run verify:shell   PASS（14页共享同一公共外壳）
node --check           PASS
git diff --check       PASS
```

浏览器交互验收：

- 1280×720桌面布局无横向溢出，Header/Footer/账户区各一个；
- 390×844移动布局无横向溢出，导航可打开并由Escape关闭；
- 中文切换英文后导航、语言和账户文案同步更新；
- 模拟已登录会话后正确显示用户、脱敏标识和五项账户菜单；
- 账户菜单方向键、Home、End、Escape及焦点恢复通过；
- 控制台错误和警告为0。

相同工作区连续构建两次的`dist`联合SHA-256：

```text
e3d6eacd2cceb73e8300d57f668f5a76932abeb0375d1854022c7a83b733066e
```

## 8. 未纳入本周

- Go BFF、OIDC回调、Redis会话和`/account` Hub页面尚未实现；
- 首页Marketplace精选内容和既有内容页的市场入口不在本周实现；
- Phase 2 Pass菜单、钱包、支付、组织或管理员入口没有加入一期外壳。

下一周按一期PRD第2.3和2.4节处理首页与既有内容页的Marketplace衔接。
