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
and code files can be previewed locally, and images copied to the clipboard
can be pasted with Ctrl/Cmd+V into the composer. Pasted images follow the same
10 MB and supported image MIME checks as selected files; they are sent as
metadata because the current API contract has no multipart upload support.

The interface also provides chat search, drag-and-drop attachments, pinned
sections, category colors and sorting, Markdown/TXT/JSON export, message
copy/edit/retry controls, generation cancellation, keyboard shortcuts
(`Ctrl/Cmd+K` focuses search and `Escape` stops generation), display
preferences, and response usage/time indicators. API keys remain a client
setting for compatibility; production deployments should move the key to a
server-side Vercel environment variable named `EVREN_API_KEY`; the proxy
prefers that value and only falls back to the client Authorization header when
the environment variable is absent.

Streaming is requested with the existing OpenAI-compatible `stream` field and
falls back to normal JSON when the upstream does not return SSE. Requests have
a 45-second proxy timeout and one retry for transient failures. Vision images
under 4 MB are sent as OpenAI-compatible base64 image content; if the model or
upstream rejects vision, the request remains usable with filename/type/size
metadata.

Supabase remains the source of truth when the current `chats.folder`,
`chats.pinned`, and `messages` fields are available. Settings, prompt
templates, category colors, and attachment previews also have localStorage
fallbacks. Production should enable RLS policies for each authenticated user's
own chats/messages and set `EVREN_API_KEY` in Vercel. Audio transcription and
multipart PDF upload require upstream endpoints not present in the current API
contract, so microphone/TTS use browser APIs and PDFs are metadata-only.