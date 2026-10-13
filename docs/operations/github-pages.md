# openakita.ai 的 GitHub Pages 自动发布

仓库中的 [Pages workflow](../../.github/workflows/pages.yml) 从源码构建网站，
发布 `dist/` 的内容到 GitHub Pages。适用于 GitHub 仓库
`openakita/openakita-web` 和现有自定义域名 `openakita.ai`。

## 同事需要做的一次性设置

使用仓库管理员或维护者账号，进入 GitHub 仓库的 **Settings → Pages**：

1. 将 **Build and deployment → Source** 改为 **GitHub Actions**。
2. 保留自定义域名 `openakita.ai` 及现有 HTTPS 设置。
3. 本 PR 已提供 workflow，无需再创建 Jekyll 等模板流程。

建议在合并这个 PR 前完成 Source 切换，避免旧的“从 main 根目录发布”流程
直接发布尚未构建的源码。GitHub Actions 还需在仓库中保持启用，并允许使用
workflow 引用的官方 `actions/*`。如果 `github-pages` 环境已有部署分支规则，
确认允许 `main`；如配置了人工审核，则部署任务会等待该审核。

这些仓库设置不由源码修改自动完成，也不需要额外提供部署密钥或 PAT。

## PR 与发布行为

- PR 的目标分支为 `main` 时，运行 `Build and verify static site` 检查。
  Fork PR 也只进行构建检查。
- 构建依次执行 `npm ci`、`npm run build`。后者包含 TypeScript 检查、Vite
  构建、Markdown/高亮组件编译，以及全部 `verify:dist` 验证。
- `main` 更新后，构建成功才上传 `dist/` 并运行部署任务。任何构建或验证失败
  都会阻止发布。上传内容包含构建生成的页面、运行脚本、CNAME 和 `.nojekyll`。
- PR 不上传 Pages 成品，也不发布预览站点；部署权限仅授予部署任务。
- 可在 **Actions → GitHub Pages → Run workflow** 手动重跑。选择 `main`
  时构建并发布；其他分支仅构建。Fork 和其他仓库不会运行发布任务。
- 同一分支的发布串行执行，不中断已经开始的部署；同一个 PR 的旧检查可以
  被更新后的检查替代。

正常发布流程：PR 构建检查通过 → 同事审核并合并到 `main` → Actions
构建并发布 `dist/` → 检查线上页面。源码和 `package-lock.json` 随 PR 提交，
`dist/` 保持 Git 忽略，不需要把构建成品覆盖到源码根目录。

## 上线确认与失败处理

在 **Actions → GitHub Pages** 确认构建和部署两个任务都成功，再访问
`https://openakita.ai/` 和 `https://openakita.ai/chat/`，检查页面语言、端点
设置、Markdown 和代码高亮。供应商调用仍需要用户自己的 API Key。

构建失败时查看 `Install dependencies` 或 `Build and verify dist` 的日志。
部署失败时先检查 Pages Source 是否为 GitHub Actions，再检查 Actions 权限和
`github-pages` 环境的审核、分支限制。不要仅凭构建通过就认为已经上线。

需要回退时，撤销对应源码提交并合并到 `main`，流程会重新构建和发布回退版本。

该 workflow 只发布国际站静态网站。`openakita.cn` 的服务器部署，以及
Account / Hub 的 Go BFF 发布，继续使用各自现有流程。

参考：[GitHub 自定义 Pages workflow](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
和 [Pages 发布源设置](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。
