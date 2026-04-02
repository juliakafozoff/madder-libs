import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../axios";
import PageShell from "../../components/ui/PageShell";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";

const CATEGORIES = [
  { value: "", label: "All" },
  { value: "speech", label: "Speeches" },
  { value: "literature", label: "Literature" },
  { value: "poetry", label: "Poetry" },
  { value: "fairytale", label: "Fairy Tales" },
  { value: "historical", label: "Historical" },
  { value: "template", label: "Templates" },
];

const SORT_OPTIONS = [
  { value: "popular", label: "Most Popular" },
  { value: "newest", label: "Newest" },
  { value: "alpha", label: "A-Z" },
];

const difficultyColor = (d) => {
  if (d === "easy") return { bg: "#dcfce7", text: "#166534" };
  if (d === "medium") return { bg: "#fef9c3", text: "#854d0e" };
  return { bg: "#fee2e2", text: "#991b1b" };
};

const categoryColor = (c) => {
  const map = {
    speech: { bg: "#dbeafe", text: "#1e40af" },
    literature: { bg: "#f3e8ff", text: "#6b21a8" },
    poetry: { bg: "#fce7f3", text: "#9d174d" },
    fairytale: { bg: "#d1fae5", text: "#065f46" },
    historical: { bg: "#ffedd5", text: "#9a3412" },
    template: { bg: "#e0e7ff", text: "#3730a3" },
  };
  return map[c] || { bg: "#f3f4f6", text: "#374151" };
};

