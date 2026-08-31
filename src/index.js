// Cloudflare Worker entrypoint — handles chat requests via Workers AI.
export default {
  async fetch(request, env) {
    // Anyone who finds this URL can spend your Workers AI quota, so require
    // a shared secret. Set SHARED_KEY here and NOLVEK_LLM_KEY on the chat Worker.
    if (env.SHARED_KEY) {
      const auth = request.headers.get('Authorization') || '';
      if (auth !== 'Bearer ' + env.SHARED_KEY) {
        return Response.json({ error: 'unauthorized' }, { status: 401 });
      }
    }

    if (request.method !== 'POST') {
      return Response.json({ ok: true, model: env.MODEL, hint: 'POST {"messages":[{"role":"user","content":"…"}]}' });
    }

    let body;
    try { body = await request.json(); }
    catch { return Response.json({ error: 'body is not JSON' }, { status: 400 }); }

    const messages = Array.isArray(body.messages) ? body.messages : [];
    if (!messages.length) return Response.json({ error: 'no messages' }, { status: 400 });

    try {
      const out = await env.AI.run(env.MODEL, {
        messages,
        max_tokens: body.max_tokens ?? 400,
        temperature: body.temperature ?? 0.3,
      });
      // The chat Worker understands a bare {response}.
      return Response.json({ response: out.response ?? '' });
    } catch (e) {
      // Return the reason instead of throwing, so you get a message not a 1101.
      return Response.json({ error: String(e && e.message) }, { status: 502 });
    }
  },
};
