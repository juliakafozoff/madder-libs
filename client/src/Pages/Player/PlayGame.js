import React, { useEffect, useState, useRef } from "react";
import { ArrowNarrowRightIcon } from "@heroicons/react/outline";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setResultStory } from "../../store/actions/story";
import PageShell from "../../components/ui/PageShell";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import TextInput from "../../components/ui/TextInput";

const PLAYFUL_PROMPTS = {
  Adjective: [
    "Give me an adjective!",
    "Quick — an adjective!",
    "Hit me with an adjective",
    "I need an adjective — make it weird",
    "An adjective, please — the stranger the better",
  ],
  Thing: [
    "Name a thing!",
    "Give me a noun — any noun",
    "Quick! A thing!",
    "I need a thing — surprise me",
    "Name something random",
  ],
  Verb: [
    "Give me a verb!",
    "An action word — go!",
    "Quick — a verb!",
    "Hit me with a verb",
    "I need a verb — make it fun",
  ],
  Adverb: [
    "How about an adverb?",
    "Give me an adverb!",
    "An adverb — the sillier the better",
    "I need an adverb!",
  ],
  Person: [
    "Name a person!",
    "Give me a famous person",
    "Quick — name someone!",
    "Who comes to mind?",
  ],
  Place: [
    "Name a place!",
    "Give me a place — real or imaginary",
    "Quick — a place!",
    "Where in the world?",
  ],
  Emotion: [
    "Give me an emotion!",
    "Name a feeling!",
    "How are you feeling? (it's for the story)",
    "An emotion — go!",
  ],
  Color: [
    "Name a color!",
    "Give me a color — any shade",
    "Quick — a color!",
    "What color are you thinking?",
  ],
  Number: [
    "Give me a number!",
    "Pick a number — any number",
    "Quick — a number!",
    "I need a number!",
  ],
  Size: [
    "Give me a size!",
    "How big? How small?",
    "Name a size!",
  ],
  Time: [
    "Give me a time or time period!",
    "Name a time!",
    "When? Give me a time!",
  ],
};

const REACTIONS = [
  "Nice one!",
  "Ooh interesting...",
  "That's going to be good...",
  "Love it!",
  "Ha! Okay...",
  "Perfect.",
  "Oh this is going to be fun...",
  "Bold choice!",
  "I like where this is going...",
  "Classic!",
];

