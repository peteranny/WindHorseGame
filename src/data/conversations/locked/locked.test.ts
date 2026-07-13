import LOCKED_CONVERSATIONS from "./index";
import { isTerminalPage, terminalAction } from "../engine";
import MONSTERS from "../../monsters/monsters";

describe("locked conversations", () => {
  it("has one entry per monster, each ending without an enter_challenge action", () => {
    MONSTERS.forEach((monster) => {
      const pages = LOCKED_CONVERSATIONS[monster.id];
      expect(pages.length).toBeGreaterThan(0);
      const lastIndex = pages.length - 1;
      expect(isTerminalPage(pages, lastIndex)).toBe(true);
      expect(terminalAction(pages, lastIndex)).not.toBe("enter_challenge");
    });
  });
});
