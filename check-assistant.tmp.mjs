import puppeteer from 'puppeteer';
const BASE = 'http://localhost:3001';
const run = async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(BASE + '/search', { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 800));

  const info = await page.evaluate(() => {
    const bubble = document.querySelector('[aria-label="Hablar con el asistente de LegalUp"]');
    const xbtn = document.querySelector('[aria-label="Cerrar asistente de LegalUp"]');
    if (!bubble) return { error: 'bubble not found' };
    const r = bubble.getBoundingClientRect();
    const cx = r.x + r.width / 2;
    const cy = r.y + r.height / 2;
    const top = document.elementFromPoint(cx, cy);
    const topInfo = top
      ? {
          tag: top.tagName,
          cls: (top.className || '').toString().slice(0, 100),
          aria: top.getAttribute('aria-label'),
          isBubble: top === bubble,
          rect: top.getBoundingClientRect().width + 'x' + top.getBoundingClientRect().height,
        }
      : null;
    // Find what overlaps the bubble area (topmost stacking)
    const all = document.elementsFromPoint(cx, cy).slice(0, 6).map((el) => ({
      tag: el.tagName,
      cls: (el.className || '').toString().slice(0, 80),
      aria: el.getAttribute('aria-label'),
      z: getComputedStyle(el).zIndex,
    }));
    return { bubbleRect: r.width + 'x' + r.height + ' at ' + Math.round(r.x) + ',' + Math.round(r.y), top: topInfo, stack: all, xbtn: !!xbtn };
  });
  console.log(JSON.stringify(info, null, 1));
  await browser.close();
};
run().catch((e) => { console.error(e); process.exit(1); });
