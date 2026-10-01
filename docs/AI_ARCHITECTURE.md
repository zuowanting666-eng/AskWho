# AskWho AI Architecture

## 架构目标

AskWho Demo 使用一个 **Routing Agent** 编排五个稳定的 AI Skills。页面负责展示与用户交互，Agent 负责流程判断，Skill 负责单一、可测试、可替换的能力。Agent 和 Skills 都不依赖 React，也不会直接修改 UI。

由于 REDcowork 运行环境不调用外部 API，当前全部能力由 deterministic local logic 与本地 mock 数据执行。它们表达真实的产品规则，但不代表已经接入 LLM、向量检索或后端服务。

## Routing Agent

`routingAgent` 是唯一 Orchestrator，提供以下入口：

- `analyzeQuestion`：理解问题并给出第一次结构化解释。
- `prepareMatch`：使用用户最终确认的经历条件排序候选人，并在严格结果不足时决定是否只放宽 Preferred。
- `prepareRoutes`：将已选 Concern 分配给最适合的经历者，每人至多一个问题。
- `synthesize`：根据回答数量与冲突情况决定等待、显示有限证据、展示差异或展示共识。
- `updateExperienceAssets`：决定把新回答并入已有资产，或在没有对应资产时新建。

每次调用返回 `result + decision + context`。`AgentDecision` 记录当前阶段、动作、理由与可选元数据；`AgentContext` 是一次执行的输入输出模型，不是数据库或全局 session。

## Five Skills

1. **Understand Query**：自然语言问题 → `ParsedIntent`、Experience Requirements、Concerns、置信度与可选澄清问题。
2. **Match Experience**：用户校准后的 Requirements + Candidate Pool → 带分数、证据强度、缺失条件与自然语言理由的排序结果。
3. **Route Question**：Selected Concerns + Match Results → 一人一问的 `QuestionRoute`。
4. **Synthesize Answer**：Human/本地 Demo Responses + Concern Context → 可追溯的结论、共识、差异和原始回答；没有回答时不编答案，单份回答标记为有限证据。
5. **Build Experience Asset**：Existing Assets + New Human Responses + Route Context → 合并或新建后的资产及变更说明。

## Human Calibration

Understand Skill 只生成 AI first draft。用户在 UnderstandPage 对优先级、补充经历和 Concern 的修改由 App state 保存。后续匹配与路由始终读取这份用户校准后的 state，不会重新调用 Understand Skill 覆盖修改。

优先级为：**Human-confirmed state > AI initial state**。

## Trace

每个 Skill 通过内存 Trace 记录阶段、Skill 名称、开始时间、耗时、状态及简短输入输出摘要。Trace 不写入 localStorage，不展示开发后台，也不保存完整问题文本或敏感内容。

## Production Replacement Path

生产环境可以在保持页面和 Agent Contract 不变的前提下替换 Skill 内部实现：

- Understand Query → LLM structured output。
- Match Experience → Embedding Retrieval、Experience Graph Retrieval 与 Ranking Model。
- Route Question → LLM routing 或学习排序。
- Synthesize Answer → 带证据约束的 LLM / RAG。
- Build Experience Asset → Experience Graph 写入与实体归并。

当前 Demo 没有接入以上生产能力，也没有外部 API、后端、数据库、环境变量或 API Key。
