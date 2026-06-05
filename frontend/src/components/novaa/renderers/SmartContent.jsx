import TextContent      from "./TextContent";
import CodeContent      from "./CodeContent";
import QuizContent      from "./QuizContent";
import FlashcardContent from "./FlashcardContent";

/**
 * Dispatcher — picks the right renderer based on AI response mode or content shape.
 *
 * Priority:
 *  1. Explicit `mode` prop ("quiz" | "flashcard")
 *  2. Presence of fenced code blocks in the content
 *  3. Plain text fallback
 */
const SmartContent = ({ content, mode }) => {
  if (mode === "quiz")                              return <QuizContent      text={content} />;
  if (mode === "flashcard")                         return <FlashcardContent text={content} />;
  if (mode === "code" || content.includes("```"))   return <CodeContent      text={content} />;
  return <TextContent text={content} />;
};

export default SmartContent;
