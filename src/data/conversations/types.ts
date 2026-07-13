export interface ConversationPage {
  speaker: "protagonist" | "monster";
  text: string;
  action?: "enter_challenge";
}

export type Conversation = ConversationPage[];
