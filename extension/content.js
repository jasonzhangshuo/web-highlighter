// Web Highlighter - 监听微信读书划线/笔记，二次同步保存
// 策略：不抢工具栏，用 MutationObserver + fetch 拦截 检测到划线/写想法后再保存

(function() {
    'use strict';

    // 不在 dashboard 页运行，避免在本地管理页误触发
    const isLocalDashboardHost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
    if (isLocalDashboardHost && (window.location.port === '3100' || window.location.port === '')) return;

    const SERVER_URL = 'http://localhost:3100';
    const IS_WEREAD = /weread\.qq\.com/i.test(window.location.hostname);
    
    // 已同步过的高亮节点（用 WeakSet 或 data 属性标记，避免重复保存）
    const syncedNodes = new WeakSet();
    
    // 可能的微信读书高亮选择器（按优先级尝试）
    const HIGHLIGHT_SELECTORS = [
        '[class*="highlight"]',
        '[class*="Highlight"]',
        '[class*="mark"]',
        '[class*="Mark"]',
        '[class*="underline"]',
        '[class*="wead"]',
        '[class*="wr_"]',
        '[class*="annotation"]',
        '[class*="想法"]',
        '[data-type="highlight"]',
        '[data-highlight]',
        'span[style*="background"]',
        'mark'
    ];

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function showToast(message, type) {
        const existing = document.getElementById('wh-toast');
        if (existing) existing.remove();
        const toast = document.createElement('div');
        toast.id = 'wh-toast';
        toast.style.cssText = `
            position: fixed !important; top: 20px !important; right: 20px !important;
            z-index: 2147483647 !important; padding: 14px 20px !important;
            border-radius: 12px !important; font-size: 14px !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3) !important; pointer-events: none !important;
            background: ${type === 'success' ? '#10b981' : '#f59e0b'} !important; color: white !important;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    function isLikelyHighlightNode(node) {
        if (node.nodeType !== Node.ELEMENT_NODE) return false;
        const el = node;
        const tag = (el.tagName || '').toLowerCase();
        if (tag !== 'span' && tag !== 'mark' && tag !== 'div') return false;
        
        const text = (el.textContent || '').trim();
        if (text.length < 1) return false;
        
        const cls = (el.className || '').toString();
        const style = (el.getAttribute('style') || '').toLowerCase();
        
        if (cls.match(/highlight|mark|underline|wead|wr_|annotation|想法|笔记/)) return true;
        if (style.includes('background')) return true;
        if (el.getAttribute('data-highlight') != null || el.getAttribute('data-type') === 'highlight') return true;
        
        const bg = window.getComputedStyle(el).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
            const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (m) {
                const r = +m[1], g = +m[2], b = +m[3];
                if (g > 180 && r > 180 && b < 150) return true;
                if (r > 200 && g > 180 && b < 120) return true;
            }
        }
        return false;
    }

    function collectHighlightText(node) {
        const text = (node.textContent || '').trim();
        if (text.length >= 1) return text;
        return null;
    }

    function saveToServer(text, note) {
        const data = {
            text: text,
            note: note || '',
            url: window.location.href,
            title: document.title,
            domain: window.location.hostname,
            timestamp: new Date().toISOString()
        };
        return fetch(`${SERVER_URL}/api/highlights`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }).then(r => {
            if (!r.ok) console.log('[Web Highlighter] 保存请求失败 HTTP', r.status);
            return r.ok;
        }).catch(err => {
            console.log('[Web Highlighter] 保存请求异常', err.message);
            return false;
        });
    }

    function syncHighlight(node, text, note) {
        if (syncedNodes.has(node)) return;
        saveToServer(text, note).then(ok => {
            if (ok) {
                syncedNodes.add(node);
                node.setAttribute('data-wh-synced', '1');
                showToast('✅ 已同步到 Web Highlighter');
            }
        });
    }

    function processNewNode(node) {
        if (syncedNodes.has(node) || node.getAttribute('data-wh-synced')) return;
        if (!isLikelyHighlightNode(node)) return;
        
        const text = collectHighlightText(node);
        if (!text) return;
        
        let note = '';
        const next = node.nextElementSibling;
        if (next && (next.className || '').toString().match(/想法|笔记|note|comment/)) {
            note = (next.textContent || '').trim();
        }
        const parent = node.parentElement;
        if (parent) {
            const noteEl = parent.querySelector('[class*="想法"], [class*="笔记"], [class*="note"], [class*="comment"]');
            if (noteEl) note = (noteEl.textContent || '').trim();
        }
        
        syncHighlight(node, text, note);
    }

    function walkAndCollectHighlights(root) {
        if (!root || root.nodeType !== Node.ELEMENT_NODE) return;
        if (root.id === 'wh-toast' || root.id === 'wh-dialog') return;
        
        if (isLikelyHighlightNode(root)) {
            processNewNode(root);
            return;
        }
        
        const children = root.querySelectorAll ? root.querySelectorAll('span, mark') : [];
        for (let i = 0; i < children.length; i++) {
            const el = children[i];
            if (isLikelyHighlightNode(el)) processNewNode(el);
        }
    }

    const observer = new MutationObserver(mutations => {
        for (const m of mutations) {
            if (m.type !== 'childList' || !m.addedNodes.length) continue;
            for (const node of m.addedNodes) {
                if (node.nodeType !== Node.ELEMENT_NODE) continue;
                walkAndCollectHighlights(node);
                const spans = node.querySelectorAll ? node.querySelectorAll('span, mark') : [];
                spans.forEach(el => { if (isLikelyHighlightNode(el)) processNewNode(el); });
            }
        }
    });

    function startObserving() {
        if (!document.body) return;
        // 微信读书只用「复制即保存」，不跑 DOM 扫描，避免误把大量节点当高亮重复保存
        if (IS_WEREAD) return;
        observer.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => walkAndCollectHighlights(document.body), 2000);
    }

    // 防重复：先同步判断本帧 3 秒内是否已处理过同一段文字，再异步用 storage 跨 frame 去重
    const DEBOUNCE_MS = 3000;
    const STORAGE_KEY = 'wh_last_copy';
    let _lastText = '';
    let _lastTime = 0;

    // 监听复制：用「当前选区」取文字（微信读书点复制时 clipboardData 常为空，选区仍在）
    document.addEventListener('copy', function(e) {
        if (!IS_WEREAD) return;
        const fromSelection = (window.getSelection && window.getSelection().toString()) || '';
        const fromClipboard = (e.clipboardData && e.clipboardData.getData('text/plain')) || '';
        const text = (fromSelection || fromClipboard).trim();
        if (text.length < 2) return;
        const now = Date.now();
        if (_lastText === text && now - _lastTime < DEBOUNCE_MS) return;
        _lastText = text;
        _lastTime = now;
        chrome.storage.local.get(STORAGE_KEY, function(rec) {
            const last = rec && rec[STORAGE_KEY];
            if (last && last.text === text && Date.now() - last.time < DEBOUNCE_MS) return;
            chrome.storage.local.set({ [STORAGE_KEY]: { text: text, time: Date.now() } });
            saveToServer(text, '').then(ok => {
                if (ok) showToast('✅ 已保存到 Web Highlighter');
            });
        });
    }, true);

    if (document.body) startObserving();
    else document.addEventListener('DOMContentLoaded', startObserving);

    // 不在微信读书里拦截 fetch，否则会随他们的接口请求不断触发保存导致刷屏
    if (!IS_WEREAD) {
        window.addEventListener('message', (e) => {
            if (e.source !== window || !e.data || e.data.type !== 'WH_SAVE_HIGHLIGHT') return;
            const { text, note } = e.data;
            if (text) saveToServer(text, note).then(ok => ok && showToast('✅ 已同步到 Web Highlighter'));
        });
        const script = document.createElement('script');
        script.textContent = `
(function() {
    var _fetch = window.fetch;
    if (!_fetch) return;
    window.fetch = function(url, opts) {
        var u = (url || '').toString();
        var body = opts && opts.body;
        if ((u.indexOf('review') !== -1 || u.indexOf('highlight') !== -1 || u.indexOf('mark') !== -1 || u.indexOf('annotation') !== -1 || u.indexOf('note') !== -1) && body) {
            try {
                var data = typeof body === 'string' ? JSON.parse(body) : body;
                var text = data.content || data.text || data.quote || (data.data && (data.data.content || data.data.text));
                var note = data.note || data.comment || data.thought || (data.data && (data.data.note || data.data.comment));
                if (text) {
                    window.postMessage({ type: 'WH_SAVE_HIGHLIGHT', text: text, note: note || '' }, '*');
                }
            } catch (e) {}
        }
        return _fetch.apply(this, arguments);
    };
})();
`;
        (document.head || document.documentElement).appendChild(script);
        script.remove();
    }

    if (IS_WEREAD) console.log('[Web Highlighter] 已加载，仅「复制」时保存。当前环境:', window === window.top ? '主页面' : 'iframe');
})();
