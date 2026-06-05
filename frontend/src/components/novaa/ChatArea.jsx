import { C, G } from "./constants";
import WelcomeScreen from "./WelcomeScreen";
import NovaaMessage  from "./NovaaMessage";
import NovaaTyping   from "./NovaaTyping";
import InputBar      from "./InputBar";

/**
 * Center pane of the NOVAA HUD.
 *
 * Manages two states:
 *  - No active session → renders WelcomeScreen
 *  - Active session    → renders session sub-header, message feed, and InputBar
 */
const ChatArea = ({
  activeSession,
  activeCourse,
  messages,
  aiLoading,
  bottomRef,
  onFollowup,
  onInitialize,
  // Input bar props
  input,
  setInput,
  inputRef,
  voice,
  file,
  onSend,
  onKeyDown,
  onInjectTask,
}) => (
  <div className="flex flex-1 flex-col overflow-hidden" style={{ background: "#000d1a" }}>

    {/* ── No session ─────────────────────────────────────────────────────── */}
    {!activeSession && <WelcomeScreen onInitialize={onInitialize} />}

    {/* ── Active session ─────────────────────────────────────────────────── */}
    {activeSession && (
      <>
        {/* Sub-header */}
        <div
          className="shrink-0 flex items-center justify-between px-5 py-2"
          style={{ background: "rgba(0,8,20,.8)", borderBottom: "1px solid rgba(0,210,255,.1)" }}
        >
          <div className="flex items-center gap-2">
            <span className="nv-mono text-[10px] tracking-widest" style={{ color: `${C}88` }}>◈ SESSION</span>
            <span className="text-xs font-medium" style={{ color: "#7ab8d4" }}>{activeSession.title}</span>
          </div>
          {activeCourse && (
            <div className="flex items-center gap-1.5">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  background: (activeCourse.material_count ?? 0) > 0 ? G : "#f59e0b",
                  boxShadow:  `0 0 4px ${(activeCourse.material_count ?? 0) > 0 ? G : "#f59e0b"}`,
                }}
              />
              <span className="nv-mono text-[9px]" style={{ color: `${C}66` }}>
                {(activeCourse.material_count ?? 0) > 0
                  ? `RAG ACTIVE · ${activeCourse.material_count} FILES`
                  : "NO MATERIAL UPLOADED"}
              </span>
            </div>
          )}
        </div>

        {/* Message feed */}
        <div className="flex-1 overflow-y-auto nv-scroll px-6 py-5 space-y-5">
          {messages.length === 0 && !aiLoading && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <div className="nv-mono text-xs" style={{ color: `${C}55` }}>SESSION INITIALIZED — AWAITING INPUT</div>
              <div className="nv-mono text-[10px]" style={{ color: `${C}33` }}>
                Use the task chips below or type your question
              </div>
            </div>
          )}
          {messages.map(msg => (
            <NovaaMessage key={msg.id} msg={msg} onFollowup={onFollowup} />
          ))}
          {/* Typing dots only until the streaming bubble appears (it becomes the live indicator) */}
          {aiLoading && !messages.some(m => m.streaming) && <NovaaTyping />}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <InputBar
          input={input}
          setInput={setInput}
          inputRef={inputRef}
          fileInputRef={file.fileInputRef}
          attachedFile={file.attachedFile}
          fileUploading={file.fileUploading}
          onFileSelect={file.handleFileSelect}
          onClearFile={file.clearFile}
          onSend={onSend}
          onKeyDown={onKeyDown}
          onInjectTask={onInjectTask}
          isListening={voice.isListening}
          speechLang={voice.speechLang}
          setSpeechLang={voice.setSpeechLang}
          speechSupported={voice.speechSupported}
          onToggleListening={voice.toggleListening}
          aiLoading={aiLoading}
          activeCourseTitle={activeCourse?.title}
        />
      </>
    )}
  </div>
);

export default ChatArea;
