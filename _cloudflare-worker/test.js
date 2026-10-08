// node --test (run from this folder). LIVE=1 also checks the deployed site.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import worker, { prefersMarkdown, htmlToMarkdown } from './worker.js';

const SITE = path.resolve(import.meta.dirname, '..');
const read = (f) => fs.readFileSync(path.join(SITE, f), 'utf8');
const pages = fs.readdirSync(SITE, { recursive: true }).filter((f) => f.endsWith('.html') && !f.startsWith('.git'));

test('Accept negotiation', () => {
  const cases = {
    'text/markdown': true,
    'text/html, text/markdown': true,
    'application/json, text/markdown;q=0.5, */*;q=0.1': true,
    'TEXT/MARKDOWN; q=1.0': true,
    'text/html': false,
    'text/markdown;q=0.9, text/html': false,
    'text/markdown;q=0': false,
    '*/*': false,
    'text/*': false,
    '': false,
  };
  for (const [accept, want] of Object.entries(cases)) assert.equal(prefersMarkdown(accept), want, accept);
  assert.equal(prefersMarkdown(null), false);
});

test('homepage converts to clean Markdown', () => {
  const md = htmlToMarkdown(read('index.html'), 'https://ladoo.net/');
  assert.match(md, /^---\ntitle: "Ladoo: App to Speak Punjabi/);
  assert.match(md, /^canonical: https:\/\/ladoo\.net\/$/m);
  assert.match(md, /^# Speak the Punjabi you grew up hearing\.$/m);
  assert.match(md, /^- \*\*Bite-size lessons\*\* that fit/m);
  assert.match(md, /\[Download on the App Store\]\(https:\/\/apps\.apple\.com\/us\/app\/ladoo-learn-punjabi\/id6782532457\)/);
  assert.match(md, /^### Is Ladoo free\?$/m);
  assert.doesNotMatch(md, /<[a-z/!][^>\n]*>/i, 'no HTML tags survive');
  assert.doesNotMatch(md, /&[a-z#0-9]+;/i, 'entities are decoded');
  assert.doesNotMatch(md, /\[Lessons\]\(https:\/\/ladoo\.net\/#language\)/, 'nav is stripped');
  assert.doesNotMatch(md, /ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਚਾਹ/, 'aria-hidden hero cards are stripped');
  assert.match(md, /\[llms\.txt\]\(https:\/\/ladoo\.net\/llms\.txt\)/);
});

test('every page converts without leftovers', () => {
  for (const f of pages) {
    const md = htmlToMarkdown(read(f), `https://ladoo.net/${f.replace('index.html', '')}`);
    assert.ok(md.length > 200, f);
    assert.doesNotMatch(md, /<[a-z/!][^>\n]*>/i, f);
    assert.doesNotMatch(md, /&[a-z#0-9]+;/i, f);
  }
});

test('404 page becomes a Markdown error body with links', () => {
  const md = htmlToMarkdown(read('404.html'), 'https://ladoo.net/nope');
  assert.match(md, /^# Page not found$/m);
  assert.match(md, /\[llms\.txt\]\(https:\/\/ladoo\.net\/llms\.txt\)/);
  assert.match(md, /\[Sitemap\]\(https:\/\/ladoo\.net\/sitemap\.xml\)/);
  assert.ok(md.replace(/[^a-z]/gi, '').length >= 20);
});

test('worker negotiates and sets headers', async (t) => {
  const origin = (body, status, type) => new Response(body, { status, headers: { 'content-type': type, vary: 'Accept-Encoding', etag: '"x"' } });
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (req) => {
    const u = new URL(req.url);
    if (u.pathname === '/llms.txt') return origin('# Ladoo', 200, 'text/plain; charset=utf-8');
    if (u.pathname === '/') return origin(read('index.html'), 200, 'text/html; charset=utf-8');
    return origin(read('404.html'), 404, 'text/html; charset=utf-8');
  };
  t.after(() => { globalThis.fetch = realFetch; });
  const call = (p, accept, method = 'GET') => worker.fetch(new Request(`https://ladoo.net${p}`, { method, headers: accept ? { accept } : {} }));

  let r = await call('/', 'text/markdown');
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'text/markdown; charset=utf-8');
  assert.equal(r.headers.get('vary'), 'Accept-Encoding, Accept');
  assert.equal(r.headers.get('etag'), null);
  assert.ok(Number(r.headers.get('x-markdown-tokens')) > 100);
  assert.match(await r.text(), /^# Speak the Punjabi/m);

  r = await call('/', 'text/html');
  assert.equal(r.headers.get('content-type'), 'text/html; charset=utf-8');
  assert.equal(r.headers.get('vary'), 'Accept-Encoding, Accept');
  assert.match(await r.text(), /<!DOCTYPE html>/);

  r = await call('/missing', 'text/markdown');
  assert.equal(r.status, 404);
  assert.equal(r.headers.get('content-type'), 'text/markdown; charset=utf-8');
  assert.match(await r.text(), /Page not found[\s\S]*llms\.txt/);

  r = await call('/missing', 'text/markdown', 'HEAD');
  assert.equal(r.status, 404);
  assert.equal(await r.text(), '');

  r = await call('/llms.txt', 'text/markdown');
  assert.equal(r.headers.get('content-type'), 'text/plain; charset=utf-8');
  assert.equal(r.headers.get('vary'), 'Accept-Encoding', 'non-HTML passes through untouched');
});

test('every Organization JSON-LD entity has a description', () => {
  let seen = 0;
  for (const f of pages) {
    for (const m of read(f).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      const stack = [JSON.parse(m[1])];
      while (stack.length) {
        const x = stack.pop();
        if (Array.isArray(x)) stack.push(...x);
        else if (x && typeof x === 'object') {
          if (x['@type'] === 'Organization') { seen++; assert.ok(x.description?.length > 40, `${f}: Organization.description`); }
          stack.push(...Object.values(x));
        }
      }
    }
  }
  assert.ok(seen >= 24, `found ${seen} Organization entities`);
});

test('llms.txt tells agents when and how to use Ladoo', () => {
  const t = read('llms.txt');
  assert.match(t, /^## When to use Ladoo$/m);
  assert.match(t, /^## How to call Ladoo$/m);
  assert.match(t, /Accept: text\/markdown/);
  assert.match(t, /^## Key pages$/m);
});

test('live site negotiates Markdown', { skip: !process.env.LIVE && 'set LIVE=1' }, async () => {
  const base = process.env.LIVE_BASE || 'https://ladoo.net';
  for (const [p, status] of [['/', 200], ['/__agent-probe-does-not-exist', 404]]) {
    const r = await fetch(base + p, { headers: { accept: 'text/markdown' } });
    assert.equal(r.status, status, p);
    assert.match(r.headers.get('content-type') || '', /^text\/markdown/, p);
    assert.match(r.headers.get('vary') || '', /\bAccept\b/, p);
    assert.match(await r.text(), /llms\.txt/, p);
  }
  const h = await fetch(base + '/', { headers: { accept: 'text/html' } });
  assert.match(h.headers.get('content-type') || '', /^text\/html/);
  assert.match(h.headers.get('vary') || '', /\bAccept\b/);
});
