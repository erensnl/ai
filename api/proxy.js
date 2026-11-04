// Evren API proxy (Vercel Serverless Function)
// vercel.json yönlendirmesi sayesinde:
//   /api/evren-api/models            -> https://evren-llmapi.ssyz.org.tr/v1/models
//   /api/evren-api/chat/completions  -> https://evren-llmapi.ssyz.org.tr/v1/chat/completions

const UPSTREAM = 'https://evren-llmapi.ssyz.org.tr/v1';
const SERVER_API_KEY = process.env.EVREN_API_KEY;
const REQUEST_TIMEOUT_MS = 45000;
const MAX_ATTEMPTS = 2;

const isJsonContentType = (contentType) =>
  Boolean(contentType && /^(?:application|text)\/(?:[\w.-]+\+)?json\b/i.test(contentType));

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const path = [].concat(req.query.path || []).join('/').replace(/^\/+/, '');
  const target = `${UPSTREAM}/${path}`;

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (SERVER_API_KEY) {
      headers['Authorization'] = `Bearer ${SERVER_API_KEY}`;
    } else if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
    }

    let body;
    if (req.method === 'POST') {
      body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    }

    let upstream;
    let lastError;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        upstream = await fetch(target, { method: req.method, headers, body, signal: controller.signal });
        clearTimeout(timeout);
        if (upstream.status < 500 || attempt === MAX_ATTEMPTS) break;
      } catch (err) {
        clearTimeout(timeout);
        lastError = err;
        if (attempt === MAX_ATTEMPTS) throw err;
      }
    }

    if (!upstream) throw lastError || new Error('Upstream yanıtı alınamadı');

    const contentType = upstream.headers.get('content-type') || '';
    if (/text\/event-stream/i.test(contentType) && upstream.body) {
      res.statusCode = upstream.status;
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      const reader = upstream.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(Buffer.from(value));
        }
      } finally {
        res.end();
      }
      return;
    }

    const text = await upstream.text();

    if (!isJsonContentType(contentType)) {
      return res.status(502).json({
        error: 'Evren API geçersiz bir yanıt döndürdü',
        detail: 'Upstream yanıtı JSON yerine HTML veya başka bir içerik türündeydi',
        upstreamStatus: upstream.status,
      });
    }

    try {
      return res.status(upstream.status).json(JSON.parse(text));
    } catch (err) {
      return res.status(502).json({
        error: 'Evren API geçersiz JSON döndürdü',
        upstreamStatus: upstream.status,
      });
    }
  } catch (err) {
    return res.status(502).json({
      error: 'Evren sunucusuna ulaşılamadı',
      target,
      detail: err.message,
    });
  }
};
