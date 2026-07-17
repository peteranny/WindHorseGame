export interface ConversationPage {
  // "narration" is scene/action description (nobody's actual speech) - shown
  // with no portrait or speaker name, unlike the other two.
  speaker: "protagonist" | "monster" | "narration";
  text: string;
  action?: "enter_challenge" | "end";
}

export type Conversation = ConversationPage[];
