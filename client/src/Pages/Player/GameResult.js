import React, { useEffect, useState } from "react";
import storyResultData from "./storyResultData";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { v4 as uuidv4 } from "uuid";
import axios from "../../axios";
import PageShell from "../../components/ui/PageShell";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";

const GameResult = () => {
  const storyData = useSelector((state) => state.storyData);
  const navigate = useNavigate();
  const [savedToBackend, setSavedToBackend] = useState(false);

  // Save completed story to backend and localStorage
  useEffect(() => {
    console.log("GameResult useEffect triggered", {
      hasStory: !!storyData.story,
      hasResultStory: !!storyData.resultStory,
      resultStoryLength: storyData.resultStory?.length,
      story: storyData.story,
      resultStory: storyData.resultStory
    });

    if (storyData.story && storyData.resultStory && storyData.resultStory.length > 0 && !savedToBackend) {
      const saveResult = async () => {
        try {
          // Convert resultStory array to text string
          const resultText = storyData.resultStory
            .map((word) => {
              if (typeof word === "object" && word.result) {
                return word.result;
              }
              return word;
            })
            .join(" ")
            .trim();

          console.log("Extracted resultText:", resultText);

          // Get templateId - try storyId first, then _id, then use a fallback
          const templateId = storyData.story.storyId || storyData.story._id || "unknown";
          console.log("Using templateId:", templateId);

          const resultId = uuidv4();
          const completedStory = {
            resultId,
            templateId,
            title: storyData.story.title || "Untitled story",
            resultText,
            createdAt: new Date().toISOString(),
          };

          console.log("Created completedStory object:", completedStory);

          // Try to save to backend first
          try {
            const token = localStorage.getItem("userToken");
            const headers = {
              "Content-Type": "application/json",
            };
            if (token) {
              headers.authorization = token;
            }

            const response = await axios.post("/story/result", completedStory, { headers });
            
            if (response.data.success) {
              console.log("✅ Saved completed story to backend:", response.data.result);
              setSavedToBackend(true);
            }
          } catch (backendError) {
            console.error("❌ Error saving to backend:", backendError);
            console.log("⚠️ Falling back to localStorage only");
            // Continue to localStorage fallback
          }

          // Also save to localStorage (for offline support and backward compatibility)
          const existingStories = JSON.parse(
            localStorage.getItem("completedStories") || "[]"
          );

          console.log("Existing stories count:", existingStories.length);

          // Check if this story already exists (avoid duplicates)
          const alreadyExists = existingStories.some(
            (s) => s.templateId === templateId && s.resultText === resultText
          );

          if (!alreadyExists) {
            // Add new story at the beginning (newest first)
            const updatedStories = [completedStory, ...existingStories];

            // Save back to localStorage
            localStorage.setItem("completedStories", JSON.stringify(updatedStories));
            console.log("✅ Saved completed story to localStorage:", completedStory);
            console.log("Total stories now:", updatedStories.length);
          } else {
            console.log("⚠️ Story already exists in localStorage, skipping save");
          }
        } catch (error) {
          console.error("❌ Error saving completed story:", error);
          console.error("Error details:", error.stack);
        }
      };

      saveResult();
    } else if (!storyData.story || !storyData.resultStory || storyData.resultStory.length === 0) {
      console.log("⚠️ Missing story data:", { 
        hasStory: !!storyData.story, 
        hasResultStory: !!storyData.resultStory,
        resultStoryLength: storyData.resultStory?.length 
      });
    }
  }, [storyData.story, storyData.resultStory, savedToBackend]);

  // Navigate away if data is missing
  useEffect(() => {
    if (!storyData.story || !storyData.resultStory || storyData.resultStory.length === 0) {
      navigate("/home");
    }
  }, [storyData.story, storyData.resultStory, navigate]);

  // Show loading or nothing while checking data
  if (!storyData.story || !storyData.resultStory || storyData.resultStory.length === 0) {
    return null;
  }

  return (
    <PageShell>
      <Card>
        <h1 className="ui-heading" style={{
          backgroundColor: '#1f2937',
          color: '#ffffff',
          padding: 'var(--spacing-md)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--spacing-lg)'
        }}>
          {storyData?.story?.title}
        </h1>
        <div style={{
          fontSize: '18px',
          lineHeight: '1.8',
          color: 'var(--text-primary)',
          padding: 'var(--spacing-lg)',
          minHeight: '100px'
        }}>
          {storyData.resultStory.map((word, index) => {
            if (typeof word === "object") {
              return (
                <span key={index} className="filled-word">
                  {word.result}{" "}
                </span>
              );
            }
            return <span key={index}> {word} </span>;
          })}
        </div>

        <h3 className="ui-heading ui-heading--small" style={{ marginTop: 'var(--spacing-lg)' }}>
          The End!
        </h3>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--spacing-lg)' }}>
          <Button onClick={() => navigate("/home")} style={{ maxWidth: '200px' }}>
            Go to Home
          </Button>
        </div>
      </Card>
    </PageShell>
  );
};

export default GameResult;
