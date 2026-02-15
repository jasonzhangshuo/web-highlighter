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

    console.log('Web Highlighter 扩展已安装');
});

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'save-highlight' && info.selectionText) {
        saveHighlightFromContextMenu(info, tab);
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
