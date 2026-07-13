import {
  buildOutcomeConversation,
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

describe("buildOutcomeConversation", () => {
  it.each([
    ["win", "太好了，成功抓到長頸鹿小馬了！"],
    ["lose", "唔...小風被長頸鹿小馬打倒了，下次準備好了再來挑戰吧。"],
    ["escape", "先撤退好了，長頸鹿小馬下次再說！"],
  ] as const)("mentions the monster's name for a %s outcome", (outcome, expectedText) => {
    const pages = buildOutcomeConversation("長頸鹿小馬", outcome);
    expect(pages).toEqual([
      { speaker: "protagonist", text: expectedText, action: "end" },
    ]);
  });

  it("never leads into a challenge", () => {
    (["win", "lose", "escape"] as const).forEach((outcome) => {
      const pages = buildOutcomeConversation("測試怪獸", outcome);
      expect(terminalAction(pages, pages.length - 1)).not.toBe(
        "enter_challenge"
      );
    });
  });
});
