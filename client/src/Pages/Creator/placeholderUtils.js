export const getInternalType = (displayLabel) => {
  if (displayLabel === "Thing") return "NOUN";
  return displayLabel.toUpperCase();
};

export const normalizeTypeForCheck = (type) => {
  const normalized = type.toLowerCase();
  if (normalized === "thing") return "noun";
  return normalized;
};

export const getFormOptions = (type) => {
  const normalizedType = normalizeTypeForCheck(type);
  if (normalizedType === "noun") {
    return ["plural"];
  } else if (normalizedType === "verb") {
    return ["past", "gerund", "present-3rd"];
  } else if (normalizedType === "adjective") {
    return ["comparative", "superlative"];
  } else if (normalizedType === "time") {
    return ["time-of-day", "date", "month-season", "year-era"];
  } else if (normalizedType === "person") {
    return ["specific-person", "type-of-person"];
  }
  return [];
};

export const normalizeQualifier = (qualifier, type) => {
  if (qualifier === "future") {
    return "any";
  }
  return qualifier;
};

export const getFormDisplayLabel = (form, type) => {
  const normalizedType = normalizeTypeForCheck(type);

  if (normalizedType === "noun") {
    if (form === "plural") {
      return { label: "Plural", example: "(books)" };
    }
  } else if (normalizedType === "verb") {
    if (form === "past") {
      return { label: "Past", example: "(walked)" };
    } else if (form === "gerund") {
      return { label: "-ing", example: "(walking)" };
    } else if (form === "present-3rd") {
      return { label: "He/She/It", example: "(walks)" };
    }
  } else if (normalizedType === "adjective") {
    if (form === "comparative") {
      return { label: "More", example: "(bigger)" };
    } else if (form === "superlative") {
      return { label: "Most", example: "(biggest)" };
    }
  } else if (normalizedType === "time") {
    if (form === "time-of-day") {
      return { label: "Time of day", example: "(at dawn, 3:17 PM)" };
    } else if (form === "date") {
      return { label: "Date", example: "(July 4th)" };
    } else if (form === "month-season") {
      return { label: "Month / season", example: "(May, spring)" };
    } else if (form === "year-era") {
      return { label: "Year / era", example: "(1999, the 1800s)" };
    }
  } else if (normalizedType === "person") {
    if (form === "specific-person") {
      return { label: "Specific person", example: "(Ana, Grandma, Leonard Cohen, Elvis Presley, Oprah)" };
    } else if (form === "type-of-person") {
      return { label: "Type of person", example: "(bully, teacher, friend)" };
    }
  }

  return { label: form, example: "" };
};

export const formatFormLabel = (form) => {
  if (form === "any") return "";
  if (form === "time-of-day") return "Time of day";
  if (form === "month-season") return "Month / season";
  if (form === "year-era") return "Year / era";
  if (form === "date") return "Date";
  if (form === "specific-person") return "Specific";
  if (form === "type-of-person") return "Type";
  return form.replace(/-/g, " ");
};

export const supportsFormSelection = (word) => {
  const normalized = normalizeTypeForCheck(word);
  return normalized === "noun" || normalized === "verb" || normalized === "adjective" || normalized === "time" || normalized === "person";
};

export const getFormExample = (form, type) => {
  const normalizedType = normalizeTypeForCheck(type);

  if (form === "any") {
    return { example: "any", suffix: "" };
  }

  if (normalizedType === "noun") {
    if (form === "singular") {
      return { example: "book", suffix: "" };
    } else if (form === "plural") {
      return { example: "books", suffix: "-s" };
    }
  } else if (normalizedType === "verb") {
    if (form === "base") {
      return { example: "walk", suffix: "" };
    } else if (form === "present-3rd") {
      return { example: "walks", suffix: "-s" };
    } else if (form === "past") {
      return { example: "walked", suffix: "-ed" };
    } else if (form === "past-participle") {
      return { example: "walked", suffix: "-ed" };
    } else if (form === "gerund") {
      return { example: "walking", suffix: "-ing" };
    }
  } else if (normalizedType === "adjective") {
    if (form === "base") {
      return { example: "big", suffix: "" };
    } else if (form === "comparative") {
      return { example: "bigger", suffix: "-er" };
    } else if (form === "superlative") {
      return { example: "biggest", suffix: "-est" };
    }
  }

  return { example: formatFormLabel(form), suffix: "" };
};

export const isWhitespaceOnly = (node) => {
  if (!node || node.nodeType !== Node.TEXT_NODE) return false;
  const text = node.textContent;
  return /^[\s\u200B\u200E]*$/.test(text);
};

export const findPreviousChip = (node) => {
  let current = node;
  while (current) {
    const prevSibling = current.previousSibling;
    if (!prevSibling) break;
    if (prevSibling.classList && prevSibling.classList.contains('dropped-tile')) {
      return prevSibling;
    }
    if (isWhitespaceOnly(prevSibling)) {
      current = prevSibling;
      continue;
    }
    break;
  }
  return null;
};
