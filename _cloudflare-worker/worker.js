// Markdown content negotiation for ladoo.net, run as a Cloudflare Worker in
// front of GitHub Pages. HTML pages stay exactly as they are for browsers.
// A request whose Accept header lists text/markdown gets the same page as
// Markdown with Content-Type: text/markdown and Vary: Accept, including 404s.
// ponytail: regex tokenizer, not a DOM; the site is hand-written HTML and
// this covers every tag it uses. Swap for HTMLRewriter if the markup grows.

const SITE = 'https://ladoo.net';

// --- Accept negotiation -----------------------------------------------------

// q-value for a media type, most specific match wins (RFC 9110 12.5.1).
function quality(ranges, type) {
  const [t, s] = type.split('/');
  let best = null;
  for (const r of ranges) {
    const [rt, rs] = r.type.split('/');
    let spec = -1;
    if (rt === t && rs === s) spec = 2;
    else if (rt === t && rs === '*') spec = 1;
    else if (rt === '*' && rs === '*') spec = 0;
    if (spec > (best?.spec ?? -1)) best = { spec, q: r.q, params: r.params };
  }
  return best;
}

export function parseAccept(accept) {
  return (accept || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [type, ...params] = s.split(';').map((p) => p.trim());
      let q = 1;
      for (const p of params) {
        const m = /^q=([0-9.]+)$/i.exec(p);
        if (m) q = Math.max(0, Math.min(1, parseFloat(m[1]) || 0));
      }
      return { type: type.toLowerCase(), q, params: params.length };
    });
}

// Markdown only when text/markdown is named outright (never via text/* or */*)
// with q > 0, and it ranks at least as high as text/html.
export function prefersMarkdown(accept) {
  const ranges = parseAccept(accept);
  const md = quality(ranges, 'text/markdown');
  if (!md || md.spec < 2 || md.q <= 0) return false;
  const html = quality(ranges, 'text/html');
  return !html || md.q >= html.q;
}

// --- HTML to Markdown -------------------------------------------------------

const ENT = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', middot: '·',
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“',
  ndash: '–', mdash: '—', hellip: '…', copy: '©',
  times: '×', rarr: '→', larr: '←', bull: '•',
};

export function decode(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+[0-9]*);/gi, (m, e) => {
    if (e[0] === '#') {
      const n = /^#x/i.test(e) ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENT[e.toLowerCase()] ?? m;
  });
}

function attr(attrs, name) {
  const m = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i').exec(attrs);
  if (!m) return null;
  return decode(m[1] ?? m[2] ?? m[3] ?? '');
}

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const DROP = new Set(['script', 'style', 'svg', 'noscript', 'nav', 'button', 'form', 'template', 'head', 'header', 'footer', 'iframe', 'select', 'textarea', 'audio', 'video', 'picture', 'source', 'input', 'canvas']);
const HEADING = { h1: '# ', h2: '## ', h3: '### ', h4: '#### ', h5: '##### ', h6: '###### ' };
const BLOCK = new Set(['p', 'div', 'section', 'article', 'main', 'aside', 'dl', 'figure', 'figcaption', 'address', 'details', 'body', 'html', 'thead', 'tbody', 'tfoot']);

function collapse(s) { return s.replace(/\s+/g, ' '); }
// Drop the single collapsed space that inter-tag whitespace leaves before each item.
function items(inner) { return inner.replace(/^\n+/, '').replace(/(^|\n) (?! )/g, '$1'); }
function block(inner) { const t = inner.trim(); return t ? `\n\n${t}\n\n` : ''; }

function render(tag, inner, attrs, base) {
  if (DROP.has(tag) || attr(attrs, 'aria-hidden') === 'true' || attr(attrs, 'hidden') !== null) return '';
  if (HEADING[tag]) return `\n\n${HEADING[tag]}${collapse(inner).trim()}\n\n`;
  if (BLOCK.has(tag)) return block(inner);
  switch (tag) {
    case 'br': return '\n';
    case 'hr': return '\n\n---\n\n';
    case 'img': {
      const alt = collapse(attr(attrs, 'alt') || '').trim();
      const src = attr(attrs, 'src');
      return alt && src ? `\n\n![${alt}](${new URL(src, base).href})\n\n` : '';
    }
    case 'a': {
      const text = collapse(inner).trim();
      const href = attr(attrs, 'href');
      if (!text) return '';
      if (!href) return text;
      return `[${text}](${new URL(href, base).href})`;
    }
    case 'strong': case 'b': { const t = collapse(inner).trim(); return t ? `**${t}**` : ''; }
    case 'em': case 'i': { const t = collapse(inner).trim(); return t ? `_${t}_` : ''; }
    case 'code': { const t = inner.trim(); return t ? `\`${t}\`` : ''; }
    case 'blockquote': return block(inner.trim().split('\n').map((l) => `> ${l}`).join('\n'));
    case 'summary': return `\n**${collapse(inner).trim()}**\n\n`;
    case 'dt': return `\n**${collapse(inner).trim()}**\n`;
    case 'dd': return `${inner.trim()}\n\n`;
    case 'li': {
      const lines = inner.trim().split('\n');
      return `- ${lines.map((l, i) => (i ? `  ${l}` : l)).join('\n')}\n`;
    }
    case 'ul': return `\n${items(inner)}\n`;
    case 'ol': {
      let n = 0;
      return `\n${items(inner).replace(/^- /gm, () => `${++n}. `)}\n`;
    }
    case 'th': return `\x02${collapse(inner).trim()}`;
    case 'td': return `\x01${collapse(inner).trim()}`;
    case 'tr': {
      const cells = inner.split(/(?=[\x01\x02])/).filter((c) => c.length);
      const header = cells.some((c) => c[0] === '\x02');
      const row = `| ${cells.map((c) => c.slice(1).replace(/\|/g, '\\|')).join(' | ')} |\n`;
      return header ? `${row}|${cells.map(() => ' --- |').join('')}\n` : row;
    }
    case 'table': return block(inner);
    default: return inner;
  }
}

