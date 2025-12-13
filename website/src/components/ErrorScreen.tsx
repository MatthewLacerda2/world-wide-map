interface ErrorScreenProps {
  error: string;
}

export function ErrorScreen({ error }: ErrorScreenProps) {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
      }}
    >
      <div style={{ color: "red", marginBottom: "10px" }}>
        Error loading data
      </div>
      <div style={{ color: "gray" }}>{error}</div>
    </div>
  );
}
