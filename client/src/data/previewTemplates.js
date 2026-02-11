// Preview templates for the animated Mad Lib example on the home page
// Each template has a structure with placeholders and highlighted words

export const previewTemplates = [
  {
    text: "At {timeOfDay}, I felt {emotion} when {personType} handed me a {size} {thing}.",
    highlights: ["timeOfDay", "emotion", "personType", "size", "thing"],
    wordPools: {
      timeOfDay: ["dawn", "3:17 PM", "midnight", "sunset", "noon"],
      emotion: ["excited", "confused", "surprised", "nervous", "thrilled"],
      personType: ["teacher", "friend", "stranger", "bully", "neighbor"],
      size: ["tiny", "massive", "gigantic", "mini", "enormous"],
      thing: ["book", "pizza", "key", "balloon", "treasure"]
    }
  },
  {
    text: "In {yearEra}, we {adverb} {verbPast} through {place} and found {pluralThing} everywhere.",
    highlights: ["yearEra", "adverb", "verbPast", "place", "pluralThing"],
    wordPools: {
      yearEra: ["1999", "the 1800s", "2025", "ancient times", "last summer"],
      adverb: ["quietly", "wildly", "carefully", "suddenly", "slowly"],
      verbPast: ["walked", "ran", "crept", "danced", "sprinted"],
      place: ["a haunted library", "under the bleachers", "on Mars", "at the mall", "in the forest"],
      pluralThing: ["books", "coins", "flowers", "secrets", "clues"]
    }
  },
  {
    text: "Dear {specificPerson}, I can't believe you {verbPast} my {thing} on {date}.",
    highlights: ["specificPerson", "verbPast", "thing", "date"],
    wordPools: {
      specificPerson: ["Ana", "Grandma", "Leonard Cohen", "Mom", "Alex"],
      verbPast: ["borrowed", "ate", "lost", "found", "hid"],
      thing: ["bike", "sandwich", "diary", "phone", "backpack"],
      date: ["July 4th", "Tuesday", "my birthday", "last week", "yesterday"]
    }
  },
  {
    text: "The {size} {thing} was {emotion}-inducing, so I {verbPast} {adverb} and ran.",
    highlights: ["size", "thing", "emotion", "verbPast", "adverb"],
    wordPools: {
      size: ["gigantic", "tiny", "massive", "mini", "enormous"],
      thing: ["spider", "cake", "robot", "dragon", "puppy"],
      emotion: ["fear", "joy", "confusion", "excitement", "terror"],
      verbPast: ["screamed", "laughed", "jumped", "froze", "danced"],
      adverb: ["quickly", "wildly", "silently", "loudly", "carefully"]
    }
  },
  {
    text: "On a {adjective} night in {place}, {personType} whispered: '{quote}'",
    highlights: ["adjective", "place", "personType", "quote"],
    wordPools: {
      adjective: ["stormy", "mysterious", "starry", "foggy", "silent"],
      place: ["the old mansion", "the park", "the subway", "the beach", "the attic"],
      personType: ["a ghost", "a friend", "a stranger", "the librarian", "a detective"],
      quote: ["The secret is in the basement", "Follow the blue door", "It's not what it seems", "Trust no one", "The answer is 42"]
    }
  },
  {
    text: "I was {emotion} until the {thing} started to {verbBase} at {timeOfDay}.",
    highlights: ["emotion", "thing", "verbBase", "timeOfDay"],
    wordPools: {
      emotion: ["happy", "bored", "calm", "excited", "sleepy"],
      thing: ["clock", "door", "phone", "refrigerator", "computer"],
      verbBase: ["talk", "sing", "dance", "glow", "move"],
      timeOfDay: ["midnight", "dawn", "3 AM", "sunset", "noon"]
    }
  },
  {
    text: "During {monthSeason}, {specificPerson} and I discovered {pluralThing} hidden {place}.",
    highlights: ["monthSeason", "specificPerson", "pluralThing", "place"],
    wordPools: {
      monthSeason: ["May", "spring", "winter", "October", "summer"],
      specificPerson: ["Grandma", "my best friend", "the neighbor", "a stranger", "my teacher"],
      pluralThing: ["treasures", "letters", "photos", "keys", "maps"],
      place: ["in the attic", "under the floorboards", "behind the bookshelf", "in the garden", "at the old tree"]
    }
  },
  {
    text: "The {size} {thing} from {place} made everyone feel {emotion}, so we {verbPast} {adverb}.",
    highlights: ["size", "thing", "place", "emotion", "verbPast", "adverb"],
    wordPools: {
      size: ["tiny", "gigantic", "massive", "mini", "enormous"],
      thing: ["message", "package", "discovery", "surprise", "mystery"],
      place: ["the mailbox", "outer space", "the future", "the past", "another dimension"],
      emotion: ["confused", "excited", "scared", "curious", "amazed"],
      verbPast: ["celebrated", "investigated", "panicked", "explored", "danced"],
      adverb: ["together", "immediately", "carefully", "wildly", "quietly"]
    }
  },
  {
    text: "At {timeOfDay} on {date}, {personType} told me the {adjective} {thing} was actually {emotion}.",
    highlights: ["timeOfDay", "date", "personType", "adjective", "thing", "emotion"],
    wordPools: {
      timeOfDay: ["dawn", "3:17 PM", "midnight", "sunset", "noon"],
      date: ["July 4th", "Tuesday", "my birthday", "last week", "yesterday"],
      personType: ["teacher", "friend", "stranger", "bully", "neighbor"],
      adjective: ["strange", "beautiful", "mysterious", "ordinary", "magical"],
      thing: ["story", "secret", "truth", "legend", "rumor"],
      emotion: ["true", "false", "real", "imaginary", "possible"]
    }
  },
  {
    text: "In {yearEra}, {specificPerson} {adverb} {verbPast} a {size} {thing} and nobody noticed.",
    highlights: ["yearEra", "specificPerson", "adverb", "verbPast", "size", "thing"],
    wordPools: {
      yearEra: ["1999", "the 1800s", "2025", "ancient times", "last summer"],
      specificPerson: ["Ana", "Grandma", "Leonard Cohen", "Mom", "Alex"],
      adverb: ["quietly", "wildly", "carefully", "suddenly", "slowly"],
      verbPast: ["created", "destroyed", "found", "lost", "built"],
      size: ["tiny", "massive", "gigantic", "mini", "enormous"],
      thing: ["machine", "monument", "invention", "secret", "treasure"]
    }
  },
  {
    text: "The {emotion} {personType} {adverb} {verbPast} through {place} holding a {thing}.",
    highlights: ["emotion", "personType", "adverb", "verbPast", "place", "thing"],
    wordPools: {
      emotion: ["excited", "nervous", "confused", "brave", "curious"],
      personType: ["detective", "explorer", "student", "hero", "adventurer"],
      adverb: ["quickly", "carefully", "wildly", "silently", "boldly"],
      verbPast: ["ran", "crept", "walked", "danced", "sprinted"],
      place: ["the dark hallway", "the crowded market", "the empty park", "the secret tunnel", "the moonlit beach"],
      thing: ["flashlight", "map", "key", "compass", "crystal"]
    }
  },
  {
    text: "On {date} at {timeOfDay}, I realized the {adjective} {thing} was {emotion}, and that's when it got weird.",
    highlights: ["date", "timeOfDay", "adjective", "thing", "emotion"],
    wordPools: {
      date: ["July 4th", "Tuesday", "my birthday", "last week", "yesterday"],
      timeOfDay: ["dawn", "3:17 PM", "midnight", "sunset", "noon"],
      adjective: ["strange", "beautiful", "mysterious", "ordinary", "magical"],
      thing: ["discovery", "coincidence", "pattern", "secret", "message"],
      emotion: ["real", "true", "impossible", "inevitable", "surprising"]
    }
  }
];

// Helper function to generate a random preview with filled words
export const generatePreview = (template) => {
  let text = template.text;
  const filledWords = {};
  const highlightSet = new Set(template.highlights || []);
  const parts = [];
  
  // Parse template and build parts array with highlight info
  const placeholderRegex = /\{(\w+)\}/g;
  let lastIndex = 0;
  let match;
  
  while ((match = placeholderRegex.exec(template.text)) !== null) {
    const key = match[1];
    const pool = template.wordPools[key];
    const randomWord = pool[Math.floor(Math.random() * pool.length)];
    filledWords[key] = randomWord;
    
    // Add text before placeholder
    if (match.index > lastIndex) {
      parts.push({
        text: template.text.substring(lastIndex, match.index),
        highlight: false
      });
    }
    
    // Add highlighted word
    parts.push({
      text: randomWord,
      highlight: highlightSet.has(key)
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < template.text.length) {
    parts.push({
      text: template.text.substring(lastIndex),
      highlight: false
    });
  }
  
  return { 
    text: parts.map(p => p.text).join(''),
    parts,
    filledWords, 
    highlights: template.highlights 
  };
};

