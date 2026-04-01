import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import copy from "clipboard-copy";
import axios from "../../axios";
import PageShell from "../../components/ui/PageShell";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";

const PublicResult = () => {
  const { resultId } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const res = await axios.get(`/story/result/${resultId}`);
        if (res.data.success && res.data.result) {
          setResult(res.data.result);
        } else {
          setError("Story not found");
        }
      } catch (err) {
        if (err.response?.status === 404) {
          setError("Story not found");
        } else {
          setError("Couldn't load story. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [resultId]);

  const shareUrl = `${window.location.origin}/result/${resultId}`;

  const handleCopy = () => {
    copy(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: result?.title ? `"${result.title}" — Glad Libs` : "A Glad Libs story",
          text: "Check out this Glad Libs story!",
          url: shareUrl,
        });
      } catch (err) {
        if (err.name !== "AbortError") handleCopy();
      }
    } else {
      handleCopy();
    }
  };

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
          <Button onClick={() => navigate("/home")}>Go to Home</Button>
        </Card>
      </PageShell>
    );
  }

  const date = result.createdAt
    ? new Date(result.createdAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <PageShell>
      <Card>
        <h1
          className="ui-heading"
          style={{
            backgroundColor: "#1f2937",
            color: "#ffffff",
            padding: "var(--spacing-md)",
            borderRadius: "var(--radius-md)",
            marginBottom: "var(--spacing-lg)",
          }}
        >
          {result.title || "Untitled story"}
        </h1>
        {date && (
          <p
            style={{
              fontSize: "14px",
              color: "var(--text-secondary)",
              marginBottom: "var(--spacing-lg)",
              textAlign: "center",
            }}
          >
            {date}
          </p>
        )}
        <div
          style={{
            fontSize: "18px",
            lineHeight: "1.8",
            color: "var(--text-primary)",
            padding: "var(--spacing-lg)",
            minHeight: "100px",
            whiteSpace: "pre-wrap",
            wordWrap: "break-word",
          }}
        >
          {result.resultText}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "var(--spacing-md)",
            marginTop: "var(--spacing-lg)",
          }}
        >
          <Button onClick={handleShare} style={{ maxWidth: "160px" }}>
            Share
          </Button>
          <Button
            onClick={handleCopy}
            style={{
              maxWidth: "160px",
              backgroundColor: "transparent",
              color: "var(--text-primary)",
              border: "1px solid var(--border-color)",
            }}
          >
            {copied ? "Copied!" : "Copy link"}
          </Button>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "var(--spacing-lg)",
          }}
        >
          <Button
            variant="tertiary"
            onClick={() => navigate("/home")}
            style={{ width: "auto" }}
          >
            Play your own Glad Libs
          </Button>
        </div>
      </Card>
    </PageShell>
  );
};

export default PublicResult;
