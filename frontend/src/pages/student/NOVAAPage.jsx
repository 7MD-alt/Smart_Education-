import { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import DashboardLayout from "../../components/layout/DashboardLayout";

// ── HUD constants & CSS ───────────────────────────────────────────────────────
import { BG, injectNovaaCSS } from "../../components/novaa/constants";

// ── Hooks ─────────────────────────────────────────────────────────────────────
import { useBootSequence  } from "../../hooks/novaa/useBootSequence";
import { useCourses       } from "../../hooks/novaa/useCourses";
import { useChatSessions  } from "../../hooks/novaa/useChatSessions";
import { useFileUpload    } from "../../hooks/novaa/useFileUpload";
import { useVoiceInput    } from "../../hooks/novaa/useVoiceInput";
import { useSendMessage   } from "../../hooks/novaa/useSendMessage";

// ── Layout components ─────────────────────────────────────────────────────────
import NovaaHeader  from "../../components/novaa/NovaaHeader";
import SessionPanel from "../../components/novaa/SessionPanel";
import ChatArea     from "../../components/novaa/ChatArea";

// ─────────────────────────────────────────────────────────────────────────────
// Page — thin orchestrator that wires hooks → components.
// Contains NO business logic: all state and side-effects live in the hooks.
// ─────────────────────────────────────────────────────────────────────────────
const NOVAAPage = () => {
  const { user }     = useAuth();
  const { courseId } = useParams();

  // ── Inject HUD stylesheet once ──────────────────────────────────────────
  useEffect(() => { injectNovaaCSS(); }, []);

  // ── Local input state (lives here so InputBar + hooks share one value) ──
  const [input, setInput] = useState("");
  const inputRef = useRef(null);

  // ── Hooks ────────────────────────────────────────────────────────────────
  const boot     = useBootSequence();
  const courses  = useCourses(courseId);
  const sessions = useChatSessions(inputRef);
  const file     = useFileUpload();
  const voice    = useVoiceInput(input, setInput, inputRef);
  const chat     = useSendMessage(
    sessions.activeSession,
    courses.selectedCourse,
    file.attachedFile,
    file.clearFile,
  );

  // ── Derived ──────────────────────────────────────────────────────────────
  const { activeCourse } = courses;

  // ── Cross-hook wiring ────────────────────────────────────────────────────
  // When opening an existing session, load its historical messages
  const handleOpenSession = async (session) => {
    const msgs = await sessions.openSession(session);
    chat.loadMessages(msgs);
  };

  // When ending a session, also clear the message list
  const handleEndSession = () => {
    sessions.endSession();
    chat.clearMessages();
    setInput("");
  };

  // When creating a new session, pass the active course title for labelling
  const handleCreateSession = () => {
    sessions.createSession(activeCourse?.title);
    chat.clearMessages();
    setInput("");
  };

  // Keyboard: Enter sends, Shift+Enter inserts newline
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!input.trim() || chat.aiLoading || !sessions.activeSession) return;
    chat.sendMessage(input);
    setInput("");
  };

  const handleInjectTask = (task) => {
    setInput(task.p);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      {/* Isolation wrapper — cancels <main> padding, covers Aurora orbs */}
      <div
        className="-m-5 md:-m-6 lg:-m-8 flex flex-col"
        style={{ height: "calc(100vh - 56px)", background: BG, overflow: "hidden", position: "relative" }}
      >
        <NovaaHeader
          booted={boot.booted}
          bootText={boot.bootText}
          activeSession={sessions.activeSession}
          elapsed={sessions.elapsed}
          username={user?.username}
          onEndSession={handleEndSession}
        />

        <div className="flex flex-1 overflow-hidden">
          <SessionPanel
            sessions={sessions.sessions}
            sessionsLoading={sessions.sessionsLoading}
            activeSession={sessions.activeSession}
            courses={courses.courses}
            selectedCourse={courses.selectedCourse}
            activeCourse={activeCourse}
            onCreateSession={handleCreateSession}
            onOpenSession={handleOpenSession}
            onDeleteSession={sessions.deleteSession}
            onSelectCourse={courses.setSelectedCourse}
          />

          <ChatArea
            activeSession={sessions.activeSession}
            activeCourse={activeCourse}
            messages={chat.messages}
            aiLoading={chat.aiLoading}
            bottomRef={chat.bottomRef}
            onFollowup={(text) => { chat.sendMessage(text); setInput(""); }}
            onInitialize={handleCreateSession}
            input={input}
            setInput={setInput}
            inputRef={inputRef}
            voice={voice}
            file={file}
            onSend={handleSend}
            onKeyDown={handleKeyDown}
            onInjectTask={handleInjectTask}
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default NOVAAPage;
