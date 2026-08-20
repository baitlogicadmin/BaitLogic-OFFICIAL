const assert = require('node:assert/strict');
const test = require('node:test');
const app = require('../server');

test('analytics accepts an event without requesting the inserted visitor row', async () => {
  const originalFetch = global.fetch;
  let captured;
  global.fetch = async (url, options) => {
    captured = { url: String(url), options };
    return new Response('', { status: 201 });
  };

  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));

  try {
    const address = server.address();
    const response = await originalFetch(`http://127.0.0.1:${address.port}/api/events`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event_name: 'preview_readiness', path: '/' }),
    });

    assert.equal(response.status, 204);
    assert.match(captured.url, /\/rest\/v1\/analytics_events$/);
    assert.equal(captured.options.headers.Prefer, 'return=minimal');
  } finally {
    global.fetch = originalFetch;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
