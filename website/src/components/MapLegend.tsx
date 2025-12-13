export function MapLegend() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: "10px",
        left: "10px",
        background:
          "linear-gradient(135deg, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.5))",
        padding: "10px 15px",
        borderRadius: "8px",
        zIndex: 1000,
        fontSize: "14px",
        fontFamily: "Arial, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ color: "white", fontWeight: "bold" }}>
        <span style={{ color: "green" }}>Green</span> is 35ms.
      </div>
      <div style={{ color: "white", fontWeight: "bold" }}>
        <span style={{ color: "#FFD700" }}>Yellow</span> is 120ms.
      </div>
      <div style={{ color: "white", fontWeight: "bold" }}>
        <span style={{ color: "red" }}>Red</span> is more than 120ms.
      </div>
    </div>
  );
}
