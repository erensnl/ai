export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };

  // Tarayıcı Preflight (OPTIONS) isteklerini Vercel tarafında anında 200/204 ile yanıtla
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  const url = new URL(req.url);
  // URL sonundaki /api/evren-api kısmını temizleyip hedef API yolunu yakala
  const pathname = url.pathname.replace(/^\/api\/evren-api/, '');
  const targetUrl = `https://evren.ssyz.org.tr/llm${pathname}${url.search}`;

  const headers = new Headers();
  headers.set('accept', 'application/json, text/plain, */*');
  headers.set('user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)');

  if (req.headers.has('content-type')) {
    headers.set('content-type', req.headers.get('content-type'));
  }
  if (req.headers.has('authorization')) {
    headers.set('authorization', req.headers.get('authorization'));
  }

  const fetchOptions = {
    method: req.method,
    headers: headers,
    redirect: 'follow',
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    fetchOptions.body = await req.arrayBuffer();
  }

  try {
    const response = await fetch(targetUrl, fetchOptions);
    const resHeaders = new Headers(response.headers);
    
    Object.keys(corsHeaders).forEach((key) => {
      resHeaders.set(key, corsHeaders[key]);
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: resHeaders,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Proxy Bağlantı Hatası', message: err.message }), {
      status: 502,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  }
}
