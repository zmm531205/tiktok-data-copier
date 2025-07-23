// instagram_script.js
(function() {
  if (window.__instagramDataCopierInjected) return;
  window.__instagramDataCopierInjected = true;

  class InstagramDataCopier {
    constructor() {
      this.csrfToken = null;
      this.userData = null;
    }

    // 获取CSRF Token
    getCsrfToken() {
      if (this.csrfToken) return this.csrfToken;
      
      const token = document.cookie.split(";").find(c => 
        c.trim().startsWith("csrftoken=")
      );
      
      if (token) {
        this.csrfToken = token.split("=")[1];
        return this.csrfToken;
      }
      
      return null;
    }

    // 检测当前页面类型
    detectPageType() {
      const currentUrl = window.location.href;
      
      if (currentUrl.includes('/reel/')) {
        return 'reel';
      } else if (currentUrl.includes('/p/')) {
        return 'post';
      } else if (currentUrl.match(/instagram\.com\/[^\/]+\/?$/) || 
                 currentUrl.match(/instagram\.com\/[^\/]+\/reels\/?$/) || 
                 currentUrl.match(/instagram\.com\/[^\/]+\/tagged\/?$/)) {
        return 'profile';
      } else {
        return 'unknown';
      }
    }

    // 从URL中提取用户名
    extractUsername(url) {
      const match = url.match(/instagram\.com\/([^\/\?]+)/);
      if (match && match[1] !== 'reel' && match[1] !== 'p') {
        return match[1];
      }
      throw new Error("无法从URL中提取用户名");
    }

    // 从URL中提取Reel代码
    extractReelCode(url) {
      const match = url.match(/\/reel\/([^\/\?]+)/);
      if (match) {
        return match[1];
      }
      throw new Error("无法从URL中提取Reel代码");
    }

    // 获取用户基本信息
    async getUserProfile(username) {
      try {
        const response = await fetch(
          `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
          {
            headers: {
              "x-ig-app-id": "936619743392459",
              "referrer": `https://www.instagram.com/${username}/`,
              "referrerPolicy": "strict-origin-when-cross-origin"
            }
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        console.error("获取用户资料失败:", error);
        throw error;
      }
    }

    // 获取用户Reels数据
    async getUserReels(userId, maxId = null) {
      try {
        const csrfToken = this.getCsrfToken();
        if (!csrfToken) {
          throw new Error("CSRF token not found");
        }

        const params = {
          target_user_id: userId,
          page_size: 100,
          include_feed_video: "true"
        };

        if (maxId) {
          params.max_id = maxId;
        }

        const response = await fetch("https://i.instagram.com/api/v1/clips/user/", {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "x-ig-app-id": "936619743392459",
            "User-Agent": "Instagram 200.0.0.29.121 Android",
            "X-CSRFToken": csrfToken
          },
          body: new URLSearchParams(params).toString(),
          method: "POST",
          credentials: "include"
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        console.error("获取用户Reels失败:", error);
        throw error;
      }
    }

    // 通过Reel代码获取用户信息，然后获取该用户的Reels
    async getReelData(reelCode) {
      try {
        // 从页面元素中查找用户名
        let username = null;
        const userElements = document.querySelectorAll('a[href*="/"]');
        for (const element of userElements) {
          const href = element.getAttribute('href');
          if (href && href.startsWith('/') && !href.includes('/reel/') && !href.includes('/p/')) {
            const potentialUser = href.substring(1).split('/')[0];
            if (potentialUser && potentialUser.length > 0 && !potentialUser.includes('?')) {
              username = potentialUser;
              break;
            }
          }
        }
        
        if (!username) {
          username = "instagram";
        }
        
        // 获取用户资料
        const profileData = await this.getUserProfile(username);
        const userId = profileData.data.user.id;
        
        // 获取该用户的所有Reels
        const reelsData = await this.getUserReels(userId);
        
        // 在Reels中查找目标Reel
        const targetReel = reelsData.items?.find(reel => {
          const media = reel.media || reel;
          return media.code === reelCode || reel.code === reelCode;
        });
        
        if (targetReel) {
          return {
            items: [targetReel.media || targetReel],
            userProfile: profileData.data.user
          };
        } else {
          throw new Error(`在用户 ${username} 的Reels中未找到代码为 ${reelCode} 的Reel`);
        }
        
      } catch (error) {
        console.error("获取Reel数据失败:", error);
        throw error;
      }
    }

    // 分析Reel数据
    analyzeReelData(reelData) {
      const media = reelData.items?.[0];
      if (!media) {
        throw new Error("未找到媒体数据");
      }

      // 检查是否隐藏了点赞和观看数
      const countsDisabled = media.like_and_view_counts_disabled || false;
      
      // 获取用户信息
      const user = media.user;
      const userProfile = reelData.userProfile;
      
      return {
        id: media.id,
        code: media.code,
        mediaType: media.media_type,
        isVideo: media.media_type === 2,
        isReel: media.product_type === "clips",
        
        // 互动数据
        likes: countsDisabled ? "隐藏" : (media.like_count || 0),
        comments: media.comment_count || 0,
        views: media.play_count || media.view_count || 0,
        
        // 时间信息
        timestamp: media.taken_at_timestamp,
        datePosted: new Date(media.taken_at_timestamp * 1000).toLocaleString(),
        
        // 用户信息
        user: {
          username: user.username,
          followers: userProfile?.edge_followed_by?.count || user.edge_followed_by?.count || user.follower_count || 0
        },
        
        // 原始数据
        rawData: media
      };
    }

    // 分析用户数据
    async analyzeUserData(username) {
      try {
        // 1. 获取用户基本信息
        const profileData = await this.getUserProfile(username);
        this.userData = profileData.data.user;
        
        // 2. 获取用户Reels
        const reelsData = await this.getUserReels(this.userData.id);
        
        // 3. 分析数据
        const analysis = this.analyzeUserDataHelper(reelsData);
        
        return {
          profile: this.userData,
          analysis: analysis,
          rawData: {
            profile: profileData,
            reels: reelsData
          }
        };
        
      } catch (error) {
        console.error("分析用户数据失败:", error);
        throw error;
      }
    }

    // 分析用户数据辅助函数
    analyzeUserDataHelper(reelsData) {
      const reels = reelsData?.items || [];
      
      // 分析最近N篇Reels的互动数据
      const recentReels = reels.slice(0, 5); // 使用插件原有的逻辑
      
      const reelStats = recentReels.map(reel => {
        const media = reel.media || reel;
        const countsDisabled = media.like_and_view_counts_disabled || false;
        
        return {
          id: reel.id,
          code: reel.code,
          likes: countsDisabled ? "隐藏" : (media.like_count || 0),
          comments: media.comment_count || 0,
          views: media.play_count || 0,
          timestamp: reel.taken_at_timestamp,
          caption: reel.caption?.text || "",
          mediaType: media.media_type,
          isVideo: media.media_type === 2,
          isReel: true,
          countsDisabled: countsDisabled
        };
      });
      
      // 计算平均值（排除隐藏的数据）
      const validReelLikes = reelStats.filter(reel => typeof reel.likes === 'number');
      const avgReelLikes = validReelLikes.length > 0 ? 
        validReelLikes.reduce((sum, reel) => sum + reel.likes, 0) / validReelLikes.length : 0;
      const avgReelComments = reelStats.length > 0 ? 
        reelStats.reduce((sum, reel) => sum + reel.comments, 0) / reelStats.length : 0;
      const avgReelViews = reelStats.length > 0 ? 
        reelStats.reduce((sum, reel) => sum + reel.views, 0) / reelStats.length : 0;
      
      // 统计隐藏数据的数量
      const hiddenLikesCount = reelStats.filter(reel => reel.likes === "隐藏").length;
      
      return {
        // 基本信息
        username: this.userData.username,
        fullName: this.userData.full_name,
        followers: this.userData.edge_followed_by?.count || 0,
        following: this.userData.edge_follow?.count || 0,
        totalPosts: this.userData.edge_owner_to_timeline_media?.count || 0,
        biography: this.userData.biography,
        
        // Reels统计
        totalReelsFound: reels.length,
        
        // 最近N篇Reels平均数据
        recentReels: {
          count: reelStats.length,
          averageLikes: typeof avgReelLikes === 'number' ? Math.round(avgReelLikes) : "部分隐藏",
          averageComments: Math.round(avgReelComments),
          averageViews: Math.round(avgReelViews),
          hiddenLikesCount: hiddenLikesCount,
          reels: reelStats
        },
        
        // 互动数据
        engagement: {
          totalLikes: reelStats.reduce((sum, reel) => sum + (typeof reel.likes === 'number' ? reel.likes : 0), 0),
          totalComments: reelStats.reduce((sum, reel) => sum + reel.comments, 0),
          totalViews: reelStats.reduce((sum, reel) => sum + reel.views, 0)
        }
      };
    }

    // 从用户资料API返回数据中提取email
    extractEmailFromProfile(userData) {
      // 从bio_links中查找email
      if (userData.bio_links && Array.isArray(userData.bio_links)) {
        for (const link of userData.bio_links) {
          if (link.url && link.url.includes('@')) {
            const emailMatch = link.url.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
            if (emailMatch) {
              return emailMatch[0];
            }
          }
        }
      }
      
      // 从biography中查找email
      if (userData.biography) {
        const emailMatch = userData.biography.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
        if (emailMatch) {
          return emailMatch[0];
        }
      }
      
      return '';
    }

    // 从页面元素中查找pinned video
    findPinnedVideos() {
      const pinnedVideos = [];
      
      // 查找所有视频卡片容器
      const videoCards = document.querySelectorAll('a[href*="/p/"]');
      
      videoCards.forEach(card => {
        // 检查是否有pin tag
        const pinTag = card.querySelector('svg[aria-label="Pinned post icon"]');
        if (pinTag) {
          const href = card.getAttribute('href');
          if (href) {
            pinnedVideos.push(href);
          }
        }
      });
      
      return pinnedVideos;
    }

    // 收集Profile页面数据
    async collectProfileData(lastN) {
      const url = location.href;
      const username = this.extractUsername(url);
      
      try {
        // 获取用户资料
        const profileData = await this.getUserProfile(username);
        const userData = profileData.data.user;
        
        // 获取用户Reels
        const reelsData = await this.getUserReels(userData.id);
        
        // 分析Reels数据
        const analysis = this.analyzeUserDataHelper(reelsData);
        
        // 提取email
        const email = this.extractEmailFromProfile(userData);
        
        // 查找pinned videos
        const pinnedVideoUrls = this.findPinnedVideos();
        
        // 计算pinned video的平均观看数
        let pinnedAvg = null;
        if (pinnedVideoUrls.length > 0) {
          // 这里需要根据pinned video的URL获取具体数据
          // 由于API限制，暂时使用页面元素数据
          pinnedAvg = 0; // 需要进一步实现
        }
        
        // 计算最近N个视频的平均观看数
        const recentReels = analysis.recentReels.reels.slice(0, lastN);
        const lastAvg = recentReels.length > 0 ? 
          Math.round(recentReels.reduce((sum, reel) => sum + reel.views, 0) / recentReels.length) : null;
        
        // 计算渗透率
        const folNum = userData.edge_followed_by?.count || 0;
        const penetration = (lastAvg != null && folNum > 0)
          ? (lastAvg/folNum*100).toFixed(1) + '%'
          : '-';

        return {
          url,
          userId: username,
          followers: (userData.edge_followed_by?.count || 0).toString(),
          bio: userData.biography || '',
          email,
          pinnedAvg,
          lastAvg,
          penetration
        };
        
      } catch (error) {
        console.error("收集Profile数据失败:", error);
        return {
          url,
          userId: username,
          followers: '0',
          bio: '',
          email: '',
          pinnedAvg: null,
          lastAvg: null,
          penetration: '-'
        };
      }
    }

    // 收集Reel页面数据
    async collectReelData() {
      const url = location.href;
      const reelCode = this.extractReelCode(url);
      
      try {
        // 获取Reel数据
        const reelData = await this.getReelData(reelCode);
        const analysis = this.analyzeReelData(reelData);
        
        return {
          url,
          userId: analysis.user.username,
          play: analysis.views,
          likes: analysis.likes,
          comments: analysis.comments,
          saves: 0, // Instagram API中没有收藏数
          shares: 0  // Instagram API中没有分享数
        };
        
      } catch (error) {
        console.error("收集Reel数据失败:", error);
        return {
          url,
          userId: '',
          play: 0,
          likes: 0,
          comments: 0,
          saves: 0,
          shares: 0
        };
      }
    }

    // 根据路径决定模式
    collectData(lastN) {
      const pageType = this.detectPageType();
      
      if (pageType === 'reel') {
        return this.collectReelData();
      } else if (pageType === 'profile') {
        return this.collectProfileData(lastN);
      } else {
        throw new Error("不支持的页面类型");
      }
    }
  }

  // 创建Instagram数据收集器实例
  const instagramCopier = new InstagramDataCopier();

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
    if (document.getElementById('instagram-data-copier-btn')) {
      return;
    }
    
    const btn = document.createElement('img');
    btn.id = 'instagram-data-copier-btn';
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
        const data = instagramCopier.collectData(prefs.lastN || 5);
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
    // 确保在Instagram页面上
    if (!location.hostname.includes('instagram.com')) {
      return;
    }
    
    // 等待页面完全加载
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(insertButton, 2000);
      });
    } else {
      setTimeout(insertButton, 3000);
    }
  }
  
  tryInsertButton();
  
  // 监听页面变化（SPA导航）
  let lastUrl = location.href;
  let retryCount = 0;
  const maxRetries = 5;
  
  function waitForPageReady() {
    // 检查页面是否已经准备好
    const hasContent = document.querySelector('[data-e2e="video-views"], [data-e2e="followers-count"], .tiktok-web-player') ||
                      document.querySelector('a[href*="/p/"], a[href*="/reel/"]');
    const hasReactReady = !document.querySelector('.loading') && document.body.children.length > 10;
    
    if (hasContent || hasReactReady) {
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
        const data = instagramCopier.collectData(msg.lastN);
        sendResponse(data);
      } catch (error) {
        sendResponse({ error: error.message });
      }
      return true;
    }
  });
})(); 