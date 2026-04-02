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

const COMMON_PLURAL_NOUNS = new Set([
  "people", "others", "members", "eyes", "hands", "days", "years", "things", "words",
  "times", "children", "men", "women", "friends", "lives", "places", "streets", "trees",
  "stars", "mountains", "rivers", "fields", "soldiers", "nations", "lands", "walls",
  "roads", "towers", "windows", "hearts", "stones", "swords", "ships", "castles",
  "dogs", "cats", "birds", "horses", "flowers", "clouds", "waves", "hills", "rooms",
  "houses", "doors", "books", "cities", "towns", "countries", "islands", "forests",
  "gardens", "churches", "schools", "tables", "chairs", "brothers", "sisters",
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

const FORM_OPTIONS = {
  Thing: [
    { value: "any", label: "Any", example: "" },
    { value: "plural", label: "Plural", example: "(dogs, mountains)" },
  ],
  Verb: [
    { value: "any", label: "Any", example: "" },
    { value: "past", label: "Past tense", example: "(walked, ran)" },
    { value: "gerund", label: "Ending in -ing", example: "(walking, running)" },
    { value: "present-3rd", label: "He/she/it form", example: "(walks, runs)" },
  ],
  Adjective: [
    { value: "any", label: "Any", example: "" },
    { value: "comparative", label: "Comparative (-er)", example: "(bigger, taller)" },
    { value: "superlative", label: "Superlative (-est)", example: "(biggest, tallest)" },
  ],
  Person: [
    { value: "any", label: "Any", example: "" },
    { value: "specific-person", label: "Specific person", example: "(Grandma, Elvis)" },
    { value: "type-of-person", label: "Type of person", example: "(teacher, bully)" },
  ],
  Time: [
    { value: "any", label: "Any", example: "" },
    { value: "time-of-day", label: "Time of day", example: "(dawn, 3 PM)" },
    { value: "date", label: "Date", example: "(July 4th)" },
    { value: "month-season", label: "Month or season", example: "(May, spring)" },
    { value: "year-era", label: "Year or era", example: "(1999, the 1800s)" },
  ],
};

const FORM_DISPLAY = {
  any: "",
  plural: "plural",
  past: "past tense",
  gerund: "-ing",
  "present-3rd": "he/she/it",
  comparative: "-er",
  superlative: "-est",
  "specific-person": "specific",
  "type-of-person": "type of person",
  "time-of-day": "time of day",
  date: "date",
  "month-season": "month/season",
  "year-era": "year/era",
};

function detectPOS(word, prevWord, nextWord) {
  const lower = word.toLowerCase().replace(/[^a-z'-]/g, "");
  if (!lower) return { type: "Thing", form: "any" };

  // Lookup maps first — base forms in these sets get "any"
  if (COMMON_ADJECTIVES.has(lower)) {
    if (lower === "best" || lower === "worst") return { type: "Adjective", form: "superlative" };
    if (lower === "better" || lower === "worse") return { type: "Adjective", form: "comparative" };
    return { type: "Adjective", form: "any" };
  }
  if (COMMON_ADVERBS.has(lower)) return { type: "Adverb", form: "any" };
  if (COMMON_VERBS.has(lower)) return { type: "Verb", form: "any" };
  if (COMMON_PLURAL_NOUNS.has(lower)) return { type: "Thing", form: "plural" };
  if (COMMON_NOUNS.has(lower)) return { type: "Thing", form: "any" };

  // Suffix rules — these also detect form
  if (lower.endsWith("ly") && lower.length > 3) return { type: "Adverb", form: "any" };
  if (lower.endsWith("tion") || lower.endsWith("ment") || lower.endsWith("ness") || lower.endsWith("ity")) return { type: "Thing", form: "any" };

  if (lower.endsWith("est") && lower.length > 4) return { type: "Adjective", form: "superlative" };
  if (lower.endsWith("er") && lower.length > 3 && !lower.endsWith("ter") && !lower.endsWith("ther")) return { type: "Adjective", form: "comparative" };
  if (lower.endsWith("ful") || lower.endsWith("ous") || lower.endsWith("ive") || lower.endsWith("ish") || lower.endsWith("al")) return { type: "Adjective", form: "any" };

  if (lower.endsWith("ing") && lower.length > 4) return { type: "Verb", form: "gerund" };
  if (lower.endsWith("ed") && lower.length > 3) return { type: "Verb", form: "past" };

  // Plural noun detection — words ending in s/es not caught above
  if ((lower.endsWith("s") || lower.endsWith("es")) && lower.length > 3 && !lower.endsWith("ss") && !lower.endsWith("us")) {
    const prevLower = (prevWord || "").toLowerCase().replace(/[^a-z]/g, "");
    if (ARTICLES.has(prevLower) || prevLower === "the" || prevLower === "these" || prevLower === "those" || prevLower === "many" || prevLower === "some" || prevLower === "all" || prevLower === "few") {
      return { type: "Thing", form: "plural" };
    }
  }

  // Context rules
  const prevLower = (prevWord || "").toLowerCase().replace(/[^a-z]/g, "");
  if (ARTICLES.has(prevLower)) return { type: "Thing", form: "any" };
  if (prevLower === PREPOSITION_TO) return { type: "Verb", form: "any" };

  const nextLower = (nextWord || "").toLowerCase().replace(/[^a-z]/g, "");
  if (COMMON_NOUNS.has(nextLower)) return { type: "Adjective", form: "any" };

  return { type: "Thing", form: "any" };
}

function getFormLabel(form) {
  return FORM_DISPLAY[form] || "";
}

function getFormOptionsForType(type) {
  return FORM_OPTIONS[type] || [];
}

export { detectPOS, WORD_TYPES, FORM_OPTIONS, FORM_DISPLAY, getFormLabel, getFormOptionsForType };
