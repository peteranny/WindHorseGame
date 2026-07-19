import { Conversation, ConversationPage } from "./types";

const isValidSpeaker = (
  speaker: unknown
): speaker is ConversationPage["speaker"] =>
  speaker === "protagonist" || speaker === "monster" || speaker === "narration";

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

// "3 分鐘" - rounded UP to the next whole minute (never floored, and never
// all the way down to 0) since this is only ever called while remainingMs
// is still positive - "0 分鐘" would read as "already unlocked" rather than
// "almost there", and flooring instead could show a stale "3 分鐘" for
// nearly a whole extra minute after really only 2-and-a-bit are left.
export const formatCooldownRemaining = (remainingMs: number): string =>
  `${Math.max(1, Math.ceil(remainingMs / 60000))} 分鐘`;

// Shown instead of a monster's (or the goal's) normal script while its
// battle-loss cooldown is still active (see gameStore.battleCooldowns) -
// never leads into a challenge, just sends the player back to the map.
// openingPage is that normal script's own first page (whatever it actually
// is right now - a monster's CONVERSATIONS[id][0], or the goal's own
// GOAL_HINT_CONVERSATION[0]/GOAL_CHALLENGE_CONVERSATION[0]), reused verbatim
// so the encounter still opens with the same beat as an unlocked encounter
// would - only the follow-up differs, with the monster itself refusing a
// rematch instead of continuing into its usual script. remainingMs is a
// snapshot taken when the conversation is first entered (see
// ConversationView) rather than a live countdown - it doesn't tick down
// while this page is on screen.
export const buildCooldownConversation = (
  monsterName: string,
  remainingMs: number,
  openingPage: ConversationPage
): Conversation => [
  openingPage,
  {
    speaker: "monster",
    text: `小風，${monsterName}剛剛才贏了你，還沒消氣，要等 ${formatCooldownRemaining(
      remainingMs
    )}才願意再戰一次！`,
    action: "end",
  },
];
