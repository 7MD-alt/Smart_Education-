import { Send, Paperclip, X, FileText, Mic } from "lucide-react";
import { C, AGENT_TASKS } from "./constants";

/**
 * Bottom input area of the NOVAA chat panel.
 *
 * Renders:
 *  - Horizontal scrollable task chip rail
 *  - Attached-file pill (dismissible)
 *  - Input row: file attach · mic + lang picker · textarea · send button
 */
const InputBar = ({
  input,
  setInput,
  inputRef,
  fileInputRef,
  attachedFile,
  fileUploading,
  onFileSelect,
  onClearFile,
  onSend,
  onKeyDown,
  onInjectTask,
  isListening,
  speechLang,
  setSpeechLang,
  speechSupported,
  onToggleListening,
  aiLoading,
  activeCourseTitle,
}) => (
  <div className="shrink-0" style={{ background: "#000612" }}>
    {/* ── Task chips ─────────────────────────────────────────────────────── */}
    <div
      className="px-4 py-2 overflow-x-auto"
      style={{ borderTop: "1px solid rgba(0,210,255,.1)" }}
    >
      <div className="flex gap-2 w-max">
        {AGENT_TASKS.map((t, i) => (
          <button
            key={i}
            onClick={() => onInjectTask(t)}
            className="nv-task-chip flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[10px] whitespace-nowrap nv-mono tracking-wide"
            style={{ color: `${C}99`, background: "rgba(0,210,255,.03)" }}
          >
            <span>{t.e}</span>
            <span>{t.t}</span>
          </button>
        ))}
      </div>
    </div>

    {/* ── Input row ──────────────────────────────────────────────────────── */}
    <div className="px-4 pb-4 pt-2">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.docx,.py,.js,.ts,.jsx,.tsx,.java,.c,.cpp,.cs,.go,.rs,.php,.rb,.swift,.kt,.html,.css,.sql,.sh,.json,.xml,.yaml,.yml,.txt,.md,.csv"
        onChange={onFileSelect}
      />

      {/* Attached file pill */}
      {attachedFile && (
        <div
          className="mb-2 flex items-center gap-2 rounded px-3 py-2"
          style={{ border: `1px solid ${C}33`, background: `${C}0d` }}
        >
          <FileText className="h-3.5 w-3.5 shrink-0" style={{ color: C }} />
          <div className="min-w-0 flex-1">
            <p className="truncate nv-mono text-[11px]" style={{ color: C }}>{attachedFile.filename}</p>
            {attachedFile.truncated && (
              <p className="nv-mono text-[9px]" style={{ color: `${C}66` }}>Truncated to 12 000 chars</p>
            )}
          </div>
          <button
            onClick={onClearFile}
            style={{ color: `${C}66` }}
            onMouseEnter={e => { e.currentTarget.style.color = "#ef4444"; }}
            onMouseLeave={e => { e.currentTarget.style.color = `${C}66`; }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Main input container */}
      <div
        className="flex items-end gap-3 rounded-lg px-4 py-3"
        style={{ border: "1px solid rgba(0,210,255,.25)", background: "rgba(0,10,24,.9)", boxShadow: "0 0 15px rgba(0,210,255,.05)" }}
      >
        {/* File attach button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={fileUploading || aiLoading}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded transition-all disabled:opacity-30"
          style={{
            border:      `1px solid ${attachedFile ? C : "rgba(0,210,255,.2)"}`,
            background:  `${attachedFile ? C : "transparent"}10`,
            color:       attachedFile ? C : `${C}66`,
          }}
          onMouseEnter={e => { if (!attachedFile) { e.currentTarget.style.borderColor = C; e.currentTarget.style.color = C; } }}
          onMouseLeave={e => { if (!attachedFile) { e.currentTarget.style.borderColor = "rgba(0,210,255,.2)"; e.currentTarget.style.color = `${C}66`; } }}
        >
          {fileUploading
            ? <span className="h-3 w-3 rounded-full border border-t-transparent animate-spin" style={{ borderColor: `${C}44`, borderTopColor: C }} />
            : <Paperclip className="h-3.5 w-3.5" />}
        </button>

        {/* Mic + language picker */}
        {speechSupported && (
          <div className="flex items-center gap-1 shrink-0">
            {!isListening && (
              <div
                className="flex rounded overflow-hidden nv-mono"
                style={{ border: "1px solid rgba(0,210,255,.15)", fontSize: 9 }}
              >
                {[["FR", "fr-FR"], ["EN", "en-US"], ["AR", "ar-MA"]].map(([label, code]) => (
                  <button
                    key={code}
                    onClick={() => setSpeechLang(code)}
                    className="px-1.5 py-0.5 transition-all"
                    style={{
                      background:  speechLang === code ? `${C}22` : "transparent",
                      color:       speechLang === code ? C : "#1e5a7a",
                      borderRight: code !== "ar-MA" ? "1px solid rgba(0,210,255,.1)" : "none",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={onToggleListening}
              disabled={aiLoading}
              title={isListening ? "Stop recording" : `Speak your question (${speechLang})`}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded transition-all disabled:opacity-30 ${isListening ? "nv-mic-listening" : ""}`}
              style={{
                border:     `1px solid ${isListening ? "#ff3b3b" : "rgba(0,210,255,.2)"}`,
                background: isListening ? "rgba(255,59,59,.15)" : "transparent",
                color:      isListening ? "#ff6b6b" : `${C}66`,
              }}
              onMouseEnter={e => { if (!isListening) { e.currentTarget.style.borderColor = C; e.currentTarget.style.color = C; } }}
              onMouseLeave={e => { if (!isListening) { e.currentTarget.style.borderColor = "rgba(0,210,255,.2)"; e.currentTarget.style.color = `${C}66`; } }}
            >
              {isListening
                ? <div className="flex items-end gap-[2px] h-4">
                    {[6, 10, 14, 10, 6].map((h, i) => (
                      <span key={i} className={`w-[2px] rounded-full nv-wave-${i + 1}`}
                            style={{ height: `${h}px`, background: "#ff6b6b" }} />
                    ))}
                  </div>
                : <Mic className="h-3.5 w-3.5" />}
            </button>
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={inputRef}
          rows={1}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={
            isListening
              ? "Listening… speak now"
              : attachedFile
                ? `Ask about "${attachedFile.filename}"…`
                : "Ask NOVAA anything about your courses…"
          }
          className="flex-1 resize-none bg-transparent text-sm nv-input"
          style={{ color: "#9acfe8", maxHeight: 120 }}
        />

        {/* Send button */}
        <button
          onClick={onSend}
          disabled={!input.trim() || aiLoading}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded transition-all disabled:opacity-30"
          style={{ border: `1px solid ${C}`, background: `${C}18`, color: C, boxShadow: `0 0 8px ${C}33` }}
          onMouseEnter={e => { e.currentTarget.style.background = `${C}30`; e.currentTarget.style.boxShadow = `0 0 15px ${C}55`; }}
          onMouseLeave={e => { e.currentTarget.style.background = `${C}18`; e.currentTarget.style.boxShadow = `0 0 8px ${C}33`; }}
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Status line */}
      <div className="mt-1.5 flex items-center justify-between px-1">
        <span className="nv-mono text-[9px]" style={{ color: `${C}33` }}>
          NOVAA · ENTER ↵ SEND · 📎 ATTACH · 🎤 VOICE
        </span>
        <span className="nv-mono text-[9px]" style={{ color: `${C}33` }}>
          {activeCourseTitle ? activeCourseTitle.toUpperCase().slice(0, 20) : "NO COURSE SELECTED"}
        </span>
      </div>
    </div>
  </div>
);

export default InputBar;
