import { formatCaptureTimestamp, sortByCaptureTime } from "./capturedHistory";

describe("sortByCaptureTime", () => {
  it("orders ids oldest-captured first", () => {
    expect(
      sortByCaptureTime({
        3: "2024-01-05T00:00:00.000Z",
        1: "2024-01-01T00:00:00.000Z",
        2: "2024-01-03T00:00:00.000Z",
      })
    ).toEqual([1, 2, 3]);
  });

  it("is empty for no captures", () => {
    expect(sortByCaptureTime({})).toEqual([]);
  });
});

describe("formatCaptureTimestamp", () => {
  it("formats as YYYY/MM/DD hh:mm, zero-padded", () => {
    expect(formatCaptureTimestamp("2024-03-05T09:07:00.000Z")).toMatch(
      /^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/
    );
  });
});
