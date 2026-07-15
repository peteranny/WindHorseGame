// A single slot in the attack line - one entry per attack button (the
// protagonist's own innate attack, plus one per captured monster).
export interface AttackLineMember {
  key: string;
  // null for the innate attack (and any other family-less attack) - a
  // null-family member never joins a group with its neighbors, so it always
  // stands alone even between two same-family monsters.
  family: string | null;
  step: number;
}

// Splits an ordered attack line into maximal runs of consecutive members
// sharing the same non-null family. Each run is what gets thrown together
// when any one of its members is tapped.
export const groupByAdjacentFamily = <T extends AttackLineMember>(
  line: T[]
): T[][] => {
  const groups: T[][] = [];
  line.forEach((member) => {
    const current = groups[groups.length - 1];
    if (
      member.family !== null &&
      current &&
      current[0].family === member.family
    ) {
      current.push(member);
    } else {
      groups.push([member]);
    }
  });
  return groups;
};

// The multiplier a member at `indexInGroup` (0-based, left-to-right within
// its own group) contributes - e.g. step 0.5 gives 1, 1.5, 2, 2.5...
export const groupMultiplierAt = (step: number, indexInGroup: number): number =>
  1 + indexInGroup * step;

// The maximal same-family run containing `key`, or a single-member run of
// just that key if it has no family (or isn't found at all).
export const findGroupContaining = <T extends AttackLineMember>(
  line: T[],
  key: string
): T[] => {
  const group = groupByAdjacentFamily(line).find((candidate) =>
    candidate.some((member) => member.key === key)
  );
  return group ?? line.filter((member) => member.key === key);
};

// Moves every member of `group` (by key) to the back of `line`, preserving
// both the relative order of the moved members and of everyone left behind.
export const moveGroupToBack = <T extends AttackLineMember>(
  line: T[],
  group: T[]
): T[] => {
  const movingKeys = new Set(group.map((member) => member.key));
  const remaining = line.filter((member) => !movingKeys.has(member.key));
  const moved = line.filter((member) => movingKeys.has(member.key));
  return [...remaining, ...moved];
};

// Moves every member of `group` (by key) to the front of `line`, same
// order-preservation as moveGroupToBack above - the alternating counterpart
// used every other tap (see Battle/index.tsx's nextPlacement).
export const moveGroupToFront = <T extends AttackLineMember>(
  line: T[],
  group: T[]
): T[] => {
  const movingKeys = new Set(group.map((member) => member.key));
  const remaining = line.filter((member) => !movingKeys.has(member.key));
  const moved = line.filter((member) => movingKeys.has(member.key));
  return [...moved, ...remaining];
};

// A stable, deterministic hue (0-359) for a family name, so the grouping
// indicator's glow color is consistent for a given family across renders and
// sessions without maintaining an explicit color table per family.
export const hueForFamily = (family: string): number => {
  let hash = 0;
  for (let i = 0; i < family.length; i += 1) {
    hash = (hash * 31 + family.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 360;
};
