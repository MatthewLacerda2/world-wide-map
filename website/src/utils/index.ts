export function getEdgeColor(pingTime: number): string {
  if (pingTime < 30) return "green";
  if (pingTime < 90) return "yellow";
  return "red";
}
