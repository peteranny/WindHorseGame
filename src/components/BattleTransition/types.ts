// Shared between index.tsx (the phase state machine) and every variants/
// component (which only ever needs to know "cover" vs "reveal" vs
// "something else, render nothing") - broken out so a variant file never
// has to import from index.tsx itself.
export type Phase = "idle" | "freeze" | "flash" | "cover" | "reveal" | "resolve";
