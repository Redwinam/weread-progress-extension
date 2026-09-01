// ==UserScript==
// @name         Weread-Progress-Show
// @namespace    https://github.com/ralix/Weread-Progress-Show
// @version      2.1.1
// @description  在微信读书网页版底部居中显示阅读进度条，无需打开目录即可查看进度
// @match        https://weread.qq.com/web/reader*
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  var WIDGET_ID = "wr-progress-pill";
  var STYLE_ID = "wr-progress-pill-style";
  var LOG = "[weread-progress]";

  function log() {
    var args = [LOG];
    for (var i = 0; i < arguments.length; i++) args.push(arguments[i]);
    console.log.apply(console, args);
  }

  // 脚本一旦被执行，第一时间留下痕迹；控制台若连这条都没有，就是脚本根本没被注入
  log("脚本已开始执行");

  // ---------------------------------------------------------------------------
  // 样式（类名加 wrp- 前缀，避免与微信读书自身样式冲突）
  // ---------------------------------------------------------------------------
  var styleInjected = false;

  function injectStyle() {
    if (styleInjected) return;
    styleInjected = true;

    var css = [
      "#" + WIDGET_ID + " {",
      "  position: fixed;",
      "  left: 50%;",
      "  bottom: 20px;",
      "  transform: translateX(-50%);",
      "  z-index: 99999;",
      "  display: flex;",
      "  align-items: center;",
      "  gap: 10px;",
      "  padding: 7px 14px;",
      "  border-radius: 999px;",
      "  background: rgba(255, 255, 255, 0.72);",
      "  border: 1px solid rgba(0, 0, 0, 0.06);",
      "  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);",
      "  backdrop-filter: blur(12px) saturate(1.4);",
      "  -webkit-backdrop-filter: blur(12px) saturate(1.4);",
      '  font-family: -apple-system, "PingFang SC", "Helvetica Neue", "Microsoft YaHei", sans-serif;',
      "  cursor: pointer;",
      "  user-select: none;",
      "  -webkit-user-select: none;",
      "  opacity: 0.55;",
      "  transition: opacity 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease;",
      "}",
      "#" + WIDGET_ID + ":hover {",
      "  opacity: 1;",
      "  transform: translateX(-50%) translateY(-2px);",
      "  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14);",
      "}",
      'body[data-theme="dark"] #' + WIDGET_ID + " {",
      "  background: rgba(30, 30, 32, 0.72);",
      "  border-color: rgba(255, 255, 255, 0.08);",
      "  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);",
      "}",
      "#" + WIDGET_ID + " .wrp-track {",
      "  width: 140px;",
      "  height: 6px;",
      "  border-radius: 999px;",
      "  background: rgba(128, 128, 128, 0.25);",
      "  overflow: hidden;",
      "  flex-shrink: 0;",
      "}",
      "#" + WIDGET_ID + " .wrp-fill {",
      "  display: block;",
      "  height: 100%;",
      "  width: 0%;",
      "  border-radius: 999px;",
      "  background: linear-gradient(90deg, #07c160, #00b8d4);",
      "  transition: width 0.4s ease;",
      "}",
      "#" + WIDGET_ID + " .wrp-pct {",
      "  font-size: 12px;",
      "  font-weight: 600;",
      "  line-height: 1;",
      "  color: rgba(0, 0, 0, 0.75);",
      "  font-variant-numeric: tabular-nums;",
      "  letter-spacing: 0.02em;",
      "  min-width: 3.2em;",
      "  text-align: right;",
      "}",
      'body[data-theme="dark"] #' + WIDGET_ID + " .wrp-pct {",
      "  color: rgba(255, 255, 255, 0.85);",
      "}",
    ].join("\n");

    if (typeof GM_addStyle === "function") {
      GM_addStyle(css);
      return;
    }
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ---------------------------------------------------------------------------
  // 进度读取
  //   优先：目录/笔记面板里的精确选择器
  //   兜底：全文档 textContent 里搜 “当前读到 xx%” / “已读到 xx%”
  //   注意用 textContent 而不是 innerText —— 面板 display:none 时 innerText 读不到
  // ---------------------------------------------------------------------------
  function readProgress() {
    var nodes = document.querySelectorAll(
      ".readerCatalog_list_item_meta_progress, .wr_reader_note_panel_header_cell_info_info"
    );
    for (var i = 0; i < nodes.length; i++) {
      var m = (nodes[i].textContent || "").match(/(\d+(?:\.\d+)?)\s*%/);
      if (m) {
        log("通过面板选择器读到进度:", m[1] + "%", "（元素类名:", nodes[i].className + "）");
        return Math.min(100, Math.max(0, parseFloat(m[1])));
      }
    }

    // 兜底：全文档文本扫描（含隐藏元素）
    var bodyText = document.body ? document.body.textContent : "";
    var m2 = bodyText.match(/(?:当前读到|已读到)\s*(\d+(?:\.\d+)?)\s*%/);
    if (m2) {
      log("通过全文档文本扫描读到进度:", m2[1] + "%");
      return Math.min(100, Math.max(0, parseFloat(m2[1])));
    }

    return null;
  }

  function readChapterTitle() {
    var el = document.querySelector(".renderTargetPageInfo_header_chapterTitle");
    return el ? (el.textContent || "").trim() : "";
  }

  // ---------------------------------------------------------------------------
  // 组件
  // ---------------------------------------------------------------------------
  var pill = null;
  var fillEl = null;
  var pctEl = null;
  var lastPct = null;
  var everFound = false;

  function createWidget() {
    if (document.getElementById(WIDGET_ID)) return;
    injectStyle();

    pill = document.createElement("div");
    pill.id = WIDGET_ID;
    pill.title = "阅读进度（点击打开目录）";

    var track = document.createElement("span");
    track.className = "wrp-track";
    fillEl = document.createElement("span");
    fillEl.className = "wrp-fill";
    track.appendChild(fillEl);

    pctEl = document.createElement("span");
    pctEl.className = "wrp-pct";
    pctEl.textContent = "…";

    pill.appendChild(track);
    pill.appendChild(pctEl);

    // 点击进度条打开微信读书自带的目录面板，方便跳转章节
    pill.addEventListener("click", function () {
      var catalogBtn = document.querySelector(".readerControls_item.catalog");
      if (catalogBtn) catalogBtn.click();
    });

    document.body.appendChild(pill);
    log("进度条组件已创建");
  }

  function render(pct) {
    fillEl.style.width = pct + "%";
    var text = (Math.round(pct * 10) / 10) + "%";
    pctEl.textContent = text;

    var chapter = readChapterTitle();
    pill.title = (chapter ? chapter + " · " : "") + "已读 " + text + "（点击打开目录）";
  }

  function tick() {
    var pct = readProgress();
    if (pct !== null) {
      if (!everFound) {
        everFound = true;
        log("首次获取到进度");
      }
      if (pct !== lastPct) {
        lastPct = pct;
        render(pct);
        log("进度更新为", pct + "%");
      }
    } else if (!everFound) {
      log("暂未在页面中找到进度文案，继续监听 DOM 变化…");
    }
  }

  // ---------------------------------------------------------------------------
  // 启动：建组件 + MutationObserver 监听 + 轮询兜底
  // ---------------------------------------------------------------------------
  function start() {
    log("脚本已注入，当前页面:", location.href);

    createWidget();
    tick();

    var timer = null;
    var observer = new MutationObserver(function () {
      if (timer) return;
      timer = setTimeout(function () {
        timer = null;
        tick();
      }, 500);
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    log("MutationObserver 已启动");

    // 兜底轮询，防止个别路径下 DOM 变化没被观察到
    setInterval(tick, 3000);
  }

  if (document.body) {
    start();
  } else {
    document.addEventListener("DOMContentLoaded", start);
  }
})();