const LibraryHome = () => {
  const navigate = useNavigate();
  const [texts, setTexts] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("popular");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [spinning, setSpinning] = useState(false);

  const fetchTexts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (search) params.set("search", search);
      if (sort) params.set("sort", sort);
      params.set("page", page);

      const res = await axios.get(`/library/texts?${params.toString()}`);
      if (res.data.success) {
        setTexts(res.data.texts);
        setTotalPages(res.data.totalPages);
      }
    } catch (err) {
      console.error("Failed to fetch library texts:", err);
    } finally {
      setLoading(false);
    }
  }, [category, search, sort, page]);

  // Fetch featured texts once
  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const res = await axios.get("/library/texts?sort=popular&page=1");
        if (res.data.success) {
          setFeatured(res.data.texts.filter((t) => t.featured));
        }
      } catch (err) {
        console.error("Failed to fetch featured:", err);
      }
    };
    fetchFeatured();
  }, []);

  useEffect(() => {
    fetchTexts();
  }, [fetchTexts]);

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleSurpriseMe = async () => {
    setSpinning(true);
    try {
      const res = await axios.get("/library/random");
      if (res.data.success && res.data.text) {
        setTimeout(() => {
          setSpinning(false);
          navigate(`/library/${res.data.text.textId}/edit`);
        }, 700);
      }
    } catch (err) {
      console.error("Surprise me failed:", err);
      setSpinning(false);
    }
  };

  const pillStyle = (active) => ({
    padding: "6px 16px",
    borderRadius: "9999px",
    border: "1px solid",
    borderColor: active ? "var(--color-primary)" : "var(--border-color)",
    backgroundColor: active ? "var(--color-primary)" : "transparent",
    color: active ? "#ffffff" : "var(--text-secondary)",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 500,
    transition: "all 0.2s ease",
    whiteSpace: "nowrap",
    fontFamily: "inherit",
  });

  const badgeStyle = (colors) => ({
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: "9999px",
    fontSize: "11px",
    fontWeight: 600,
    backgroundColor: colors.bg,
    color: colors.text,
  });

  return (
    <PageShell>
      <Card style={{ maxWidth: "900px" }}>
        <h1 className="ui-heading">Pick a Famous Text</h1>
        <p
          className="ui-text ui-text--secondary"
          style={{ textAlign: "center", marginBottom: "var(--spacing-lg)" }}
        >
          Choose a classic, tap words to blank out, and let your friends fill
          them in blind.
        </p>

        {/* Search + Surprise Me */}
        <div
          style={{
            display: "flex",
            gap: "var(--spacing-sm)",
            marginBottom: "var(--spacing-md)",
          }}
        >
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by title, author, or topic..."
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-color)",
              fontSize: "15px",
              fontFamily: "inherit",
              outline: "none",
            }}
          />
          <button
            onClick={handleSurpriseMe}
            disabled={spinning}
            style={{
              padding: "10px 18px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-primary)",
              backgroundColor: "transparent",
              color: "var(--color-primary)",
              cursor: spinning ? "default" : "pointer",
              fontSize: "14px",
              fontWeight: 600,
              fontFamily: "inherit",
              whiteSpace: "nowrap",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span
              style={{
                display: "inline-block",
                animation: spinning
                  ? "spin 0.6s linear infinite"
                  : "none",
              }}
            >
              ✦
            </span>
            Surprise Me!
          </button>
        </div>

        {/* Category pills */}
        <div
          style={{
            display: "flex",
            gap: "var(--spacing-xs)",
            marginBottom: "var(--spacing-md)",
            flexWrap: "wrap",
          }}
        >
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => {
                setCategory(cat.value);
                setPage(1);
              }}
              style={pillStyle(category === cat.value)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Sort dropdown */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: "var(--spacing-md)",
          }}
        >
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            style={{
              padding: "6px 12px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-color)",
              fontSize: "14px",
              fontFamily: "inherit",
              cursor: "pointer",
              backgroundColor: "var(--color-secondary)",
            }}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Featured row */}
        {!search && !category && featured.length > 0 && (
          <div style={{ marginBottom: "var(--spacing-lg)" }}>
            <h2
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: "var(--spacing-sm)",
              }}
            >
              Great for Groups
            </h2>
            <div
              style={{
                display: "flex",
                gap: "var(--spacing-md)",
                overflowX: "auto",
                paddingBottom: "var(--spacing-sm)",
              }}
            >
              {featured.map((text) => (
                <div
                  key={text.textId}
                  onClick={() => navigate(`/library/${text.textId}/edit`)}
                  style={{
                    minWidth: "260px",
                    maxWidth: "300px",
                    padding: "var(--spacing-md)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--color-secondary)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: "6px",
                      marginBottom: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={badgeStyle(categoryColor(text.category))}>
                      {text.category}
                    </span>
                    <span style={badgeStyle(difficultyColor(text.difficulty))}>
                      {text.difficulty}
                    </span>
                  </div>
                  <h3
                    style={{
                      fontSize: "16px",
                      fontWeight: 600,
                      margin: "0 0 4px 0",
                      color: "var(--text-primary)",
                    }}
                  >
                    {text.title}
                  </h3>
                  {text.author && (
                    <p
                      style={{
                        fontSize: "13px",
                        color: "var(--text-secondary)",
                        margin: "0 0 8px 0",
                      }}
                    >
                      {text.author}
                      {text.year ? ` (${text.year})` : ""}
                    </p>
                  )}
                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--text-secondary)",
                      margin: 0,
                      lineHeight: 1.4,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {text.contextBlurb}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "var(--spacing-xl)" }}>
            <div className="loader" style={{ margin: "0 auto" }}></div>
          </div>
        ) : texts.length === 0 ? (
          <p
            className="ui-text ui-text--secondary"
            style={{ textAlign: "center" }}
          >
            No texts found. Try a different search or category.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "var(--spacing-md)",
            }}
          >
            {texts.map((text) => (
              <div
                key={text.textId}
                onClick={() => navigate(`/library/${text.textId}/edit`)}
                style={{
                  padding: "var(--spacing-md)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--color-secondary)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-primary)";
                  e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-color)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: "6px",
                    marginBottom: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  <span style={badgeStyle(categoryColor(text.category))}>
                    {text.category}
                  </span>
                  <span style={badgeStyle(difficultyColor(text.difficulty))}>
                    {text.difficulty}
                  </span>
                </div>
                <h3
                  style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    margin: "0 0 4px 0",
                    color: "var(--text-primary)",
                  }}
                >
                  {text.title}
                </h3>
                {text.author && (
                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--text-secondary)",
                      margin: "0 0 6px 0",
                    }}
                  >
                    {text.author}
                    {text.year ? ` (${text.year})` : ""}
                  </p>
                )}
                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--text-secondary)",
                    margin: "0 0 8px 0",
                    lineHeight: 1.4,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {text.contextBlurb}
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: "6px",
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  {text.playCount > 0 && (
                    <span
                      style={{
                        fontSize: "12px",
                        color: "var(--text-secondary)",
                      }}
                    >
                      ▶ {text.playCount}
                    </span>
                  )}
                  {(text.tags || []).slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      style={{
                        fontSize: "11px",
                        padding: "1px 6px",
                        borderRadius: "4px",
                        backgroundColor: "#f3f4f6",
                        color: "#6b7280",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "var(--spacing-md)",
              marginTop: "var(--spacing-lg)",
            }}
          >
            <Button
              variant="tertiary"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{ width: "auto" }}
            >
              Previous
            </Button>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: "14px",
                color: "var(--text-secondary)",
              }}
            >
              {page} of {totalPages}
            </span>
            <Button
              variant="tertiary"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{ width: "auto" }}
            >
              Next
            </Button>
          </div>
        )}

        <div style={{ marginTop: "var(--spacing-lg)", textAlign: "left" }}>
          <Button
            variant="tertiary"
            onClick={() => {
              const token = localStorage.getItem("userToken");
              navigate(token ? "/home" : "/");
            }}
            style={{ width: "auto", display: "inline-block" }}
          >
            ← Back
          </Button>
        </div>
      </Card>

      {/* Spin animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </PageShell>
  );
};

export default LibraryHome;
