# 第九周交付：Pass 摘要与统一 Hub 接入

- 日期：2026-08-17
- 对应 PRD：Phase 2 P2.1
- 决策：`docs/adr/0002-pass-summary-integration.md`

## 本周目标

在不引入支付和余额写操作的前提下，把已有 Pass OIDC 单点登录能力延伸到官网统一入口，并让“我的 OpenAkita”以独立模块展示 Pass 账户状态、可用额度和 UTC 当月用量。

## 已完成

### Pass

- 新增 `GET /api/internal/openakita/users/{account_sub}/summary`；
- 使用独立机器身份、常量时间凭据比较和严格 subject 校验；
- 返回 `active`、`suspended`、`not_provisioned` 三种稳定状态；
- 按 UTC 月半开区间汇总消费日志，不返回邮箱、密码、API Key、调用明细或账本；
- 消费日志关闭时明确标记用量不可用；
- 冻结 README、示例和 JSON Schema 契约。

### 官网 BFF

- 增加严格校验的 Pass 客户端、独立超时和专用 Secret 配置；
- Hub 并发聚合四个模块，Pass 超时或 5xx 不影响其余模块；
- 只向浏览器映射最小额度、用量、显示规则和提醒码，不转发 Account `sub` 或下游错误正文；
- 会话与统一账户菜单增加 Pass 控制台入口。

### 官网前端与运维

- Hub 增加 Pass 卡片，覆盖未开通、暂停、低余额、余额耗尽、用量不可用和独立故障；
- 金额展示完全使用 Pass 返回的换算规则；
- 增加四模块成功、空状态、Marketplace 降级、Pass 降级构建夹具；
- 更新生产环境模板、架构、接口契约和故障运行手册。

## 明确不包含

- 官网充值表单或支付回调；
- 钱包扣款、余额冻结/解冻；
- API Key 创建、展示或撤销；
- Pass 调用明细、账本流水或管理员能力。

这些能力属于后续支付与 Pass 深度集成阶段，必须先完成独立安全和幂等设计。

## 验收命令

```powershell
# Pass（使用仓库提供的 Go 容器）
docker compose -f docker-compose.dev.yml --profile tools run --rm --no-deps go-test go test ./...
docker compose -f docker-compose.dev.yml --profile tools run --rm --no-deps go-test go vet ./...

# 官网
Set-Location .\bff
go test ./...
go vet ./...
go build -o .\bin\openakita-web-bff.exe .\cmd\openakita-web-bff
Set-Location ..
npm run build
docker build -f Dockerfile.static .
docker build -f Dockerfile.bff .
```

## 当前仓库基线说明

本周新增的 Pass 摘要测试、官网 BFF 全部测试、类型检查、构建校验与镜像构建均通过。Pass 全仓测试仍有一个与本周无关的既有失败：`service/TestComposeTieredTextQuotaKeepsToolCallSurcharges` 的分层计费期望值与当前实现不一致。Pass 全仓 `go vet` 也会因 `common/custom-event.go` 的锁复制以及若干 `relay/channel/*` 适配器不可达代码返回失败；本周新增文件没有产生新的 vet 告警。
