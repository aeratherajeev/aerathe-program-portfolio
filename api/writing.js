// Vercel serverless function: GET /api/writing
// Fetches the Medium and Substack RSS feeds server-side (browsers can't, because of CORS),
// merges them newest first, and caches the result at Vercel's edge for 6 hours.

const FEEDS = [
  { source: 'Medium', url: 'https://medium.com/feed/@aerathe' },
  { source: 'Substack', url: 'https://aerathe.substack.com/feed' },
];

// Leave a piece off the site by adding part of its URL here, e.g. 'is-obedience-slavery'.
const HIDE = [];

const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 50;

function decode(s) {
  return s
    .replace(/^<!\[CDATA\[|\]\]>$/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'")
    .trim();
}

function tag(xml, name) {
  const m = xml.match(new RegExp('<' + name + '[^>]*>([\\s\\S]*?)</' + name + '>'));
  return m ? decode(m[1]) : '';
}

// First sentence or two of the post as plain text, for the excerpt line on the Writing page.
function excerpt(html) {
  const text = decode(html).replace(/<figure[\s\S]*?<\/figure>/g, ' ').replace(/<h[1-6][\s\S]*?<\/h[1-6]>/, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
    .replace(/\s+/g, ' ').trim();
  if (text.length <= 180) return text;
  const cut = text.slice(0, 180);
  const end = cut.lastIndexOf('. ');
  return end > 80 ? cut.slice(0, end + 1) : cut.replace(/\s+\S*$/, '') + '…';
}

async function readFeed({ source, url }) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'portfolio-feed/1.0' } });
    if (!r.ok) return [];
    const xml = await r.text();
    return (xml.match(/<item>[\s\S]*?<\/item>/g) || []).map((item) => ({
      title: tag(item, 'title'),
      url: tag(item, 'link').split('?')[0],
      date: new Date(tag(item, 'pubDate')).toISOString(),
      source,
      excerpt: excerpt(tag(item, 'description') || tag(item, 'content:encoded')),
      categories: (item.match(/<category[^>]*>[\s\S]*?<\/category>/g) || []).map((c) => decode(c.replace(/<\/?category[^>]*>/g, ''))),
    }));
  } catch (e) {
    return [];
  }
}

module.exports = async (req, res) => {
  const asked = parseInt((req.query && req.query.limit) || DEFAULT_LIMIT, 10);
  const limit = Math.min(Math.max(asked || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const lists = await Promise.all(FEEDS.map(readFeed));
  const items = lists.flat()
    .filter((p) => p.title && p.url && !HIDE.some((h) => p.url.includes(h)))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);

  res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=86400');
  res.status(200).json({ items });
};
