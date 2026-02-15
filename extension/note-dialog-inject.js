/**
 * 由 background 通过 scripting.executeScript 注入，用于「添加笔记并保存」后备弹窗。
 * 监听自定义事件 wh-show-note-dialog，收到后显示弹窗并提交到本地 API。
 */
(function() {
    'use strict';
    if (window.__whNoteDialogInjected) return;
    window.__whNoteDialogInjected = true;
    function showToast(msg) {
        var el = document.getElementById('wh-inject-toast');
        if (el) el.remove();
        el = document.createElement('div');
        el.id = 'wh-inject-toast';
        el.style.cssText = 'position:fixed;top:20px;right:20px;z-index:2147483647;padding:14px 20px;border-radius:12px;font-size:14px;font-family:system-ui,sans-serif;background:#10b981;color:#fff;box-shadow:0 10px 40px rgba(0,0,0,0.3);pointer-events:none;';
        el.textContent = msg;
        document.body.appendChild(el);
        setTimeout(function() { el.remove(); }, 2500);
    }
    function esc(s) {
        var d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }
    function showDialog(selectionText, serverUrl) {
        try {
            var existing = document.getElementById('wh-note-dialog-wrap');
            if (existing) existing.remove();
            if (!document.body) return;
            var preview = selectionText.length > 60 ? selectionText.substring(0, 60) + '\u2026' : selectionText;
            var wrap = document.createElement('div');
            wrap.id = 'wh-note-dialog-wrap';
            wrap.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);font-family:system-ui,sans-serif;';
            var box = document.createElement('div');
            box.style.cssText = 'background:white;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.3);padding:20px;width:90%;max-width:400px;box-sizing:border-box;';
            box.innerHTML = '<div style="font-size:13px;color:#666;margin-bottom:12px;">\u9ad8\u4eae\u5185\u5bb9\uff1a</div><div style="font-size:14px;color:#333;line-height:1.5;margin-bottom:16px;padding:10px;background:#f5f5f5;border-radius:8px;">' + esc(preview) + '</div><label style="font-size:13px;color:#666;display:block;margin-bottom:8px;">\u4f60\u7684\u7b14\u8bb0\uff08\u53ef\u9009\uff09\uff1a</label><textarea id="wh-note-input" placeholder="\u5199\u4e0b\u4f60\u5bf9\u8fd9\u6bb5\u5185\u5bb9\u7684\u60f3\u6cd5..." rows="4" style="width:100%;padding:12px;border:1px solid #e0e0e0;border-radius:8px;font-size:14px;box-sizing:border-box;"></textarea><div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;"><button id="wh-note-cancel" style="padding:10px 18px;border-radius:8px;border:1px solid #ddd;background:#fff;cursor:pointer;font-size:14px;">\u53d6\u6d88</button><button id="wh-note-save" style="padding:10px 18px;border-radius:8px;border:none;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;cursor:pointer;font-size:14px;">\u4fdd\u5b58</button></div>';
            wrap.appendChild(box);
            function remove() {
                var w = document.getElementById('wh-note-dialog-wrap');
                if (w) w.remove();
            }
            box.querySelector('#wh-note-save').onclick = function() {
                var note = (box.querySelector('#wh-note-input').value || '').trim();
                var payload = { text: selectionText, note: note, url: location.href, title: document.title, domain: location.hostname, timestamp: new Date().toISOString() };
                fetch(serverUrl + '/api/highlights', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(function(r) {
                    if (r.ok) { remove(); showToast('\u5df2\u4fdd\u5b58\u5230 Web Highlighter'); }
                });
            };
            box.querySelector('#wh-note-cancel').onclick = function() { remove(); };
            wrap.onclick = function(e) { if (e.target === wrap) remove(); };
            document.body.appendChild(wrap);
            var input = box.querySelector('#wh-note-input');
            if (input) input.focus();
        } catch (e) {
            console.warn('[Web Highlighter] note dialog inject error', e);
        }
    }
    window.addEventListener('wh-show-note-dialog', function(ev) {
        var d = ev && ev.detail;
        if (d && d.selectionText && d.serverUrl) showDialog(d.selectionText, d.serverUrl);
    });

    function showQuickNote(serverUrl) {
        try {
            var existing = document.getElementById('wh-quick-note-wrap');
            if (existing) existing.remove();
            if (!document.body) return;
            var wrap = document.createElement('div');
            wrap.id = 'wh-quick-note-wrap';
            wrap.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);font-family:system-ui,sans-serif;';
            var box = document.createElement('div');
            box.style.cssText = 'background:white;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.3);padding:20px;width:90%;max-width:400px;box-sizing:border-box;';
            box.innerHTML = '<div style="font-size:15px;color:#333;margin-bottom:12px;">\u968f\u624b\u8bb0</div><textarea id="wh-quick-note-input" placeholder="\u8bb0\u4e0b\u4f60\u7684\u60f3\u6cd5\u2026\u2026" rows="5" style="width:100%;padding:12px;border:1px solid #e0e0e0;border-radius:8px;font-size:14px;box-sizing:border-box;"></textarea><div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;"><button type="button" id="wh-quick-note-cancel" style="padding:10px 18px;border-radius:8px;border:1px solid #ddd;background:#fff;cursor:pointer;font-size:14px;">\u53d6\u6d88</button><button type="button" id="wh-quick-note-save" style="padding:10px 18px;border-radius:8px;border:none;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;cursor:pointer;font-size:14px;">\u4fdd\u5b58</button></div>';
            wrap.appendChild(box);
            function remove() { var w = document.getElementById('wh-quick-note-wrap'); if (w) w.remove(); }
            var saveBtn = box.querySelector('#wh-quick-note-save');
            var cancelBtn = box.querySelector('#wh-quick-note-cancel');
            saveBtn.onclick = function() {
                if (!document.getElementById('wh-quick-note-wrap')) return;
                var note = (box.querySelector('#wh-quick-note-input').value || '').trim();
                if (!note) { remove(); return; }
                var payload = { text: '(\u968f\u624b\u8bb0)', note: note, type: 'quick_note', url: location.href, title: document.title, domain: location.hostname, timestamp: new Date().toISOString() };
                fetch(serverUrl + '/api/highlights', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(function(r) {
                    if (r.ok && document.getElementById('wh-quick-note-wrap')) { remove(); showToast('\u5df2\u4fdd\u5b58\u5230 Web Highlighter'); }
                });
            };
            cancelBtn.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                remove();
            };
            wrap.onclick = function(e) { if (e.target === wrap) remove(); };
            document.body.appendChild(wrap);
            var input = box.querySelector('#wh-quick-note-input');
            if (input) input.focus();
        } catch (e) {
            console.warn('[Web Highlighter] quick-note inject error', e);
        }
    }
    window.addEventListener('wh-show-quick-note', function(ev) {
        var d = ev && ev.detail;
        if (d && d.serverUrl) showQuickNote(d.serverUrl);
    });
})();
