import type { CSSProperties } from "react"
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import type { PlasmoCSConfig, PlasmoGetStyle } from "plasmo"

import cssText from "data-text:~/contents/weread-progress.css"

export const config: PlasmoCSConfig = {
  matches: ["https://weread.qq.com/web/reader*"],
  run_at: "document_idle"
}

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

type ReaderState = {
  progress: number
  chapter: string
  dark: boolean
}

type ProgressStyle = CSSProperties & {
  "--wrp-bottom": string
  "--wrp-progress": string
}

const FOLLOW_UP_DELAYS = [120, 520, 1400]

function parseProgress(text?: string | null): number | null {
  if (!text) return null

  // 限定在“读到”语义中取值，避免误读“推荐值 74%”。
  const match = text.match(/(?:当前)?(?:已)?读到\s*(\d+(?:\.\d+)?)\s*%/)
  if (!match) return null

  const value = Number(match[1])
  return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : null
}

function readProgress(): number | null {
  const selectedProgress = document.querySelector(
    ".readerCatalog_list_item_selected .readerCatalog_list_item_meta_progress"
  )
  const catalogValue = parseProgress(selectedProgress?.textContent)
  if (catalogValue !== null) return catalogValue

  const noteNodes = document.querySelectorAll(
    ".wr_reader_note_panel_header_cell_info_info"
  )
  for (const node of noteNodes) {
    const value = parseProgress(node.textContent)
    if (value !== null) return value
  }

  // 兼容微信读书灰度版本的轻微类名调整，但不扫描全页百分比。
  const fallbackNodes = document.querySelectorAll(
    '.readerCatalog [class*="progress"], .readerNotePanel [class*="info"]'
  )
  for (const node of fallbackNodes) {
    const value = parseProgress(node.textContent)
    if (value !== null) return value
  }

  return null
}

function readChapterTitle(): string {
  const selectedTitle = document.querySelector(
    ".readerCatalog_list_item_selected .readerCatalog_list_item_title_text"
  )?.textContent
  const headerTitle = document.querySelector(
    ".renderTargetPageInfo_header_chapterTitle"
  )?.textContent

  return (selectedTitle || headerTitle || "当前章节").trim()
}

function readDarkTheme(): boolean {
  return /darkTheme/i.test(document.body?.className || "")
}

function formatProgress(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(1).replace(/\.0$/, "")
}

function readPagerCenter(): number | null {
  const buttons = Array.from(
    document.querySelectorAll<HTMLElement>(".renderTarget_pager_button")
  ).filter((button) => {
    const rect = button.getBoundingClientRect()
    const style = getComputedStyle(button)
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== "none" &&
      style.visibility !== "hidden"
    )
  })

  if (buttons.length === 0) return null

  return (
    buttons.reduce((sum, button) => {
      const rect = button.getBoundingClientRect()
      return sum + rect.top + rect.height / 2
    }, 0) / buttons.length
  )
}

function ProgressOverlay() {
  const [reader, setReader] = useState<ReaderState | null>(null)
  const [bottom, setBottom] = useState(18)
  const rootRef = useRef<HTMLButtonElement>(null)
  const frameRef = useRef<number | null>(null)
  const followUpTimersRef = useRef<number[]>([])

  const updatePosition = useCallback(() => {
    const root = rootRef.current
    const pagerCenter = readPagerCenter()

    if (!root || pagerCenter === null) {
      setBottom(18)
      return
    }

    const rootHeight = root.getBoundingClientRect().height
    const nextBottom = Math.max(
      18,
      Math.round(window.innerHeight - pagerCenter - rootHeight / 2)
    )
    setBottom((current) => (current === nextBottom ? current : nextBottom))
  }, [])

  const refresh = useCallback(() => {
    frameRef.current = null

    const progress = readProgress()
    if (progress !== null) {
      const nextState = {
        progress,
        chapter: readChapterTitle(),
        dark: readDarkTheme()
      }
      setReader((current) => {
        if (
          current &&
          current.progress === nextState.progress &&
          current.chapter === nextState.chapter &&
          current.dark === nextState.dark
        ) {
          return current
        }
        return nextState
      })
    }

    requestAnimationFrame(updatePosition)
  }, [updatePosition])

  const queueRefresh = useCallback(() => {
    if (frameRef.current !== null) return
    frameRef.current = requestAnimationFrame(refresh)
  }, [refresh])

  const followUpRefresh = useCallback(() => {
    queueRefresh()
    for (const delay of FOLLOW_UP_DELAYS) {
      followUpTimersRef.current.push(window.setTimeout(queueRefresh, delay))
    }
  }, [queueRefresh])

  useLayoutEffect(() => {
    if (reader) updatePosition()
  }, [reader, updatePosition])

  useEffect(() => {
    queueRefresh()

    const observer = new MutationObserver(queueRefresh)
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["class"]
    })

    const handleVisibility = () => {
      if (!document.hidden) followUpRefresh()
    }

    document.addEventListener("click", followUpRefresh, true)
    document.addEventListener("keyup", followUpRefresh, true)
    document.addEventListener("visibilitychange", handleVisibility)
    window.addEventListener("scroll", queueRefresh, { passive: true })
    window.addEventListener("resize", followUpRefresh, { passive: true })
    window.addEventListener("hashchange", followUpRefresh)
    window.addEventListener("popstate", followUpRefresh)
    const intervalId = window.setInterval(queueRefresh, 3000)

    return () => {
      observer.disconnect()
      document.removeEventListener("click", followUpRefresh, true)
      document.removeEventListener("keyup", followUpRefresh, true)
      document.removeEventListener("visibilitychange", handleVisibility)
      window.removeEventListener("scroll", queueRefresh)
      window.removeEventListener("resize", followUpRefresh)
      window.removeEventListener("hashchange", followUpRefresh)
      window.removeEventListener("popstate", followUpRefresh)
      window.clearInterval(intervalId)
      followUpTimersRef.current.forEach(window.clearTimeout)
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    }
  }, [followUpRefresh, queueRefresh])

  if (!reader) return null

  const displayValue = formatProgress(reader.progress)
  const style: ProgressStyle = {
    "--wrp-bottom": `${bottom}px`,
    "--wrp-progress": `${reader.progress}%`
  }

  const openCatalog = () => {
    document.querySelector<HTMLElement>(".readerControls_item.catalog")?.click()
    followUpRefresh()
  }

  return (
    <button
      ref={rootRef}
      type="button"
      className="wrp-root"
      data-theme={reader.dark ? "dark" : "light"}
      style={style}
      title={`${reader.chapter} · 已读 ${displayValue}%（点击打开目录）`}
      aria-label={`全书阅读进度 ${displayValue}%，${reader.chapter}，点击打开目录`}
      onClick={openCatalog}>
      <span className="wrp-topline">
        <span className="wrp-label">全书进度</span>
        <span className="wrp-chapter">{reader.chapter}</span>
        <strong className="wrp-value">{displayValue}%</strong>
      </span>
      <span className="wrp-track" aria-hidden="true">
        <span className="wrp-fill" />
      </span>
    </button>
  )
}

export default ProgressOverlay
