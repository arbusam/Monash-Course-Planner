import { isValidUnitCode, parseHandbookRequisites } from '../src/utils/requisites.js';

const HANDBOOK_YEAR = process.env.HANDBOOK_YEAR || '2026';
const CACHE_CONTROL = 'public, s-maxage=604800, stale-while-revalidate=86400';

const sendJson = (res, status, body, extraHeaders = {}) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  Object.entries(extraHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  res.end(JSON.stringify(body));
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const url = new URL(req.url || '/', 'http://localhost');
  const code = (
    (typeof req.query?.code === 'string' ? req.query.code : null) ||
    url.searchParams.get('code') ||
    ''
  )
    .trim()
    .toUpperCase();

  if (!isValidUnitCode(code)) {
    sendJson(res, 400, { error: 'Invalid unit code' });
    return;
  }

  try {
    const handbookUrl = `https://handbook.monash.edu/${HANDBOOK_YEAR}/units/${code.toLowerCase()}`;
    const response = await fetch(handbookUrl, {
      headers: {
        'User-Agent': 'MonashCoursePlanner/2.1 (+https://github.com/arbusam/Monash-Course-Planner)',
        Accept: 'text/html'
      }
    });

    if (response.status === 429) {
      sendJson(
        res,
        503,
        { error: 'Handbook rate limited', code },
        { 'Retry-After': '60', 'Cache-Control': 'no-store' }
      );
      return;
    }

    if (!response.ok) {
      const status = response.status >= 500 ? 502 : response.status;
      sendJson(
        res,
        status,
        { error: `Failed to load handbook page (${response.status})`, code },
        { 'Cache-Control': 'no-store' }
      );
      return;
    }

    const html = await response.text();
    const rules = parseHandbookRequisites(html);

    sendJson(
      res,
      200,
      { code, handbookYear: HANDBOOK_YEAR, rules },
      { 'Cache-Control': CACHE_CONTROL }
    );
  } catch (error) {
    sendJson(
      res,
      502,
      { error: error.message || 'Failed to fetch requisites', code },
      { 'Cache-Control': 'no-store' }
    );
  }
}
