import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import axios from "../../axios";
import PageShell from "../../components/ui/PageShell";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { detectPOS, WORD_TYPES, getFormLabel, getFormOptionsForType } from "../../utils/posDetection";

const GapSelector = () => {
  const { textId } = useParams();
  const navigate = useNavigate();
  const [text, setText] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [words, setWords] = useState([]);
  const [gaps, setGaps] = useState({});
  const [headerCollapsed, setHeaderCollapsed] = useState(window.innerWidth < 768);
  const [saving, setSaving] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    const fetchText = async () => {
      try {
        const res = await axios.get(`/library/texts/${textId}`);
        if (res.data.success && res.data.text) {
          setText(res.data.text);
          const splitWords = res.data.text.fullText.split(/(\s+)/);
          setWords(splitWords);
        } else {
          setError("Text not found");
        }
      } catch (err) {
        setError(err.response?.status === 404 ? "Text not found" : "Failed to load text");
      } finally {
        setLoading(false);
      }
    };
    fetchText();
  }, [textId]);

  const gapCount = Object.keys(gaps).length;

  const difficultyLabel = () => {
    if (gapCount <= 5) return { label: "Easy", color: "#166534", bg: "#dcfce7" };
    if (gapCount <= 15) return { label: "Medium", color: "#854d0e", bg: "#fef9c3" };
    return { label: "Hard", color: "#991b1b", bg: "#fee2e2" };
  };

  const toggleGap = useCallback(
    (index) => {
      setGaps((prev) => {
        const next = { ...prev };
        if (next[index]) {
          delete next[index];
        } else {
          const wordList = words.filter((w) => w.trim());
          const wordOnlyIndex = wordList.indexOf(words[index]);
          const prevWord = wordOnlyIndex > 0 ? wordList[wordOnlyIndex - 1] : "";
          const nextWord = wordOnlyIndex < wordList.length - 1 ? wordList[wordOnlyIndex + 1] : "";
          const detected = detectPOS(words[index], prevWord, nextWord);
          next[index] = { type: detected.type, form: detected.form };
        }
        return next;
      });
    },
    [words]
  );

  const updateGapType = (index, newType) => {
    setGaps((prev) => ({
      ...prev,
      [index]: { ...prev[index], type: newType, form: "any" },
    }));
  };

  const updateGapForm = (index, newForm) => {
    setGaps((prev) => ({
      ...prev,
      [index]: { ...prev[index], form: newForm },
    }));
  };

  const clearAll = () => {
    setGaps({});
  };

  const handleCreate = async () => {
    if (gapCount === 0) return;

    const token = localStorage.getItem("userToken");
    if (!token) {
      sessionStorage.setItem(
        "libraryGapState",
        JSON.stringify({ textId, gaps })
      );
      navigate(`/login?return=/library/${textId}/edit`);
      return;
    }

    setSaving(true);
    try {
      const storyArray = [];

      for (let i = 0; i < words.length; i++) {
        if (gaps[i]) {
          const formLabel = getFormLabel(gaps[i].form);
          const displayText = formLabel
            ? `${gaps[i].type} (${formLabel})`
            : gaps[i].type;
          storyArray.push({
            tag: "span",
            className: "filled-word",
            text: displayText,
            form: gaps[i].form || "any",
          });
        } else {
          storyArray.push(words[i]);
        }
      }

      const gameId = uuidv4();
      const createRes = await axios.post(
        "/story/create",
        { id: gameId },
        {
          headers: {
            "Content-Type": "application/json",
            authorization: token,
          },
        }
      );

      if (!createRes.data.story) {
        throw new Error("Failed to create game");
      }

      await axios.put(
        `/story/update/${gameId}`,
        {
          title: text.title,
          story: storyArray,
          premadeTextId: textId,
        },
        {
          headers: {
            "Content-Type": "application/json",
            authorization: token,
          },
        }
      );

      try {
        await axios.put(`/library/texts/${textId}/play`);
      } catch (e) {}

      navigate(`/created-game/${gameId}`);
    } catch (err) {
      console.error("Failed to create game:", err);
      setError("Failed to create game. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const saved = sessionStorage.getItem("libraryGapState");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.textId === textId && parsed.gaps) {
          setGaps(parsed.gaps);
        }
      } catch (e) {}
      sessionStorage.removeItem("libraryGapState");
    }
  }, [textId]);

  if (loading) {
    return (
      <PageShell>
        <Card>
          <div className="loader" style={{ margin: "0 auto" }}></div>
        </Card>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <Card>
          <h1 className="ui-heading">{error}</h1>
          <Button onClick={() => navigate("/library")}>Back to Library</Button>
        </Card>
      </PageShell>
    );
  }

  const diff = difficultyLabel();
  const gapEntries = Object.entries(gaps)
    .map(([index, gap]) => ({ index: Number(index), word: words[Number(index)], ...gap }))
    .sort((a, b) => a.index - b.index);

  if (reviewing) {
    return (
      <PageShell className="gap-selector-shell">
        <Card style={{ maxWidth: "800px", paddingBottom: "100px" }}>
          <button
            onClick={() => setReviewing(false)}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer",
              padding: "0",
              marginBottom: "var(--spacing-md)",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            ← Back to text
          </button>

          <h1 className="ui-heading" style={{ marginBottom: "var(--spacing-xs)" }}>
            Review Your Blanks
          </h1>
          <p style={{
            fontSize: "14px",
            color: "var(--text-secondary)",
            marginBottom: "var(--spacing-lg)",
            marginTop: 0,
          }}>
            Check that each blank has the right type. This is what players will be asked to fill in.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {gapEntries.map((gap, i) => {
              const formOptions = getFormOptionsForType(gap.type);
              const hasFormOptions = formOptions.length > 0;
              return (
                <div
                  key={gap.index}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 16px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "rgba(243, 129, 0, 0.06)",
                    border: "1px solid rgba(243, 129, 0, 0.15)",
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    minWidth: "24px",
                  }}>
                    {i + 1}.
                  </span>

                  <span style={{
                    fontSize: "15px",
                    color: "var(--text-primary)",
                    fontStyle: "italic",
                    minWidth: "100px",
                    flex: "0 0 auto",
                  }}>
                    "{gap.word}"
                  </span>

                  <span style={{ color: "var(--text-secondary)", fontSize: "14px" }}>→</span>

                  <select
                    value={gap.type}
                    onChange={(e) => updateGapType(gap.index, e.target.value)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-color)",
                      fontSize: "14px",
                      fontFamily: "inherit",
                      backgroundColor: "#fff",
                      cursor: "pointer",
                      color: "var(--text-primary)",
                    }}
                  >
                    {WORD_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>

                  {hasFormOptions && (
                    <select
                      value={gap.form}
                      onChange={(e) => updateGapForm(gap.index, e.target.value)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-color)",
                        fontSize: "14px",
                        fontFamily: "inherit",
                        backgroundColor: "#fff",
                        cursor: "pointer",
                        color: "var(--text-primary)",
                      }}
                    >
                      {formOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}{opt.example ? ` ${opt.example}` : ""}
                        </option>
                      ))}
                    </select>
                  )}

                  <button
                    onClick={() => {
                      setGaps((prev) => {
                        const next = { ...prev };
                        delete next[gap.index];
                        return next;
                      });
                    }}
                    style={{
                      marginLeft: "auto",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "16px",
                      color: "var(--text-secondary)",
                      padding: "4px",
                      lineHeight: 1,
                    }}
                    title="Remove this blank"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>

          {gapEntries.length === 0 && (
            <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "var(--spacing-xl) 0" }}>
              No blanks selected. Go back to add some.
            </p>
          )}
        </Card>

        {gapEntries.length > 0 && (
          <div
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(8px)",
              borderTop: "1px solid var(--border-color)",
              padding: "12px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              zIndex: 50,
            }}
          >
            <span style={{ fontSize: "15px", fontWeight: 600 }}>
              {gapEntries.length} blank{gapEntries.length !== 1 ? "s" : ""} ready
            </span>
            <button
              onClick={handleCreate}
              disabled={saving}
              style={{
                padding: "8px 24px",
                borderRadius: "var(--radius-sm)",
                border: "none",
                backgroundColor: "var(--color-primary)",
                color: "#fff",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: 600,
                fontFamily: "inherit",
              }}
            >
              {saving ? "Creating..." : "Create Game"}
            </button>
          </div>
        )}
      </PageShell>
    );
  }

  return (
    <PageShell className="gap-selector-shell">
      <Card style={{ maxWidth: "800px", paddingBottom: "100px" }}>
        <button
          onClick={() => navigate("/library")}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-secondary)",
            cursor: "pointer",
            padding: "0",
            marginBottom: "var(--spacing-md)",
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          ← Back to Library
        </button>

        <div style={{ marginBottom: "var(--spacing-lg)" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div style={{ flex: 1 }}>
              <h1
                className="ui-heading"
                style={{ marginBottom: "var(--spacing-xs)" }}
              >
                {text.title}
              </h1>
              {!headerCollapsed && (
                <>
                  {text.author && (
                    <p
                      style={{
                        fontSize: "15px",
                        color: "var(--text-secondary)",
                        margin: "0 0 4px 0",
                      }}
                    >
                      {text.author}
                      {text.year ? ` (${text.year})` : ""}
                    </p>
                  )}
                  {text.contextBlurb && (
                    <p
                      style={{
                        fontSize: "14px",
                        color: "var(--text-secondary)",
                        margin: 0,
                        fontStyle: "italic",
                        lineHeight: 1.5,
                      }}
                    >
                      {text.contextBlurb}
                    </p>
                  )}
                </>
              )}
            </div>
            <button
              onClick={() => setHeaderCollapsed((c) => !c)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "18px",
                color: "var(--text-secondary)",
                padding: "4px 8px",
              }}
            >
              {headerCollapsed ? "▼" : "▲"}
            </button>
          </div>

          <p
            style={{
              fontSize: "14px",
              color: "var(--text-secondary)",
              marginTop: "var(--spacing-sm)",
              marginBottom: 0,
            }}
          >
            Tap any word to turn it into a blank. Tap again to deselect.
          </p>
        </div>

        <div
          style={{
            fontSize: "18px",
            lineHeight: "2.2",
            color: "var(--text-primary)",
            padding: "var(--spacing-md)",
            userSelect: "none",
          }}
        >
          {words.map((word, index) => {
            if (!word.trim()) {
              return <span key={index}>{word}</span>;
            }

            const isGap = !!gaps[index];

            return (
              <span
                key={index}
                onClick={() => toggleGap(index)}
                style={{
                  display: "inline",
                  padding: "3px 2px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  position: "relative",
                  transition: "all 0.15s ease",
                  backgroundColor: isGap
                    ? "rgba(243, 129, 0, 0.15)"
                    : "transparent",
                  borderBottom: isGap
                    ? "2px solid var(--color-primary)"
                    : "2px solid transparent",
                  color: isGap ? "var(--text-primary)" : undefined,
                }}
                onMouseEnter={(e) => {
                  if (!isGap) {
                    e.currentTarget.style.backgroundColor =
                      "rgba(243, 129, 0, 0.08)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isGap) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                {isGap ? (
                  <>
                    <span style={{ opacity: 0.35 }}>{word}</span>
                    <span
                      style={{
                        display: "inline-block",
                        marginLeft: "2px",
                        padding: "0 4px",
                        borderRadius: "3px",
                        fontSize: "10px",
                        fontWeight: 600,
                        backgroundColor: "var(--color-primary)",
                        color: "#fff",
                        verticalAlign: "super",
                        lineHeight: "1.4",
                      }}
                    >
                      {gaps[index].type}
                    </span>
                  </>
                ) : (
                  word
                )}
              </span>
            );
          })}
        </div>
      </Card>

      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(8px)",
          borderTop: "1px solid var(--border-color)",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          zIndex: 50,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "15px", fontWeight: 600 }}>
            {gapCount} blank{gapCount !== 1 ? "s" : ""} selected
          </span>
          {gapCount > 0 && (
            <span
              style={{
                display: "inline-block",
                padding: "2px 8px",
                borderRadius: "9999px",
                fontSize: "12px",
                fontWeight: 600,
                backgroundColor: diff.bg,
                color: diff.color,
              }}
            >
              {diff.label}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {gapCount > 0 && (
            <button
              onClick={clearAll}
              style={{
                padding: "8px 16px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-color)",
                backgroundColor: "transparent",
                cursor: "pointer",
                fontSize: "14px",
                fontFamily: "inherit",
                color: "var(--text-secondary)",
              }}
            >
              Clear All
            </button>
          )}
          <button
            onClick={() => setReviewing(true)}
            disabled={gapCount === 0}
            style={{
              padding: "8px 24px",
              borderRadius: "var(--radius-sm)",
              border: "none",
              backgroundColor:
                gapCount === 0
                  ? "#d1d5db"
                  : "var(--color-primary)",
              color: "#fff",
              cursor: gapCount === 0 ? "default" : "pointer",
              fontSize: "14px",
              fontWeight: 600,
              fontFamily: "inherit",
            }}
          >
            Review Blanks
          </button>
        </div>
      </div>
    </PageShell>
  );
};

export default GapSelector;
