# 微信读书阅读进度

这是一个基于 Plasmo 的 Manifest V3 浏览器扩展。它直接从微信读书隐藏的目录/笔记面板读取真实的全书进度，并在“上一页 / 下一页”按钮之间显示。

## 在 Arc 中安装

1. 打开 `arc://extensions` 。
2. 打开右上角的“开发者模式”。
3. 点击“加载已解压的扩展程序”。
4. 选择本项目的 `build/chrome-mv3-prod` 目录。
5. 刷新已打开的微信读书阅读页。

## 开发

```bash
pnpm install
pnpm dev
```

## 生产构建

```bash
pnpm build
```

可加载目录：`build/chrome-mv3-prod`

## 权限

扩展只请求 `https://weread.qq.com/*` 的网站访问权限，不读取其他网站。
