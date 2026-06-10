import DOMPurify from "dompurify";

/**
 * Sanitize an HTML string before injecting it via dangerouslySetInnerHTML.
 *
 * NOVAA answers, course materials and uploaded-file text are all
 * attacker-influenceable, so any HTML we render MUST be sanitized — otherwise a
 * payload like <img src=x onerror="fetch('/steal?t='+localStorage.access_token)">
 * would execute and steal the user's JWT.
 *
 * We only ever generate a tiny set of formatting tags (bold/code/etc.), so the
 * allowlist is deliberately narrow. DOMPurify strips <script>, event handlers
 * (onerror/onclick/…), javascript: URLs, and anything else dangerous.
 */
export function safeHtml(html) {
  return DOMPurify.sanitize(html ?? "", {
    ALLOWED_TAGS: ["strong", "b", "em", "i", "code", "br", "span", "p", "u"],
    ALLOWED_ATTR: ["style", "class"],
    ALLOW_DATA_ATTR: false,
  });
}

export default safeHtml;
