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
    currentPlatform: 'tiktok',
    
    // 初始化标记
    initialized: false
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

    // 根据当前网址自动设置平台
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab) {
        let platform = 'tiktok'; // 默认
        if (tab.url.includes('instagram.com')) {
          platform = 'instagram';
        } else if (tab.url.includes('tiktok.com')) {
          platform = 'tiktok';
        }
        
        // 设置当前平台
        setCurrentPlatform(platform);
      } else {
        // 如果没有获取到tab，使用保存的平台设置
        setCurrentPlatform(prefs.currentPlatform || 'tiktok');
      }
    });
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

    chrome.storage.local.set(settings, () => {
      // 确保设置已保存
    });
  }

  // 刷新数据
  function refresh() {
    const statusEl = document.getElementById('status');
    const dataDisplay = document.getElementById('dataDisplay');
    const dataContent = document.getElementById('dataContent');
    const refreshBtn = document.getElementById('refreshBtn');

    statusEl.textContent = '正在獲取數據...';
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
          statusEl.textContent = '無法獲取當前標籤頁';
          refreshBtn.disabled = false;
          return;
        }

        // 检查是否在支持的网站上
        const isTikTok = tab.url.includes('tiktok.com');
        const isInstagram = tab.url.includes('instagram.com');

        if (!isTikTok && !isInstagram) {
          statusEl.textContent = '請在TikTok或Instagram頁面上使用此擴展';
          refreshBtn.disabled = false;
          return;
        }

        if ((platform === 'tiktok' && !isTikTok) || (platform === 'instagram' && !isInstagram)) {
          statusEl.textContent = `請在${platform === 'tiktok' ? 'TikTok' : 'Instagram'}頁面上使用此擴展`;
          refreshBtn.disabled = false;
          return;
        }

        chrome.tabs.sendMessage(tab.id, { action: 'getData', lastN }, (response) => {
          if (chrome.runtime.lastError) {
            statusEl.textContent = '無法與頁面通信，請刷新頁面後重試';
            refreshBtn.disabled = false;
            return;
          }

          if (response && response.error) {
            statusEl.textContent = `錯誤: ${response.error}`;
            refreshBtn.disabled = false;
            return;
          }

          if (response) {
            // 显示数据
            const isVideo = response.hasOwnProperty('play');
            const tableBody = document.getElementById('dataTableBody');
            tableBody.innerHTML = ''; // 清空表格

            if (isVideo) {
              // Video页面不显示表格数据
              dataDisplay.style.display = 'none';
            } else {
              // Profile页面始终显示三个关键指标（不受复选框状态影响）
              const profileData = [
                ['置頂平均觀看', response.pinnedAvg || '-'],
                ['最近平均觀看', response.lastAvg || '-'],
                ['滲透率', response.penetration]
              ];
              
              profileData.forEach(([label, value]) => {
                const row = tableBody.insertRow();
                const cell1 = row.insertCell(0);
                const cell2 = row.insertCell(1);
                cell1.textContent = label;
                cell2.textContent = value;
              });
              
              dataDisplay.style.display = 'block';
            }

            statusEl.textContent = '數據獲取成功';
          } else {
            statusEl.textContent = '未收到數據響應';
          }

          refreshBtn.disabled = false;
        });
      });
    });
  }

  // 事件监听器
  document.addEventListener('DOMContentLoaded', () => {
    // 检查是否已初始化
    chrome.storage.local.get(['initialized'], (result) => {
      if (!result.initialized) {
        // 首次安装，写入默认设置
        chrome.storage.local.set(defaults, () => {
          chrome.storage.local.set({ initialized: true }, () => {
            initUI(defaults);
          });
        });
      } else {
        // 已初始化，读取现有设置
        chrome.storage.local.get(defaults, (prefs) => {
          // 确保所有设置都存在，如果不存在则使用默认值
          const settings = { ...defaults, ...prefs };
          initUI(settings);
        });
      }
    });

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
    
    // 自动刷新数据
    setTimeout(() => {
      refresh();
    }, 500);
  });
})();