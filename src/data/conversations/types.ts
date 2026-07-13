export interface ConversationPage {
  speaker: "protagonist" | "monster";
  text: string;
  action?: "enter_challenge" | "end";
}

export type Conversation = ConversationPage[];
