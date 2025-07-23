// content_script.js
(function() {
  if (window.__tiktokDataCopierInjected) return;
  window.__tiktokDataCopierInjected = true;

  // 将 "1.2K"/"3.4M" 转为数字
  function parseView(text) {
    if (!text) return 0;
    const t = text.trim();
    let m = 1;
    if (/K$/i.test(t)) m = 1e3;
    if (/M$/i.test(t)) m = 1e6;
    const num = parseFloat(t.replace(/[^0-9.]/g, '')) || 0;
    return Math.round(num * m);
  }

  // 判断当前是 直连 还是 播放器 浮层
  function detectVideoMode() {
    const path = location.pathname;

    // 只有真正以 /@user/video/ID 开头，才是视频页
    const isVideoPage = /^\/@[^\/]+\/video\/\d+/.test(path);
    if (!isVideoPage) {
      // Profile 页，无论有没有浮层，都视作 Profile
      return 'profile';
    }

    // 如果是视频页，再分直连/浮层
    const hasOverlay = !!(
      document.querySelector('.xgplayer-container') &&
      document.querySelector('.tiktok-web-player') &&
      document.querySelector('strong[data-e2e="browse-like-count"]')
    );
    return hasOverlay ? 'overlay' : 'direct';
  }

  // 尝试从内联 JSON 提取 stats
  function parseStatsFromJSON() {
    const tag = document.getElementById('__UNIVERSAL_DATA_FOR_REHYDRATION__');
    if (!tag) return null;
    const raw = tag.textContent;
    const m = raw.match(/"stats":\{([\s\S]*?)\},/);
    if (!m) return null;
    try {
      return JSON.parse(`{${m[1]}}`);
    } catch {
      return null;
    }
  }

  // 收集 "视频页" 数据
  function collectVideoData() {
    const url = location.href;
    const atSeg = location.pathname.split('/').find(p => p.startsWith('@')) || '';
    const userId = atSeg.slice(1);

    // 1. 只在直连模式下尝试 JSON
    let statsJson = null;
    if (detectVideoMode() === 'direct') {
      statsJson = parseStatsFromJSON();
      if (statsJson) {
        // 如果所有字段都是 0，也视为解析失败
        const vals = [
          Number(statsJson.playCount)||0,
          Number(statsJson.diggCount)||0,
          Number(statsJson.commentCount)||0,
          Number(statsJson.shareCount)||0,
          Number(statsJson.collectCount)||0
        ];
        const allZero = vals.every(v => v === 0);
        if (allZero) statsJson = null;
      }
    }

    let play, likes, comments, shares, saves;
    if (statsJson) {
      play     = Number(statsJson.playCount)    || 0;
      likes    = Number(statsJson.diggCount)    || 0;
      comments = Number(statsJson.commentCount) || 0;
      shares   = Number(statsJson.shareCount)   || 0;
      saves    = Number(statsJson.collectCount) || 0;
    } else {
      // 2. DOM fallback（overlay 或 JSON 失效）
      // 2a. 精确：在 Profile 视频列表中，定位 href 匹配当前 URL 的 <a>
      const anchor = document.querySelector(`a[href="${url}"]`);
      if (anchor) {
        play = parseView(anchor.querySelector('strong[data-e2e="video-views"]')?.innerText);
      } else {
        // 2b. 通用：直连或其它页面
        const getText = keys => {
          for (const k of keys) {
            const el = document.querySelector(`strong[data-e2e="${k}"]`);
            if (el) return el.innerText;
          }
          return '';
        };
        play = parseView(getText(['video-views','play-count']));
      }
      // 其余字段都走通用 DOM
      const getText = keys => {
        for (const k of keys) {
          const el = document.querySelector(`strong[data-e2e="${k}"]`);
          if (el) return el.innerText;
        }
        return '';
      };
      likes    = parseView(getText(['browse-like-count','like-count']));
      comments = parseView(getText(['browse-comment-count','comment-count']));
      shares   = parseView(getText(['share-count']));
      const savesEls = document.querySelectorAll('strong[data-e2e="undefined-count"]');
      saves    = parseView(savesEls[0]?.innerText);
    }

    return { url, userId, play, likes, comments, saves, shares };
  }

  // 收集 "个人主页" 数据
  function collectProfileData(lastN) {
    const url = location.href;
    const atSeg = location.pathname.split('/').find(p => p.startsWith('@')) || '';
    const userId = atSeg.slice(1);

    const folText = document.querySelector('strong[data-e2e="followers-count"]')?.innerText || '';
    const followers = folText.replace(/,/g,'').trim();

    const bioText = document.querySelector('h2[data-e2e="user-bio"]')?.innerText || '';
    const bio = bioText.trim().replace(/\s+/g,' ');

    const emailMatch = bio.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
    const email = emailMatch ? emailMatch[0] : '';

    // 改进的视频卡片查找逻辑
    let cards = Array.from(document.querySelectorAll('a.css-1mdo0pl-AVideoContainer'));
    
    // 如果找不到视频卡片，尝试其他选择器
    if (cards.length === 0) {
      const alternativeSelectors = [
        '[data-e2e="user-post-item"]',
        '.video-card',
        '.user-post-item',
        'a[href*="/video/"]',
        '[data-e2e="video-card"]'
      ];
      
      for (const selector of alternativeSelectors) {
        cards = Array.from(document.querySelectorAll(selector));
        if (cards.length > 0) break;
      }
    }
    
    const pinned = [], nonPinned = [];
    cards.forEach((card, index) => {
      // 尝试多种方式获取观看数
      let vText = '';
      const viewSelectors = [
        'strong[data-e2e="video-views"]',
        '[data-e2e="video-views"]',
        '.video-views',
        '.view-count'
      ];
      
      for (const selector of viewSelectors) {
        const viewEl = card.querySelector(selector);
        if (viewEl) {
          vText = viewEl.innerText;
          break;
        }
      }
      
      const v = parseView(vText);
      
      // 检查是否为置顶视频
      const isPinned = card.querySelector('[data-e2e="video-card-badge"]') || 
                      card.querySelector('.pinned-badge') ||
                      card.querySelector('[data-e2e="pinned-video"]');
      
      if (isPinned) {
        pinned.push(v);
      } else {
        nonPinned.push(v);
      }
    });

    const avg = arr => arr.length ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length) : null;
    const pinnedAvg   = avg(pinned);
    const lastAvg     = avg(nonPinned.slice(0, lastN));
    const folNum      = parseView(followers);
    const penetration = (lastAvg != null && folNum > 0)
      ? (lastAvg/folNum*100).toFixed(1) + '%'
      : '-';

    return { 
      url, 
      userId, 
      followers, 
      bio, 
      email, 
      pinnedAvg: pinnedAvg !== null ? pinnedAvg : null,
      lastAvg: lastAvg !== null ? lastAvg : null,
      penetration 
    };
  }

  // 根据路径决定模式
  function collectData(lastN) {
    const isVideoPage = /^\/@[^\/]+\/video\/\d+/.test(location.pathname);
    return isVideoPage ? collectVideoData() : collectProfileData(lastN);
  }

  // Toast：底部居中
  function showToast(msg) {
    const d = document.createElement('div');
    d.textContent = msg;
    Object.assign(d.style, {
      position: 'fixed',
      bottom: '40px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(0,0,0,0.8)',
      color: '#fff',
      padding: '8px 16px',
      borderRadius: '4px',
      zIndex: 1000000,
      fontSize: '14px'
    });
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 2000);
  }

  // 插入复制按钮
  function insertButton() {
    // 检查是否已经存在按钮，避免重复插入
    if (document.getElementById('tiktok-data-copier-btn')) {
      return;
    }
    
    const btn = document.createElement('img');
    btn.id = 'tiktok-data-copier-btn';
    btn.src = chrome.runtime.getURL('button.png');
    Object.assign(btn.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: '48px', height: '48px',
      cursor: 'pointer', zIndex: 999999
    });
    document.body.appendChild(btn);

    btn.addEventListener('click', () => {
      btn.style.opacity = '0.6';
      chrome.storage.local.get([
        'toggleUsername','toggleFollowers','toggleBio','toggleEmail',
        'togglePinned','toggleLastVideos','togglePenetration',
        'toggleViews','toggleLikes','toggleComments','toggleSaves','toggleShares',
        'lastN'
      ], prefs => {
        const data = collectData(prefs.lastN || 5);
        const isVideo = data.hasOwnProperty('play');
        const row = [];

        // URL 永远第一
        row.push(data.url);

        // Profile 字段
        if (!isVideo) {
          if (prefs.toggleUsername)   row.push(data.userId);
          if (prefs.toggleFollowers)  row.push(data.followers);
          if (prefs.toggleBio)        row.push(data.bio);
          if (prefs.toggleEmail)      row.push(data.email);
          if (prefs.togglePinned)     row.push(data.pinnedAvg ?? '-');
          if (prefs.toggleLastVideos) row.push(data.lastAvg   ?? '-');
          if (prefs.togglePenetration)row.push(data.penetration);
        }

        // Video 字段
        if (isVideo) {
          if (prefs.toggleUsername) row.push(data.userId);
          if (prefs.toggleViews)    row.push(data.play.toLocaleString());
          if (prefs.toggleLikes)    row.push(data.likes.toLocaleString());
          if (prefs.toggleComments) row.push(data.comments.toLocaleString());
          if (prefs.toggleSaves)    row.push(data.saves.toLocaleString());
          if (prefs.toggleShares)   row.push(data.shares.toLocaleString());
        }

        const text = row.filter(v => v != null).join('\t');
        navigator.clipboard.writeText(text)
          .then(() => showToast('Copy Succeed!'))
          .catch(() => showToast('Copy Failed'))
          .finally(() => setTimeout(() => btn.style.opacity = '1', 2000));
      });
    });
  }

  // 改进的按钮插入逻辑
  function tryInsertButton() {
    // 确保在TikTok页面上
    if (!location.hostname.includes('tiktok.com')) {
      return;
    }
    
    // 等待页面完全加载
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        // 等待React渲染完成
        setTimeout(insertButton, 2000);
      });
    } else {
      // 如果页面已经加载，延迟更长时间确保React渲染完成
      setTimeout(insertButton, 3000);
    }
  }
  
  tryInsertButton();
  
  // 监听页面变化（SPA导航）
  let lastUrl = location.href;
  let retryCount = 0;
  const maxRetries = 5;
  
  function waitForPageReady() {
    // 检查页面是否已经准备好（React渲染完成）
    const hasContent = document.querySelector('[data-e2e="video-views"], [data-e2e="followers-count"], .tiktok-web-player');
    const hasReactReady = !document.querySelector('.loading') && document.body.children.length > 10;
    
    // 添加Profile页面的特殊检查
    const isProfilePage = location.pathname.match(/^\/@[^\/]+$/);
    const hasProfileContent = isProfilePage ? 
      (document.querySelector('[data-e2e="followers-count"]') || document.querySelector('.video-card')) : 
      true;
    
    if ((hasContent || hasReactReady) && hasProfileContent) {
      insertButton();
      retryCount = 0;
    } else if (retryCount < maxRetries) {
      retryCount++;
      setTimeout(waitForPageReady, 1000);
    } else {
      insertButton();
      retryCount = 0;
    }
  }
  
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(waitForPageReady, 1000);
    }
  }).observe(document, { subtree: true, childList: true });

  // 监听 popup.js 的 getData
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'getData') {
      try {
        const data = collectData(msg.lastN);
        sendResponse(data);
      } catch (error) {
        sendResponse({ error: error.message });
      }
      return true;
    }
  });
})();