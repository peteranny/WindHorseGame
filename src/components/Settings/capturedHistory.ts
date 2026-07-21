// Monster ids in the order they were captured (oldest/first-captured
// first) - the dev-only "peek another key's captures" table in Settings
// renders exactly this order, top to bottom.
export const sortByCaptureTime = (captured: Record<number, string>): number[] =>
  Object.entries(captured)
    .sort(([, a], [, b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([id]) => Number(id));

// "YYYY/MM/DD hh:mm" in the viewer's own local time - no existing shared
// date formatter in the codebase covers this shape (Battle's own
// toLocaleDateString() omits the time entirely).
export const formatCaptureTimestamp = (iso: string): string => {
  const date = new Date(iso);
  const pad = (n: number): string => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(
      date.getDate()
    )} ` + `${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
};
