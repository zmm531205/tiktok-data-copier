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
        return 'video'; // 將帖子頁面視為video頁面
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
      throw new Error("無法從URL中提取用戶名");
    }

    // 从URL中提取Reel代码
    extractReelCode(url) {
      const match = url.match(/\/reel\/([^\/\?]+)/);
      if (match) {
        return match[1];
      }
      throw new Error("無法從URL中提取Reel代碼");
    }

    // 从URL中提取Post代码
    extractPostCode(url) {
      const match = url.match(/\/p\/([^\/\?]+)/);
      if (match) {
        return match[1];
      }
      throw new Error("無法從URL中提取Post代碼");
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
        // console.error("獲取用戶資料失敗:", error);
        throw error;
      }
    }

    // 获取用户Reels数据
    async getUserReels(userId, maxId = null) {
      try {
        const csrfToken = this.getCsrfToken();
        if (!csrfToken) {
          throw new Error("CSRF token 未找到");
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
        // console.error("獲取用戶Reels失敗:", error);
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
          throw new Error(`在用戶 ${username} 的Reels中未找到代碼為 ${reelCode} 的Reel`);
        }
        
      } catch (error) {
        // console.error("獲取Reel數據失敗:", error);
        throw error;
      }
    }

    // 分析Reel数据
    analyzeReelData(reelData) {
      const media = reelData.items?.[0];
      if (!media) {
        throw new Error("未找到媒體數據");
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
        // console.error("分析用戶數據失敗:", error);
        throw error;
      }
    }

    // 分析用户数据辅助函数
    analyzeUserDataHelper(reelsData) {
      const reels = reelsData?.items || [];
      
      // 分析最近5篇Reels的互动数据
      const recentReels = reels.slice(0, 5);
      
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
        
        // 最近5篇Reels平均数据
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

    // 从页面元素中查找pinned video的reels ID
    findPinnedReelsIds() {
      const pinnedReelsIds = [];
      
      // 直接查找pinned icon
      const pinnedIcons = document.querySelectorAll('svg[aria-label="Pinned post icon"], svg[title="Pinned post icon"], svg[aria-label*="Pinned"], svg[title*="Pinned"]');
      
      pinnedIcons.forEach((icon, index) => {
        // 向上查找包含href的a標籤
        let parent = icon.parentElement;
        let foundLink = null;
        let depth = 0;
        
        while (parent && depth < 15) {
          if (parent.tagName === 'A' && parent.href && (parent.href.includes('/p/') || parent.href.includes('/reel/'))) {
            foundLink = parent;
            break;
          }
          parent = parent.parentElement;
          depth++;
        }
        
        if (foundLink) {
          const href = foundLink.getAttribute('href');
          // 匹配 /p/{id}/ 或 /reel/{id}/ 格式
          const match = href.match(/\/(?:p|reel)\/([^\/\?]+)/);
          if (match) {
            pinnedReelsIds.push(match[1]);
          }
        }
      });
      
      return pinnedReelsIds;
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
        
        // 从页面元素中查找pinned reels IDs
        const pinnedReelsIds = this.findPinnedReelsIds();
        
        // 在API數據中查找pinned reels的觀看數
        let pinnedAvg = null;
        if (pinnedReelsIds.length > 0) {
          const pinnedReels = [];
          const reels = reelsData?.items || [];
          
          // 在API數據中匹配pinned reels
          pinnedReelsIds.forEach(pinnedId => {
            const foundReel = reels.find(reel => {
              const media = reel.media || reel;
              const reelCode = media.code || reel.code;
              return reelCode === pinnedId;
            });
            
            if (foundReel) {
              const media = foundReel.media || foundReel;
              const views = media.play_count || media.view_count || 0;
              pinnedReels.push(views);
            }
          });
          
          // 計算pinned reels的平均觀看數
          if (pinnedReels.length > 0) {
            pinnedAvg = Math.round(pinnedReels.reduce((sum, views) => sum + views, 0) / pinnedReels.length);
          }
        }
        
        // 分析Reels数据
        const reels = reelsData?.items || [];
        const recentReels = reels.slice(0, lastN);
        
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
        
        // 计算最近N个视频的平均观看数
        const lastAvg = reelStats.length > 0 ? 
          Math.round(reelStats.reduce((sum, reel) => sum + reel.views, 0) / reelStats.length) : null;
        
        // 计算渗透率
        const folNum = userData.edge_followed_by?.count || 0;
        const penetration = (lastAvg != null && folNum > 0)
          ? (lastAvg/folNum*100).toFixed(1) + '%'
          : '-';

        // 提取email
        const email = this.extractEmailFromProfile(userData);

        return {
          url,
          userId: username,
          followers: (userData.edge_followed_by?.count || 0).toLocaleString(),
          bio: userData.biography || '',
          email,
          pinnedAvg: pinnedAvg ? pinnedAvg.toLocaleString() : null,
          lastAvg: lastAvg ? lastAvg.toLocaleString() : null,
          penetration
        };
        
      } catch (error) {
        // console.error("收集Profile數據失敗:", error);
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
        // console.error("收集Reel數據失敗:", error);
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

    // 收集Post页面数据
    async collectPostData() {
      const url = location.href;
      const postCode = this.extractPostCode(url);
      
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
        
        // 从页面元素中获取互动数据
        let likes = 0;
        let comments = 0;
        let saves = 0;
        let shares = 0;
        
        // 尝试获取点赞数
        const likeElements = document.querySelectorAll('[data-e2e="like-count"], [data-e2e="browse-like-count"], .like-count, .likes-count');
        for (const element of likeElements) {
          const text = element.textContent.trim();
          const match = text.match(/(\d+(?:,\d+)*)/);
          if (match) {
            likes = parseInt(match[1].replace(/,/g, ''));
            break;
          }
        }
        
        // 尝试获取评论数
        const commentElements = document.querySelectorAll('[data-e2e="comment-count"], .comment-count, .comments-count');
        for (const element of commentElements) {
          const text = element.textContent.trim();
          const match = text.match(/(\d+(?:,\d+)*)/);
          if (match) {
            comments = parseInt(match[1].replace(/,/g, ''));
            break;
          }
        }
        
        // 尝试获取收藏数
        const saveElements = document.querySelectorAll('[data-e2e="save-count"], .save-count, .saves-count');
        for (const element of saveElements) {
          const text = element.textContent.trim();
          const match = text.match(/(\d+(?:,\d+)*)/);
          if (match) {
            saves = parseInt(match[1].replace(/,/g, ''));
            break;
          }
        }
        
        // 尝试获取分享数
        const shareElements = document.querySelectorAll('[data-e2e="share-count"], .share-count, .shares-count');
        for (const element of shareElements) {
          const text = element.textContent.trim();
          const match = text.match(/(\d+(?:,\d+)*)/);
          if (match) {
            shares = parseInt(match[1].replace(/,/g, ''));
            break;
          }
        }
        
        return {
          url,
          userId: username,
          play: 0, // Post没有观看数
          likes: likes,
          comments: comments,
          saves: saves,
          shares: shares
        };
        
      } catch (error) {
        // console.error("收集Post數據失敗:", error);
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
    async collectData(lastN) {
      const pageType = this.detectPageType();
      
      if (pageType === 'reel') {
        return this.collectReelData();
      } else if (pageType === 'video') {
        return this.collectPostData();
      } else if (pageType === 'profile') {
        return this.collectProfileData(lastN);
      } else {
        throw new Error("不支持的頁面類型");
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
        'ig-toggleUsername','ig-toggleFollowers','ig-toggleBio','ig-toggleEmail',
        'ig-togglePinned','ig-toggleLastVideos','ig-togglePenetration',
        'ig-toggleViews','ig-toggleLikes','ig-toggleComments','ig-toggleSaves','ig-toggleShares',
        'ig-lastN'
      ], async prefs => {
        try {
          const data = await instagramCopier.collectData(prefs['ig-lastN'] || 5);
          const isVideo = data.hasOwnProperty('play');
          const row = [];

          // URL 永远第一
          row.push(data.url);

          // Profile 字段
          if (!isVideo) {
            if (prefs['ig-toggleUsername'])   row.push(data.userId);
            if (prefs['ig-toggleFollowers'])  row.push(data.followers);
            if (prefs['ig-toggleBio'])        row.push(data.bio);
            if (prefs['ig-toggleEmail'])      row.push(data.email);
            if (prefs['ig-togglePinned'])     row.push(data.pinnedAvg ?? '-');
            if (prefs['ig-toggleLastVideos']) row.push(data.lastAvg   ?? '-');
            if (prefs['ig-togglePenetration'])row.push(data.penetration);
          }

          // Video 字段
          if (isVideo) {
            if (prefs['ig-toggleUsername']) row.push(data.userId);
            if (prefs['ig-toggleViews'])    row.push(data.play.toLocaleString());
            if (prefs['ig-toggleLikes'])    row.push(data.likes.toLocaleString());
            if (prefs['ig-toggleComments']) row.push(data.comments.toLocaleString());
            if (prefs['ig-toggleSaves'])    row.push(data.saves.toLocaleString());
            if (prefs['ig-toggleShares'])   row.push(data.shares.toLocaleString());
          }

          const text = row.filter(v => v != null).join('\t');
          await navigator.clipboard.writeText(text);
          showToast('Copy Succeed!');
        } catch (error) {
          // console.error('複製失敗:', error);
          showToast('Copy Failed');
        } finally {
          setTimeout(() => btn.style.opacity = '1', 2000);
        }
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
    const hasContent = document.querySelector('a[href*="/p/"], a[href*="/reel/"]');
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
      (async () => {
        try {
          const data = await instagramCopier.collectData(msg.lastN);
          sendResponse(data);
        } catch (error) {
          sendResponse({ error: error.message });
        }
      })();
      return true;
    }
  });
})(); 