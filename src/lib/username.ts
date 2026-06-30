const ADJECTIVES = [
  "Swift", "Bold", "Keen", "Bright", "Calm", "Sharp", "Quick", "Wise",
  "Cool", "Neat", "Prime", "Fresh", "Clear", "Steady", "Agile", "Solid",
];

const NOUNS = [
  "Falcon", "River", "Pixel", "Orbit", "Spark", "Forge", "Beacon", "Comet",
  "Anchor", "Summit", "Vector", "Pulse", "Cedar", "Nova", "Drift", "Crest",
];

const COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
  "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export interface UserIdentity {
  id: string;
  name: string;
  color: string;
}

export function generateUsername(): UserIdentity {
  return {
    id: `user-${Math.random().toString(36).slice(2, 10)}`,
    name: `${pick(ADJECTIVES)} ${pick(NOUNS)}`,
    color: pick(COLORS),
  };
}

const STORAGE_KEY = "boardroom-identity";

export function getOrCreateIdentity(): UserIdentity {
  if (typeof window === "undefined") {
    return generateUsername();
  }
  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as UserIdentity;
      if (parsed.id) return parsed;
      const withId = { ...parsed, id: `user-${Math.random().toString(36).slice(2, 10)}` };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(withId));
      return withId;
    } catch {
      // fall through
    }
  }
  const identity = generateUsername();
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  return identity;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
