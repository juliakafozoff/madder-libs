import React from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";

const StoryPreview = ({ updatedStory, onCreateStory, onBackToEditing, previewSectionRef }) => {
  return (
    <div
      ref={previewSectionRef}
      style={{
        marginTop: 'var(--spacing-lg)',
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start'
      }}
    >
      <div style={{
        maxWidth: '672px',
        width: 'auto',
        margin: '0 auto',
        flexShrink: 0
      }}>
        <Card
          className="preview-card"
          style={{
            backgroundColor: '#f9fafb',
            width: '100%'
          }}
        >
          <h2 className="ui-heading ui-heading--small" style={{ textAlign: 'center' }}>Story Preview</h2>
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
            {updatedStory && updatedStory.length > 0 ? (
              updatedStory.map((word, index) => {
                if (typeof word === "object" && word.className) {
                  return (
                    <span key={index} className={word.className}>
                      {word.text}
                    </span>
                  );
                }
                return <span key={index}>{word}</span>;
              })
            ) : (
              <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                No story content yet. Add some text and placeholders to see the preview.
              </span>
            )}
          </div>
          <div style={{
            display: 'flex',
            gap: 'var(--spacing-md)',
            marginTop: 'var(--spacing-lg)',
            justifyContent: 'center'
          }}>
            <Button onClick={onCreateStory}>
              Generate link
            </Button>
            <Button
              onClick={onBackToEditing}
              style={{
                backgroundColor: 'transparent',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)'
              }}
            >
              Back to editing
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default StoryPreview;
