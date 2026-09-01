const Popup = () => (
  <main
    style={{
      width: 260,
      padding: "18px 18px 16px",
      color: "#202832",
      background: "#f8f8fa",
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif'
    }}>
    <div style={{ fontSize: 15, fontWeight: 700 }}>微信读书阅读进度</div>
    <p
      style={{
        margin: "8px 0 0",
        color: "#717882",
        fontSize: 12,
        lineHeight: 1.65
      }}>
      已启用。打开微信读书网页阅读器后，进度条会自动显示在翻页按钮之间。
    </p>
  </main>
)

export default Popup
