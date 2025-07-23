# Social Media Data Copier

一个Chrome扩展，用于从TikTok和Instagram页面收集和复制用户数据。

## 功能特性

### TikTok支持
#### Profile页面数据收集
- **用户信息**: 用户名、粉丝数、个人简介、邮箱
- **视频统计**: 置顶视频平均观看数、最近视频平均观看数
- **渗透率计算**: 最近视频平均观看数 / 粉丝数

#### Video页面数据收集
- **视频统计**: 观看数、点赞数、评论数、收藏数、分享数
- **用户信息**: 用户名

### Instagram支持
#### Profile页面数据收集
- **用户信息**: 用户名、粉丝数、个人简介、邮箱（从bio_links和biography中提取）
- **Reels统计**: 最近Reels平均观看数、平均点赞数、平均评论数
- **渗透率计算**: 最近Reels平均观看数 / 粉丝数
- **置顶视频**: 通过页面元素检测pinned posts

#### Reel页面数据收集
- **视频统计**: 观看数、点赞数、评论数
- **用户信息**: 用户名、粉丝数
- **支持隐藏数据**: 自动处理隐藏点赞数的Reels

### 通用功能
- **一键复制**: 点击右下角按钮复制数据到剪贴板
- **自定义设置**: 可选择要复制的数据字段
- **Tab分隔**: 复制的数据以Tab分隔，方便粘贴到Excel
- **平台切换**: 支持TikTok和Instagram之间的快速切换

## 安装方法

### 方法1: 从Chrome Web Store安装
1. 访问Chrome Web Store
2. 搜索"Social Media Data Copier"
3. 点击"添加至Chrome"

### 方法2: 手动安装
1. 下载或克隆此仓库
2. 打开Chrome，访问 `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择此仓库的文件夹

## 使用方法

### TikTok页面
#### Profile页面
1. 访问TikTok用户主页 (例如: `https://www.tiktok.com/@username`)
2. 等待页面完全加载
3. 点击右下角的复制按钮
4. 数据会自动复制到剪贴板

#### Video页面
1. 访问TikTok视频页面 (例如: `https://www.tiktok.com/@username/video/1234567890`)
2. 等待页面完全加载
3. 点击右下角的复制按钮
4. 数据会自动复制到剪贴板

### Instagram页面
#### Profile页面
1. 访问Instagram用户主页 (例如: `https://www.instagram.com/username/`)
2. 等待页面完全加载
3. 点击右下角的复制按钮
4. 数据会自动复制到剪贴板

#### Reel页面
1. 访问Instagram Reel页面 (例如: `https://www.instagram.com/reel/ABC123/`)
2. 等待页面完全加载
3. 点击右下角的复制按钮
4. 数据会自动复制到剪贴板

### 自定义设置
1. 点击扩展图标打开设置页面
2. 选择平台（TikTok或Instagram）
3. 选择要复制的数据字段
4. 设置"Last N Videos/Reels"的数量
5. 设置会自动保存

## 数据格式

### TikTok Profile页面数据
```
URL	用户名	粉丝数	个人简介	邮箱	置顶平均观看	最近平均观看	渗透率
```

### TikTok Video页面数据
```
URL	用户名	观看数	点赞数	评论数	收藏数	分享数
```

### Instagram Profile页面数据
```
URL	用户名	粉丝数	个人简介	邮箱	置顶平均观看	最近平均观看	渗透率
```

### Instagram Reel页面数据
```
URL	用户名	观看数	点赞数	评论数	收藏数	分享数
```

## 技术特性

- **Manifest V3**: 使用最新的Chrome扩展API
- **响应式设计**: 适配不同屏幕尺寸
- **错误处理**: 完善的错误处理机制
- **页面监听**: 支持TikTok和Instagram的SPA导航
- **数据验证**: 确保数据完整性
- **API集成**: 使用Instagram官方API获取数据
- **CSRF Token**: 自动获取和管理Instagram的CSRF Token

## 版本历史

### v1.4 (2025-07-22)
- 新增Instagram支持
- 新增Profile页面数据收集（用户名、粉丝数、个人简介、邮箱）
- 新增Reel页面数据收集（观看数、点赞数、评论数）
- 新增置顶视频检测功能
- 新增平台切换界面
- 优化UI设计

### v1.3 (2025-07-22)
- 新增Video页面支持
- 改进Profile页面数据收集
- 优化页面加载检测
- 修复React错误问题
- 清理调试代码

### v1.2
- 新增Last Videos开关
- 新增Views/Likes/Comments/Saves/Shares功能

### v1.1
- 基础Profile页面数据收集
- 复制功能

## 开发信息

- **作者**: Jamie
- **版本**: 1.4
- **兼容性**: Chrome 88+
- **许可证**: MIT

## 联系方式

如有问题或建议，请联系：LINE@jamie

## 免责声明

此扩展仅用于学习和研究目的。请遵守TikTok和Instagram的服务条款和隐私政策。使用者需自行承担使用风险。 