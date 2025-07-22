// popup.js
document.addEventListener('DOMContentLoaded', () => {
  const toggles = {
    username:     document.getElementById('toggle-username'),
    followers:    document.getElementById('toggle-followers'),
    bio:          document.getElementById('toggle-bio'),
    email:        document.getElementById('toggle-email'),
    pinned:       document.getElementById('toggle-pinned'),
    lastVideos:   document.getElementById('toggle-lastVideos'),
    penetration:  document.getElementById('toggle-penetration'),
    views:        document.getElementById('toggle-views'),
    likes:        document.getElementById('toggle-likes'),
    comments:     document.getElementById('toggle-comments'),
    saves:        document.getElementById('toggle-saves'),
    shares:       document.getElementById('toggle-shares')
  };
  const inputLastN = document.getElementById('input-lastN');

  const defaults = {
    initialized:        true,
    toggleUsername:     true,
    toggleFollowers:    true,
    toggleBio:          true,
    toggleEmail:        true,
    togglePinned:       true,
    toggleLastVideos:   true,
    togglePenetration:  true,
    toggleViews:        true,
    toggleLikes:        true,
    toggleComments:     true,
    toggleSaves:        true,
    toggleShares:       true,
    lastN:              5
  };

  // 首次安装写入默认，之后只读不覆盖
  chrome.storage.local.get(['initialized'], res => {
    if (!res.initialized) {
      chrome.storage.local.set(defaults, () => initUI(defaults));
    } else {
      chrome.storage.local.get(defaults, initUI);
    }
  });

  function initUI(prefs) {
    Object.keys(toggles).forEach(key => {
      const sk = 'toggle' + key.charAt(0).toUpperCase() + key.slice(1);
      toggles[key].checked = prefs[sk];
    });
    inputLastN.value = prefs.lastN;
    refresh();
  }

  function saveSetting(key, value) {
    chrome.storage.local.set({ [key]: value }, refresh);
  }

  // 绑定所有开关
  Object.entries(toggles).forEach(([key, el]) => {
    const sk = 'toggle' + key.charAt(0).toUpperCase() + key.slice(1);
    el.addEventListener('change', () => saveSetting(sk, el.checked));
  });

  // 绑定 Last N Videos 输入框
  inputLastN.addEventListener('change', () => {
    const n = parseInt(inputLastN.value, 10) || defaults.lastN;
    saveSetting('lastN', n);
  });

  // 每次打开 & 保存后都刷新 View Stats Data 表格
  function refresh() {
    const lastN = parseInt(inputLastN.value, 10) || defaults.lastN;
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (!tabs[0]?.id) return;
      
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: 'getData', lastN },
        data => {
          if (!data) return;
          
          if (data.error) {
            return;
          }
          
          document.getElementById('stat-pinnedAvg').textContent =
            data.pinnedAvg != null
              ? Number(data.pinnedAvg).toLocaleString()
              : '-';
          document.getElementById('stat-lastAvg').textContent =
            data.lastAvg != null
              ? Number(data.lastAvg).toLocaleString()
              : '-';
          document.getElementById('stat-penetration').textContent =
            data.penetration || '-';
        }
      );
    });
  }
});