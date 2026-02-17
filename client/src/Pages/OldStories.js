import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRightIcon, ClipboardCopyIcon, TrashIcon } from "@heroicons/react/outline";
import PageShell from "../components/ui/PageShell";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import LogoutButton from "../components/ui/LogoutButton";
import { useDispatch } from "react-redux";
import { autoLogout } from "../store/actions/auth";
import axios from "../axios";

const OldStories = () => {
  const [activeTab, setActiveTab] = useState("templates"); // "templates" or "results"
  const [templates, setTemplates] = useState([]);
  const [completedStories, setCompletedStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState(null); // { type: 'template'|'result', id: string, title: string }
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    // Load templates from API
    const fetchTemplates = async () => {
      try {
        const token = localStorage.getItem("userToken");
        const response = await axios.get("/user/stories", {
          headers: {
            "Content-Type": "application/json",
            authorization: token,
          },
        });
        
        if (response.data.success && response.data.user.storiesCreated) {
          // Fetch play counts from backend
          const playCountPromises = response.data.user.storiesCreated.map(async (template) => {
            try {
              const resultsResponse = await axios.get(`/story/results/${template.storyId}`, {
                headers: {
                  "Content-Type": "application/json",
                  authorization: token,
                },
              });
              const playCount = resultsResponse.data.success ? resultsResponse.data.results.length : 0;
              return {
                ...template,
                playCount,
              };
            } catch (error) {
              console.error(`Error fetching play count for template ${template.storyId}:`, error);
              // Fallback to localStorage count
              const completedStories = JSON.parse(
                localStorage.getItem("completedStories") || "[]"
              );
              const playCount = completedStories.filter(
                (result) => result.templateId === template.storyId
              ).length;
              return {
                ...template,
                playCount,
              };
            }
          });
          
          const templatesWithStatus = await Promise.all(playCountPromises);
          setTemplates(templatesWithStatus);
        }
      } catch (error) {
        console.error("Error fetching templates:", error);
      } finally {
        setLoading(false);
      }
    };

    // Load completed stories from backend (for authenticated users)
    const fetchResults = async () => {
      try {
        const token = localStorage.getItem("userToken");
        if (token) {
          // Try to fetch from backend first
          try {
            const response = await axios.get("/story/my-results", {
              headers: {
                "Content-Type": "application/json",
                authorization: token,
              },
            });
            
            if (response.data.success && response.data.results) {
              // Transform backend results to match localStorage format
              const transformedResults = response.data.results.map((result) => ({
                resultId: result.resultId,
                templateId: result.templateId,
                title: result.title,
                resultText: result.resultText,
                createdAt: result.createdAt,
              }));
              
              // Merge with localStorage results (for backward compatibility)
              const localStorageResults = JSON.parse(
                localStorage.getItem("completedStories") || "[]"
              );
              
              // Combine and deduplicate (prefer backend results)
              const combinedResults = [...transformedResults];
              localStorageResults.forEach((localResult) => {
                const exists = combinedResults.some(
                  (r) => r.resultId === localResult.resultId
                );
                if (!exists) {
                  combinedResults.push(localResult);
                }
              });
              
              // Sort by createdAt (newest first)
              const sortedStories = combinedResults.sort((a, b) => 
                new Date(b.createdAt) - new Date(a.createdAt)
              );
              setCompletedStories(sortedStories);
              return;
            }
          } catch (backendError) {
            console.error("Error fetching results from backend:", backendError);
            // Fall back to localStorage
          }
        }
        
        // Fallback to localStorage
        const savedStoriesRaw = localStorage.getItem("completedStories");
        const savedStories = JSON.parse(savedStoriesRaw || "[]");
        
        // Sort by createdAt (newest first)
        const sortedStories = savedStories.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        setCompletedStories(sortedStories);
      } catch (error) {
        console.error("Error loading results:", error);
        // Fallback to localStorage
        const savedStoriesRaw = localStorage.getItem("completedStories");
        const savedStories = JSON.parse(savedStoriesRaw || "[]");
        const sortedStories = savedStories.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        setCompletedStories(sortedStories);
      }
    };
    
    fetchTemplates();
    fetchResults();
  }, []);

  const handleLogout = async () => {
    await dispatch(autoLogout());
    navigate("/login");
  };

  const handleCopyCode = (e, code) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent row click
    navigator.clipboard.writeText(code).then(() => {
      alert("Copied!");
    }).catch((err) => {
      console.error("Failed to copy:", err);
      alert("Failed to copy code");
    });
  };

  const handleRowClick = (templateId) => {
    navigate(`/start/${templateId}`);
  };

  const handleDeleteClick = (e, type, id, title) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteModal({ type, id, title });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal) return;

    try {
      if (deleteModal.type === "template") {
        // Delete template from backend
        const token = localStorage.getItem("userToken");
        
        await axios.delete(`/story/delete/${deleteModal.id}`, {
          headers: {
            "Content-Type": "application/json",
            authorization: token,
          },
        });
        
        // Refresh templates list
        const response = await axios.get("/user/stories", {
          headers: {
            "Content-Type": "application/json",
            authorization: token,
          },
        });
        
        if (response.data.success && response.data.user.storiesCreated) {
          const completedStories = JSON.parse(
            localStorage.getItem("completedStories") || "[]"
          );
          
          const templatesWithStatus = response.data.user.storiesCreated.map((template) => {
            const playCount = completedStories.filter(
              (result) => result.templateId === template.storyId
            ).length;
            
            return {
              ...template,
              playCount,
            };
          });
          
          setTemplates(templatesWithStatus);
        } else {
          // If API doesn't return stories, remove from local state
          setTemplates((prev) => prev.filter((t) => {
            const id = t._id || t.id || t.storyId;
            return id !== deleteModal.id;
          }));
        }
      } else if (deleteModal.type === "result") {
        // Try to delete from backend first
        try {
          const token = localStorage.getItem("userToken");
          if (token) {
            // Note: We don't have a delete endpoint for results yet, but we can try
            // For now, we'll just delete from localStorage and refresh from backend
            // TODO: Add DELETE /story/result/:resultId endpoint if needed
          }
        } catch (backendError) {
          console.error("Error deleting from backend:", backendError);
          // Continue to localStorage deletion
        }
        
        // Delete result from localStorage
        const savedStories = JSON.parse(
          localStorage.getItem("completedStories") || "[]"
        );
        const updatedStories = savedStories.filter(
          (story) => story.resultId !== deleteModal.id
        );
        localStorage.setItem("completedStories", JSON.stringify(updatedStories));
        
        // Refresh results list from backend
        try {
          const token = localStorage.getItem("userToken");
          if (token) {
            const response = await axios.get("/story/my-results", {
              headers: {
                "Content-Type": "application/json",
                authorization: token,
              },
            });
            
            if (response.data.success && response.data.results) {
              const transformedResults = response.data.results.map((result) => ({
                resultId: result.resultId,
                templateId: result.templateId,
                title: result.title,
                resultText: result.resultText,
                createdAt: result.createdAt,
              }));
              
              const localStorageResults = JSON.parse(
                localStorage.getItem("completedStories") || "[]"
              );
              
              const combinedResults = [...transformedResults];
              localStorageResults.forEach((localResult) => {
                const exists = combinedResults.some(
                  (r) => r.resultId === localResult.resultId
                );
                if (!exists) {
                  combinedResults.push(localResult);
                }
              });
              
              const sortedStories = combinedResults.sort((a, b) => 
                new Date(b.createdAt) - new Date(a.createdAt)
              );
              setCompletedStories(sortedStories);
              return;
            }
          }
        } catch (error) {
          console.error("Error refreshing results:", error);
        }
        
        // Fallback: refresh from localStorage only
        const sortedStories = updatedStories.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        setCompletedStories(sortedStories);
      }
      
      setDeleteModal(null);
    } catch (error) {
      console.error("Error deleting:", error);
      const errorMessage = error.response?.data?.msg || error.response?.data?.message || error.message || "Failed to delete. Please try again.";
      alert(errorMessage);
      // Don't close modal on error so user can try again
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal(null);
  };

  const renderTemplatesTab = () => {
    if (loading) {
      return (
        <p className="ui-text ui-text--secondary" style={{ textAlign: 'center' }}>
          Loading templates...
        </p>
      );
    }

    if (templates.length === 0) {
      return (
        <p className="ui-text ui-text--secondary" style={{ textAlign: 'center' }}>
          No templates yet. Create your first story!
        </p>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
        {templates.map((template) => {
          const statusText = template.playCount === 0 
            ? "Unplayed" 
            : `Played ${template.playCount} time${template.playCount !== 1 ? 's' : ''}`;

          return (
            <div
              key={template._id || template.storyId}
              onClick={() => handleRowClick(template.storyId)}
              style={{
                padding: 'var(--spacing-md)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-secondary)',
                cursor: 'pointer',
                transition: 'all var(--transition-base)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 'var(--spacing-md)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f9fafb';
                e.currentTarget.style.borderColor = 'var(--color-primary)';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-secondary)';
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <button
                type="button"
                onClick={(e) => {
                  // Use _id if available, otherwise fall back to id or storyId
                  const templateId = template._id || template.id || template.storyId;
                  handleDeleteClick(e, "template", templateId, template.title || "Untitled story");
                }}
                style={{
                  padding: 'var(--spacing-xs)',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 'var(--radius-sm)',
                  transition: 'all var(--transition-base)',
                  flexShrink: 0,
                  marginRight: 'var(--spacing-sm)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#fee2e2';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                title="Delete template"
              >
                <TrashIcon 
                  className="w-5 h-5" 
                  style={{ 
                    color: '#dc2626',
                    flexShrink: 0
                  }} 
                />
              </button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)', flex: 1 }}>
                <h2 style={{
                  fontSize: '18px',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--text-primary)',
                  margin: 0
                }}>
                  {template.title || "Untitled story"}
                </h2>
                <p style={{
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  margin: 0
                }}>
                  {statusText}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                <button
                  type="button"
                  onClick={(e) => handleCopyCode(e, template.storyId)}
                  style={{
                    padding: 'var(--spacing-xs)',
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 'var(--radius-sm)',
                    transition: 'all var(--transition-base)',
                    pointerEvents: 'auto'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-secondary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  title="Copy code"
                >
                  <ClipboardCopyIcon 
                    className="w-5 h-5" 
                    style={{ 
                      color: 'var(--text-secondary)',
                      flexShrink: 0
                    }} 
                  />
                </button>
                <ChevronRightIcon 
                  className="w-5 h-5" 
                  style={{ 
                    color: 'var(--text-secondary)',
                    flexShrink: 0,
                    pointerEvents: 'none'
                  }} 
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderResultsTab = () => {
    if (completedStories.length === 0) {
      return (
        <p className="ui-text ui-text--secondary" style={{ textAlign: 'center' }}>
          No completed stories yet. Play a story to see results here!
        </p>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
        {completedStories.map((story) => {
          // Format date
          const date = new Date(story.createdAt);
          const formattedDate = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });

          // Get first line/snippet of resultText (first 60 chars)
          const snippet = story.resultText.length > 60
            ? story.resultText.substring(0, 60).trim() + "..."
            : story.resultText;

          return (
            <div
              key={story.resultId}
              onClick={() => {
                navigate(`/story/${story.resultId}`);
              }}
              style={{
                padding: 'var(--spacing-md)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-secondary)',
                cursor: 'pointer',
                transition: 'all var(--transition-base)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 'var(--spacing-md)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f9fafb';
                e.currentTarget.style.borderColor = 'var(--color-primary)';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-secondary)';
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <button
                type="button"
                onClick={(e) => handleDeleteClick(e, "result", story.resultId, story.title || "Untitled story")}
                style={{
                  padding: 'var(--spacing-xs)',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 'var(--radius-sm)',
                  transition: 'all var(--transition-base)',
                  flexShrink: 0,
                  marginRight: 'var(--spacing-sm)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#fee2e2';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                title="Delete result"
              >
                <TrashIcon 
                  className="w-5 h-5" 
                  style={{ 
                    color: '#dc2626',
                    flexShrink: 0
                  }} 
                />
              </button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)', flex: 1 }}>
                <h2 style={{
                  fontSize: '18px',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--text-primary)',
                  margin: 0
                }}>
                  {story.title || "Untitled story"}
                </h2>
                <p style={{
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  margin: 0
                }}>
                  {formattedDate} • {snippet}
                </p>
              </div>
              <ChevronRightIcon 
                className="w-5 h-5" 
                style={{ 
                  color: 'var(--text-secondary)',
                  flexShrink: 0
                }} 
              />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <PageShell>
      <LogoutButton onClick={handleLogout} />
      <Card>
        <h1 className="ui-heading">My Stories</h1>
        
        {/* Tab Toggle */}
        <div style={{
          display: 'flex',
          gap: 'var(--spacing-sm)',
          marginBottom: 'var(--spacing-lg)',
          borderBottom: '2px solid var(--border-color)'
        }}>
          <button
            onClick={() => setActiveTab("templates")}
            style={{
              padding: 'var(--spacing-md) var(--spacing-lg)',
              border: 'none',
              borderBottom: activeTab === "templates" ? '3px solid var(--color-primary)' : '3px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === "templates" ? 'var(--color-primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === "templates" ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)',
              cursor: 'pointer',
              fontSize: '16px',
              transition: 'all var(--transition-base)',
              marginBottom: '-2px'
            }}
          >
            Templates
          </button>
          <button
            onClick={() => setActiveTab("results")}
            style={{
              padding: 'var(--spacing-md) var(--spacing-lg)',
              border: 'none',
              borderBottom: activeTab === "results" ? '3px solid var(--color-primary)' : '3px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === "results" ? 'var(--color-primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === "results" ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)',
              cursor: 'pointer',
              fontSize: '16px',
              transition: 'all var(--transition-base)',
              marginBottom: '-2px'
            }}
          >
            Results
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "templates" ? renderTemplatesTab() : renderResultsTab()}

        <div style={{ marginTop: 'var(--spacing-lg)', textAlign: 'left' }}>
          <Button variant="tertiary" onClick={() => navigate("/home")} style={{ width: 'auto', display: 'inline-block' }}>
            Back
          </Button>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={handleDeleteCancel}
        >
          <Card
            style={{
              maxWidth: '400px',
              width: '90%',
              padding: 'var(--spacing-lg)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="ui-heading ui-heading--small" style={{ marginBottom: 'var(--spacing-md)' }}>
              Delete story?
            </h2>
            <p className="ui-text ui-text--secondary" style={{ marginBottom: 'var(--spacing-lg)' }}>
              This can't be undone.
            </p>
            <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'flex-end' }}>
              <Button variant="tertiary" onClick={handleDeleteCancel} style={{ width: 'auto' }}>
                Cancel
              </Button>
              <Button 
                onClick={handleDeleteConfirm} 
                style={{ 
                  width: 'auto',
                  backgroundColor: '#dc2626',
                  borderColor: '#dc2626'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#b91c1c';
                  e.currentTarget.style.borderColor = '#b91c1c';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#dc2626';
                  e.currentTarget.style.borderColor = '#dc2626';
                }}
              >
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}
    </PageShell>
  );
};

export default OldStories;
