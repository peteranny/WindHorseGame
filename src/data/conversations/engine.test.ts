import {
  isTerminalPage,
  nextPageIndex,
  parseConversation,
  terminalAction,
} from "./engine";

describe("parseConversation", () => {
  it("parses a well-formed conversation into pages", () => {
    const raw = [
      { speaker: "protagonist", text: "哈囉" },
      { speaker: "monster", text: "？？？", action: "enter_challenge" },
    ];
    expect(parseConversation(raw)).toEqual(raw);
  });

  it("drops pages with an empty or missing text", () => {
    const raw = [
      { speaker: "protagonist", text: "" },
      { speaker: "monster", text: "   " },
      { speaker: "protagonist" },
      { speaker: "monster", text: "有效的一頁" },
    ];
    expect(parseConversation(raw)).toEqual([
      { speaker: "monster", text: "有效的一頁" },
    ]);
  });

  it("drops pages with an invalid speaker or action", () => {
    const raw = [
      { speaker: "villain", text: "不應該出現" },
      { speaker: "monster", text: "有效", action: "explode" },
    ];
    expect(parseConversation(raw)).toEqual([
      { speaker: "monster", text: "有效" },
    ]);
  });

  it("returns an empty array for malformed (non-array) input", () => {
    expect(parseConversation(null)).toEqual([]);
    expect(parseConversation(undefined)).toEqual([]);
    expect(parseConversation("not an array")).toEqual([]);
    expect(parseConversation({})).toEqual([]);
  });
});

describe("page navigation", () => {
  const pages = parseConversation([
    { speaker: "protagonist", text: "第一頁" },
    { speaker: "monster", text: "第二頁" },
    { speaker: "protagonist", text: "第三頁", action: "enter_challenge" },
  ]);

  it("advances through pages in order", () => {
    expect(nextPageIndex(pages, 0)).toBe(1);
    expect(nextPageIndex(pages, 1)).toBe(2);
  });

  it("does not advance past the last page", () => {
    expect(nextPageIndex(pages, 2)).toBe(2);
  });

  it("identifies the terminal page", () => {
    expect(isTerminalPage(pages, 0)).toBe(false);
    expect(isTerminalPage(pages, 1)).toBe(false);
    expect(isTerminalPage(pages, 2)).toBe(true);
  });

  it("signals challenge entry only from the terminal page's action", () => {
    expect(terminalAction(pages, 0)).toBeUndefined();
    expect(terminalAction(pages, 2)).toBe("enter_challenge");
  });
});
