# LLMLearning 部署手册（阿里云 · 静态站 · 推送即上线）

> 模式：**本地 push → 服务器定时 `git fetch`，有更新就 `reset --hard` 跟随 origin/main。** 站点是纯静态 HTML，nginx 直接托管仓库目录，拉取后改了即生效、无需重启、无需回滚机制。
> 参考本机通用手册 `内部沟通/服务器自动拉取部署与自愈.md`，但因本项目无后端/DB/采集，已大幅精简。
> ⚠️ 本文命令用占位符：`<公网IP>`、clone 路径 `/srv/llmlearning`、用户 `deploy`、仓库 `git@github.com:LiYounian/LLMLearning.git`——按实际替换。systemd/nginx 真实文件放 `/etc`、**不入库**，本手册即真源。

---

## 架构一句话

```
本地(开发/统筹) ──push──▶ GitHub(origin/main)
                              │
   服务器 llmlearning-update.timer 每 2 分钟触发 ▼
        git fetch → 有新提交? → reset --hard origin/main + clean
                              │（静态站，nginx 直接读文件，无需重启）
        nginx :9501 托管仓库目录 ──▶ 浏览器访问 http://<公网IP>:9501/
```

---

## 一、前置（阿里云控制台 + 一次性）

1. **安全组放行 9501**：阿里云控制台 → 该 ECS 安全组 → 入方向加规则：TCP `9501`、源 `0.0.0.0/0`（或限你的 IP）。
2. **建部署用户 + 目录**：
   ```bash
   sudo useradd -m -s /bin/bash deploy || true
   sudo mkdir -p /srv && sudo chown deploy:deploy /srv
   ```
3. **让服务器能读 GitHub 仓库**（二选一）：
   - 仓库公开 → 直接用 HTTPS clone，无需密钥：`https://github.com/LiYounian/LLMLearning.git`
   - 仓库私有 → 给服务器配**只读 deploy key**：`sudo -u deploy ssh-keygen -t ed25519 -f /home/deploy/.ssh/id_ed25519 -N ""`，把 `/home/deploy/.ssh/id_ed25519.pub` 加到 GitHub 仓库 Settings → Deploy keys（勾只读），然后用 SSH 地址 clone。

## 二、拉代码 + 装 nginx

```bash
# 拉仓库（HTTPS 或 SSH 地址二选一）
sudo -u deploy git clone git@github.com:LiYounian/LLMLearning.git /srv/llmlearning

# 装 nginx（Ubuntu；CentOS 用 dnf/yum）
sudo apt update && sudo apt install -y nginx

# 放置站点配置（模板在仓库 deploy/ 下）
sudo cp /srv/llmlearning/deploy/nginx-llmlearning.conf /etc/nginx/conf.d/llmlearning.conf
# 若 clone 路径不是 /srv/llmlearning，改配置里的 root：
# sudo sed -i 's#/srv/llmlearning#/你的/路径#' /etc/nginx/conf.d/llmlearning.conf

sudo nginx -t && sudo systemctl reload nginx     # 校验并生效
```

nginx 需要能读到 `/srv/llmlearning`（deploy 家目录下则确保 nginx 用户有读权限；放 `/srv` 一般没问题）。

**验证**：
```bash
curl -sS http://127.0.0.1:9501/ | head -c 200        # 应看到落地页 HTML
# 浏览器打开 http://<公网IP>:9501/
```

## 三、装自动更新定时器（推送即上线的关键）

```bash
chmod +x /srv/llmlearning/deploy/update.sh
sudo cp /srv/llmlearning/deploy/llmlearning-update.service /etc/systemd/system/
sudo cp /srv/llmlearning/deploy/llmlearning-update.timer   /etc/systemd/system/
# 若 clone 路径/用户不同，改 .service 里的 ExecStart 路径与 User / HOME
sudo systemctl daemon-reload
sudo systemctl enable --now llmlearning-update.timer
```

**验证**：
```bash
systemctl list-timers llmlearning-update.timer --no-pager    # 看下次触发时间
sudo -u deploy /srv/llmlearning/deploy/update.sh             # 手动跑一轮
cat /srv/llmlearning/deploy/logs/update.log                  # 有更新才写行
```

至此完成：**本地每次 `git push` 到 main，最迟 2 分钟后服务器自动拉取更新，浏览器刷新即见新内容。**

---

## 四、日常运维

| 目的 | 命令 |
|---|---|
| 立即手动更新一轮 | `sudo -u deploy /srv/llmlearning/deploy/update.sh` |
| 看更新日志 | `tail -n 50 /srv/llmlearning/deploy/logs/update.log` |
| 看定时器状态 | `systemctl list-timers llmlearning-update.timer` |
| 健康探测 | `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:9501/`（期望 200） |
| 手动硬对齐远端 | `git -C /srv/llmlearning fetch && git -C /srv/llmlearning reset --hard origin/main` |
| nginx 配置改后 | `sudo nginx -t && sudo systemctl reload nginx` |

---

## 五、常见问题（静态站相关子集）

- **外网连不上 `<公网IP>:9501`**：① 安全组放行 9501 了吗；② `sudo ss -ltnp | grep 9501` 看 nginx 是否在听；③ nginx `listen 9501` 生效了吗（`nginx -t` + reload）。
- **首页 403/404**：root 路径不对，或 `index.html` 不在 clone 根；`ls /srv/llmlearning/index.html` 核对，修 nginx 配置 root。
- **中文目录名乱码/打不开**：确认 nginx 配置有 `charset utf-8;`。
- **推了代码服务器没更新**：`systemctl list-timers` 看 timer 是否 enable；手动跑 `update.sh` 看报错；私有仓库常见是 SSH key 问题——`.service` 里必须有 `Environment=HOME=/home/deploy`，否则 git 找不到 `~/.ssh`（通用手册踩坑 §七/7）。
- **git 拉取报本地改动冲突**：展示端只读、绝不本地改；`update.sh` 里已 `reset --hard` + `clean -fd` 强制跟随远端，正常不会冲突。若手动改过，硬对齐即可（见上表）。
- **update.log 被清掉**：`deploy/logs/` 已在 `.gitignore`，`git clean` 不会删它；若仍丢，检查 .gitignore 是否随 main 更新到了服务器。

---

## 六、以后升级（可选，不急）

- **加域名 + HTTPS**：域名解析到公网 IP → nginx 加 443 server + certbot 签证书 → 应用仍监听 9501 或改反代。
- **秒级上线**：把定时器换成 GitHub webhook 推送触发（需服务器开一个校验密钥的入站端点 + 安全组放行）。当前 2 分钟轮询对学习站足够。
