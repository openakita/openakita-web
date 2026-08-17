# 第二周交付：Vite多页面构建治理

- 完成日期：2026-08-17
- 范围：OpenAkita 官网静态构建、资源版本和产物完整性
- 状态：已完成，可进入第三周公共页面外壳重构

## 1. 交付结果

第二周把原先只声明Vite开发服务器的配置升级为可重复、可验证的正式多页面构建：

1. 自动发现并构建14个正式官网HTML入口；
2. 保持每个页面现有URL和目录结构；
3. 明确排除不发布的`memu_reference.html`设计参考文件；
4. 将动态使用的JS、多语言JSON、图片和下载API回退文件复制到`dist`；
5. 在`dist`中重新编译`assets/ts/motion.ts`，不再修改被Git跟踪的`assets/js/motion.js`；
6. 用文件内容摘要生成运行时JS和语言包缓存版本；
7. 删除会在每次构建时改写源HTML的`bump-assets.mjs`流程；
8. 新增页面数量、必需运行时文件和本地链接完整性校验；
9. 修复Desktop安装教程中一个已存在的图片断链。

## 2. 正式页面清单

构建必须产生以下14个页面：

```text
/
/about/
/download/
/privacy/
/scenarios/
/services/
/terms/
/tutorials/
/tutorials/im-channels/
/tutorials/llm-endpoints/
/tutorials/setup-install/
/tutorials/setup-install/desktop/
/tutorials/setup-install/pypi/
/tutorials/setup-install/source/
```

`memu_reference.html`和`memu_reference.css`是本地设计参考，不是官网产品页面，不进入构建产物。

## 3. 构建流水线

标准命令保持为：

```powershell
npm run build
```

npm生命周期按顺序执行：

```text
prebuild  -> npm run typecheck
build     -> vite build
postbuild -> node build-tools/verify-dist.mjs
```

任一阶段失败都会使整体构建失败。

### 3.1 多页面入口

`vite.config.ts`递归发现仓库内正式HTML文件，并用相对路径作为Rollup入口名。新增正式页面不需要手工维护入口数组，但必须能通过产物校验。

### 3.2 生成资源与运行时资源

构建产物分为两类：

| 类型 | 输出 | 处理方式 |
| --- | --- | --- |
| Vite解析的CSS和图片 | `dist/assets/generated/` | 使用Vite文件名内容哈希 |
| 经典脚本、动态图片和语言包 | `dist/assets/js`、`dist/assets/img`、`dist/assets/i18n` | 保留稳定URL，并在引用处添加内容摘要查询参数 |

经典脚本在源HTML中使用`vite-ignore`声明由官网构建插件管理；Vite会从最终HTML删除该属性。最终产物不包含`vite-ignore`或历史Git提交版本号。

### 3.3 Motion构建

`motion.ts`在`closeBundle`阶段直接编译到：

```text
dist/assets/js/motion.js
```

这保证生产产物来自TypeScript源码，同时避免`npm run build`修改仓库中的跟踪文件。`build:motion`和`watch:motion`继续保留，供不经过Vite的本地经典脚本调试使用。

### 3.4 语言包缓存

构建对所有`assets/i18n/*.json`按稳定文件顺序计算联合SHA-256摘要，并只在`dist/assets/js/main.js`中注入该版本。源`main.js`不被修改。

## 4. 产物校验

`build-tools/verify-dist.mjs`执行：

- 源页面与`dist`页面一一对应；
- 页面总数必须为14；
- `CNAME`、`api/latest-dev.json`、主要脚本和六个外语包必须存在；
- TypeScript源码目录不得发布到`dist/assets/ts`；
- 检查所有产物HTML中的本地`href`和`src`；
- 在Windows上也逐段校验文件名大小写，避免Linux部署断链；
- 目录链接按`index.html`解析；
- 本地引用不得逃逸`dist`目录；
- 外部HTTP、邮件、协议链接不作为本地文件检查；
- 缺页、缺资源、无效URI或断链都会使构建失败。

也可以单独执行：

```powershell
npm run verify:dist
```

## 5. 验收证据

### 构建

```text
npm run typecheck                         PASS
npm run build                             PASS
verify-dist: 14 pages                     PASS
verify-dist: 12 required runtime files    PASS
```

### 确定性

相同工作区连续构建两次，对所有`dist`文件按相对路径和内容计算联合SHA-256：

```powershell
npm run hash:dist
```

该命令按POSIX格式相对路径排序，并以路径长度、路径、内容长度、内容组成明确的二进制输入，避免不同临时校验脚本产生不可比的摘要。

```text
537e7bba33c627947a9b27a3da5c1194571f4e3d63de11d48b7dac598922bcfb
```

两次摘要完全一致，构建前后`git status --short`完全一致。

### HTTP预览

使用`npm run preview`请求14个正式页面以及以下运行时资源：

```text
/assets/js/main.js
/assets/i18n/en.json
/api/latest-dev.json
```

共17个请求全部返回HTTP 200，并返回符合预期的HTML、JavaScript或JSON Content-Type。

### 缓存版本

- 14个产物HTML均含12位内容摘要版本；
- 产物中历史`bb1a1fd6958e`版本出现次数为0；
- 产物中`vite-ignore`出现次数为0；
- 源HTML中历史版本号出现次数为0。

## 6. 构建治理规则

从本周起：

1. 禁止构建脚本修改被Git跟踪的HTML、CSS或JS；
2. 新增页面必须由自动入口发现并通过链接校验；
3. 新增动态加载的必需文件时，应加入运行时复制范围和校验清单；
4. 不得把设计参考、临时导出或本地实验页面默认为正式入口；
5. `npm run build`是发布前的唯一标准静态构建命令；
6. 构建警告必须处理或明确建模，不把警告当作长期正常输出。

## 7. 后续工作

第三周将解决公共页面外壳问题：

- Header、Footer和账户区单一来源；
- 导航、语言菜单和无障碍行为统一；
- 去除14个页面中的重复公共HTML；
- 在不改变URL和SEO内容的前提下继续通过本周建立的构建校验。
