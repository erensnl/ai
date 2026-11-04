// Evren API proxy (Vercel Serverless Function)
// vercel.json yönlendirmesi sayesinde:
//   /api/evren-api/models            -> https://evren-llmapi.ssyz.org.tr/v1/models
//   /api/evren-api/chat/completions  -> https://evren-llmapi.ssyz.org.tr/v1/chat/completions

const UPSTREAM = 'https://evren-llmapi.ssyz.org.tr/v1';

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
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
    }

    let body;
    if (req.method === 'POST') {
      body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    }

    const upstream = await fetch(target, { method: req.method, headers, body });

    const text = await upstream.text();
    const contentType = upstream.headers.get('content-type') || '';

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
