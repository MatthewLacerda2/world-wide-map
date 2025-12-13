interface EdgeTooltipProps {
  position: { x: number; y: number };
  originDisplay: string;
  destinationDisplay: string;
  pingDisplay: string;
}

export function EdgeTooltip({
  position,
  originDisplay,
  destinationDisplay,
  pingDisplay,
}: EdgeTooltipProps) {
  return (
    <div
      className="edge-tooltip"
      style={{
        position: "absolute",
        left: `${position.x}px`,
        top: `${position.y - 10}px`,
        transform: "translate(-50%, -100%)",
        pointerEvents: "none",
        zIndex: 1000,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        color: "white",
        padding: "8px 12px",
        borderRadius: "4px",
        fontSize: "12px",
        whiteSpace: "nowrap",
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div>
          <strong>Origin:</strong> {originDisplay}
        </div>
        <div>
          <strong>Destination:</strong> {destinationDisplay}
        </div>
        <div>
          <strong>Ping Time:</strong> {pingDisplay}
        </div>
      </div>
    </div>
  );
}
