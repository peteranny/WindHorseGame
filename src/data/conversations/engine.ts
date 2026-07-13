import { Conversation, ConversationPage } from "./types";

const isValidSpeaker = (
  speaker: unknown
): speaker is ConversationPage["speaker"] =>
  speaker === "protagonist" || speaker === "monster";

const isValidAction = (
  action: unknown
): action is ConversationPage["action"] =>
  action === "enter_challenge" || action === "end";

export const parseConversation = (raw: unknown): Conversation => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (page): page is ConversationPage =>
        typeof page === "object" &&
        page !== null &&
        isValidSpeaker((page as ConversationPage).speaker) &&
        typeof (page as ConversationPage).text === "string" &&
        (page as ConversationPage).text.trim().length > 0
    )
    .map((page) => ({
      speaker: page.speaker,
      text: page.text,
      ...(isValidAction(page.action) ? { action: page.action } : {}),
    }));
};

export const isTerminalPage = (
  conversation: Conversation,
  index: number
): boolean => index === conversation.length - 1;

export const nextPageIndex = (
  conversation: Conversation,
  index: number
): number => Math.min(index + 1, conversation.length - 1);

export const terminalAction = (
  conversation: Conversation,
  index: number
): ConversationPage["action"] | undefined =>
  isTerminalPage(conversation, index) ? conversation[index]?.action : undefined;

export type BattleOutcome = "win" | "lose" | "escape";

export const buildOutcomeConversation = (
  monsterName: string,
  outcome: BattleOutcome
): Conversation => {
  switch (outcome) {
    case "win":
      return [
        {
          speaker: "protagonist",
          text: `太好了，成功抓到${monsterName}了！`,
          action: "end",
        },
      ];
    case "lose":
      return [
        {
          speaker: "protagonist",
          text: `唔...小風被${monsterName}打倒了，下次準備好了再來挑戰吧。`,
          action: "end",
        },
      ];
    case "escape":
      return [
        {
          speaker: "protagonist",
          text: `先撤退好了，${monsterName}下次再說！`,
          action: "end",
        },
      ];
  }
};