function getPlayfulPrompt(wordType) {
  const type = wordType.charAt(0).toUpperCase() + wordType.slice(1).toLowerCase();
  const prompts = PLAYFUL_PROMPTS[type];
  if (prompts) {
    return prompts[Math.floor(Math.random() * prompts.length)];
  }
  // Fallback for custom types
  const article = /^[aeiou]/i.test(wordType.trim()) ? "an" : "a";
  const fallbacks = [
    `Give me ${article} ${wordType}!`,
    `Quick — ${article} ${wordType}!`,
    `I need ${article} ${wordType}!`,
    `Hit me with ${article} ${wordType}`,
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

function getReaction() {
  return REACTIONS[Math.floor(Math.random() * REACTIONS.length)];
}

const PlayGame = () => {
  const storyData = useSelector((state) => state.storyData.story);
  const [story, setStory] = useState(storyData?.story);
  const [error, setError] = useState(null);
  const [gameContest, setGameContest] = useState([]);
  const [wordInput, setWordInput] = useState("");
  const [nextWord, setNextWord] = useState(1);
  const [reaction, setReaction] = useState(null);
  const [prompt, setPrompt] = useState("");
  const inputRef = useRef(null);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    try {
      const gaps = story
        .map((word, index) => (typeof word === "object" ? { ...word, index } : ""))
        .filter((word) => typeof word === "object");
      setGameContest(gaps);
      if (gaps.length > 0) {
        setPrompt(getPlayfulPrompt(gaps[0].text));
      }
    } catch (err) {
      setError("Something went wrong loading the game. Please try again.");
    }
  }, []);

  const showReactionThenAdvance = (callback) => {
    const r = getReaction();
    setReaction(r);
    setTimeout(() => {
      setReaction(null);
      callback();
    }, 800);
  };

  const moveNextWord = (wordIndex) => {
    try {
      setStory((prev) =>
        prev.map((word, index) =>
          index === wordIndex ? { ...word, result: wordInput } : word
        )
      );
      setWordInput("");
      const newNext = nextWord + 1;

      showReactionThenAdvance(() => {
        setNextWord(newNext);
        // Set new prompt for next word
        if (gameContest[newNext - 1]) {
          setPrompt(getPlayfulPrompt(gameContest[newNext - 1].text));
        }
        setTimeout(() => inputRef.current?.focus(), 50);
      });
    } catch (err) {
      setError("Something went wrong. Please try again.");
    }
  };

  const seeResult = (wordIndex) => {
    try {
      const resultStry = story.map((word, index) =>
        index === wordIndex ? { ...word, result: wordInput } : word
      );
      setStory(resultStry);
      setWordInput("");
      dispatch(setResultStory(resultStry));
      navigate("/result");
    } catch (err) {
      setError("Something went wrong showing your result. Please try again.");
    }
  };

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

  const progress = ((nextWord - 1) / gameContest.length) * 100;

  return (
    <PageShell>
      <Card>
        {/* Story title */}
        <div style={{
          fontSize: '13px',
          color: 'var(--text-secondary)',
          textAlign: 'center',
          marginBottom: 'var(--spacing-xs)',
        }}>
          You're filling in
        </div>
        <h2 style={{
          fontSize: '18px',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--text-primary)',
          textAlign: 'center',
          margin: '0 0 var(--spacing-lg) 0',
          wordBreak: 'break-word',
        }}>
          {storyData?.title || "a story"}
        </h2>

        {/* Progress bar */}
        <div style={{
          width: '100%',
          height: '6px',
          backgroundColor: 'rgba(0,0,0,0.06)',
          borderRadius: '3px',
          marginBottom: 'var(--spacing-sm)',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            backgroundColor: 'var(--color-primary)',
            borderRadius: '3px',
            transition: 'width 0.4s ease-out',
          }} />
        </div>
        <div style={{
          fontSize: '13px',
          color: 'var(--text-secondary)',
          marginBottom: 'var(--spacing-lg)',
          textAlign: 'right',
        }}>
          {nextWord} of {gameContest.length}
        </div>

        {/* Reaction overlay or prompt */}
        {reaction ? (
          <div style={{
            textAlign: 'center',
            padding: 'var(--spacing-xl) 0',
            animation: 'reaction-pop 0.3s ease-out',
          }}>
            <span style={{
              fontSize: '22px',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-primary)',
              fontStyle: 'italic',
            }}>
              {reaction}
            </span>
          </div>
        ) : (
          <>
            {/* Playful prompt */}
            <h2 className="ui-heading ui-heading--small" style={{
              textAlign: 'center',
              marginBottom: 'var(--spacing-lg)',
              minHeight: '32px',
            }}>
              {prompt}
            </h2>

            {/* Word type badge */}
            <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-md)' }}>
              <span style={{
                display: 'inline-block',
                padding: '4px 14px',
                fontSize: '13px',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-primary)',
                backgroundColor: 'rgba(243, 129, 0, 0.1)',
                borderRadius: '20px',
                textTransform: 'lowercase',
              }}>
                {currentGame.text}
              </span>
            </div>

            {/* Input */}
            <TextInput
              inputRef={inputRef}
              type="text"
              value={wordInput}
              onChange={(e) => setWordInput(e.target.value)}
              placeholder={`Type a ${currentGame.text.toLowerCase()}...`}
              onKeyPress={(e) => {
                if (e.key === "Enter" && wordInput.trim()) {
                  if (nextWord < gameContest.length) {
                    moveNextWord(currentGame.index);
                  } else {
                    seeResult(currentGame.index);
                  }
                }
              }}
              autoFocus
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
          </>
        )}
      </Card>

      {/* Story shape — shows blanks filling in without revealing text */}
      <div style={{
        marginTop: 'var(--spacing-md)',
        padding: 'var(--spacing-md)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        justifyContent: 'center',
        opacity: 0.7,
      }}>
        {story.map((word, i) => {
          if (typeof word === "object") {
            const gapIdx = gameContest.findIndex((g) => g.index === i);
            const isFilled = gapIdx >= 0 && gapIdx < nextWord - 1;
            const isCurrent = gapIdx === nextWord - 1;
            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  width: '32px',
                  height: '8px',
                  borderRadius: '4px',
                  backgroundColor: isFilled
                    ? 'var(--color-primary)'
                    : 'transparent',
                  border: isCurrent
                    ? '2px solid var(--color-primary)'
                    : isFilled
                    ? 'none'
                    : '1px dashed rgba(0,0,0,0.15)',
                  transition: 'all 0.3s ease',
                }}
              />
            );
          }
          return null;
        })}
      </div>

      <style>{`
        @keyframes reaction-pop {
          0% { transform: scale(0.8); opacity: 0; }
          60% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </PageShell>
  );
};

export default PlayGame;
