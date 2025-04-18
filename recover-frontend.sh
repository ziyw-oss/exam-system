#!/bin/bash

# === 配置区 ===
COMMIT_HASH="403cd63"  # 替换成 “答案写入数据库” 的提交哈希
TEMP_BRANCH="temp-recover-$COMMIT_HASH"
BACKUP_DIR="recovered-from-git"

echo "🌀 当前分支: $(git branch --show-current)"
CURRENT_BRANCH=$(git branch --show-current)

# === 创建临时分支并 cherry-pick ===
git checkout -b $TEMP_BRANCH $COMMIT_HASH
echo "✅ 创建并切换到临时分支: $TEMP_BRANCH"

# === 准备备份目录 ===
mkdir -p $BACKUP_DIR/frontend
cp -r frontend/src/pages $BACKUP_DIR/frontend/ 2>/dev/null || true
cp frontend/next.config.js $BACKUP_DIR/frontend/ 2>/dev/null || true
cp frontend/tsconfig.json $BACKUP_DIR/frontend/ 2>/dev/null || true
cp frontend/.env.local $BACKUP_DIR/frontend/ 2>/dev/null || true

echo "📦 恢复文件已保存到: $BACKUP_DIR/frontend"

# === 切回主分支 ===
git checkout $CURRENT_BRANCH
git branch -D $TEMP_BRANCH
echo "🔁 已回到原分支 $CURRENT_BRANCH，删除临时分支 $TEMP_BRANCH"