import { Conversation } from "./types";
import { parseConversation } from "./engine";

import goalHint from "./goalHint.json";
import goalChallenge from "./goalChallenge.json";
import goalFinal from "./goalFinal.json";

import c0 from "./0.json";
import c1 from "./1.json";
import c2 from "./2.json";
import c3 from "./3.json";
import c4 from "./4.json";
import c5 from "./5.json";
import c6 from "./6.json";
import c7 from "./7.json";
import c8 from "./8.json";
import c9 from "./9.json";
import c10 from "./10.json";
import c11 from "./11.json";
import c12 from "./12.json";
import c13 from "./13.json";
import c14 from "./14.json";
import c15 from "./15.json";
import c16 from "./16.json";
import c17 from "./17.json";
import c18 from "./18.json";
import c19 from "./19.json";
import c20 from "./20.json";
import c21 from "./21.json";
import c22 from "./22.json";
import c23 from "./23.json";
import c24 from "./24.json";
import c25 from "./25.json";
import c26 from "./26.json";
import c27 from "./27.json";
import c28 from "./28.json";
import c29 from "./29.json";
import c30 from "./30.json";
import c31 from "./31.json";
import c32 from "./32.json";
import c33 from "./33.json";
import c34 from "./34.json";
import c35 from "./35.json";
import c36 from "./36.json";
import c37 from "./37.json";
import c38 from "./38.json";

const CONVERSATIONS: Record<number, Conversation> = {
  0: parseConversation(c0),
  1: parseConversation(c1),
  2: parseConversation(c2),
  3: parseConversation(c3),
  4: parseConversation(c4),
  5: parseConversation(c5),
  6: parseConversation(c6),
  7: parseConversation(c7),
  8: parseConversation(c8),
  9: parseConversation(c9),
  10: parseConversation(c10),
  11: parseConversation(c11),
  12: parseConversation(c12),
  13: parseConversation(c13),
  14: parseConversation(c14),
  15: parseConversation(c15),
  16: parseConversation(c16),
  17: parseConversation(c17),
  18: parseConversation(c18),
  19: parseConversation(c19),
  20: parseConversation(c20),
  21: parseConversation(c21),
  22: parseConversation(c22),
  23: parseConversation(c23),
  24: parseConversation(c24),
  25: parseConversation(c25),
  26: parseConversation(c26),
  27: parseConversation(c27),
  28: parseConversation(c28),
  29: parseConversation(c29),
  30: parseConversation(c30),
  31: parseConversation(c31),
  32: parseConversation(c32),
  33: parseConversation(c33),
  34: parseConversation(c34),
  35: parseConversation(c35),
  36: parseConversation(c36),
  37: parseConversation(c37),
  38: parseConversation(c38),
};

export const GOAL_HINT_CONVERSATION: Conversation = parseConversation(goalHint);
// Shown once every monster is captured but the goal battle hasn't been beaten
// yet - its terminal page's "enter_challenge" action starts that battle.
export const GOAL_CHALLENGE_CONVERSATION: Conversation = parseConversation(
  goalChallenge
);
// Shown after winning the goal battle, replacing the generic capture-outcome
// text (see ConversationView) since there's no monster being captured here.
export const GOAL_FINAL_CONVERSATION: Conversation = parseConversation(
  goalFinal
);

export default CONVERSATIONS;
