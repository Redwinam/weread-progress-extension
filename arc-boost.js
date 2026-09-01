/**
 * 微信读书·阅读进度 Arc Boost
 *
 * 将本文件的全部内容粘贴到 Arc Boost 的 JavaScript 编辑器中。
 * Boost 会在刷新页面后执行。
 */

(function () {
  "use strict";

  var ROOT_ID = "wr-boost-reading-progress";
  var STYLE_ID = ROOT_ID + "-style";
  var INSTANCE_KEY = "__WR_READING_PROGRESS_BOOST__";

  // Arc 在编辑 Boost 时可能重复执行代码，先清理上一个实例。
  if (window[INSTANCE_KEY] && typeof window[INSTANCE_KEY].destroy === "function") {
    window[INSTANCE_KEY].destroy();
  }

  var observer = null;
  var intervalId = null;
  var frameId = null;
  var followUpTimers = [];
  var eventCleanups = [];
  var lastProgress = null;

  var CSS = `
    #${ROOT_ID} {
      --wrp-progress: 0%;
      --wrp-surface: rgba(255, 255, 255, .82);
      --wrp-border: rgba(28, 35, 43, .09);
      --wrp-text: #202832;
      --wrp-muted: #7c858f;
      --wrp-track: rgba(32, 40, 50, .10);
      --wrp-accent: #5d646e;

      position: fixed;
      z-index: 2147483646;
      left: 50%;
      bottom: var(--wrp-bottom, max(18px, env(safe-area-inset-bottom)));
      display: block;
      width: clamp(270px, 30vw, 390px);
      min-height: 47px;
      box-sizing: border-box;
      padding: 4px 14px 11px;
      overflow: hidden;
      color: var(--wrp-text);
      background: var(--wrp-surface);
      border: 1px solid var(--wrp-border);
      border-radius: 15px;
      box-shadow:
        0 12px 34px rgba(25, 31, 39, .13),
        0 2px 8px rgba(25, 31, 39, .05),
        inset 0 1px 0 rgba(255, 255, 255, .45);
      backdrop-filter: blur(18px) saturate(145%);
      -webkit-backdrop-filter: blur(18px) saturate(145%);
      appearance: none;
      -webkit-appearance: none;
      outline: none;
      cursor: pointer;
      user-select: none;
      -webkit-user-select: none;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
        "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
      font-variant-numeric: tabular-nums;
      text-align: left;
      opacity: 0;
      transform: translateX(-50%) translateY(8px);
      transition:
        opacity 220ms ease,
        transform 280ms cubic-bezier(.2, .8, .2, 1),
        box-shadow 220ms ease,
        background-color 220ms ease;
    }

    #${ROOT_ID}.wrp-visible {
      opacity: .88;
      transform: translateX(-50%) translateY(0);
    }

    #${ROOT_ID}.wrp-visible:hover,
    #${ROOT_ID}.wrp-visible:focus-visible {
      opacity: 1;
      transform: translateX(-50%) translateY(-2px);
      box-shadow:
        0 16px 42px rgba(25, 31, 39, .17),
        0 3px 10px rgba(25, 31, 39, .07),
        inset 0 1px 0 rgba(255, 255, 255, .5);
    }

    #${ROOT_ID} .wrp-topline {
      display: flex;
      align-items: center;
      min-width: 0;
      height: 20px;
      line-height: 20px;
    }

    #${ROOT_ID} .wrp-label {
      flex: 0 0 auto;
      margin-right: 8px;
      color: var(--wrp-text);
      font-size: 12px;
      font-weight: 620;
      letter-spacing: .01em;
    }

    #${ROOT_ID} .wrp-chapter {
      min-width: 0;
      flex: 1 1 auto;
      overflow: hidden;
      color: var(--wrp-muted);
      font-size: 11px;
      font-weight: 450;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    #${ROOT_ID} .wrp-value {
      flex: 0 0 auto;
      min-width: 42px;
      margin-left: 10px;
      color: var(--wrp-text);
      font-size: 13px;
      font-weight: 680;
      letter-spacing: -.01em;
      text-align: right;
    }

    #${ROOT_ID} .wrp-track {
      position: absolute;
      right: 14px;
      bottom: 8px;
      left: 14px;
      height: 4px;
      overflow: hidden;
      background: var(--wrp-track);
      border-radius: 999px;
    }

    #${ROOT_ID} .wrp-fill {
      display: block;
      width: var(--wrp-progress);
      height: 100%;
      background: var(--wrp-accent);
      border-radius: inherit;
      box-shadow: 0 0 7px rgba(93, 100, 110, .22);
      transition: width 420ms cubic-bezier(.2, .8, .2, 1);
    }

    #${ROOT_ID}.wrp-changed .wrp-value {
      animation: wrp-boost-value-pop 320ms cubic-bezier(.2, .8, .2, 1);
    }

    body.wr_darkTheme #${ROOT_ID},
    body.wr_reader_darkTheme #${ROOT_ID},
    body[class*="darkTheme"] #${ROOT_ID} {
      --wrp-surface: rgba(31, 35, 41, .82);
      --wrp-border: rgba(255, 255, 255, .10);
      --wrp-text: rgba(255, 255, 255, .92);
      --wrp-muted: rgba(255, 255, 255, .53);
      --wrp-track: rgba(255, 255, 255, .12);
      --wrp-accent: #858c96;
      box-shadow:
        0 14px 38px rgba(0, 0, 0, .32),
        0 2px 8px rgba(0, 0, 0, .18),
        inset 0 1px 0 rgba(255, 255, 255, .06);
    }

    @keyframes wrp-boost-value-pop {
      0% { opacity: .45; transform: translateY(2px); }
      100% { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 700px) {
      #${ROOT_ID} {
        bottom: max(12px, env(safe-area-inset-bottom));
        width: min(84vw, 340px);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      #${ROOT_ID},
      #${ROOT_ID} .wrp-fill {
        transition-duration: .01ms !important;
      }

      #${ROOT_ID}.wrp-changed .wrp-value {
        animation: none;
      }
    }
  `;

  function isReaderPage() {
    return location.hostname === "weread.qq.com" &&
      location.pathname.indexOf("/web/reader") === 0;
  }

  function parseProgress(text) {
    if (!text) return null;

    // 必须包含“读到”，避免误读书籍推荐值等其他百分比。
    var match = String(text).match(
      /(?:当前)?(?:已)?读到\s*(\d+(?:\.\d+)?)\s*%/,
    );
    if (!match) return null;

    var value = Number(match[1]);
    return Number.isFinite(value)
      ? Math.min(100, Math.max(0, value))
      : null;
  }

  function readProgress() {
    var selectedProgress = document.querySelector(
      ".readerCatalog_list_item_selected " +
      ".readerCatalog_list_item_meta_progress",
    );
    var value = parseProgress(selectedProgress && selectedProgress.textContent);
    if (value !== null) return value;

    var noteNodes = document.querySelectorAll(
      ".wr_reader_note_panel_header_cell_info_info",
    );
    for (var i = 0; i < noteNodes.length; i += 1) {
      value = parseProgress(noteNodes[i].textContent);
      if (value !== null) return value;
    }

    // 灰度版本的类名可能有轻微变化，但搜索范围仍限制在目录和笔记面板。
    var fallbackNodes = document.querySelectorAll(
      '.readerCatalog [class*="progress"], ' +
      '.readerNotePanel [class*="info"]',
    );
    for (var j = 0; j < fallbackNodes.length; j += 1) {
      value = parseProgress(fallbackNodes[j].textContent);
      if (value !== null) return value;
    }

    return null;
  }

  function readChapterTitle() {
    var selected = document.querySelector(
      ".readerCatalog_list_item_selected " +
      ".readerCatalog_list_item_title_text",
    );
    var header = document.querySelector(
      ".renderTargetPageInfo_header_chapterTitle",
    );
    var text = (selected && selected.textContent) ||
      (header && header.textContent) ||
      "当前章节";
    return text.trim();
  }

  function formatProgress(value) {
    return Number.isInteger(value)
      ? String(value)
      : value.toFixed(1).replace(/\.0$/, "");
  }

  function injectStyle() {
    var oldStyle = document.getElementById(STYLE_ID);
    if (oldStyle) oldStyle.remove();

    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    (document.head || document.documentElement).appendChild(style);
  }

  function createWidget() {
    var oldRoot = document.getElementById(ROOT_ID);
    if (oldRoot) oldRoot.remove();
    if (!document.body) return null;

    var root = document.createElement("button");
    root.id = ROOT_ID;
    root.type = "button";
    root.setAttribute("aria-live", "polite");
    root.innerHTML = `
      <span class="wrp-topline">
        <span class="wrp-label">全书进度</span>
        <span class="wrp-chapter"></span>
        <strong class="wrp-value">--%</strong>
      </span>
      <span class="wrp-track" aria-hidden="true">
        <span class="wrp-fill"></span>
      </span>
    `;

    root.addEventListener("click", function () {
      var catalogButton = document.querySelector(
        ".readerControls_item.catalog",
      );
      if (catalogButton) catalogButton.click();
    });

    document.body.appendChild(root);
    return root;
  }

  function positionWidget(root) {
    var buttons = Array.from(document.querySelectorAll(
      ".renderTarget_pager_button",
    )).filter(function (button) {
      var rect = button.getBoundingClientRect();
      var style = getComputedStyle(button);
      return rect.width > 0 &&
        rect.height > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden";
    });

    // 横向阅读时，让进度条与“上一页 / 下一页”垂直居中对齐。
    if (buttons.length > 0) {
      var centerSum = buttons.reduce(function (sum, button) {
        var rect = button.getBoundingClientRect();
        return sum + rect.top + rect.height / 2;
      }, 0);
      var pagerCenterY = centerSum / buttons.length;
      var rootHeight = root.getBoundingClientRect().height;
      var bottom = Math.max(
        18,
        Math.round(window.innerHeight - pagerCenterY - rootHeight / 2),
      );
      root.style.setProperty("--wrp-bottom", bottom + "px");
      return;
    }

    // 上下滚动阅读模式没有翻页按钮，回到默认底部位置。
    root.style.removeProperty("--wrp-bottom");
  }

  function render(progress) {
    var root = document.getElementById(ROOT_ID);
    if (!root) root = createWidget();
    if (!root) return;

    var displayValue = formatProgress(progress);
    var chapter = readChapterTitle();
    var valueNode = root.querySelector(".wrp-value");
    var chapterNode = root.querySelector(".wrp-chapter");

    root.style.setProperty("--wrp-progress", progress + "%");
    root.title = chapter + " · 已读 " + displayValue + "%（点击打开目录）";
    root.setAttribute(
      "aria-label",
      "全书阅读进度 " + displayValue + "%，" + chapter +
      "，点击打开目录",
    );
    valueNode.textContent = displayValue + "%";
    chapterNode.textContent = chapter;
    positionWidget(root);

    if (lastProgress !== null && progress !== lastProgress) {
      root.classList.remove("wrp-changed");
      void root.offsetWidth;
      root.classList.add("wrp-changed");
    }

    lastProgress = progress;
    requestAnimationFrame(function () {
      positionWidget(root);
      root.classList.add("wrp-visible");
    });
  }

  function refresh() {
    frameId = null;

    if (!isReaderPage()) {
      var root = document.getElementById(ROOT_ID);
      if (root) root.remove();
      return;
    }

    var progress = readProgress();
    if (progress !== null) render(progress);
  }

  function queueRefresh() {
    if (frameId !== null) return;
    frameId = requestAnimationFrame(refresh);
  }

  function followUpRefresh() {
    queueRefresh();
    [120, 520, 1400].forEach(function (delay) {
      var timer = window.setTimeout(queueRefresh, delay);
      followUpTimers.push(timer);
    });
  }

  function isWidgetMutation(target) {
    var element = target.nodeType === Node.ELEMENT_NODE
      ? target
      : target.parentElement;
    return Boolean(element && element.closest && element.closest("#" + ROOT_ID));
  }

  function addEvent(target, type, listener, options) {
    target.addEventListener(type, listener, options);
    eventCleanups.push(function () {
      target.removeEventListener(type, listener, options);
    });
  }

  function start() {
    injectStyle();
    queueRefresh();

    observer = new MutationObserver(function (mutations) {
      var relevant = mutations.some(function (mutation) {
        return !isWidgetMutation(mutation.target);
      });
      if (relevant) queueRefresh();
    });
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["class"],
    });

    addEvent(document, "click", followUpRefresh, true);
    addEvent(document, "keyup", followUpRefresh, true);
    addEvent(window, "scroll", queueRefresh, { passive: true });
    addEvent(window, "hashchange", followUpRefresh);
    addEvent(window, "popstate", followUpRefresh);
    addEvent(window, "resize", followUpRefresh, { passive: true });
    addEvent(document, "visibilitychange", function () {
      if (!document.hidden) followUpRefresh();
    });

    // 低频轮询用于兼容微信读书偶尔不更新 DOM 属性的翻页路径。
    intervalId = window.setInterval(queueRefresh, 3000);
  }

  function destroy() {
    if (observer) observer.disconnect();
    if (intervalId !== null) window.clearInterval(intervalId);
    if (frameId !== null) cancelAnimationFrame(frameId);
    followUpTimers.forEach(function (timer) {
      window.clearTimeout(timer);
    });
    eventCleanups.forEach(function (cleanup) {
      cleanup();
    });

    var root = document.getElementById(ROOT_ID);
    var style = document.getElementById(STYLE_ID);
    if (root) root.remove();
    if (style) style.remove();
  }

  window[INSTANCE_KEY] = { destroy: destroy, refresh: followUpRefresh };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
