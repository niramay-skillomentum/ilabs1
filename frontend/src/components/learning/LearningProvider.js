"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import LearningCard from "./LearningCard";

const LearningContext = createContext(null);

/**
 * LearningProvider — Context provider for the Learning & Coaching Engine.
 *
 * Responsibilities:
 * - Maintains a queue of learning events
 * - Provides showLearningCard() to any child component
 * - Listens to 'learning_event' Socket.IO events (when socket is passed)
 * - Handles viewed/dismissed/tutorOpened interactions via API
 * - Renders the current learning card overlay
 */
export function LearningProvider({ children }) {
  const [currentEvent, setCurrentEvent] = useState(null);
  const [eventQueue, setEventQueue] = useState([]);
  const socketListenerAttached = useRef(false);

  const showLearningCard = useCallback((learningData) => {
    if (!learningData || !learningData.eventId) return;

    setCurrentEvent((prev) => {
      // Prevent duplicate event queues
      if (prev && prev.eventId === learningData.eventId) return prev;
      
      setEventQueue((q) => {
        if (q.some(item => item.eventId === learningData.eventId)) return q;
        return [...q, learningData];
      });
      
      if (!prev) return learningData;
      return prev;
    });
  }, []);

  // When current event is dismissed, show next from queue
  const showNext = useCallback(() => {
    setEventQueue((q) => {
      if (q.length > 0) {
        const [next, ...rest] = q;
        setCurrentEvent(next);
        return rest;
      }
      setCurrentEvent(null);
      return q;
    });
  }, []);

  // Record an interaction with the backend
  const recordInteraction = useCallback(async (eventId, action) => {
    if (!eventId) return;
    try {
      const token = sessionStorage.getItem("auth_token") || "";
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3002";
      await fetch(`${backendUrl}/api/learning/interact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ eventId, action })
      });
    } catch (err) {
      console.warn("[LearningProvider] Interaction recording failed:", err.message);
    }
  }, []);

  // Handle "Got It" / dismiss
  const handleDismiss = useCallback(() => {
    if (currentEvent) {
      recordInteraction(currentEvent.eventId, "dismissed");
    }
    showNext();
  }, [currentEvent, recordInteraction, showNext]);

  // Handle "Learn More"
  const handleLearnMore = useCallback((data) => {
    if (data) {
      recordInteraction(data.eventId, "viewed");
    }
    // For now, just dismiss — could open a docs page in the future
    showNext();
  }, [recordInteraction, showNext]);

  // Handle "Ask AI Tutor"
  const handleAskTutor = useCallback((data) => {
    if (data) {
      recordInteraction(data.eventId, "tutorOpened");
    }

    // Find and click the TutorialPanel button to open it, with pre-filled context
    // Store the mistake context so the TutorialPanel can use it
    if (data) {
      try {
        sessionStorage.setItem("learning_tutor_context", JSON.stringify({
          desk: data.desk,
          tradeRef: data.tradeRef,
          mistake: data.title,
          mistakeCode: data.mistakeCode,
          message: data.message,
          whyItMatters: data.whyItMatters,
          correctAction: data.correctAction
        }));
      } catch (e) { /* sessionStorage may not be available */ }

      // Try to find and click the tutorial panel button
      const tutorButtons = document.querySelectorAll("button");
      for (const btn of tutorButtons) {
        if (btn.textContent?.includes("🤖") || btn.textContent?.includes("Tutorial")) {
          btn.click();
          break;
        }
      }
    }

    showNext();
  }, [recordInteraction, showNext]);

  // Attach Socket.IO listener for learning events
  const attachSocketListener = useCallback((socket) => {
    if (!socket || socketListenerAttached.current) return;

    socket.on("learning_event", (payload) => {
      if (payload && payload.eventId) {
        showLearningCard(payload);
      }
    });

    socketListenerAttached.current = true;
  }, [showLearningCard]);

  // Detach when unmounting
  useEffect(() => {
    return () => {
      socketListenerAttached.current = false;
    };
  }, []);

  const contextValue = {
    showLearningCard,
    attachSocketListener,
    currentEvent,
    hasActiveLearning: !!currentEvent
  };

  return (
    <LearningContext.Provider value={contextValue}>
      {children}
      {/* Render the current learning card */}
      {currentEvent && (
        <LearningCard
          data={currentEvent}
          onDismiss={handleDismiss}
          onLearnMore={handleLearnMore}
          onAskTutor={handleAskTutor}
        />
      )}
    </LearningContext.Provider>
  );
}

/**
 * useLearning — Custom hook for consuming the learning context.
 *
 * Usage:
 *   const { showLearningCard, attachSocketListener } = useLearning();
 *
 *   // In an API error handler:
 *   if (data.learning) showLearningCard(data.learning);
 *
 *   // In socket setup:
 *   attachSocketListener(socket);
 */
export function useLearning() {
  const context = useContext(LearningContext);
  if (!context) {
    // Graceful fallback — return no-ops if used outside provider
    return {
      showLearningCard: () => {},
      attachSocketListener: () => {},
      currentEvent: null,
      hasActiveLearning: false
    };
  }
  return context;
}
