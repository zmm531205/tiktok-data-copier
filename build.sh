#!/bin/bash

# Chrome扩展打包脚本
# 用于将项目打包成可安装的Chrome扩展

echo "🚀 开始打包Chrome扩展..."

# 创建临时构建目录
BUILD_DIR="build"
RELEASE_DIR="release"
ZIP_NAME="social-media-data-copier-v2.1.zip"

# 清理旧的构建目录和ZIP文件
if [ -d "$BUILD_DIR" ]; then
    echo "🧹 清理旧的构建目录..."
    rm -rf "$BUILD_DIR"
fi

if [ -f "$ZIP_NAME" ]; then
    echo "🧹 清理旧的ZIP文件..."
    rm "$ZIP_NAME"
fi

# 创建构建目录
echo "📁 创建构建目录..."
mkdir -p "$BUILD_DIR"

# 复制release目录中的所有文件到构建目录
echo "📋 复制文件到构建目录..."
cp -r "$RELEASE_DIR"/* "$BUILD_DIR/"

# 检查必要文件是否存在
echo "✅ 检查必要文件..."
required_files=(
    "manifest.json"
    "popup.html"
    "popup.js"
    "content_script.js"
    "instagram_script.js"
    "button.png"
    "logo.png"
)

for file in "${required_files[@]}"; do
    if [ ! -f "$BUILD_DIR/$file" ]; then
        echo "❌ 错误: 缺少必要文件 $file"
        exit 1
    fi
    echo "✅ $file"
done

# 创建ZIP文件（直接在构建目录中创建，避免路径问题）
echo "📦 创建ZIP文件..."
cd "$BUILD_DIR"
zip -r "../$ZIP_NAME" . -x "*.DS_Store" "*.git*" "*.zip" "release/*"
cd ..

# 检查ZIP文件大小
ZIP_SIZE=$(du -h "$ZIP_NAME" | cut -f1)
echo "📊 ZIP文件大小: $ZIP_SIZE"

# 验证ZIP文件内容
echo "🔍 验证ZIP文件内容..."
unzip -l "$ZIP_NAME"

echo ""
echo "🎉 打包完成!"
echo "📦 扩展文件: $ZIP_NAME"
echo "📁 构建目录: $BUILD_DIR"
echo ""
echo "📋 安装说明:"
echo "1. 打开Chrome浏览器"
echo "2. 访问 chrome://extensions/"
echo "3. 开启'开发者模式'"
echo "4. 点击'加载已解压的扩展程序'"
echo "5. 选择 '$BUILD_DIR' 目录"
echo ""
echo "或者直接拖拽 $ZIP_NAME 到扩展页面进行安装" 