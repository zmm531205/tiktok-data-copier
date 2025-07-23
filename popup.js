// popup.js
(function() {
  // 默认设置
  const defaults = {
    // TikTok设置
    toggleUsername: true,
    toggleFollowers: true,
    toggleBio: true,
    toggleEmail: true,
    togglePinned: true,
    toggleLastVideos: true,
    togglePenetration: true,
    toggleViews: true,
    toggleLikes: true,
    toggleComments: true,
    toggleSaves: true,
    toggleShares: true,
    lastN: 5,
    
    // Instagram设置
    'ig-toggleUsername': true,
    'ig-toggleFollowers': true,
    'ig-toggleBio': true,
    'ig-toggleEmail': true,
    'ig-togglePinned': true,
    'ig-toggleLastVideos': true,
    'ig-togglePenetration': true,
    'ig-toggleViews': true,
    'ig-toggleLikes': true,
    'ig-toggleComments': true,
    'ig-toggleSaves': true,
    'ig-toggleShares': true,
    'ig-lastN': 5,
    
    // 当前平台
    currentPlatform: 'tiktok'
  };

  // 初始化UI
  function initUI(prefs) {
    // 设置TikTok复选框
    document.getElementById('toggleUsername').checked = prefs.toggleUsername;
    document.getElementById('toggleFollowers').checked = prefs.toggleFollowers;
    document.getElementById('toggleBio').checked = prefs.toggleBio;
    document.getElementById('toggleEmail').checked = prefs.toggleEmail;
    document.getElementById('togglePinned').checked = prefs.togglePinned;
    document.getElementById('toggleLastVideos').checked = prefs.toggleLastVideos;
    document.getElementById('togglePenetration').checked = prefs.togglePenetration;
    document.getElementById('toggleViews').checked = prefs.toggleViews;
    document.getElementById('toggleLikes').checked = prefs.toggleLikes;
    document.getElementById('toggleComments').checked = prefs.toggleComments;
    document.getElementById('toggleSaves').checked = prefs.toggleSaves;
    document.getElementById('toggleShares').checked = prefs.toggleShares;
    document.getElementById('lastN').value = prefs.lastN;

    // 设置Instagram复选框
    document.getElementById('ig-toggleUsername').checked = prefs['ig-toggleUsername'];
    document.getElementById('ig-toggleFollowers').checked = prefs['ig-toggleFollowers'];
    document.getElementById('ig-toggleBio').checked = prefs['ig-toggleBio'];
    document.getElementById('ig-toggleEmail').checked = prefs['ig-toggleEmail'];
    document.getElementById('ig-togglePinned').checked = prefs['ig-togglePinned'];
    document.getElementById('ig-toggleLastVideos').checked = prefs['ig-toggleLastVideos'];
    document.getElementById('ig-togglePenetration').checked = prefs['ig-togglePenetration'];
    document.getElementById('ig-toggleViews').checked = prefs['ig-toggleViews'];
    document.getElementById('ig-toggleLikes').checked = prefs['ig-toggleLikes'];
    document.getElementById('ig-toggleComments').checked = prefs['ig-toggleComments'];
    document.getElementById('ig-toggleSaves').checked = prefs['ig-toggleSaves'];
    document.getElementById('ig-toggleShares').checked = prefs['ig-toggleShares'];
    document.getElementById('ig-lastN').value = prefs['ig-lastN'];

    // 设置当前平台
    setCurrentPlatform(prefs.currentPlatform || 'tiktok');
  }

  // 设置当前平台
  function setCurrentPlatform(platform) {
    // 更新标签页状态
    document.querySelectorAll('.platform-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-platform="${platform}"]`).classList.add('active');

    // 更新内容区域
    document.querySelectorAll('.platform-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${platform}-content`).classList.add('active');

    // 保存当前平台
    chrome.storage.local.set({ currentPlatform: platform });
  }

  // 保存设置
  function saveSettings() {
    const settings = {
      // TikTok设置
      toggleUsername: document.getElementById('toggleUsername').checked,
      toggleFollowers: document.getElementById('toggleFollowers').checked,
      toggleBio: document.getElementById('toggleBio').checked,
      toggleEmail: document.getElementById('toggleEmail').checked,
      togglePinned: document.getElementById('togglePinned').checked,
      toggleLastVideos: document.getElementById('toggleLastVideos').checked,
      togglePenetration: document.getElementById('togglePenetration').checked,
      toggleViews: document.getElementById('toggleViews').checked,
      toggleLikes: document.getElementById('toggleLikes').checked,
      toggleComments: document.getElementById('toggleComments').checked,
      toggleSaves: document.getElementById('toggleSaves').checked,
      toggleShares: document.getElementById('toggleShares').checked,
      lastN: parseInt(document.getElementById('lastN').value) || 5,

      // Instagram设置
      'ig-toggleUsername': document.getElementById('ig-toggleUsername').checked,
      'ig-toggleFollowers': document.getElementById('ig-toggleFollowers').checked,
      'ig-toggleBio': document.getElementById('ig-toggleBio').checked,
      'ig-toggleEmail': document.getElementById('ig-toggleEmail').checked,
      'ig-togglePinned': document.getElementById('ig-togglePinned').checked,
      'ig-toggleLastVideos': document.getElementById('ig-toggleLastVideos').checked,
      'ig-togglePenetration': document.getElementById('ig-togglePenetration').checked,
      'ig-toggleViews': document.getElementById('ig-toggleViews').checked,
      'ig-toggleLikes': document.getElementById('ig-toggleLikes').checked,
      'ig-toggleComments': document.getElementById('ig-toggleComments').checked,
      'ig-toggleSaves': document.getElementById('ig-toggleSaves').checked,
      'ig-toggleShares': document.getElementById('ig-toggleShares').checked,
      'ig-lastN': parseInt(document.getElementById('ig-lastN').value) || 5
    };

    chrome.storage.local.set(settings);
  }

  // 刷新数据
  function refresh() {
    const statusEl = document.getElementById('status');
    const dataDisplay = document.getElementById('dataDisplay');
    const dataContent = document.getElementById('dataContent');
    const refreshBtn = document.getElementById('refreshBtn');

    statusEl.textContent = '正在获取数据...';
    refreshBtn.disabled = true;
    dataDisplay.style.display = 'none';

    // 获取当前平台
    chrome.storage.local.get(['currentPlatform'], (result) => {
      const platform = result.currentPlatform || 'tiktok';
      const lastN = platform === 'tiktok' ? 
        parseInt(document.getElementById('lastN').value) || 5 :
        parseInt(document.getElementById('ig-lastN').value) || 5;

      // 发送消息到content script
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab) {
          statusEl.textContent = '无法获取当前标签页';
          refreshBtn.disabled = false;
          return;
        }

        // 检查是否在支持的网站上
        const isTikTok = tab.url.includes('tiktok.com');
        const isInstagram = tab.url.includes('instagram.com');

        if (!isTikTok && !isInstagram) {
          statusEl.textContent = '请在TikTok或Instagram页面上使用此扩展';
          refreshBtn.disabled = false;
          return;
        }

        if ((platform === 'tiktok' && !isTikTok) || (platform === 'instagram' && !isInstagram)) {
          statusEl.textContent = `请在${platform === 'tiktok' ? 'TikTok' : 'Instagram'}页面上使用此扩展`;
          refreshBtn.disabled = false;
          return;
        }

        chrome.tabs.sendMessage(tab.id, { action: 'getData', lastN }, (response) => {
          if (chrome.runtime.lastError) {
            statusEl.textContent = '无法与页面通信，请刷新页面后重试';
            refreshBtn.disabled = false;
            return;
          }

          if (response && response.error) {
            statusEl.textContent = `错误: ${response.error}`;
            refreshBtn.disabled = false;
            return;
          }

          if (response) {
            // 显示数据
            let displayText = '';
            const isVideo = response.hasOwnProperty('play');

            if (isVideo) {
              displayText = `URL: ${response.url}\n`;
              displayText += `用户名: ${response.userId}\n`;
              displayText += `观看数: ${response.play.toLocaleString()}\n`;
              displayText += `点赞数: ${response.likes.toLocaleString()}\n`;
              displayText += `评论数: ${response.comments.toLocaleString()}\n`;
              displayText += `收藏数: ${response.saves.toLocaleString()}\n`;
              displayText += `分享数: ${response.shares.toLocaleString()}`;
            } else {
              displayText = `URL: ${response.url}\n`;
              displayText += `用户名: ${response.userId}\n`;
              displayText += `粉丝数: ${response.followers}\n`;
              displayText += `个人简介: ${response.bio}\n`;
              displayText += `邮箱: ${response.email || '无'}\n`;
              displayText += `置顶平均观看: ${response.pinnedAvg || '-'}\n`;
              displayText += `最近平均观看: ${response.lastAvg || '-'}\n`;
              displayText += `渗透率: ${response.penetration}`;
            }

            dataContent.textContent = displayText;
            dataDisplay.style.display = 'block';
            statusEl.textContent = '数据获取成功';
          } else {
            statusEl.textContent = '未收到数据响应';
          }

          refreshBtn.disabled = false;
        });
      });
    });
  }

  // 事件监听器
  document.addEventListener('DOMContentLoaded', () => {
    // 初始化设置
    chrome.storage.local.get(defaults, initUI);

    // 平台切换
    document.querySelectorAll('.platform-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const platform = tab.getAttribute('data-platform');
        setCurrentPlatform(platform);
      });
    });

    // 设置变更监听
    const allInputs = document.querySelectorAll('input[type="checkbox"], input[type="number"]');
    allInputs.forEach(input => {
      input.addEventListener('change', saveSettings);
    });

    // 刷新按钮
    document.getElementById('refreshBtn').addEventListener('click', refresh);
  });
})();