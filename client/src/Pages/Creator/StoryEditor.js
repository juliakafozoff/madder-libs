import React, { useEffect, useRef, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { normalizeQualifier, normalizeTypeForCheck, isWhitespaceOnly, findPreviousChip } from "./placeholderUtils";

const StoryEditor = ({
  storyAreaRef,
  storySegments,
  setStorySegments,
  setCustomChips,
  setSelectedForms,
}) => {
  const pendingDropRangeRef = useRef(null);
  const draggingChipRef = useRef(null);

  const getCaretPositionFromPoint = (x, y) => {
    if (!storyAreaRef.current) return null;
    const container = storyAreaRef.current;

    if (document.caretRangeFromPoint) {
      try {
        const range = document.caretRangeFromPoint(x, y);
        if (range && container.contains(range.startContainer)) {
          return range;
        }
      } catch (e) {}
    }

    if (document.caretPositionFromPoint) {
      try {
        const pos = document.caretPositionFromPoint(x, y);
        if (pos && container.contains(pos.offsetNode)) {
          const range = document.createRange();
          range.setStart(pos.offsetNode, pos.offset);
          range.setEnd(pos.offsetNode, pos.offset);
          return range;
        }
      } catch (e) {}
    }

    const element = document.elementFromPoint(x, y);
    if (!element) return null;
    if (!container.contains(element) && element !== container) return null;

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
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

    const range = document.createRange();
    range.selectNodeContents(container);
    range.collapse(false);
    return range;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const container = storyAreaRef.current;
    if (container) {
      container.classList.remove('drag-over');
      const indicator = container.querySelector('.drop-indicator');
      if (indicator) indicator.remove();
    }

    if (!storyAreaRef.current) return;

    const chipMoveData = e.dataTransfer.getData("text/plain");
    const isChipMove = chipMoveData && chipMoveData.startsWith("chip:");

    if (isChipMove) {
      const chipId = chipMoveData.replace("chip:", "");
      if (!draggingChipRef.current || draggingChipRef.current.id !== chipId) {
        draggingChipRef.current = null;
        return;
      }

      const chipElement = container.querySelector(`[data-placeholder-id="${chipId}"]`);
      if (!chipElement) {
        draggingChipRef.current = null;
        return;
      }

      let dropRange = pendingDropRangeRef.current;
      if (!dropRange) {
        dropRange = getCaretPositionFromPoint(e.clientX, e.clientY);
      }
      if (!dropRange) {
        dropRange = document.createRange();
        dropRange.selectNodeContents(container);
        dropRange.collapse(false);
      }
      if (!dropRange.collapsed) {
        dropRange.collapse(true);
      }

      if (dropRange.startContainer === chipElement || chipElement.contains(dropRange.startContainer)) {
        draggingChipRef.current = null;
        return;
      }

      const chipClone = chipElement.cloneNode(true);
      chipElement.remove();

      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(dropRange);
      dropRange.insertNode(chipClone);

      let nextNode = chipClone.nextSibling;
      if (!nextNode || nextNode.nodeType !== Node.TEXT_NODE) {
        const textNode = document.createTextNode('\u200E');
        chipClone.parentNode.insertBefore(textNode, chipClone.nextSibling);
        nextNode = textNode;
      } else if (nextNode.textContent === '') {
        nextNode.textContent = '\u200E';
      }

      const newRange = document.createRange();
      newRange.setStart(nextNode, 0);
      newRange.setEnd(nextNode, 0);
      selection.removeAllRanges();
      selection.addRange(newRange);
      container.focus();

      const inputEvent = new Event('input', { bubbles: true });
      container.dispatchEvent(inputEvent);

      draggingChipRef.current = null;
      pendingDropRangeRef.current = null;
      return;
    }

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

    let dropRange = pendingDropRangeRef.current;
    if (!dropRange) {
      dropRange = getCaretPositionFromPoint(e.clientX, e.clientY);
    }
    if (!dropRange) {
      dropRange = document.createRange();
      dropRange.selectNodeContents(container);
      dropRange.collapse(false);
    }

    const placeholderId = uuidv4();
    const isCustomAttr = payload.isCustom ? 'data-placeholder-custom="true"' : '';
    const chipHTML = `<span class="dropped-tile" data-placeholder-id="${placeholderId}" data-placeholder-type="${payload.type}" data-placeholder-qualifier="${payload.qualifier || 'any'}" data-placeholder-kind="${payload.kind}" ${isCustomAttr} contenteditable="false" style="color: #0081c9; font-weight: var(--font-weight-semibold); cursor: default; user-select: none; padding: 6px 18px 6px 10px; border-radius: 8px; background-color: rgba(0, 129, 201, 0.1); margin: 0 2px; display: inline-flex; align-items: center; vertical-align: baseline; white-space: nowrap; max-width: 100%; unicode-bidi: isolate; direction: ltr; position: relative;">
      ${payload.label}
      <button class="chip-delete-btn" data-placeholder-id="${placeholderId}" style="position: absolute; top: 2px; right: 4px; cursor: pointer; color: #f2a0a0; font-size: 12px; line-height: 12px; background: transparent; border: none; padding: 0; user-select: none; pointer-events: auto; font-weight: bold;">×</button>
    </span>`;

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = chipHTML;
    const chipElement = tempDiv.firstElementChild;

    if (!dropRange.collapsed) {
      dropRange.collapse(true);
    }

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(dropRange);
    dropRange.insertNode(chipElement);

    let nextNode = chipElement.nextSibling;
    if (!nextNode || nextNode.nodeType !== Node.TEXT_NODE) {
      const textNode = document.createTextNode('\u200E');
      chipElement.parentNode.insertBefore(textNode, chipElement.nextSibling);
      nextNode = textNode;
    } else if (nextNode.textContent === '') {
      nextNode.textContent = '\u200E';
    }

    const newRange = document.createRange();
    newRange.setStart(nextNode, 0);
    newRange.setEnd(nextNode, 0);
    selection.removeAllRanges();
    selection.addRange(newRange);
    container.focus();

    if (payload.isCustom) {
      setCustomChips(prev => prev.filter(chip => chip !== payload.label));
    }

    const inputEvent = new Event('input', { bubbles: true });
    container.dispatchEvent(inputEvent);

    if (!payload.isCustom) {
      const normalizedType = normalizeTypeForCheck(payload.type);
      if (normalizedType === "verb" || normalizedType === "noun" || normalizedType === "adjective" || normalizedType === "time" || normalizedType === "person") {
        setSelectedForms(prev => {
          const updated = { ...prev };
          delete updated[normalizedType];
          return updated;
        });
      }
    }

    pendingDropRangeRef.current = null;
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const chipMoveData = e.dataTransfer.getData("text/plain");
    const isChipMove = chipMoveData && chipMoveData.startsWith("chip:");
    e.dataTransfer.dropEffect = isChipMove ? "move" : "copy";

    const container = storyAreaRef.current;
    if (!container) return;
    container.classList.add('drag-over');

    const dropRange = getCaretPositionFromPoint(e.clientX, e.clientY);
    if (dropRange) {
      pendingDropRangeRef.current = dropRange;
    }
    if (!dropRange) return;

    const existingIndicator = container.querySelector('.drop-indicator');
    if (existingIndicator) existingIndicator.remove();

    try {
      const rect = dropRange.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
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
        animation: blink 1s infinite;
      `;
      if (getComputedStyle(container).position === 'static') {
        container.style.position = 'relative';
      }
      container.appendChild(indicator);
    } catch (err) {}
  };

  const handleDragEnd = (e) => {
    if (!draggingChipRef.current) {
      const container = storyAreaRef.current;
      if (container) {
        container.classList.remove('drag-over');
        const indicator = container.querySelector('.drop-indicator');
        if (indicator) indicator.remove();
      }
      pendingDropRangeRef.current = null;
      return;
    }

    const container = storyAreaRef.current;
    if (!container) {
      draggingChipRef.current = null;
      return;
    }

    const inputEvent = new Event('input', { bubbles: true });
    container.dispatchEvent(inputEvent);

    draggingChipRef.current = null;
    pendingDropRangeRef.current = null;
    container.classList.remove('drag-over');
    const indicator = container.querySelector('.drop-indicator');
    if (indicator) indicator.remove();
  };

  const handleDragLeave = (e) => {
    const container = storyAreaRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
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

    const selection = window.getSelection();
    let savedRange = null;
    if (wasFocused && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const startContainer = range.startContainer;
      const startOffset = range.startOffset;

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
          charPos += 1;
        }
      }
      savedRange = { charPos };
    }

    let newHTML = '';
    storySegments.forEach((segment) => {
      if (segment.type === 'placeholder') {
        const isCustomAttr = segment.isCustom ? 'data-placeholder-custom="true"' : '';
        newHTML += `<span class="dropped-tile" data-placeholder-id="${segment.id}" ${isCustomAttr} contenteditable="false" style="color: #0081c9; font-weight: var(--font-weight-semibold); cursor: default; user-select: none; padding: 6px 18px 6px 10px; border-radius: 8px; background-color: rgba(0, 129, 201, 0.1); margin: 0 2px; display: inline-flex; align-items: center; vertical-align: baseline; white-space: nowrap; max-width: 100%; unicode-bidi: isolate; direction: ltr; position: relative;">
          ${segment.label}
          <button class="chip-delete-btn" data-placeholder-id="${segment.id}" style="position: absolute; top: 2px; right: 4px; cursor: pointer; color: #f2a0a0; font-size: 12px; line-height: 12px; background: transparent; border: none; padding: 0; user-select: none; pointer-events: auto; font-weight: bold;">×</button>
        </span>`;
      } else {
        const escaped = segment.content
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        newHTML += escaped;
      }
    });

    container.innerHTML = newHTML;

    container.querySelectorAll('.dropped-tile').forEach(tile => {
      let nextSibling = tile.nextSibling;
      if (!nextSibling || nextSibling.nodeType !== Node.TEXT_NODE) {
        const textNode = document.createTextNode('\u200E');
        tile.parentNode.insertBefore(textNode, tile.nextSibling);
      } else if (nextSibling.textContent === '') {
        nextSibling.textContent = '\u200E';
      }

      tile.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('chip-delete-btn')) return;
        e.stopPropagation();
      });

      tile.setAttribute('draggable', 'true');

      const handleChipDragStartInner = (e) => {
        if (e.target.classList.contains('chip-delete-btn')) {
          e.preventDefault();
          return;
        }
        const chipId = tile.getAttribute('data-placeholder-id');
        if (!chipId) return;
        const segmentIndex = storySegments.findIndex(seg =>
          seg.type === 'placeholder' && seg.id === chipId
        );
        draggingChipRef.current = {
          id: chipId,
          originalIndex: segmentIndex,
          originalElement: tile
        };
        e.dataTransfer.setData("text/plain", `chip:${chipId}`);
        e.dataTransfer.effectAllowed = "move";
        tile.style.opacity = '0.5';
      };

      const handleChipDragEndInner = (e) => {
        const chipId = tile.getAttribute('data-placeholder-id');
        if (chipId) {
          const currentChip = container.querySelector(`[data-placeholder-id="${chipId}"]`);
          if (currentChip) currentChip.style.opacity = '1';
        }
      };

      tile.removeEventListener('dragstart', handleChipDragStartInner);
      tile.removeEventListener('dragend', handleChipDragEndInner);
      tile.addEventListener('dragstart', handleChipDragStartInner);
      tile.addEventListener('dragend', handleChipDragEndInner);

      const deleteBtn = tile.querySelector('.chip-delete-btn');
      if (deleteBtn) {
        const newDeleteBtn = deleteBtn.cloneNode(true);
        deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);

        newDeleteBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const placeholderId = newDeleteBtn.getAttribute('data-placeholder-id');
          if (placeholderId) {
            const textNodeAfter = tile.nextSibling;
            setStorySegments(prev => prev.filter(seg =>
              !(seg.type === 'placeholder' && seg.id === placeholderId)
            ));
            setTimeout(() => {
              if (!storyAreaRef.current) return;
              const c = storyAreaRef.current;
              const r = document.createRange();
              const s = window.getSelection();
              if (textNodeAfter && textNodeAfter.nodeType === Node.TEXT_NODE && textNodeAfter.parentNode === c) {
                r.setStart(textNodeAfter, 0);
                r.setEnd(textNodeAfter, 0);
              } else {
                const w = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
                const firstTextNode = w.nextNode();
                if (firstTextNode) {
                  r.setStart(firstTextNode, 0);
                  r.setEnd(firstTextNode, 0);
                } else {
                  const newTextNode = document.createTextNode('\u200E');
                  c.appendChild(newTextNode);
                  r.setStart(newTextNode, 0);
                  r.setEnd(newTextNode, 0);
                }
              }
              s.removeAllRanges();
              s.addRange(r);
              c.focus();
            }, 10);
          }
        });
      }
    });

    if (wasFocused && savedRange) {
      container.focus();
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
            const ns = node.nextSibling;
            if (ns && ns.nodeType === Node.TEXT_NODE) {
              targetNode = ns;
              targetOffset = 0;
            } else {
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
        } catch (e) {}
      } else {
        const range = document.createRange();
        range.selectNodeContents(container);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }

    const justInsertedPlaceholder = storySegments.find(seg =>
      seg.type === 'placeholder' &&
      !container.querySelector(`[data-placeholder-id="${seg.id}"]`)
    );

    if (justInsertedPlaceholder) {
      setTimeout(() => {
        const placeholderElement = container.querySelector(`[data-placeholder-id="${justInsertedPlaceholder.id}"]`);
        if (placeholderElement) {
          const range = document.createRange();
          const sel = window.getSelection();
          let nn = placeholderElement.nextSibling;
          if (nn && nn.nodeType === Node.TEXT_NODE) {
            range.setStart(nn, 0);
            range.setEnd(nn, 0);
          } else {
            const textNode = document.createTextNode('\u200E');
            placeholderElement.parentNode.insertBefore(textNode, placeholderElement.nextSibling);
            range.setStart(textNode, 0);
            range.setEnd(textNode, 0);
          }
          sel.removeAllRanges();
          sel.addRange(range);
          container.focus();
        }
      }, 10);
    }
  }, [storySegments]);

  const handleStoryInput = (e) => {
    if (!storyAreaRef.current) return;
    const nodes = Array.from(storyAreaRef.current.childNodes);
    const newSegments = [];

    nodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        if (text) {
          const lastSeg = newSegments[newSegments.length - 1];
          if (lastSeg && lastSeg.type === 'text') {
            lastSeg.content += text;
          } else {
            newSegments.push({ type: 'text', content: text });
          }
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.classList && node.classList.contains('dropped-tile')) {
          const placeholderId = node.getAttribute('data-placeholder-id');
          const isCustom = node.getAttribute('data-placeholder-custom') === 'true';
          const typeName = node.getAttribute('data-placeholder-type');
          const rawQualifier = node.getAttribute('data-placeholder-qualifier') || 'any';
          const qualifier = normalizeQualifier(rawQualifier, typeName);
          const kind = node.getAttribute('data-placeholder-kind') || 'placeholder';
          const label = Array.from(node.childNodes)
            .filter(n => n.nodeType === Node.TEXT_NODE || (n.nodeType === Node.ELEMENT_NODE && !n.classList.contains('chip-delete-btn')))
            .map(n => n.textContent)
            .join('')
            .trim();

          const existingPlaceholder = placeholderId
            ? storySegments.find(s => s.type === 'placeholder' && s.id === placeholderId)
            : null;

          if (existingPlaceholder) {
            const normalizedQualifier = normalizeQualifier(existingPlaceholder.qualifier, existingPlaceholder.typeName);
            newSegments.push({
              ...existingPlaceholder,
              qualifier: normalizedQualifier,
              isCustom: isCustom || existingPlaceholder.isCustom
            });
          } else {
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

    const allText = storyAreaRef.current.textContent || storyAreaRef.current.innerText || '';
    if (newSegments.length === 0 && allText.trim()) {
      newSegments.push({ type: 'text', content: allText });
    }

    setStorySegments(newSegments);
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  const handleKeyDown = (e) => {
    if (!storyAreaRef.current) return;
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!range.collapsed) return;

    if (e.key === 'Backspace') {
      const startContainer = range.startContainer;
      const startOffset = range.startOffset;

      if (startContainer.nodeType === Node.TEXT_NODE && startOffset > 0) return;

      if (startOffset === 0) {
        let targetPlaceholder = null;
        if (startContainer.nodeType === Node.TEXT_NODE) {
          targetPlaceholder = findPreviousChip(startContainer);
        } else if (startContainer.nodeType === Node.ELEMENT_NODE) {
          const prevSibling = startContainer.previousSibling;
          if (prevSibling && prevSibling.classList && prevSibling.classList.contains('dropped-tile')) {
            targetPlaceholder = prevSibling;
          } else if (isWhitespaceOnly(prevSibling)) {
            targetPlaceholder = findPreviousChip(prevSibling);
          }
        }

        if (targetPlaceholder) {
          e.preventDefault();
          e.stopPropagation();
          const placeholderId = targetPlaceholder.getAttribute('data-placeholder-id');
          if (placeholderId) {
            const textNodeAfter = targetPlaceholder.nextSibling;
            setStorySegments(prev => prev.filter(seg =>
              !(seg.type === 'placeholder' && seg.id === placeholderId)
            ));
            setTimeout(() => {
              if (!storyAreaRef.current) return;
              const container = storyAreaRef.current;
              const r = document.createRange();
              const s = window.getSelection();
              if (textNodeAfter && textNodeAfter.nodeType === Node.TEXT_NODE && textNodeAfter.parentNode === container) {
                r.setStart(textNodeAfter, 0);
                r.setEnd(textNodeAfter, 0);
              } else {
                const w = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
                const firstTextNode = w.nextNode();
                if (firstTextNode) {
                  r.setStart(firstTextNode, 0);
                  r.setEnd(firstTextNode, 0);
                } else {
                  const newTextNode = document.createTextNode('\u200E');
                  container.appendChild(newTextNode);
                  r.setStart(newTextNode, 0);
                  r.setEnd(newTextNode, 0);
                }
              }
              s.removeAllRanges();
              s.addRange(r);
              container.focus();
            }, 10);
          }
        }
      }
    } else if (e.key === 'Delete') {
      const startContainer = range.startContainer;
      const startOffset = range.startOffset;
      if (startContainer.nodeType === Node.TEXT_NODE && startOffset < startContainer.textContent.length) return;

      if (startContainer.nodeType === Node.TEXT_NODE && startOffset === startContainer.textContent.length) {
        const nextSibling = startContainer.nextSibling;
        if (nextSibling && nextSibling.classList && nextSibling.classList.contains('dropped-tile')) {
          e.preventDefault();
          e.stopPropagation();
          const placeholderId = nextSibling.getAttribute('data-placeholder-id');
          if (placeholderId) {
            setStorySegments(prev => prev.filter(seg =>
              !(seg.type === 'placeholder' && seg.id === placeholderId)
            ));
            setTimeout(() => {
              if (!storyAreaRef.current) return;
              const container = storyAreaRef.current;
              const r = document.createRange();
              const s = window.getSelection();
              if (startContainer.parentNode === container) {
                r.setStart(startContainer, startContainer.textContent.length);
                r.setEnd(startContainer, startContainer.textContent.length);
              } else {
                const w = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
                const firstTextNode = w.nextNode();
                if (firstTextNode) {
                  r.setStart(firstTextNode, 0);
                  r.setEnd(firstTextNode, 0);
                }
              }
              s.removeAllRanges();
              s.addRange(r);
              container.focus();
            }, 10);
          }
        }
      }
    }
  };

  return (
    <div className="ui-input-group" style={{ position: 'relative' }}>
      <label className="ui-input-label">Story</label>
      <div
        ref={storyAreaRef}
        contentEditable
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDragEnd={handleDragEnd}
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
          cursor: grab;
          user-select: none;
          display: inline-flex !important;
          align-items: center !important;
          vertical-align: baseline !important;
          white-space: nowrap !important;
          max-width: 100% !important;
          position: relative !important;
        }
        [contenteditable] .dropped-tile:active {
          cursor: grabbing;
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
  );
};

export default StoryEditor;
