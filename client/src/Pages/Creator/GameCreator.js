import React, { useEffect, useRef, useState, useCallback } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import axios from "../../axios";
import { setStory } from "../../store/actions/story";
import PageShell from "../../components/ui/PageShell";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import TextInput from "../../components/ui/TextInput";
import LogoutButton from "../../components/ui/LogoutButton";
import { autoLogout } from "../../store/actions/auth";

const GameCreator = () => {
  const [ownField, setOwnField] = useState("");
  const [blanks, setBlanks] = useState([
    "Adjective",
    "Thing",
    "Verb",
    "Adverb",
    "Person",
    "Place",
    "Emotion",
    "Color",
    "Number",
    "Size",
    "Time",
  ]);
  const [customChips, setCustomChips] = useState([]); // Array of custom chip words (only one chip per word)
  const titleRef = useRef("");
  const storyAreaRef = useRef(null);
  const pendingDropRangeRef = useRef(null); // Track the drop position during drag
  const [storySegments, setStorySegments] = useState([]); // Array of { type: 'text'|'placeholder', content: string, ...placeholderData }
  const [updatedStory, setUpdatedStory] = useState("");
  // activeDropdown removed - dropdown only exists for palette pills (chipDropdown)
  const [selectedForms, setSelectedForms] = useState({}); // { verb: "past", noun: "plural", adjective: "comparative" } or undefined for default
  const [chipDropdown, setChipDropdown] = useState(null); // { word, position: { top, left } }
  const chipDropdownRef = useRef(null);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { id } = useParams();

  const handleLogout = async () => {
    await dispatch(autoLogout());
    navigate("/login");
  };

  // Map display labels to internal types (for backward compatibility)
  const getInternalType = (displayLabel) => {
    // Map "Thing" (user-facing) to "NOUN" (internal)
    if (displayLabel === "Thing") return "NOUN";
    return displayLabel.toUpperCase();
  };

  // Normalize type for internal checks (handles both "Thing" and "Noun" -> "noun")
  const normalizeTypeForCheck = (type) => {
    const normalized = type.toLowerCase();
    // Map "thing" (from display label) to "noun" (internal)
    if (normalized === "thing") return "noun";
    return normalized;
  };

  // Handle dragstart for chips - set JSON payload
  const handleChipDragStart = (e, word, form, isCustom = false) => {
    e.stopPropagation();
    
    const normalizedType = getInternalType(word);
    const qualifier = form || "any";
    
    // Create label - use form label (e.g., "past", "gerund") NOT example words
    let label = word;
    if (form && form !== "any") {
      const formLabel = formatFormLabel(form);
      label = formLabel ? `${word} (${formLabel})` : word;
    }
    
    const payload = {
      kind: "placeholder",
      type: normalizedType,
      qualifier: qualifier,
      label: label,
      isCustom: isCustom // Track if this is a custom chip
    };
    
    e.dataTransfer.setData("application/json", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "copy";
  };

  // Form options for each type (excluding "any" - it's implicit/default)
  const getFormOptions = (type) => {
    const normalizedType = normalizeTypeForCheck(type);
    if (normalizedType === "noun") {
      return ["plural"]; // Only show plural (singular is implicit)
    } else if (normalizedType === "verb") {
      return ["past", "gerund", "future", "present-3rd"]; // Exclude "any", "base", "past-participle"
    } else if (normalizedType === "adjective") {
      return ["comparative", "superlative"]; // Exclude "any" and "base"
    } else if (normalizedType === "time") {
      return ["time-of-day", "date", "month-season", "year-era"];
    } else if (normalizedType === "person") {
      return ["specific-person", "type-of-person"];
    }
    return []; // Other types have no dropdown
  };

  // Get display label for dropdown options
  const getFormDisplayLabel = (form, type) => {
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
      } else if (form === "future") {
        return { label: "Future", example: "(will walk)" };
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
        return { label: "Specific person", example: "(Ana, Grandma, Leonard Cohen)" };
      } else if (form === "type-of-person") {
        return { label: "Type of person", example: "(bully, teacher, friend)" };
      }
    }
    
    return { label: form, example: "" };
  };

  const formatFormLabel = (form) => {
    if (form === "any") return "";
    
    // Custom labels for Time forms
    if (form === "time-of-day") return "Time of day";
    if (form === "month-season") return "Month / season";
    if (form === "year-era") return "Year / era";
    if (form === "date") return "Date";
    
    // Custom labels for Person forms
    if (form === "specific-person") return "Specific";
    if (form === "type-of-person") return "Type";
    
    return form.replace(/-/g, " ");
  };

  // Check if a word type supports form selection
  const supportsFormSelection = (word) => {
    const normalized = normalizeTypeForCheck(word);
    return normalized === "noun" || normalized === "verb" || normalized === "adjective" || normalized === "time" || normalized === "person";
  };

  // Handle caret click - show dropdown for Thing/Verb/Adjective/Time/Person
  const handleCaretClick = (e, word) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!supportsFormSelection(word)) {
      return;
    }

    // Get position of the caret icon (e.currentTarget is the caret span)
    const caretRect = e.currentTarget.getBoundingClientRect();
    // Find the container div with position: relative
    const container = e.currentTarget.closest('div[style*="position: relative"]');
    const containerRect = container?.getBoundingClientRect() || { top: 0, left: 0 };
    
    setChipDropdown({
      word: word,
      position: {
        top: caretRect.bottom - containerRect.top + 5,
        left: caretRect.left - containerRect.left
      }
    });
  };

  // Handle form selection from chip dropdown - updates the selected form for that category
  const handleChipFormSelect = (word, form) => {
    const normalizedWord = normalizeTypeForCheck(word);
    
    // Update selectedForms - if form is "any", remove the entry (default)
    if (form === "any") {
      setSelectedForms(prev => {
        const updated = { ...prev };
        delete updated[normalizedWord];
        return updated;
      });
    } else {
      setSelectedForms(prev => ({
        ...prev,
        [normalizedWord]: form
      }));
    }
    
    setChipDropdown(null);
  };

  // Get example word and suffix for each form
  const getFormExample = (form, type) => {
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
      } else if (form === "future") {
        return { example: "will walk", suffix: "" };
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


  /**
   * Drag-and-drop insertion implementation:
   * 
   * 1. getCaretPositionFromPoint: Uses document.caretRangeFromPoint (Safari/Chrome) 
   *    or document.caretPositionFromPoint (Firefox) to get the exact drop position
   *    from mouse coordinates. Falls back to elementFromPoint if APIs unavailable.
   * 
   * 2. handleDragOver: Computes caret range from mouse coordinates, stores it in
   *    pendingDropRangeRef, and shows a visual insertion caret indicator.
   * 
   * 3. handleDrop: Uses pendingDropRangeRef to insert chip directly into DOM at
   *    the exact caret position using range.insertNode(). Then syncs segments from DOM.
   * 
   * Manual test cases:
   * - Drop between "Of" and "lovers": chip inserts between words ✓
   * - Drop in middle of word: caret splits text node ✓
   * - Drop at beginning of line: chip inserts at start ✓
   * - After drop, typing continues right after chip ✓
   * - Backspace deletes chip cleanly ✓
   */
  
  // Helper to get caret position from mouse coordinates
  const getCaretPositionFromPoint = (x, y) => {
    if (!storyAreaRef.current) return null;
    
    const container = storyAreaRef.current;
    
    // Try modern API first (Safari, Chrome)
    if (document.caretRangeFromPoint) {
      try {
        const range = document.caretRangeFromPoint(x, y);
        // Ensure range is within our container
        if (range && container.contains(range.startContainer)) {
          return range;
        }
      } catch (e) {
        // Fallback if it fails
      }
    }
    
    // Try Firefox API
    if (document.caretPositionFromPoint) {
      try {
        const pos = document.caretPositionFromPoint(x, y);
        if (pos && container.contains(pos.offsetNode)) {
          const range = document.createRange();
          range.setStart(pos.offsetNode, pos.offset);
          range.setEnd(pos.offsetNode, pos.offset);
          return range;
        }
      } catch (e) {
        // Fallback if it fails
      }
    }
    
    // Fallback: find nearest text node and approximate position
    const element = document.elementFromPoint(x, y);
    if (!element) return null;
    
    if (!container.contains(element) && element !== container) return null;
    
    // Find the text node at this point
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let node;
    let lastTextNode = null;
    while ((node = walker.nextNode())) {
      const rect = node.getBoundingClientRect();
      if (rect && y >= rect.top && y <= rect.bottom) {
        lastTextNode = node;
        break;
      }
    }
    
    if (lastTextNode) {
      const range = document.createRange();
      // Approximate offset based on x position
      const rect = lastTextNode.getBoundingClientRect();
      const relativeX = x - rect.left;
      const textLength = lastTextNode.textContent.length || 1;
      const charWidth = rect.width / textLength;
      const offset = Math.min(
        Math.max(0, Math.round(relativeX / charWidth)),
        lastTextNode.textContent.length
      );
      range.setStart(lastTextNode, offset);
      range.setEnd(lastTextNode, offset);
      return range;
    }
    
    // Last resort: create range at end of container
    const range = document.createRange();
    range.selectNodeContents(container);
    range.collapse(false); // Collapse to end
    return range;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Remove insertion caret indicator
    const container = storyAreaRef.current;
    if (container) {
      container.classList.remove('drag-over');
      const indicator = container.querySelector('.drop-indicator');
      if (indicator) indicator.remove();
    }
    
    // Get JSON payload
    const jsonData = e.dataTransfer.getData("application/json");
    if (!jsonData) return;
    
    let payload;
    try {
      payload = JSON.parse(jsonData);
    } catch (err) {
      console.error("Failed to parse drag data:", err);
      return;
    }
    
    if (payload.kind !== "placeholder") return;
    
    if (!storyAreaRef.current) return;
    
    // Use pendingDropRangeRef if available, otherwise compute from mouse coordinates
    let dropRange = pendingDropRangeRef.current;
    if (!dropRange) {
      dropRange = getCaretPositionFromPoint(e.clientX, e.clientY);
    }
    
    if (!dropRange) {
      // Last resort fallback: append at end
      dropRange = document.createRange();
      dropRange.selectNodeContents(container);
      dropRange.collapse(false);
    }
    
    // Create placeholder chip element with all necessary data attributes
    const placeholderId = uuidv4();
    const isCustomAttr = payload.isCustom ? 'data-placeholder-custom="true"' : '';
    const chipHTML = `<span class="dropped-tile" data-placeholder-id="${placeholderId}" data-placeholder-type="${payload.type}" data-placeholder-qualifier="${payload.qualifier || 'any'}" data-placeholder-kind="${payload.kind}" ${isCustomAttr} contenteditable="false" style="color: #0081c9; font-weight: var(--font-weight-semibold); cursor: default; user-select: none; padding: 6px 18px 6px 10px; border-radius: 8px; background-color: rgba(0, 129, 201, 0.1); margin: 0 2px; display: inline-flex; align-items: center; vertical-align: baseline; white-space: nowrap; max-width: 100%; unicode-bidi: isolate; direction: ltr; position: relative;">
      ${payload.label}
      <button class="chip-delete-btn" data-placeholder-id="${placeholderId}" style="position: absolute; top: 2px; right: 4px; cursor: pointer; color: #f2a0a0; font-size: 12px; line-height: 12px; background: transparent; border: none; padding: 0; user-select: none; pointer-events: auto; font-weight: bold;">×</button>
    </span>`;
    
    // Create a temporary container to parse the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = chipHTML;
    const chipElement = tempDiv.firstElementChild;
    
    // Ensure range is collapsed (caret position, not selection)
    if (!dropRange.collapsed) {
      dropRange.collapse(true); // Collapse to start
    }
    
    // Set the selection to the drop range (for visual feedback)
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(dropRange);
    
    // Insert the chip directly into the DOM at the caret position
    // This will split text nodes automatically if needed
    dropRange.insertNode(chipElement);
    
    // Create a text node after the chip for cursor positioning (if it doesn't exist)
    let nextNode = chipElement.nextSibling;
    if (!nextNode || nextNode.nodeType !== Node.TEXT_NODE) {
      const textNode = document.createTextNode('\u200E');
      chipElement.parentNode.insertBefore(textNode, chipElement.nextSibling);
      nextNode = textNode;
    } else if (nextNode.textContent === '') {
      nextNode.textContent = '\u200E';
    }
    
    // Position cursor after the inserted chip
    const newRange = document.createRange();
    newRange.setStart(nextNode, 0);
    newRange.setEnd(nextNode, 0);
    selection.removeAllRanges();
    selection.addRange(newRange);
    container.focus();
    
    // If this is a custom chip, remove it from customChips
    if (payload.isCustom) {
      setCustomChips(prev => prev.filter(chip => chip !== payload.label));
    }
    
    // Sync segments from DOM (handleStoryInput will be called, but we need to ensure it runs)
    // Trigger input event to sync segments
    const inputEvent = new Event('input', { bubbles: true });
    container.dispatchEvent(inputEvent);
    
    // If this is a qualifier pill (Verb/Thing/Adjective/Time/Person) and not a custom chip, reset it to default
    if (!payload.isCustom) {
      const normalizedType = normalizeTypeForCheck(payload.type);
      if (normalizedType === "verb" || normalizedType === "noun" || normalizedType === "adjective" || normalizedType === "time" || normalizedType === "person") {
        // Reset the selected form for this category back to default
        setSelectedForms(prev => {
          const updated = { ...prev };
          delete updated[normalizedType];
          return updated;
        });
      }
    }
    
    // Clear pending range
    pendingDropRangeRef.current = null;
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    
    // Show visual insertion indicator
    const container = storyAreaRef.current;
    if (!container) return;
    
    container.classList.add('drag-over');
    
    // Get caret position from mouse coordinates and store in ref
    const dropRange = getCaretPositionFromPoint(e.clientX, e.clientY);
    if (dropRange) {
      pendingDropRangeRef.current = dropRange;
    }
    
    if (!dropRange) return;
    
    // Remove existing indicator
    const existingIndicator = container.querySelector('.drop-indicator');
    if (existingIndicator) existingIndicator.remove();
    
    // Create insertion caret indicator
    try {
      const rect = dropRange.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      // Create a visual indicator element
      const indicator = document.createElement('span');
      indicator.className = 'drop-indicator';
      indicator.style.cssText = `
        position: absolute;
        left: ${rect.left - containerRect.left}px;
        top: ${rect.top - containerRect.top}px;
        width: 2px;
        height: ${Math.max(rect.height || 20, 20)}px;
        background-color: #0081c9;
        pointer-events: none;
        z-index: 1000;
      `;
      
      // Insert indicator temporarily (will be removed on drop or dragleave)
      if (getComputedStyle(container).position === 'static') {
        container.style.position = 'relative';
      }
      container.appendChild(indicator);
    } catch (err) {
      // Silently fail if indicator creation fails
    }
  };

  const handleDragLeave = (e) => {
    // Only remove indicator if we're actually leaving the container
    const container = storyAreaRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    // Check if mouse is still within container bounds
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      container.classList.remove('drag-over');
      const indicator = container.querySelector('.drop-indicator');
      if (indicator) indicator.remove();
      pendingDropRangeRef.current = null;
    }
  };

  // Sync contentEditable DOM with segments
  useEffect(() => {
    if (!storyAreaRef.current) return;
    
    const container = storyAreaRef.current;
    const wasFocused = document.activeElement === container;
    
    // Save cursor position
    const selection = window.getSelection();
    let savedRange = null;
    if (wasFocused && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      // Try to save cursor position relative to content
      const startContainer = range.startContainer;
      const startOffset = range.startOffset;
      
      // Build a simple position marker
      let charPos = 0;
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
      let node;
      while ((node = walker.nextNode())) {
        if (node === startContainer) {
          if (node.nodeType === Node.TEXT_NODE) {
            charPos += startOffset;
          }
          break;
        }
        if (node.nodeType === Node.TEXT_NODE) {
          charPos += node.textContent.length;
        } else if (node.classList && node.classList.contains('dropped-tile')) {
          charPos += 1; // Count placeholder as 1 char
        }
      }
      
      savedRange = { charPos };
    }
    
    // Build new HTML from segments - use unicode-bidi: isolate to prevent direction issues
    let newHTML = '';
    storySegments.forEach((segment, index) => {
      if (segment.type === 'placeholder') {
        // Use unicode-bidi: isolate to prevent placeholder from affecting text direction
        // This isolates the bidirectional algorithm for the placeholder element
        const isCustomAttr = segment.isCustom ? 'data-placeholder-custom="true"' : '';
        // Story chips include a delete X button in the top-right corner
        // Styled as small inline pills that flow with text
        newHTML += `<span class="dropped-tile" data-placeholder-id="${segment.id}" ${isCustomAttr} contenteditable="false" style="color: #0081c9; font-weight: var(--font-weight-semibold); cursor: default; user-select: none; padding: 6px 18px 6px 10px; border-radius: 8px; background-color: rgba(0, 129, 201, 0.1); margin: 0 2px; display: inline-flex; align-items: center; vertical-align: baseline; white-space: nowrap; max-width: 100%; unicode-bidi: isolate; direction: ltr; position: relative;">
          ${segment.label}
          <button class="chip-delete-btn" data-placeholder-id="${segment.id}" style="position: absolute; top: 2px; right: 4px; cursor: pointer; color: #f2a0a0; font-size: 12px; line-height: 12px; background: transparent; border: none; padding: 0; user-select: none; pointer-events: auto; font-weight: bold;">×</button>
        </span>`;
      } else {
        // Escape HTML in text content
        const escaped = segment.content
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        newHTML += escaped;
      }
    });
    
    // Update DOM
    container.innerHTML = newHTML;
    
    // Ensure there's always a text node after each placeholder for cursor positioning
    // Also attach delete button handlers
    container.querySelectorAll('.dropped-tile').forEach(tile => {
      // Check if there's a text node immediately after
      let nextSibling = tile.nextSibling;
      if (!nextSibling || nextSibling.nodeType !== Node.TEXT_NODE) {
        // Create an empty text node after the placeholder
        // Use left-to-right mark (LRM) to ensure LTR direction
        const textNode = document.createTextNode('\u200E');
        tile.parentNode.insertBefore(textNode, tile.nextSibling);
      } else if (nextSibling.textContent === '') {
        // If empty text node exists, add LRM to ensure direction
        nextSibling.textContent = '\u200E';
      }
      
      // Story chips are "dumb" - they don't open dropdowns
      // Only allow cursor positioning by preventing default behavior
      tile.addEventListener('mousedown', (e) => {
        // Don't prevent default if clicking the delete button
        if (e.target.classList.contains('chip-delete-btn')) {
          return;
        }
        e.stopPropagation();
        // Allow the click to position the cursor, but don't open any dropdowns
      });
      
      // Attach delete button handler
      const deleteBtn = tile.querySelector('.chip-delete-btn');
      if (deleteBtn) {
        // Remove any existing handlers to avoid duplicates
        const newDeleteBtn = deleteBtn.cloneNode(true);
        deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);
        
        newDeleteBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          const placeholderId = newDeleteBtn.getAttribute('data-placeholder-id');
          if (placeholderId) {
            // Find the placeholder to check if it's custom
            const placeholderToRemove = storySegments.find(seg => 
              seg.type === 'placeholder' && seg.id === placeholderId
            );
            
            // Save the text node that comes after the placeholder (where cursor should be)
            const textNodeAfter = tile.nextSibling;
            
            // Remove placeholder from segments
            // Custom chips are single-use and should NOT be restored to the palette when deleted
            setStorySegments(prev => prev.filter(seg => 
              !(seg.type === 'placeholder' && seg.id === placeholderId)
            ));
            
            // Place cursor where placeholder was (after DOM updates)
            setTimeout(() => {
              if (!storyAreaRef.current) return;
              const container = storyAreaRef.current;
              const range = document.createRange();
              const selection = window.getSelection();
              
              // Try to use the text node that was after the placeholder
              if (textNodeAfter && textNodeAfter.nodeType === Node.TEXT_NODE && textNodeAfter.parentNode === container) {
                range.setStart(textNodeAfter, 0);
                range.setEnd(textNodeAfter, 0);
              } else {
                // Fallback: find the first text node in the container
                const walker = document.createTreeWalker(
                  container,
                  NodeFilter.SHOW_TEXT
                );
                const firstTextNode = walker.nextNode();
                if (firstTextNode) {
                  range.setStart(firstTextNode, 0);
                  range.setEnd(firstTextNode, 0);
                } else {
                  // No text node found, create one
                  const newTextNode = document.createTextNode('\u200E');
                  container.appendChild(newTextNode);
                  range.setStart(newTextNode, 0);
                  range.setEnd(newTextNode, 0);
                }
              }
              
              selection.removeAllRanges();
              selection.addRange(range);
              container.focus();
            }, 10);
          }
        });
      }
    });
    
      // Restore cursor position
      if (wasFocused && savedRange) {
        container.focus();
        
        // Restore cursor to approximate position
        let charCount = 0;
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
        let node;
        let targetNode = null;
        let targetOffset = 0;
        
        while ((node = walker.nextNode())) {
          if (node.nodeType === Node.TEXT_NODE) {
            const textLen = node.textContent.length;
            if (charCount + textLen >= savedRange.charPos) {
              targetNode = node;
              targetOffset = savedRange.charPos - charCount;
              break;
            }
            charCount += textLen;
          } else if (node.classList && node.classList.contains('dropped-tile')) {
            if (charCount + 1 >= savedRange.charPos) {
              // Place cursor after the placeholder (in the empty text node after it)
              const nextSibling = node.nextSibling;
              if (nextSibling && nextSibling.nodeType === Node.TEXT_NODE) {
                // Text node exists, place cursor at start
                targetNode = nextSibling;
                targetOffset = 0;
              } else {
                // No text node, create one with LRM and place cursor there
                const textNode = document.createTextNode('\u200E');
                node.parentNode.insertBefore(textNode, node.nextSibling);
                targetNode = textNode;
                targetOffset = 0;
              }
              break;
            }
            charCount += 1;
          }
        }
        
        if (targetNode) {
          try {
            const range = document.createRange();
            if (targetNode.nodeType === Node.TEXT_NODE) {
              range.setStart(targetNode, Math.min(targetOffset, targetNode.textContent.length));
              range.setEnd(targetNode, Math.min(targetOffset, targetNode.textContent.length));
            } else {
              range.setStart(targetNode, targetOffset);
              range.setEnd(targetNode, targetOffset);
            }
            selection.removeAllRanges();
            selection.addRange(range);
          } catch (e) {
            // Fallback: just focus
          }
        } else {
          // If no target found, place cursor at end
          const range = document.createRange();
          range.selectNodeContents(container);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
      
      // After drop, ensure cursor is placed after the newly inserted placeholder
      // Check if we just inserted a placeholder (by checking if segments changed)
      const justInsertedPlaceholder = storySegments.find(seg => 
        seg.type === 'placeholder' && 
        !container.querySelector(`[data-placeholder-id="${seg.id}"]`)
      );
      
      if (justInsertedPlaceholder) {
        setTimeout(() => {
          const placeholderElement = container.querySelector(`[data-placeholder-id="${justInsertedPlaceholder.id}"]`);
          if (placeholderElement) {
            const range = document.createRange();
            const selection = window.getSelection();
            
            // Place cursor in the empty text node after the placeholder
            let nextNode = placeholderElement.nextSibling;
            if (nextNode && nextNode.nodeType === Node.TEXT_NODE) {
              // Text node exists, place cursor at start
              range.setStart(nextNode, 0);
              range.setEnd(nextNode, 0);
            } else {
              // Create text node with LRM and place cursor there
              const textNode = document.createTextNode('\u200E');
              placeholderElement.parentNode.insertBefore(textNode, placeholderElement.nextSibling);
              range.setStart(textNode, 0);
              range.setEnd(textNode, 0);
            }
            
            selection.removeAllRanges();
            selection.addRange(range);
            container.focus();
          }
        }, 10);
      }
  }, [storySegments]);

  // Handle story input - parse contentEditable and update segments
  const handleStoryInput = (e) => {
    if (!storyAreaRef.current) return;
    
    // Get all child nodes
    const nodes = Array.from(storyAreaRef.current.childNodes);
    const newSegments = [];
    
    nodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        if (text) {
          // Merge with previous text segment if exists
          const lastSeg = newSegments[newSegments.length - 1];
          if (lastSeg && lastSeg.type === 'text') {
            lastSeg.content += text;
          } else {
            newSegments.push({ type: 'text', content: text });
          }
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // Check if it's a placeholder tile
        if (node.classList && node.classList.contains('dropped-tile')) {
          // Find the matching segment by data attribute or create from data attributes
          const placeholderId = node.getAttribute('data-placeholder-id');
          const isCustom = node.getAttribute('data-placeholder-custom') === 'true';
          const typeName = node.getAttribute('data-placeholder-type');
          const qualifier = node.getAttribute('data-placeholder-qualifier') || 'any';
          const kind = node.getAttribute('data-placeholder-kind') || 'placeholder';
          
          // Get label from text content (excluding delete button)
          const label = Array.from(node.childNodes)
            .filter(n => n.nodeType === Node.TEXT_NODE || (n.nodeType === Node.ELEMENT_NODE && !n.classList.contains('chip-delete-btn')))
            .map(n => n.textContent)
            .join('')
            .trim();
          
          const existingPlaceholder = placeholderId 
            ? storySegments.find(s => s.type === 'placeholder' && s.id === placeholderId)
            : null;
          
          if (existingPlaceholder) {
            // Preserve existing placeholder data
            newSegments.push({ ...existingPlaceholder, isCustom: isCustom || existingPlaceholder.isCustom });
          } else {
            // Create new placeholder from DOM data attributes (for chips inserted directly)
            newSegments.push({
              type: 'placeholder',
              id: placeholderId || uuidv4(),
              kind: kind,
              typeName: typeName || label.toUpperCase(),
              qualifier: qualifier,
              label: label || 'Placeholder',
              isCustom: isCustom
            });
          }
        } else {
          // Other element - get text content
          const text = node.textContent || node.innerText || '';
          if (text) {
            const lastSeg = newSegments[newSegments.length - 1];
            if (lastSeg && lastSeg.type === 'text') {
              lastSeg.content += text;
            } else {
              newSegments.push({ type: 'text', content: text });
            }
          }
        }
      }
    });
    
    // If no segments but there's content, create a text segment
    const allText = storyAreaRef.current.textContent || storyAreaRef.current.innerText || '';
    if (newSegments.length === 0 && allText.trim()) {
      newSegments.push({ 
        type: 'text', 
        content: allText 
      });
    }
    
    setStorySegments(newSegments);
  };

  // Handle paste to prevent breaking placeholders
  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  // Helper function to check if a text node contains only whitespace/ZWSP
  const isWhitespaceOnly = (node) => {
    if (node.nodeType !== Node.TEXT_NODE) return false;
    const text = node.textContent;
    // Check if text contains only whitespace, zero-width space, or left-to-right mark
    return /^[\s\u200B\u200E]*$/.test(text);
  };

  // Helper function to find the previous chip element, skipping whitespace-only text nodes
  const findPreviousChip = (node) => {
    let current = node;
    while (current) {
      const prevSibling = current.previousSibling;
      if (!prevSibling) break;
      
      // If previous sibling is a chip, return it
      if (prevSibling.classList && prevSibling.classList.contains('dropped-tile')) {
        return prevSibling;
      }
      
      // If previous sibling is a whitespace-only text node, skip it and check again
      if (isWhitespaceOnly(prevSibling)) {
        current = prevSibling;
        continue;
      }
      
      // Otherwise, no chip found
      break;
    }
    return null;
  };

  // Handle keyboard events (backspace/delete) to properly handle chips
  const handleKeyDown = (e) => {
    if (!storyAreaRef.current) return;
    
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    
    // Only handle collapsed selections (no highlighted range)
    if (!range.collapsed) return;
    
    if (e.key === 'Backspace') {
      const startContainer = range.startContainer;
      const startOffset = range.startOffset;
      
      // If cursor is inside a text node and offset > 0, let normal Backspace happen
      if (startContainer.nodeType === Node.TEXT_NODE && startOffset > 0) {
        return; // Normal text deletion
      }
      
      // If offset === 0, check what's immediately before the caret
      if (startOffset === 0) {
        let targetPlaceholder = null;
        
        if (startContainer.nodeType === Node.TEXT_NODE) {
          // Check previous sibling, skipping whitespace-only text nodes
          targetPlaceholder = findPreviousChip(startContainer);
        } else if (startContainer.nodeType === Node.ELEMENT_NODE) {
          // Cursor is in an element node, check previous sibling
          const prevSibling = startContainer.previousSibling;
          if (prevSibling && prevSibling.classList && prevSibling.classList.contains('dropped-tile')) {
            targetPlaceholder = prevSibling;
          } else if (isWhitespaceOnly(prevSibling)) {
            // Skip whitespace and check again
            targetPlaceholder = findPreviousChip(prevSibling);
          }
        }
        
        if (targetPlaceholder) {
          e.preventDefault();
          e.stopPropagation();
          const placeholderId = targetPlaceholder.getAttribute('data-placeholder-id');
          if (placeholderId) {
            // Find the placeholder to check if it's custom
            const placeholderToRemove = storySegments.find(seg => 
              seg.type === 'placeholder' && seg.id === placeholderId
            );
            
            // Save the text node that comes after the placeholder (where cursor should be)
            const textNodeAfter = targetPlaceholder.nextSibling;
            
            // Remove placeholder from segments
            // Custom chips are single-use and should NOT be restored to the palette when deleted
            setStorySegments(prev => prev.filter(seg => 
              !(seg.type === 'placeholder' && seg.id === placeholderId)
            ));
            
            // Place cursor where placeholder was (after DOM updates)
            setTimeout(() => {
              if (!storyAreaRef.current) return;
              const container = storyAreaRef.current;
              const range = document.createRange();
              const selection = window.getSelection();
              
              // Try to use the text node that was after the placeholder
              if (textNodeAfter && textNodeAfter.nodeType === Node.TEXT_NODE && textNodeAfter.parentNode === container) {
                range.setStart(textNodeAfter, 0);
                range.setEnd(textNodeAfter, 0);
              } else {
                // Fallback: find the first text node in the container
                const walker = document.createTreeWalker(
                  container,
                  NodeFilter.SHOW_TEXT
                );
                const firstTextNode = walker.nextNode();
                if (firstTextNode) {
                  range.setStart(firstTextNode, 0);
                  range.setEnd(firstTextNode, 0);
                } else {
                  // No text node found, create one
                  const newTextNode = document.createTextNode('\u200E');
                  container.appendChild(newTextNode);
                  range.setStart(newTextNode, 0);
                  range.setEnd(newTextNode, 0);
                }
              }
              
              selection.removeAllRanges();
              selection.addRange(range);
              container.focus();
            }, 10);
          }
        }
      }
    } else if (e.key === 'Delete') {
      // Handle Delete key (for completeness, but focus is on Backspace)
      const startContainer = range.startContainer;
      const startOffset = range.startOffset;
      
      // If cursor is inside a text node and not at the end, let normal Delete happen
      if (startContainer.nodeType === Node.TEXT_NODE && startOffset < startContainer.textContent.length) {
        return; // Normal text deletion
      }
      
      // Check if next sibling is a chip
      if (startContainer.nodeType === Node.TEXT_NODE && startOffset === startContainer.textContent.length) {
        const nextSibling = startContainer.nextSibling;
        if (nextSibling && nextSibling.classList && nextSibling.classList.contains('dropped-tile')) {
          e.preventDefault();
          e.stopPropagation();
          const placeholderId = nextSibling.getAttribute('data-placeholder-id');
          if (placeholderId) {
            const placeholderToRemove = storySegments.find(seg => 
              seg.type === 'placeholder' && seg.id === placeholderId
            );
            
            // Remove placeholder from segments
            // Custom chips are single-use and should NOT be restored to the palette when deleted
            setStorySegments(prev => prev.filter(seg => 
              !(seg.type === 'placeholder' && seg.id === placeholderId)
            ));
            
            // Place cursor where it was (before the deleted chip)
            setTimeout(() => {
              if (!storyAreaRef.current) return;
              const container = storyAreaRef.current;
              const range = document.createRange();
              const selection = window.getSelection();
              
              if (startContainer.parentNode === container) {
                range.setStart(startContainer, startContainer.textContent.length);
                range.setEnd(startContainer, startContainer.textContent.length);
              } else {
                const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
                const firstTextNode = walker.nextNode();
                if (firstTextNode) {
                  range.setStart(firstTextNode, 0);
                  range.setEnd(firstTextNode, 0);
                }
              }
              
              selection.removeAllRanges();
              selection.addRange(range);
              container.focus();
            }, 10);
          }
        }
      }
    }
  };


  // Close dropdown when clicking outside (only for palette pills)
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (chipDropdown && chipDropdownRef.current && !chipDropdownRef.current.contains(e.target)) {
        // Close dropdown if clicking outside (caret click is handled by stopPropagation)
        setChipDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [chipDropdown]);

  const addWord = (e) => {
    e.preventDefault();
    if (!ownField.trim()) return;
    const customWord = ownField.charAt(0).toUpperCase() + ownField.slice(1);
    
    // Only add if it doesn't already exist in customChips
    setCustomChips(prev => {
      if (prev.includes(customWord)) {
        return prev; // Already exists, don't add duplicate
      }
      return [...prev, customWord];
    });
    
    setOwnField("");
  };

  const viewStory = () => {
    // Convert segments array to the format expected by the preview
    const result = [];
    
    storySegments.forEach(segment => {
      if (segment.type === 'placeholder') {
        result.push({
          tag: "span",
          className: "filled-word",
          text: segment.label || segment.typeName, // Use display label (e.g., "Thing") instead of internal type (e.g., "NOUN")
          form: segment.qualifier,
        });
      } else {
        // Text segment - check for inline blanks and convert to chips
        const text = segment.content;
        const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const sortedBlanks = [...blanks].sort((a, b) => b.length - a.length);
        const blankPatterns = sortedBlanks.map(blank => escapeRegex(blank));
        const regex = new RegExp(`\\b(${blankPatterns.join('|')})\\b`, 'g');
        
        let lastIndex = 0;
        let match;
        regex.lastIndex = 0;
        
        while ((match = regex.exec(text)) !== null) {
          if (match.index > lastIndex) {
            result.push(text.substring(lastIndex, match.index));
          }
          result.push({
            tag: "span",
            className: "filled-word",
            text: match[1],
          });
          lastIndex = regex.lastIndex;
        }
        
        if (lastIndex < text.length) {
          result.push(text.substring(lastIndex));
        }
      }
    });
    
    console.log(result);
    setUpdatedStory(result);
  };

  const createStory = async () => {
    if (!titleRef.current.value) {
      alert("Enter a title");
      return;
    }
    const token = localStorage.getItem("userToken");
    const headers = {
      "Content-Type": "application/json",
    };
    
    // Only include authorization header if token exists
    if (token) {
      headers.authorization = token;
    }
    
    const response = await axios.put(
      `/story/update/${id}`,
      {
        title: titleRef.current.value,
        story: updatedStory,
      },
      {
        headers,
      }
    );
    dispatch(setStory(response.data.story));
    navigate(`/created-game/${id}`);
  };

  const token = localStorage.getItem("userToken");

  return (
    <PageShell wide>
      {token && <LogoutButton onClick={handleLogout} />}
      <Card wide>
        <h1 className="ui-heading">Create Your Story</h1>
        
        <TextInput
          inputRef={titleRef}
          type="text"
          placeholder="Enter story title"
          label="Title"
          required
        />
        
        <div className="ui-input-group" style={{ position: 'relative' }}>
          <label className="ui-input-label">Story</label>
          <div
            ref={storyAreaRef}
            contentEditable
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onInput={handleStoryInput}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            className="ui-input"
            style={{
              minHeight: '200px',
              padding: 'var(--spacing-md)',
              border: 'var(--border-width) solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              outline: 'none',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              fontSize: '16px',
              lineHeight: '1.5',
              fontFamily: 'inherit',
              color: 'var(--text-primary)',
              backgroundColor: 'var(--color-secondary)',
              transition: 'all var(--transition-base)',
              cursor: 'text',
              direction: 'ltr',
              textAlign: 'left'
            }}
            data-placeholder="Type your story here. Drag word categories to add placeholders."
          >
          </div>
          <style>{`
            [contenteditable][data-placeholder]:empty:before {
              content: attr(data-placeholder);
              color: var(--text-secondary);
              pointer-events: none;
            }
            [contenteditable]:focus {
              border-color: var(--color-primary);
              box-shadow: 0 0 0 3px rgba(243, 129, 0, 0.1);
            }
            [contenteditable].drag-over {
              border-color: #0081c9;
              background-color: rgba(0, 129, 201, 0.05);
            }
            [contenteditable] .drop-indicator {
              position: absolute;
              width: 2px;
              background-color: #0081c9;
              pointer-events: none;
              z-index: 1000;
              animation: blink 1s infinite;
            }
            @keyframes blink {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.3; }
            }
            [contenteditable] .dropped-tile {
              color: #0081c9;
              font-weight: var(--font-weight-semibold);
              cursor: default;
              user-select: none;
              display: inline-flex !important;
              align-items: center !important;
              vertical-align: baseline !important;
              white-space: nowrap !important;
              max-width: 100% !important;
              position: relative !important;
            }
            [contenteditable] .dropped-tile:hover {
              background-color: rgba(0, 129, 201, 0.15);
            }
            [contenteditable] .dropped-tile .chip-delete-btn {
              opacity: 0.7;
              transition: opacity 0.2s, color 0.2s;
            }
            [contenteditable] .dropped-tile:hover .chip-delete-btn {
              opacity: 1;
            }
            [contenteditable] .dropped-tile .chip-delete-btn:hover {
              opacity: 1;
              color: #ff4444;
            }
          `}</style>
        </div>

        <div>
          <label className="ui-input-label">Word Categories</label>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--spacing-md)',
            marginTop: 'var(--spacing-sm)',
            position: 'relative'
          }}>
            {blanks.map((word, index) => {
              const isConfigurable = supportsFormSelection(word);
              const normalizedWord = normalizeTypeForCheck(word);
              const selectedForm = selectedForms[normalizedWord];
              
              // Build label - show form if selected, otherwise just the word
              let chipLabel = word;
              if (selectedForm && selectedForm !== "any") {
                const formLabel = formatFormLabel(selectedForm);
                chipLabel = formLabel ? `${word} (${formLabel})` : word;
              }
              
              return (
                <span
                  key={`base-${index}`}
                  draggable={true}
                  data-chip-word={word}
                  data-chip-form={selectedForm || "any"}
                  style={{
                    backgroundColor: selectedForm && selectedForm !== "any" ? '#0081c9' : '#1f2937',
                    color: '#ffffff',
                    padding: 'var(--spacing-md) var(--spacing-lg)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'grab',
                    fontSize: '16px',
                    fontWeight: 'var(--font-weight-semibold)',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    MozUserSelect: 'none',
                    msUserSelect: 'none',
                    transition: 'background-color var(--transition-fast)',
                    pointerEvents: 'auto',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-xs)'
                  }}
                  onDragStart={(e) => {
                    handleChipDragStart(e, word, selectedForm || "any");
                  }}
                >
                  <span>{chipLabel}</span>
                  {isConfigurable && (
                    <span
                      onClick={(e) => handleCaretClick(e, word)}
                      style={{
                        cursor: 'pointer',
                        fontSize: '12px',
                        padding: '2px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        lineHeight: 1
                      }}
                    >
                      ▼
                    </span>
                  )}
                </span>
              );
            })}
            {/* Render custom chips */}
            {customChips.map((customWord) => (
              <span
                key={`custom-${customWord}`}
                draggable={true}
                data-chip-word={customWord}
                data-chip-form="any"
                data-chip-custom="true"
                style={{
                  backgroundColor: '#1f2937',
                  color: '#ffffff',
                  padding: 'var(--spacing-md) var(--spacing-lg)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'grab',
                  fontSize: '16px',
                  fontWeight: 'var(--font-weight-semibold)',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  MozUserSelect: 'none',
                  msUserSelect: 'none',
                  transition: 'background-color var(--transition-fast)',
                  pointerEvents: 'auto'
                }}
                onDragStart={(e) => {
                  handleChipDragStart(e, customWord, "any", true);
                }}
              >
                {customWord}
              </span>
            ))}
            {/* Chip Form Selection Dropdown */}
            {chipDropdown && (() => {
              const normalizedWord = normalizeTypeForCheck(chipDropdown.word);
              const currentForm = selectedForms[normalizedWord] || "any";
              const hasNonDefaultForm = currentForm !== "any";
              
              return (
                <div
                  ref={chipDropdownRef}
                  style={{
                    position: 'absolute',
                    top: `${chipDropdown.position.top}px`,
                    left: `${chipDropdown.position.left}px`,
                    backgroundColor: 'white',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    zIndex: 1000,
                    minWidth: '150px',
                    padding: 'var(--spacing-sm)',
                    marginTop: '4px'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {getFormOptions(chipDropdown.word).map((form) => {
                    const { label, example } = getFormDisplayLabel(form, chipDropdown.word);
                    return (
                      <div
                        key={form}
                        onClick={() => handleChipFormSelect(chipDropdown.word, form)}
                        style={{
                          padding: 'var(--spacing-sm) var(--spacing-md)',
                          cursor: 'pointer',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '14px',
                          color: 'var(--text-primary)',
                          transition: 'background-color var(--transition-fast)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--color-secondary)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <span style={{ fontWeight: 'var(--font-weight-medium)' }}>{label}</span>
                        {example && (
                          <span style={{ 
                            fontSize: '12px', 
                            color: 'var(--text-secondary)',
                            opacity: 0.8
                          }}>
                            {example}
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {hasNonDefaultForm && (
                    <>
                      <div style={{
                        height: '1px',
                        backgroundColor: 'var(--border-color)',
                        margin: 'var(--spacing-xs) 0'
                      }} />
                      <div
                        onClick={() => handleChipFormSelect(chipDropdown.word, "any")}
                        style={{
                          padding: 'var(--spacing-sm) var(--spacing-md)',
                          cursor: 'pointer',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '13px',
                          color: 'var(--text-secondary)',
                          transition: 'background-color var(--transition-fast)',
                          fontStyle: 'italic'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--color-secondary)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        Reset to default
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
            <form
              onSubmit={addWord}
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#1f2937',
                padding: 'var(--spacing-md) var(--spacing-lg)',
                borderRadius: 'var(--radius-md)',
                gap: 'var(--spacing-sm)'
              }}
            >
              <input
                value={ownField}
                onChange={(e) => setOwnField(e.target.value)}
                type="text"
                placeholder="Fill in your own"
                style={{
                  outline: 'none',
                  color: '#ffffff',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid #ffffff',
                  fontSize: '16px',
                  fontWeight: 'var(--font-weight-semibold)',
                  width: '150px'
                }}
              />
              <button
                type="submit"
                style={{
                  display: 'none'
                }}
              />
            </form>
          </div>
        </div>

        <Button onClick={viewStory} disabled={storySegments.length === 0}>
          View my story!
        </Button>

        {updatedStory && (
          <Card style={{ marginTop: 'var(--spacing-lg)', backgroundColor: '#f9fafb' }}>
            <h2 className="ui-heading ui-heading--small">Story Preview</h2>
            <div style={{
              fontSize: '18px',
              lineHeight: '1.8',
              color: 'var(--text-primary)',
              padding: 'var(--spacing-lg)',
              backgroundColor: 'var(--color-secondary)',
              borderRadius: 'var(--radius-md)',
              minHeight: '100px',
              textAlign: 'center'
            }}>
              {updatedStory.map((word, index) => {
                if (typeof word === "object" && word.className) {
                  return (
                    <span key={index} className={word.className}>
                      {word.text}
                    </span>
                  );
                }
                return <span key={index}>{word}</span>;
              })}
            </div>
            <Button onClick={createStory}>
              Create my story!
            </Button>
          </Card>
        )}
      </Card>
    </PageShell>
  );
};

export default GameCreator;
