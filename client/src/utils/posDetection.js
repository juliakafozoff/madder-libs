const COMMON_NOUNS = new Set([
  "time", "year", "people", "way", "day", "man", "woman", "child", "world", "life",
  "hand", "part", "place", "case", "week", "company", "system", "program", "question",
  "work", "government", "number", "night", "point", "home", "water", "room", "mother",
  "area", "money", "story", "fact", "month", "lot", "right", "study", "book", "eye",
  "job", "word", "business", "issue", "side", "kind", "head", "house", "service", "friend",
  "father", "power", "hour", "game", "line", "end", "members", "family", "law", "car",
  "city", "community", "name", "president", "team", "minute", "idea", "body", "information",
  "back", "parent", "face", "others", "level", "office", "door", "health", "person", "art",
  "war", "history", "party", "result", "change", "morning", "reason", "research", "girl",
  "guy", "moment", "air", "teacher", "force", "education", "dog", "cat", "bird", "tree",
  "sun", "moon", "star", "king", "queen", "baby", "food", "fish", "horse", "fire",
  "mountain", "river", "ocean", "island", "garden", "street", "town", "country", "field",
  "forest", "church", "school", "table", "chair", "bed", "window", "heart", "blood",
  "stone", "sword", "ship", "castle", "gold", "silver", "iron", "brother", "sister",
  "daughter", "son", "wife", "husband", "creature", "beast", "monster", "hero", "villain",
  "army", "battle", "soldier", "nation", "land", "sky", "earth", "wind", "rain", "snow",
  "storm", "ground", "road", "path", "bridge", "wall", "tower", "bowl", "basket", "coat",
]);

const COMMON_VERBS = new Set([
  "is", "was", "are", "were", "be", "been", "being", "have", "has", "had", "do", "does",
  "did", "will", "would", "could", "should", "may", "might", "shall", "can", "need",
  "dare", "ought", "used", "go", "say", "get", "make", "know", "think", "take", "see",
  "come", "want", "look", "use", "find", "give", "tell", "work", "call", "try", "ask",
  "put", "run", "move", "live", "believe", "bring", "happen", "write", "provide", "sit",
  "stand", "lose", "pay", "meet", "include", "continue", "set", "learn", "change", "lead",
  "understand", "watch", "follow", "stop", "create", "speak", "read", "allow", "add",
  "spend", "grow", "open", "walk", "win", "offer", "remember", "love", "consider", "appear",
  "buy", "wait", "serve", "die", "send", "expect", "build", "stay", "fall", "cut", "reach",
  "kill", "remain", "suggest", "raise", "pass", "sell", "require", "report", "decide",
  "pull", "fight", "eat", "sleep", "drink", "sing", "dance", "fly", "swim", "jump",
  "climb", "throw", "catch", "hold", "break", "burn", "hide", "steal", "cry", "laugh",
]);

const COMMON_ADJECTIVES = new Set([
  "good", "new", "first", "last", "long", "great", "little", "own", "other", "old",
  "right", "big", "high", "different", "small", "large", "next", "early", "young", "important",
  "few", "public", "bad", "same", "able", "free", "full", "sure", "true", "real",
  "best", "better", "strong", "possible", "whole", "special", "hard", "clear", "certain",
  "low", "dark", "beautiful", "happy", "sad", "angry", "brave", "cold", "hot", "warm",
  "tall", "short", "fast", "slow", "loud", "quiet", "bright", "soft", "sharp", "sweet",
  "bitter", "wild", "gentle", "fierce", "proud", "humble", "rich", "poor", "wise", "foolish",
  "fair", "foul", "deep", "shallow", "wide", "narrow", "thick", "thin", "heavy", "light",
  "rough", "smooth", "wet", "dry", "fresh", "stale", "sick", "pale", "mighty", "terrible",
  "wonderful", "strange", "curious", "enormous", "tiny", "magnificent", "dreadful", "splendid",
]);

const COMMON_ADVERBS = new Set([
  "not", "also", "very", "often", "however", "too", "usually", "really", "already", "always",
  "never", "sometimes", "together", "likely", "simply", "generally", "instead", "actually",
  "again", "rather", "almost", "especially", "ever", "quickly", "probably", "only", "just",
  "enough", "still", "well", "here", "there", "now", "then", "slowly", "quietly", "loudly",
  "suddenly", "finally", "carefully", "eagerly", "gently", "fiercely", "proudly", "bravely",
  "wisely", "foolishly", "roughly", "softly", "deeply", "greatly", "terribly", "wonderfully",
]);

const ARTICLES = new Set(["the", "a", "an"]);
const PREPOSITION_TO = "to";

const WORD_TYPES = [
  "Adjective", "Thing", "Verb", "Adverb", "Person", "Place",
  "Emotion", "Color", "Number", "Size", "Time",
];

function detectPOS(word, prevWord, nextWord) {
  const lower = word.toLowerCase().replace(/[^a-z'-]/g, "");
  if (!lower) return "Thing";

  // Lookup maps first
  if (COMMON_ADJECTIVES.has(lower)) return "Adjective";
  if (COMMON_ADVERBS.has(lower)) return "Adverb";
  if (COMMON_VERBS.has(lower)) return "Verb";
  if (COMMON_NOUNS.has(lower)) return "Thing";

  // Suffix rules
  if (lower.endsWith("ly") && lower.length > 3) return "Adverb";
  if (lower.endsWith("tion") || lower.endsWith("ment") || lower.endsWith("ness") || lower.endsWith("ity")) return "Thing";
  if (lower.endsWith("ful") || lower.endsWith("ous") || lower.endsWith("ive") || lower.endsWith("ish") || lower.endsWith("al")) return "Adjective";
  if (lower.endsWith("ing") || lower.endsWith("ed")) return "Verb";

  // Context rules
  const prevLower = (prevWord || "").toLowerCase().replace(/[^a-z]/g, "");
  if (ARTICLES.has(prevLower)) return "Thing";
  if (prevLower === PREPOSITION_TO) return "Verb";

  // Check if next word looks like a noun (after articles) — this word might be adjective
  const nextLower = (nextWord || "").toLowerCase().replace(/[^a-z]/g, "");
  if (COMMON_NOUNS.has(nextLower)) return "Adjective";

  // Default
  return "Thing";
}

export { detectPOS, WORD_TYPES };
