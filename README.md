# ai

## Evren API proxy

The frontend calls the OpenAI-compatible API through `/api/evren-api`. The
Vercel serverless proxy forwards those requests to
`https://evren-llmapi.ssyz.org.tr/v1`, preserving the frontend's
`/models` and `/chat/completions` paths.

The proxy only forwards JSON responses. If the upstream returns an HTML page
or malformed JSON, it returns a JSON error response instead of passing the
invalid payload to the frontend.

## Sohbet yönetimi ve ekler

The interface stores chat categories in `localStorage` and uses the existing
`chats.folder` and `chats.pinned` fields when Supabase is available. Rename,
delete, category assignment, and pin state are persisted through the existing
Supabase `chats` table; no migration is required when those fields already
exist. If the fields are missing in a deployment, the UI keeps working with
local state, but Supabase persistence for that field requires adding nullable
`folder text` and `pinned boolean default false` columns.

Attachments are limited to TXT, Markdown, CSV, JSON, and PDF files up to 10 MB.
Text and JSON files contribute at most their first 8000 characters to the
OpenAI-compatible message; PDFs contribute safe filename/type/size metadata
only because the current API contract has no multipart upload support. Images
and code files can be previewed locally, but are sent as metadata unless their
text content is supported by the browser.

The interface also provides chat search, drag-and-drop attachments, pinned
sections, category colors and sorting, Markdown/TXT/JSON export, message
copy/edit/retry controls, generation cancellation, keyboard shortcuts
(`Ctrl/Cmd+K` focuses search and `Escape` stops generation), display
preferences, and response usage/time indicators. API keys remain a client
setting for compatibility; production deployments should move the key to a
server-side Vercel environment variable named `EVREN_API_KEY`; the proxy
prefers that value and only falls back to the client Authorization header when
the environment variable is absent.