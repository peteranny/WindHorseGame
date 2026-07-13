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
