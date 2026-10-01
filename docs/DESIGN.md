# 问对 AskWho · 设计文档

## 视觉方向

**Bright Editorial + Young Lifestyle + Hot Pink × Neo Mint + Black & White**。

AskWho 是面向年轻用户的手机消费产品。页面应鲜亮、直接、有撞色张力，同时精致、可信、可用，具有年轻、潮流、生活方式社区气质和少量 Editorial / sticker-like 视觉感。

后续所有正式页面必须延续当前 AskPage 的视觉语言。首页布局、文案及视觉已锁定；除接入流程跳转外，不主动改动首页。Community 表达人与经历的存在感，不意味着社区 Feed 或陌生人社交；产品范围见 [PRODUCT.md](./PRODUCT.md)。

## 核心色彩

| 角色 | 色值 | 使用原则 |
| --- | --- | --- |
| Hot Pink / Bright Magenta | `#EE5B9F` | 品牌符号、重要文字强调、人物与行动重点。 |
| Hot Pink 较深状态 | `#E65195` | 主 CTA 等需要更明确边界的动作区域。按下只轻微变深，禁用反馈不转灰紫或紫棕。 |
| Neo Mint | `#54E6AE` | 经历 Token、Marker、节点及导航选中底座，真实参与信息结构。 |
| Neo Mint 可选值 | `#5DE3AE`、`#56DEAB` | 同一品牌语义下的组件变化。 |
| Near Black | `#181818`、`#24221F` | 标题、正文、线性图标与信息骨架。 |
| Secondary Text | `#625E5B` | 说明文字；已锁定首页使用的中性灰 `#666666` 可保留。 |
| Tertiary Text | `#8C8782` | 弱提示；小字号或必要信息应适当加深以保证可读性，不强制直接使用低对比度灰色。 |
| Main Background | `#FFFFFF`、`#FCFCFA` | App 内大面积白色留白。 |
| Soft Neutral | `#F5F4F1` | 弱分隔、轻量底色；不作为主视觉。 |

允许根据组件需要生成 Hot Pink 和 Mint 的非常浅色 tint，但不能降低核心品牌色本身的鲜亮程度。不要把品牌色处理成灰粉、灰紫、豆沙色或莫兰迪绿。

白色和 Near Black 建立信息骨架；Hot Pink 与 Neo Mint 共同建立品牌节奏。Mint 不能只是装饰点，Pink 不能覆盖全部强调。正文不大面积染色，色彩重点通过留白保持精致感。重要状态同时有文字或图标表达，不仅靠颜色。

## 排版与层级

- 优先通过 **Typography、Section、Color Blocks、Spacing** 建立层级，不把所有信息装进白色卡片。
- 标题允许有冲击力，但以字重、行距和局部 Marker 建立节奏，避免整屏超粗黑字。
- 单屏明显大卡片约不超过两张；普通信息优先用文字分区与轻量列表。
- Experience Token 可有少量不同圆角、约 1–2° rotation 和小型线性图标，不把所有标签做成圆润 pill。
- 可以使用少量手绘 underline、小圆点、短线与不规则形状；每屏约 3–5 处以内，不做满屏贴纸。
- 使用系统字体，不加载远程字体。
- 正文及辅助说明应保证对比度。鲜亮粉色配白字 CTA 保持足够大的清晰字形，例如当前首页的 19px 粗体；不为提高对比度将品牌按钮改成灰暗色。

## 布局与触控

- mobile-first，390px 为主要设计基准，支持 375–430px。
- 使用 `100dvh`，允许 `100vh` 回退，并适配设备安全区。
- 桌面 App 容器最大宽度 430px，水平居中，不做桌面多栏布局。
- 所有核心交互支持 touch，不依赖 hover；语义化标签、键盘焦点和触控目标都需明确。
- 固定底部导航或操作区域必须为正文预留空间；流程页可采用文末 CTA，不必复用首页 Bottom Navigation。
- 页面可纵向滚动，不能出现横向溢出。

## 页面侧重点

### AskPage

强调“我可以自然描述问题”。保留鲜亮品牌区、Editorial Hero、问题—经历—人三块流程视觉、核心 Question Input、轻量示例与底部导航。

### UnderstandPage

强调“AI 把问题转化成 Experience”，不是关键词提取或普通 Loading。

- 简单 App Header 与返回入口，不放 Bottom Navigation。
- Hero 直接给出判断，随后依次展示核心经历、优先经历与校准、真正顾虑、Routing Preview、CTA。
- 核心经历采用更醒目的粉绿 Token，带必要/锁定标记，不允许直接删除。
- 优先经历权重更轻，允许移除与撤销，不用复杂弹窗。
- 顾虑使用编号 Editorial List，不拆成多张卡片。
- Routing Preview 以节点和连接关系表达先找 Experience 再找 Person，不重复首页三张色块。
- 底部 CTA 延续鲜亮 Hot Pink，并用轻量 Mint 点表达低打扰邀请说明。

## 动效

仅使用少量 CSS opacity、translateY 与 animation-delay。Understand 的 Hero、核心经历、优先经历、顾虑可在约 1.5–2 秒内依次显现，不用动效阻塞操作。删除 Token 使用短暂消失反馈，支持 `prefers-reduced-motion`。不引入动画库。

## 禁止的方向

- 紫色或红色主导、灰粉灰紫豆沙品牌色。
- AI 科技蓝紫渐变、玻璃拟态、机器人、星光特效。
- Dashboard、Chatbot 气泡、堆叠白卡和厚重阴影。
- 少女风、儿童风、糖果风、大面积荧光、满屏贴纸。
- 小红书标准红、双列 Feed 或现有组件的复刻。

## 工程与表达边界

遵守根目录 [AGENTS.md](../AGENTS.md)。区分 AI 理解、真人经历和整理结果，不把 AI 整理表现成 AI 的亲身经历。Demo 暂用固定案例与前端状态模拟，不接外部 API，不创建真实 Agent 或后端；新增 npm 依赖须先获用户明确同意。
