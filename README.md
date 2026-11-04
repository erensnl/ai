# ai

## Evren API proxy

The frontend calls the OpenAI-compatible API through `/api/evren-api`. The
Vercel serverless proxy forwards those requests to
`https://evren-llmapi.ssyz.org.tr/v1`, preserving the frontend's
`/models` and `/chat/completions` paths.

The proxy only forwards JSON responses. If the upstream returns an HTML page
or malformed JSON, it returns a JSON error response instead of passing the
invalid payload to the frontend.