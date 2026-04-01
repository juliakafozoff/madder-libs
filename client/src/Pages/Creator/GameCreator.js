import React, { useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import axios from "../../axios";
import { setStory } from "../../store/actions/story";
import PageShell from "../../components/ui/PageShell";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import TextInput from "../../components/ui/TextInput";
import LogoutButton from "../../components/ui/LogoutButton";
import { autoLogout } from "../../store/actions/auth";
import { useToast } from "../../components/ui/Toast";
import { normalizeQualifier } from "./placeholderUtils";
import StoryEditor from "./StoryEditor";
import WordPalette from "./WordPalette";
import StoryPreview from "./StoryPreview";

const BLANKS = [
  "Adjective", "Thing", "Verb", "Adverb", "Person",
  "Place", "Emotion", "Color", "Number", "Size", "Time",
];

const GameCreator = () => {
  const [customChips, setCustomChips] = useState([]);
  const titleRef = useRef("");
  const storyAreaRef = useRef(null);
  const previewSectionRef = useRef(null);
  const editorSectionRef = useRef(null);
  const [storySegments, setStorySegments] = useState([]);
  const [updatedStory, setUpdatedStory] = useState([]);
  const [isPreview, setIsPreview] = useState(false);
  const [selectedForms, setSelectedForms] = useState({});
  const toast = useToast();

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();

  const handleLogout = async () => {
    await dispatch(autoLogout());
    navigate("/login");
  };

  const viewStory = () => {
    const result = [];

    storySegments.forEach(segment => {
      if (segment.type === 'placeholder') {
        const normalizedQualifier = normalizeQualifier(segment.qualifier, segment.typeName);
        result.push({
          tag: "span",
          className: "filled-word",
          text: segment.label || segment.typeName,
          form: normalizedQualifier,
        });
      } else {
        const text = segment.content;
        const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const sortedBlanks = [...BLANKS].sort((a, b) => b.length - a.length);
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

    setUpdatedStory(result);
    setIsPreview(true);

    setTimeout(() => {
      previewSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const backToEditing = () => {
    setIsPreview(false);
    setTimeout(() => {
      editorSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const createStory = async () => {
    if (!titleRef.current.value) {
      toast.info("Enter a title");
      return;
    }
    const token = localStorage.getItem("userToken");
    const headers = { "Content-Type": "application/json" };
    if (token) {
      headers.authorization = token;
    }

    try {
      const response = await axios.put(
        `/story/update/${id}`,
        {
          title: titleRef.current.value,
          story: updatedStory,
        },
        { headers }
      );
      dispatch(setStory(response.data.story));
      navigate(`/created-game/${id}`);
    } catch (error) {
      toast.error(error.response?.data?.error || "Couldn't save your story. Please try again.");
    }
  };

  const token = localStorage.getItem("userToken");

  return (
    <PageShell wide>
      {token && <LogoutButton onClick={handleLogout} />}
      <Card wide>
        <h1 className="ui-heading" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          {isPreview ? 'Preview & Share' : 'Create Your Story'}
          {isPreview && (
            <span style={{
              fontSize: '12px',
              fontWeight: 'var(--font-weight-medium)',
              color: '#0081c9',
              backgroundColor: 'rgba(0, 129, 201, 0.1)',
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Preview
            </span>
          )}
        </h1>

        <div ref={editorSectionRef} style={{
          opacity: isPreview ? 0.6 : 1,
          pointerEvents: isPreview ? 'none' : 'auto',
          transition: 'opacity var(--transition-base)'
        }}>
          <TextInput
            inputRef={titleRef}
            type="text"
            placeholder="Enter story title"
            label="Title"
            required
          />

          <StoryEditor
            storyAreaRef={storyAreaRef}
            storySegments={storySegments}
            setStorySegments={setStorySegments}
            setCustomChips={setCustomChips}
            setSelectedForms={setSelectedForms}
          />

          <WordPalette
            blanks={BLANKS}
            customChips={customChips}
            setCustomChips={setCustomChips}
            selectedForms={selectedForms}
            setSelectedForms={setSelectedForms}
          />
        </div>

        {!isPreview && (
          <Button onClick={viewStory} disabled={storySegments.length === 0} style={{ marginTop: 'var(--spacing-lg)' }}>
            Preview
          </Button>
        )}

        {isPreview && (
          <StoryPreview
            updatedStory={updatedStory}
            onCreateStory={createStory}
            onBackToEditing={backToEditing}
            previewSectionRef={previewSectionRef}
          />
        )}
      </Card>
    </PageShell>
  );
};

export default GameCreator;
