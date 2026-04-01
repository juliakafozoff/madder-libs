import React, { useEffect, useRef, useState } from "react";
import {
  getInternalType,
  normalizeTypeForCheck,
  getFormOptions,
  getFormDisplayLabel,
  formatFormLabel,
  supportsFormSelection,
} from "./placeholderUtils";

const WordPalette = ({
  blanks,
  customChips,
  setCustomChips,
  selectedForms,
  setSelectedForms,
}) => {
  const [ownField, setOwnField] = useState("");
  const [chipDropdown, setChipDropdown] = useState(null);
  const chipDropdownRef = useRef(null);

  const handleChipDragStart = (e, word, form, isCustom = false) => {
    if (e.target.closest && e.target.closest('[data-no-drag="true"]')) {
      e.preventDefault();
      return;
    }
    e.stopPropagation();

    const normalizedType = getInternalType(word);
    const qualifier = form || "any";

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
      isCustom: isCustom
    };

    e.dataTransfer.setData("application/json", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleCaretClick = (e, word) => {
    e.preventDefault();
    e.stopPropagation();
    if (!supportsFormSelection(word)) return;

    const caretRect = e.currentTarget.getBoundingClientRect();
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

  const handleChipFormSelect = (word, form) => {
    const normalizedWord = normalizeTypeForCheck(word);
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

  const addWord = (e) => {
    e.preventDefault();
    if (!ownField.trim()) return;
    const customWord = ownField.charAt(0).toUpperCase() + ownField.slice(1);
    setCustomChips(prev => {
      if (prev.includes(customWord)) return prev;
      return [...prev, customWord];
    });
    setOwnField("");
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (chipDropdown && chipDropdownRef.current && !chipDropdownRef.current.contains(e.target)) {
        setChipDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [chipDropdown]);

  return (
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
              onDragStart={(e) => handleChipDragStart(e, word, selectedForm || "any")}
            >
              <span>{chipLabel}</span>
              {isConfigurable && (
                <span
                  data-no-drag="true"
                  draggable={false}
                  onClick={(e) => handleCaretClick(e, word)}
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onDragStart={(e) => e.preventDefault()}
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
            onDragStart={(e) => handleChipDragStart(e, customWord, "any", true)}
          >
            {customWord}
          </span>
        ))}
        {chipDropdown && (() => {
          const normalizedWord = normalizeTypeForCheck(chipDropdown.word);
          const currentForm = selectedForms[normalizedWord] || "any";
          const hasNonDefaultForm = currentForm !== "any";

          return (
            <div
              ref={chipDropdownRef}
              data-no-drag="true"
              draggable={false}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onDragStart={(e) => e.preventDefault()}
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
                    data-no-drag="true"
                    draggable={false}
                    onClick={() => handleChipFormSelect(chipDropdown.word, form)}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onDragStart={(e) => e.preventDefault()}
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
                    data-no-drag="true"
                    draggable={false}
                    onClick={() => handleChipFormSelect(chipDropdown.word, "any")}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onDragStart={(e) => e.preventDefault()}
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
          <button type="submit" style={{ display: 'none' }} />
        </form>
      </div>
    </div>
  );
};

export default WordPalette;
