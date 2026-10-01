# AskWho Final QA

- **Tested flow:** Ask → Understand → Match → Request → Answer → Experience；同时验证返回链路、Mismatch、Skip、追问、帮助反馈、经验详情、标签修正和邀请开关。
- **Responsive widths:** 375px、390px、430px；六个页面均无横向溢出，长文本和主要 CTA 正常换行。
- **Automated tests:** `npm run test`，38/38 passed。
- **Build:** `npm run build` passed；0 TypeScript error，0 build error。
- **Final ZIP:** `AskWho_REDcowork.zip`，低于 5 MB 目标。
- **External API:** None。
- **Backend:** None。
- **Database:** None。
- **AI execution:** Local deterministic Demo implementation。
- **Production replacement path:** 见 [AI_ARCHITECTURE.md](./AI_ARCHITECTURE.md)。

## 推荐人工截图

1. **AskPage Hero + Question Input**：停留在默认东京问题完整显示、CTA 尚未点击的状态。
2. **Understand WHO + WHAT Calibration**：停留在 2 个必须、3 个优先、3 个重点问题均可见的状态。
3. **Match Top Candidate + Question Routing**：停留在最高匹配者、匹配依据与三条问题路由同时可见的状态。
4. **Request Quick Answer**：停留在回答者视角，已选中一条 Quick Answer、尚未提交的状态。
5. **Answer Consensus + Difference**：停留在 3/3、2/3 共识与体验差异均可见的状态。
6. **Experience Asset + Reuse**：停留在东京巨蛋资产显示“今天补充了 1 条新经验”与复用模块的状态。
