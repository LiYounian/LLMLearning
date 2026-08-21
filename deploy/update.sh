#!/usr/bin/env bash
# LLMLearning 展示端自动更新脚本（纯静态站）
# 职责：让服务器上的仓库副本只读跟随 origin/main。静态文件被 nginx 直接托管，
#       拉取后无需重启任何服务，改了即生效。幂等，可反复跑。
# 谁跑：服务器上的 llmlearning-update.timer 周期调用（也可手动跑）。
set -euo pipefail

# 自定位：脚本在 <仓库>/deploy/ 下，仓库根即其父目录的父目录
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRANCH="${LLM_BRANCH:-main}"
LOG_DIR="${REPO_DIR}/deploy/logs"
mkdir -p "$LOG_DIR"
LOG="${LOG_DIR}/update.log"

log(){ echo "[$(date '+%F %T')] $*" >>"$LOG"; }

cd "$REPO_DIR"

before="$(git rev-parse HEAD)"
git fetch --quiet origin "$BRANCH"
after="$(git rev-parse "origin/${BRANCH}")"

if [ "$before" = "$after" ]; then
  # 无新提交，静默退出（不刷屏日志）
  exit 0
fi

# 只读节点：硬对齐远端（丢弃任何本地改动，展示端本就不该本地改）
git reset --hard "origin/${BRANCH}" --quiet
git clean -fd --quiet   # 清掉远端已删除但本地残留的未跟踪文件

log "updated ${before:0:7} -> ${after:0:7} (branch=${BRANCH})"

# 静态站：nginx 直接读文件，无需重启。仅做一个存在性冒烟。
if [ ! -f "${REPO_DIR}/index.html" ]; then
  log "WARN: index.html 缺失，检查仓库内容"
fi
