# 第四周交付：首页与内容页 Marketplace 衔接

- 完成日期：2026-08-17
- PRD范围：一期第2.3、2.4节
- 状态：已完成；当前按生产资源可用性展示降级态

## 1. 交付结果

第四周完成了官网到 Marketplace 的编辑型入口，但没有把官网改造成第二个资源目录：

1. 首页Hero保留“立即下载”，新增“探索市场”次级入口；
2. 首页新增“下载 → 扩展 → 一键安装 → 统一管理”四步路径；
3. 三个官方精选资源进入集中配置；
4. 下载页增加“先下载、登录后同步资源”的非阻断提示；
5. 服务页按Plugin、Skill、MCP类型提供“从市场获取”入口；
6. 场景页提供人工策划的资源类型深链；
7. 教程首页及六个教程正文页末尾增加相关资源模块；
8. 关于、隐私与条款页不增加相关资源模块；
9. 所有市场链接、目标ID、资源ID、slug和可用状态均由配置维护；
10. 构建会拒绝未知目标、失效配置、未发布资源链接和遗漏模块。

## 2. 生产可用性与降级决策

实施时对生产 Marketplace 做了只读核对：

- Marketplace首页和目录可访问；
- 生产目录当前没有已发布资源；
- `github-assistant`与`web-research-skill`详情页当前返回404；
- 当前代码和生产数据中没有可发布的“IM 通道连接”资源。

因此按照PRD第2.3.6节，首页当前隐藏三个精选资源卡片，展示“官方精选正在上架”提示和“浏览全部资源”入口。配置中保留真实存在的两个资源ID与slug；第三个资源标记为`planned`，不编造资源ID。前台不展示下载量、评分或用户资产。

只有三个精选条目全部设置为`published`，构建才会渲染三张卡片。`published`条目必须同时提供`resource_id`和`slug`。

## 3. 配置边界

站点级Marketplace地址位于：

```text
config/site.json
```

入口、资源和文案位于：

```text
config/marketplace.json
```

配置包含：

- `targets`：市场首页、全部目录、Plugin、Skill、MCP和资源库；
- `target_id`：每个官网入口的稳定配置标识；
- `category_id`：目录与资源类型深链的稳定分类标识；
- `featured_resources`：三个精选资源的资源ID、slug、文案键和状态；
- `related_sections`：下载、服务、场景和教程页模块；
- `copy`：中文与英文的编辑型文案，其他语言回退英文。

Marketplace当前没有独立的Category实体，目录筛选使用`type=plugin|skill|mcp`。因此官网用`resource-type:*`作为稳定分类标识，并把实际查询路径集中在同一配置中；Marketplace以后引入真实Category ID时，只改配置与对应验证规则。

## 4. 构建期生成与约束

源码页面只声明语义占位符：

```html
<div data-marketplace-featured></div>
<div data-marketplace-related="tutorials"></div>
<a data-marketplace-target="skill">从市场获取 Skill</a>
```

Vite构建阶段负责：

1. 根据配置生成绝对HTTPS链接；
2. 注入`data-marketplace-target-id`和可选`data-marketplace-category-id`；
3. 根据资源状态生成精选卡片或统一降级提示；
4. 为内容页生成一致的轻量相关资源模块；
5. 注入Marketplace文案包，语言切换时同步更新新模块。

源码不直接维护生产Marketplace详情URL，避免资源下架或slug变化后散落失效链接。

## 5. 页面覆盖

| 页面 | 入口形式 | 目标 |
| --- | --- | --- |
| 首页Hero | 次级按钮 | Marketplace首页 |
| 首页扩展区 | 四步路径与降级提示 | 全部目录 |
| 下载 | 非阻断提示 | 全部目录、已获取资源 |
| 服务 | 类型入口 | Plugin、Skill、MCP |
| 应用场景 | 类型入口 | MCP、Skill、Plugin |
| 教程首页与六个正文页 | 页末相关资源 | Skill、MCP、Plugin |
| 关于、隐私、条款 | 无新增入口 | 保持原职责 |

## 6. 验收命令与结果

```powershell
npm run typecheck
npm run build
npm run verify:marketplace
```

构建结果：

- TypeScript检查通过；
- Vite生产构建通过；
- 14个正式页面和12个运行时文件通过静态引用校验；
- 14个页面通过共享Header/Footer校验；
- 3个编辑型资源、10个内容页模块、31个配置化链接通过Marketplace校验；
- 本地桌面端与390px移动端浏览器检查通过；
- 中文/英文切换通过；
- 页面无横向溢出；
- 浏览器控制台无错误或警告。

## 7. 上架操作

资源正式发布后：

1. 先确认生产详情页返回200；
2. 在`config/marketplace.json`写入真实`resource_id`和`slug`；
3. 将对应`availability`改为`published`；
4. 三个精选资源全部发布后运行完整构建；
5. 由`verify-marketplace`确认首页恰好生成三张卡片。

资源撤回或不可用时，将状态改为`unavailable`。构建会隐藏整个精选卡片区并回到统一提示，不会保留失效详情链接。