export function htmlToMarkdown(html, url) {
  const base = url || SITE;
  const title = decode(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] || '').trim();
  const headMeta = (name) => {
    const re = new RegExp(`<meta\\s+[^>]*name=["']${name}["'][^>]*>`, 'i');
    const tag = re.exec(html)?.[0];
    return tag ? attr(tag, 'content') : null;
  };
  const description = headMeta('description');
  const canonical = attr(/<link\s+[^>]*rel=["']canonical["'][^>]*>/i.exec(html)?.[0] || '', 'href');

  const body = /<main[^>]*>([\s\S]*?)<\/main>/i.exec(html)?.[1]
    ?? /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html)?.[1]
    ?? html;

  // Walk tags with a stack; each close tag re-renders the text emitted since
  // its open tag, so nested inline markup composes without a DOM.
  const stack = [];
  let out = '';
  const re = /<!--[\s\S]*?-->|<\/([a-zA-Z][a-zA-Z0-9]*)\s*>|<([a-zA-Z][a-zA-Z0-9]*)([^>]*)>|[^<]+/g;
  let m;
  while ((m = re.exec(body))) {
    if (m[0].startsWith('<!--')) continue;
    if (m[1]) {
      const tag = m[1].toLowerCase();
      let i = stack.length - 1;
      while (i >= 0 && stack[i].tag !== tag) i--;
      if (i < 0) continue;
      while (stack.length > i + 1) { // close implicitly-open children
        const f = stack.pop();
        out = out.slice(0, f.start) + render(f.tag, out.slice(f.start), f.attrs, base);
      }
      const f = stack.pop();
      out = out.slice(0, f.start) + render(f.tag, out.slice(f.start), f.attrs, base);
    } else if (m[2]) {
      const tag = m[2].toLowerCase();
      const attrs = m[3];
      if (VOID.has(tag) || attrs.trimEnd().endsWith('/')) out += render(tag, '', attrs, base);
      else stack.push({ tag, attrs, start: out.length });
    } else {
      out += collapse(decode(m[0]));
    }
  }
  while (stack.length) {
    const f = stack.pop();
    out = out.slice(0, f.start) + render(f.tag, out.slice(f.start), f.attrs, base);
  }

  const text = out
    .replace(/[\x01\x02]/g, '')
    .replace(/(\*\*[^*\n]+\*\*)(?=[\p{L}\p{N}])/gu, '$1 ')
    .split('\n').map((l) => l.trimEnd()).join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const front = ['---', `title: ${JSON.stringify(title)}`];
  if (description) front.push(`description: ${JSON.stringify(description)}`);
  if (canonical) front.push(`canonical: ${canonical}`);
  front.push('---');

  return `${front.join('\n')}\n\n${text}\n\n---\n\nLadoo for agents: [llms.txt](${SITE}/llms.txt) · [Sitemap](${SITE}/sitemap.xml) · [Home](${SITE}/)\n`;
}

// --- Worker -----------------------------------------------------------------

function withVary(headers) {
  const h = new Headers(headers);
  const vary = (h.get('vary') || '').split(',').map((v) => v.trim()).filter(Boolean);
  if (!vary.some((v) => v.toLowerCase() === 'accept')) vary.push('Accept');
  h.set('vary', vary.join(', '));
  return h;
}

export default {
  async fetch(request) {
    const res = await fetch(request);
    const type = (res.headers.get('content-type') || '').toLowerCase();
    if (!type.startsWith('text/html') || !['GET', 'HEAD'].includes(request.method)) return res;

    if (!prefersMarkdown(request.headers.get('accept'))) {
      return new Response(res.body, { status: res.status, statusText: res.statusText, headers: withVary(res.headers) });
    }

    const md = htmlToMarkdown(await res.text(), request.url.replace(/^http:/, 'https:'));
    const headers = withVary(res.headers);
    for (const h of ['content-encoding', 'content-length', 'etag', 'last-modified', 'content-range', 'transfer-encoding']) headers.delete(h);
    headers.set('content-type', 'text/markdown; charset=utf-8');
    headers.set('x-markdown-tokens', String(Math.ceil(md.length / 4)));
    return new Response(request.method === 'HEAD' ? null : md, { status: res.status, statusText: res.statusText, headers });
  },
};
