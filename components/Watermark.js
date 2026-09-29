export default function Watermark() {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "#fff",
        borderRadius: 999,
        boxShadow: "0 4px 14px rgba(46, 15, 27, 0.18)",
        padding: "6px 14px 6px 6px",
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          background: "var(--wine)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: 12,
        }}
      >
        MBB
      </div>
      <div style={{ lineHeight: 1.25 }}>
        <div style={{ fontWeight: 700, fontSize: 12.5, color: "var(--wine-deep)" }}>Melissa Berdeja</div>
        <div style={{ fontSize: 10.5, color: "var(--muted)" }}>Dev &amp; Design</div>
      </div>
    </div>
  );
}
