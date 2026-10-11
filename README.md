# 环境变量

这些变量填在 Vercel 项目的 **Settings → Environment Variables**。生产环境和预览环境都要填。改完需要重新部署才会生效。

本地开发写在 `backend/.env`。这个文件不要提交到仓库。

## 必须填写

**MONGO_URL**  
数据库连接地址，用 MongoDB Atlas 的连接串。名字写成 `MONGODB_URI` 也可以。没有它，聊天、设置、白名单都存不住。

**JWT_SECRET**  
后台登录用的密钥。自己做一长串随机字符，不要用数据库地址来当密钥。

在 PowerShell 里可以这样生成一串：

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

把结果填进 `JWT_SECRET`。

## 建议填写

**ADMIN_PATH**  
后台入口路径，例如 `/my-secret-admin`。  
第一次还没在后台保存过路径时，用这个值作为入口。之后以后台「设置」里保存的路径为准。

## 可选

**CORS_ORIGINS**  
额外允许访问接口的网址，多个用英文逗号隔开，例如 `https://example.com,https://www.example.com`。  
默认已经允许本机和现有正式域名。换了新域名再填这项。

**TG_WEBHOOK_SECRET**  
只有要用 Telegram 机器人接收指令（比如把 IP 加入白名单）时才填。自己定一串密码，用来确认请求确实来自 Telegram。  
不填也能收消息提醒。提醒用的机器人 Token 和聊天 ID 不在这里填，到后台「设置」里填，并用开关控制是否推送。

**DEEPSEEK_API_KEY**  
可选。不填时，后台翻译走谷歌。填了之后，后台可以改用 DeepSeek。  
`DEEPSEEK_BASE_URL`、`DEEPSEEK_MODEL` 一般不用改。

**REACT_APP_API_URL**  
只给本地开发用，前端把接口转到这个地址，例如 `http://127.0.0.1:8000`。线上不用填。

## 不用自己填

**VERCEL_ENV**、**VERCEL_URL**  
Vercel 部署时自动带上。

## 怎么配

1. 打开 Vercel 里这个项目，进入 Settings → Environment Variables。
2. 加上 `MONGO_URL` 和 `JWT_SECRET`。
3. 需要隐藏后台地址时，加上 `ADMIN_PATH`。
4. 保存后重新部署。
5. 用后台路径登录，在「设置」里填写 Telegram，并选择是否打开 Telegram 推送和系统通知。两项开关默认都是开的。
