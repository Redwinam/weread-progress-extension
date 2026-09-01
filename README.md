# 微信读书阅读进度

[![GitHub Release](https://img.shields.io/github/v/release/Redwinam/weread-progress-extension?display_name=tag&style=flat-square)](https://github.com/Redwinam/weread-progress-extension/releases/latest)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-5d646e?style=flat-square)](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
[![License: MIT](https://img.shields.io/badge/License-MIT-5d646e?style=flat-square)](LICENSE)

在微信读书网页版的“上一页 / 下一页”按钮之间，显示当前章节和真实的全书阅读进度。无需打开目录，也不根据页码猜测进度。

这是一个基于 [Plasmo](https://www.plasmo.com/) 的 Manifest V3 浏览器扩展，推荐用于 Arc，也适用于 Chrome、Edge、Brave 等 Chromium 浏览器。

## 功能

- 从微信读书页面已有的目录/笔记数据中读取真实的全书进度
- 自动显示当前章节、百分比和深灰色进度条
- 自动对齐“上一页 / 下一页”按钮，并随窗口尺寸调整位置
- 适配微信读书的浅色与深色阅读主题
- 翻页、切换章节或返回页面后自动更新
- 点击进度条即可打开目录
- 使用 Shadow DOM 隔离样式，尽量避免与网页样式互相影响

## 安装

### Arc

1. 前往 [Releases](https://github.com/Redwinam/weread-progress-extension/releases/latest)，下载最新的 `weread-reading-progress-*-chrome-mv3.zip`。
2. 解压下载的 ZIP 文件。
3. 在 Arc 地址栏打开 `arc://extensions`。
4. 打开页面右上角的“开发者模式”。
5. 点击“加载已解压的扩展程序”，选择刚刚解压、且其中包含 `manifest.json` 的文件夹。
6. 打开或刷新[微信读书网页版](https://weread.qq.com/)，进入任意书籍的阅读页。

### Chrome / Edge / Brave

安装步骤与 Arc 相同，只需将第 3 步的地址换成：

- Chrome：`chrome://extensions`
- Edge：`edge://extensions`
- Brave：`brave://extensions`

> 浏览器扩展页面不能直接加载 ZIP；请先解压，再选择解压后的文件夹。首次安装或更新扩展后，已经打开的微信读书页面需要刷新一次。

## 使用

进入形如 `https://weread.qq.com/web/reader/...` 的阅读页面后，进度条会自动出现在底部翻页按钮之间。鼠标悬停可以查看完整提示，点击进度条可以打开目录。

如果微信读书暂时没有在页面中提供可读取的进度数据，扩展不会显示一个猜测值；数据出现后会自动更新。

## 常见问题

### 安装后没有出现进度条

请依次确认：

1. 当前页面是微信读书的书籍阅读页，而不是书架或书籍详情页。
2. 安装或重新加载扩展后，已经打开的阅读页已刷新。
3. 扩展详情页中的“网站访问权限”允许访问 `weread.qq.com`。
4. 当前书籍的目录中能够正常显示“读到 xx%”。

如果以上条件都满足仍未显示，可能是微信读书更新了页面结构。欢迎提交 [Issue](https://github.com/Redwinam/weread-progress-extension/issues)，并附上浏览器名称、阅读模式和问题描述。

### 为什么不继续使用油猴脚本或 Arc Boost？

微信读书页面与浏览器的脚本注入策略可能导致油猴脚本无法执行，向 Arc Boost 粘贴较长代码也可能卡顿。本项目因此改为独立的 Manifest V3 扩展；仓库中的 `main.js` 和 `arc-boost.js` 仅保留为早期实验版本。

## 隐私与权限

扩展只请求 `https://weread.qq.com/*` 的网站访问权限，不会在其他网站运行。它不收集、保存或上传阅读记录及账号信息。

## 本地开发

需要 Node.js 与 pnpm。

```bash
pnpm install
pnpm dev
```

Plasmo 会在开发模式下生成可加载的扩展目录。

## 构建与打包

```bash
pnpm build
pnpm package
```

- 可加载目录：`build/chrome-mv3-prod`
- 发布压缩包：`build/chrome-mv3-prod.zip`

## 许可证

[MIT](LICENSE)
