/**
 * 用 Playwright 打开微信读书，注入复制监听，在终端打印结果。
 * 运行：npx node scripts/weread-copy-listener.js
 * 请在打开的浏览器里：打开一本书 → 选中一段字 → 点「复制」，看终端是否出现 [检测] 复制...
 */

const { chromium } = require('playwright');

const INJECT = `
  var text = (e.clipboardData && e.clipboardData.getData('text/plain')) || '';
  console.log('WH_COPY ' + text.length + ' ' + (text.slice(0, 80) || ''));
`;

async function main() {
  console.log('正在启动浏览器并打开微信读书...');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 把页面里的 console 转到我们终端
  page.on('console', (msg) => {
    const text = msg.text();
    if (text.startsWith('WH_COPY')) {
      console.log('[检测] 复制事件触发:', text);
    }
    if (text.startsWith('WH_INJECTED')) {
      console.log('[检测]', text);
    }
  });

  await page.goto('https://weread.qq.com', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(3000);

  function injectInFrame(frame) {
    return frame.evaluate((fnBody) => {
      const fn = new Function('e', fnBody);
      document.addEventListener('copy', fn, true);
      console.log('WH_INJECTED', window === window.top ? '主页面' : 'iframe', location.href);
    }, INJECT).catch((err) => {
      console.log('[检测] 注入失败:', frame.url(), err.message);
    });
  }

  async function injectAll() {
    await injectInFrame(page);
    for (const frame of page.frames()) {
      if (frame !== page.mainFrame()) await injectInFrame(frame);
    }
  }

  await injectAll();
  console.log('\n已注入复制监听。请你在浏览器里：打开一本书 → 选中一段字 → 点工具栏「复制」。');
  console.log('若复制事件被监听到，终端会打印 [检测] 复制事件触发...\n');

  // 进入阅读页后可能新增 iframe，每 8 秒再注入一次
  const interval = setInterval(injectAll, 8000);
  await page.waitForTimeout(120000);
  clearInterval(interval);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
