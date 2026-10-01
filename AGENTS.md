# 问对 AskWho 工程约束

## 产品背景

AskWho 是 AI Experience Routing 产品。对于普通搜索难以解决的生活经验问题，AI 判断什么样经历的人适合回答，匹配真正经历过的人，再将真人经验整理成可用答案。AI 不直接生成答案。Demo 的所有 AI 能力后续通过前端 mock data 和本地逻辑模拟。

## 长期技术约束

- 使用 React、Vite、TypeScript、Tailwind CSS 和 lucide-react。
- 纯前端 SPA；不使用 Next.js。
- 不使用 Supabase、Firebase、数据库或任何后端。
- 不调用任何外部 API；不使用环境变量或 API Key。
- 不使用远程字体；使用系统字体与本地资源。
- 不使用 Framer Motion、大型 UI 库或其他非必要依赖。
- 未经用户明确同意，不安装新的 npm dependency。需要新增依赖时先说明名称和用途，获得明确同意后再安装。
- 所有核心功能必须离线可运行；运行时不依赖外部网络，静态构建通过本地或平台静态服务器加载。构建工具安装与开发服务器不属于产品后端。
- 最终项目以 ZIP 交付用于 REDcowork 上传。ZIP 硬上限 10MB，目标低于 5MB；排除 node_modules、缓存、Git 历史及旧归档。

## 移动端规范

- mobile-first，设计基准宽度 390px，支持 375–430px。
- 使用 100dvh；可保留 100vh 回退，适配设备安全区。
- 桌面预览时 App 容器最大宽度 430px 并水平居中。
- 不做桌面多栏布局。
- 所有核心交互支持 touch，不能仅依赖 hover；保留语义化与键盘可访问性。

## 目录职责

- src/components：共享组件与 AppShell。
- src/pages：后续业务页面。
- src/data：后续前端 mock data。
- src/ai：后续本地模拟逻辑，不接入外部 AI 服务。
- src/styles：样式与后续设计变量。
- docs：产品、设计与 Demo 数据文档。

## 本轮范围

只完成工程初始化及基础移动端 App Shell。页面仅显示「问对 AskWho」和一句占位文案。不实现正式 UI、六个业务页面、Agent、Skill、复杂交互或其他产品功能。后续功能需以用户的新指令为准。

## 验证与交付

- 交付前运行 npm run build，确保 TypeScript 检查与 Vite 构建成功。
- 报告项目结构、实际依赖版本、构建结果、dist 原始体积和 ZIP 体积。
- 保留 package-lock.json 以确保可复现安装；不得打包 node_modules。
