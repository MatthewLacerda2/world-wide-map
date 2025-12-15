interface ToggleControlsProps {
  showGeozones: boolean;
  showEdges: boolean;
  onToggleGeozones: () => void;
  onToggleEdges: () => void;
}

export function ToggleControls({
  showGeozones,
  showEdges,
  onToggleGeozones,
  onToggleEdges,
}: ToggleControlsProps) {
  const buttonStyle = (isActive: boolean) => ({
    padding: "8px 16px",
    backgroundColor: isActive
      ? "rgba(76, 175, 80, 0.9)"
      : "rgba(244, 67, 54, 0.9)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500" as const,
    boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
    transition: "background-color 0.2s ease",
    fontFamily: "Arial, sans-serif",
  });

  const handleMouseEnter = (
    e: React.MouseEvent<HTMLButtonElement>,
    isActive: boolean
  ) => {
    e.currentTarget.style.backgroundColor = isActive
      ? "rgba(76, 175, 80, 1)"
      : "rgba(244, 67, 54, 1)";
  };

  const handleMouseLeave = (
    e: React.MouseEvent<HTMLButtonElement>,
    isActive: boolean
  ) => {
    e.currentTarget.style.backgroundColor = isActive
      ? "rgba(76, 175, 80, 0.9)"
      : "rgba(244, 67, 54, 0.9)";
  };

  return (
    <div
      style={{
        position: "absolute",
        top: "10px",
        right: "10px",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      <button
        onClick={onToggleGeozones}
        style={buttonStyle(showGeozones)}
        onMouseEnter={(e) => handleMouseEnter(e, showGeozones)}
        onMouseLeave={(e) => handleMouseLeave(e, showGeozones)}
      >
        {showGeozones ? "Hide" : "Show"} Geozones
      </button>
      <button
        onClick={onToggleEdges}
        style={buttonStyle(showEdges)}
        onMouseEnter={(e) => handleMouseEnter(e, showEdges)}
        onMouseLeave={(e) => handleMouseLeave(e, showEdges)}
      >
        {showEdges ? "Hide" : "Show"} Edges
      </button>
    </div>
  );
}
