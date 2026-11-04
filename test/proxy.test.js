const test = require('node:test');
const assert = require('node:assert/strict');

const handler = require('../api/proxy');

const createUpstreamResponse = (status, contentType, body) => ({
  status,
  headers: new Headers({ 'content-type': contentType }),
  text: async () => body,
});

const createResponse = () => ({
  statusCode: null,
  headers: {},
  body: null,
  setHeader(name, value) {
    this.headers[name] = value;
  },
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
  send(payload) {
    this.body = payload;
    return this;
  },
  write(payload) {
    this.body = `${this.body || ''}${payload.toString()}`;
    return true;
  },
  end() {
    return this;
  },
});

test('forwards requests to the OpenAI-compatible v1 upstream', async () => {
  const originalFetch = global.fetch;
  let request;
  global.fetch = async (target, options) => {
    request = { target, options };
    return createUpstreamResponse(200, 'application/json', '{"data":[{"id":"auto"}]}');
  };

  try {
    const response = createResponse();
    await handler({ method: 'GET', query: { path: 'models' }, headers: {} }, response);

    assert.equal(request.target, 'https://evren-llmapi.ssyz.org.tr/v1/models');
    assert.equal(request.options.method, 'GET');
    assert.deepEqual(response.body, { data: [{ id: 'auto' }] });
    assert.equal(response.statusCode, 200);
  } finally {
    global.fetch = originalFetch;
  }
});

test('returns JSON error instead of passing through an HTML response', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () =>
    createUpstreamResponse(200, 'text/html; charset=utf-8', '<!doctype html><html></html>');

  try {
    const response = createResponse();
    await handler({ method: 'POST', query: { path: 'chat/completions' }, headers: {} }, response);

    assert.equal(response.statusCode, 502);
    assert.deepEqual(response.body, {
      error: 'Evren API geçersiz bir yanıt döndürdü',
      detail: 'Upstream yanıtı JSON yerine HTML veya başka bir içerik türündeydi',
      upstreamStatus: 200,
    });
  } finally {
    global.fetch = originalFetch;
  }
});

test('returns JSON error for malformed JSON', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => createUpstreamResponse(200, 'application/json', '{not-json');

  try {
    const response = createResponse();
    await handler({ method: 'GET', query: { path: 'models' }, headers: {} }, response);

    assert.equal(response.statusCode, 502);
    assert.deepEqual(response.body, {
      error: 'Evren API geçersiz JSON döndürdü',
      upstreamStatus: 200,
    });
  } finally {
    global.fetch = originalFetch;
  }
});

test('passes through server-sent event responses without JSON buffering', async () => {
  const originalFetch = global.fetch;
  const encoder = new TextEncoder();
  global.fetch = async () => ({
    status: 200,
    headers: new Headers({ 'content-type': 'text/event-stream' }),
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"hi"}}]}\n\n'));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    }),
  });

  try {
    const response = createResponse();
    await handler({ method: 'POST', query: { path: 'chat/completions' }, headers: {}, body: '{}' }, response);

    assert.equal(response.statusCode, 200);
    assert.match(response.body, /data: \[DONE\]/);
    assert.equal(response.headers['Content-Type'], 'text/event-stream');
  } finally {
    global.fetch = originalFetch;
  }
});
