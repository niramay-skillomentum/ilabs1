"use client";

import { memo, useEffect, useRef, useCallback } from "react";
import "./LearningCard.css";

// Severity icon mapping
const SEVERITY_ICONS = {
  INFO: "ℹ️",
  WARNING: "⚠️",
  ERROR: "🛑",
  CRITICAL: "🔴"
};

/**
 * LearningCard — Enterprise-grade coaching popup.
 * Renders a professional learning moment when a user makes a mistake.
 *
 * Props:
 *   data        - The learning event object from the backend
 *   onDismiss   - Called when user clicks "Got It" or presses ESC
 *   onLearnMore - Called when user clicks "Learn More"
 *   onAskTutor  - Called when user clicks "Ask AI Tutor"
 */
const LearningCard = memo(function LearningCard({ data, onDismiss, onLearnMore, onAskTutor }) {
  const cardRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Focus trapping + ESC handling
  useEffect(() => {
    if (!data) return;

    // Store the previously focused element
    previousFocusRef.current = document.activeElement;

    // Focus the card
    const timer = setTimeout(() => {
      if (cardRef.current) {
        cardRef.current.focus();
      }
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onDismiss?.();
        return;
      }

      // Focus trapping
      if (e.key === "Tab" && cardRef.current) {
        const focusable = cardRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
      // Restore focus on unmount
      if (previousFocusRef.current && previousFocusRef.current.focus) {
        previousFocusRef.current.focus();
      }
    };
  }, [data, onDismiss]);

  const handleDismiss = useCallback(() => {
    onDismiss?.();
  }, [onDismiss]);

  const handleLearnMore = useCallback(() => {
    onLearnMore?.(data);
  }, [onLearnMore, data]);

  const handleAskTutor = useCallback(() => {
    onAskTutor?.(data);
  }, [onAskTutor, data]);

  if (!data) return null;

  const severity = data.severity || "WARNING";
  const realWorldImpact = Array.isArray(data.realWorldImpact) ? data.realWorldImpact : [];

  return (
    <>
      {/* Overlay */}
      <div
        className="learning-overlay"
        onClick={handleDismiss}
        aria-hidden="true"
      />

      {/* Card */}
      <div
        ref={cardRef}
        className="learning-card"
        data-severity={severity}
        role="dialog"
        aria-modal="true"
        aria-label={`Learning Moment: ${data.title || "Validation Feedback"}`}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="learning-header">
          <div className="learning-icon" data-severity={severity} aria-hidden="true">
            {SEVERITY_ICONS[severity] || "ℹ️"}
          </div>
          <div className="learning-header-content">
            <div className="learning-label" data-severity={severity}>
              Learning Moment
            </div>
            {data.mentorIntro && (
              <div className="learning-mentor-intro">{data.mentorIntro}</div>
            )}
            <h3 className="learning-title">{data.title}</h3>
          </div>
          <button
            className="learning-close"
            onClick={handleDismiss}
            aria-label="Close learning card"
            title="Close (ESC)"
          >
            ✕
          </button>
        </div>

        {/* Body (scrollable) */}
        <div className="learning-body">
          {/* Description */}
          {data.message && (
            <div className="learning-section">
              <p className="learning-section-text">{data.message}</p>
            </div>
          )}

          {/* Why This Matters */}
          {data.whyItMatters && (
            <div className="learning-section">
              <div className="learning-section-label">Why This Matters</div>
              <p className="learning-section-text">{data.whyItMatters}</p>
            </div>
          )}

          {/* Real-World Impact */}
          {realWorldImpact.length > 0 && (
            <div className="learning-section" data-severity={severity}>
              <div className="learning-section-label">Real-World Impact</div>
              <ul className="learning-impact-list">
                {realWorldImpact.map((impact, idx) => (
                  <li key={idx} className="learning-impact-item">
                    <span className="learning-impact-bullet" />
                    <span>{impact}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Correct Action */}
          {data.correctAction && (
            <div className="learning-section">
              <div className="learning-section-label">Correct Action</div>
              <div className="learning-action-text">{data.correctAction}</div>
            </div>
          )}


        </div>

        {/* Footer */}
        <div className="learning-footer">
          <button
            className="learning-btn learning-btn-secondary"
            onClick={handleLearnMore}
          >
            Learn More
          </button>
          <button
            className="learning-btn learning-btn-tutor"
            onClick={handleAskTutor}
          >
            Ask AI Tutor
          </button>
          <button
            className="learning-btn learning-btn-primary"
            onClick={handleDismiss}
          >
            Got It
          </button>
        </div>
      </div>
    </>
  );
});

export default LearningCard;
