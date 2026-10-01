# 问对 AskWho

移动端 AI 产品 Demo 的工程初始化版本，仅包含 App Shell 和占位文案。

## 本地开发

使用 Node.js 22.12+ 或兼容的更新版本，安装锁定依赖后启动：

```sh
npm ci
npm run dev
```

## 构建与预览

```sh
npm run build
npm run preview
```

构建输出在 `dist/`，使用本地或平台静态服务器提供该目录即可运行。依赖安装需要网络；构建后的页面运行不请求外部 API、字体或 CDN。请通过 HTTP 静态服务器预览，不直接双击 HTML。

## 交付

`release/AskWho.zip` 为可上传 REDcowork 的工程归档，包含源码、文档、依赖锁文件和 dist 构建产物，不包含 node_modules 或原始模板 ZIP。
