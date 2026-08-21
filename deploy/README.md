# LLMLearning 部署手册（阿里云 · 静态站 · 推送即上线）

> 模式：**本地 push → 服务器定时 `git fetch`，有更新就 `reset --hard` 跟随 origin/main。** 站点是纯静态 HTML，nginx 直接托管仓库目录，拉取后改了即生效、无需重启、无需回滚机制。
> 参考本机通用手册 `内部沟通/服务器自动拉取部署与自愈.md`，因本项目无后端/DB/采集，已大幅精简。
> **本项目实际部署环境**：用户 `admin`、clone 路径 `/home/admin/LLMLearning`、端口 `9501`、仓库 `git@github.com:LiYounian/LLMLearning.git`。systemd/nginx 真实文件放 `/etc`、**不入库**，本手册即真源。

---

## 架构一句话

```
本地(开发/统筹) ──push──▶ GitHub(origin/main)
                              │
   服务器 llmlearning-update.timer 每 2 分钟触发 ▼
        git fetch → 有新提交? → reset --hard origin/main + clean
                              │（静态站，nginx 直接读文件，无需重启）
        nginx :9501 托管 /home/admin/LLMLearning ──▶ http://<公网IP>:9501/
```

---

## 一、前置（阿里云控制台 + 权限）

1. **安全组放行 9501**：阿里云控制台 → 该 ECS 安全组 → 入方向加规则：TCP `9501`、源 `0.0.0.0/0`（或限你的 IP）。
2. **仓库已 clone 到 `/home/admin/LLMLearning`**（若未拉：`git clone git@github.com:LiYounian/LLMLearning.git /home/admin/LLMLearning`）。私有仓库需给服务器配**只读 deploy key**（`ssh-keygen` 后把公钥加到 GitHub 仓库 Settings → Deploy keys 勾只读）。
3. **让 nginx 能读家目录里的站点**：家目录默认 `700`，nginx（www-data）进不去会 403。给一个"可穿越"位（只放行进入、不放行列目录）：
   ```bash
   sudo chmod o+x /home/admin
   ```
   仓库内文件 git clone 默认 644/755 可读，无需再动。

## 二、装 nginx + 配置站点

```bash
sudo apt update && sudo apt install -y nginx          # CentOS 系用 dnf/yum
sudo cp /home/admin/LLMLearning/deploy/nginx-llmlearning.conf /etc/nginx/conf.d/llmlearning.conf
sudo nginx -t && sudo systemctl reload nginx          # 校验并生效
```

**验证**：
```bash
curl -sS http://127.0.0.1:9501/ | head -c 200         # 应看到落地页 HTML
# 浏览器打开 http://<公网IP>:9501/
```

## 三、装自动更新定时器（推送即上线的关键）

```bash
chmod +x /home/admin/LLMLearning/deploy/update.sh
sudo cp /home/admin/LLMLearning/deploy/llmlearning-update.service /etc/systemd/system/
sudo cp /home/admin/LLMLearning/deploy/llmlearning-update.timer   /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now llmlearning-update.timer
```

**验证**：
```bash
systemctl list-timers llmlearning-update.timer --no-pager    # 看下次触发时间
/home/admin/LLMLearning/deploy/update.sh                     # 手动跑一轮（以 admin 身份）
cat /home/admin/LLMLearning/deploy/logs/update.log           # 有更新才写行
```

至此完成：**本地每次 `git push` 到 main，最迟 2 分钟后服务器自动拉取更新，浏览器刷新即见新内容。**

---

## 四、日常运维

| 目的 | 命令 |
|---|---|
| 立即手动更新一轮 | `/home/admin/LLMLearning/deploy/update.sh` |
| 看更新日志 | `tail -n 50 /home/admin/LLMLearning/deploy/logs/update.log` |
| 看定时器状态 | `systemctl list-timers llmlearning-update.timer` |
| 健康探测 | `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:9501/`（期望 200） |
| 手动硬对齐远端 | `git -C /home/admin/LLMLearning fetch && git -C /home/admin/LLMLearning reset --hard origin/main` |
| nginx 配置改后 | `sudo nginx -t && sudo systemctl reload nginx` |

---

## 五、常见问题

- **外网连不上 `<公网IP>:9501`**：① 安全组放行 9501 了吗；② `sudo ss -ltnp | grep 9501` 看 nginx 是否在听；③ nginx `listen 9501` 生效了吗（`nginx -t` + reload）。
- **首页 403**：多半是 nginx 读不了家目录 → 确认执行过 `sudo chmod o+x /home/admin`；也确认 root 指向 `/home/admin/LLMLearning`。
- **首页 404**：`ls /home/admin/LLMLearning/index.html` 核对门户在不在；不在就先 `git pull` / `reset --hard origin/main`。
- **中文目录名乱码/打不开**：确认 nginx 配置有 `charset utf-8;`。
- **推了代码服务器没更新**：`systemctl list-timers` 看 timer 是否 enable；手动跑 `update.sh` 看报错；私有仓库常见是 SSH key 问题——`.service` 里必须有 `Environment=HOME=/home/admin`，否则 git 找不到 `~/.ssh`。
- **git 拉取报本地改动冲突**：展示端只读、绝不本地改；`update.sh` 已 `reset --hard` + `clean -fd` 强制跟随远端。若手动改过，硬对齐即可（见上表）。

---

## 六、以后升级（可选，不急）

- **加域名 + HTTPS**：域名解析到公网 IP → nginx 加 443 server + certbot 签证书。
- **秒级上线**：把定时器换成 GitHub webhook 推送触发（需服务器开一个校验密钥的入站端点 + 安全组放行）。当前 2 分钟轮询对学习站足够。
