// Web Highlighter - Background Script
// 处理扩展后台任务

const SERVER_URL = 'http://localhost:3100';

// 扩展安装时创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'save-highlight',
        title: '💡 保存到 Web Highlighter',
        contexts: ['selection']
    });
    chrome.contextMenus.create({
        id: 'save-highlight-with-note',
        title: '💡 添加笔记并保存',
        contexts: ['selection']
    });

    console.log('Web Highlighter 扩展已安装');
});

// 快捷键：在任意页面打开随手记输入框
chrome.commands.onCommand.addListener(function(command) {
    if (command !== 'open-quick-note') return;
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        var tab = tabs[0];
        if (!tab || !tab.id) return;
        chrome.tabs.sendMessage(tab.id, { action: 'showQuickNoteDialog' }).then(function() {}).catch(function() {
            injectQuickNoteFallback(tab.id);
        });
    });
});
function injectQuickNoteFallback(tabId) {
    chrome.scripting.executeScript({
        target: { tabId: tabId, allFrames: true },
        files: ['note-dialog-inject.js']
    }).then(function() {
        return chrome.scripting.executeScript({
            target: { tabId: tabId, allFrames: true },
            args: [SERVER_URL],
            func: function(serverUrl) {
                try {
                    window.dispatchEvent(new CustomEvent('wh-show-quick-note', { detail: { serverUrl: serverUrl } }));
                } catch (e) { console.warn('[Web Highlighter] quick-note dispatch error', e); }
            }
        });
    }).then(function() {}).catch(function() {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon-48.png',
            title: 'Web Highlighter',
            message: '当前页面无法打开随手记，请在其他网页试一下'
        });
    });
}

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (!info.selectionText) return;
    if (info.menuItemId === 'save-highlight') {
        saveHighlightFromContextMenu(info, tab);
    } else if (info.menuItemId === 'save-highlight-with-note') {
        const payload = { action: 'showNoteDialog', selectionText: info.selectionText };
        const tryFrame = (frameId) => chrome.tabs.sendMessage(tab.id, payload, { frameId: frameId });
        const frameId = info.frameId !== undefined ? info.frameId : 0;
        tryFrame(frameId).then(() => {}).catch(() => {
            if (frameId !== 0) {
                tryFrame(0).then(() => {}).catch(injectNoteDialogFallback);
            } else {
                injectNoteDialogFallback();
            }
        });
        function showNoteUnavailable() {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon-48.png',
                title: 'Web Highlighter',
                message: '请先在网页上选中文字，再右键选择「添加笔记并保存」'
            });
        }
        function injectNoteDialogFallback() {
            var tabId = tab.id;
            var selectionText = info.selectionText;
            var serverUrl = SERVER_URL;
            chrome.scripting.executeScript({
                target: { tabId: tabId, allFrames: true },
                files: ['note-dialog-inject.js']
            }).then(function() {
                return chrome.scripting.executeScript({
                    target: { tabId: tabId, allFrames: true },
                    args: [selectionText, serverUrl],
                    func: function(selectionText, serverUrl) {
                        try {
                            window.dispatchEvent(new CustomEvent('wh-show-note-dialog', { detail: { selectionText: selectionText, serverUrl: serverUrl } }));
                        } catch (e) { console.warn('[Web Highlighter] dispatch error', e); }
                    }
                });
            }).then(function(results) {
                var anyOk = results && results.some(function(r) { return r && !r.error; });
                if (!anyOk) showNoteUnavailable();
            }).catch(showNoteUnavailable);
        }
    }
});

// 从右键菜单保存高亮
async function saveHighlightFromContextMenu(info, tab) {
    const data = {
        text: info.selectionText,
        note: '',
        url: tab.url,
        title: tab.title,
        domain: new URL(tab.url).hostname,
        timestamp: new Date().toISOString()
    };

    try {
        const response = await fetch(`${SERVER_URL}/api/highlights`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            // 显示成功通知
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon-48.png',
                title: 'Web Highlighter',
                message: '✅ 高亮保存成功！'
            });
        }
    } catch (error) {
        console.error('Save error:', error);
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon-48.png',
            title: 'Web Highlighter',
            message: '❌ 保存失败，请检查服务器'
        });
    }
}

// 处理来自 content script 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'highlightSaved') {
        console.log('Highlight saved:', message.data);
    }
    sendResponse({ success: true });
});
