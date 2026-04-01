import React, { useEffect, useState } from "react";
// import storyData from "./storyData";
import { ArrowNarrowRightIcon } from "@heroicons/react/outline";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setResultStory } from "../../store/actions/story";
import PageShell from "../../components/ui/PageShell";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import TextInput from "../../components/ui/TextInput";

const PlayGame = () => {
  const storyData = useSelector((state) => state.storyData.story);
  const [story, setStory] = useState(storyData?.story);
  const [error, setError] = useState(null);

  const [gameContest, setGameContest] = useState([]);

  const [wordInput, setWordInput] = useState("");

  const [nextWord, setNextWord] = useState(1);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  function getArticle(label) {
    return /^[aeiou]/i.test(label.trim()) ? "an" : "a";
  }

  useEffect(() => {
    try {
      setGameContest(
        story
          .map((word, index) => {
            return typeof word === "object" ? { ...word, index } : "";
          })
          .filter((word, index) => {
            return typeof word === "object";
          })
      );
    } catch (err) {
      setError("Something went wrong loading the game. Please try again.");
    }
  }, []);

  const moveNextWord = (wordIndex) => {
    try {
      console.log(wordIndex);
      setStory((prev) => {
        return prev.map((word, index) => {
          return index === wordIndex ? { ...word, result: wordInput } : word;
        });
      });
      setWordInput("");
      setNextWord((prev) => prev + 1);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    }
  };

  const seeResult = (wordIndex) => {
    try {
      let resultStry = [];
      resultStry = story.map((word, index) => {
        return index === wordIndex ? { ...word, result: wordInput } : word;
      });
      setStory((prev) => {
        return prev.map((word, index) => {
          return index === wordIndex ? { ...word, result: wordInput } : word;
        });
      });
      setWordInput("");
      console.log(resultStry);
      console.log(story);
      dispatch(setResultStory(resultStry));
      navigate("/result");
    } catch (err) {
      setError("Something went wrong showing your result. Please try again.");
    }
  };
  // setWordIndex(game.index);

  if (error) {
    return (
      <PageShell>
        <Card>
          <div className="flex flex-col items-center gap-4 py-8">
            <p className="text-base text-gray-700 text-center">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
            >
              Try again
            </button>
          </div>
        </Card>
      </PageShell>
    );
  }

  if (!story) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="loader"></div>
      </div>
    );
  }

  const currentGame = gameContest[nextWord - 1];
  if (!currentGame) {
    return <h1>Loading...</h1>;
  }

  return (
    <PageShell>
      <Card>
        {/* Progress Indicator */}
        <div style={{
          fontSize: '14px',
          color: 'var(--text-secondary)',
          marginBottom: 'var(--spacing-lg)',
          textAlign: 'center'
        }}>
          Step {nextWord} of {gameContest.length}
        </div>

        {/* Step Title */}
        <h2 className="ui-heading ui-heading--small" style={{ textAlign: 'center', marginBottom: 'var(--spacing-lg)' }}>
          Enter {getArticle(currentGame.text.toLowerCase())} <strong>{currentGame.text.toLowerCase()}</strong>
        </h2>
        
        {/* Input */}
        <TextInput
          type="text"
          value={wordInput}
          onChange={(e) => setWordInput(e.target.value)}
          placeholder={`Enter ${getArticle(currentGame.text.toLowerCase())} ${currentGame.text.toLowerCase()}`}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && wordInput.trim()) {
              if (nextWord < gameContest.length) {
                moveNextWord(currentGame.index);
              } else {
                seeResult(currentGame.index);
              }
            }
          }}
        />
        
        {/* Button */}
        <div style={{ marginTop: 'var(--spacing-lg)' }}>
          {nextWord < gameContest.length ? (
            <Button
              onClick={() => moveNextWord(currentGame.index)}
              disabled={!wordInput.trim()}
              style={{ width: '100%' }}
            >
              <span style={{ marginRight: 'var(--spacing-sm)' }}>Next</span>
              <ArrowNarrowRightIcon style={{ width: '20px', height: '20px' }} />
            </Button>
          ) : (
            <Button
              onClick={() => seeResult(currentGame.index)}
              disabled={!wordInput.trim()}
              style={{ width: '100%' }}
            >
              <span style={{ marginRight: 'var(--spacing-sm)' }}>See Result</span>
              <ArrowNarrowRightIcon style={{ width: '20px', height: '20px' }} />
            </Button>
          )}
        </div>
      </Card>
    </PageShell>
  );
};

export default PlayGame;
