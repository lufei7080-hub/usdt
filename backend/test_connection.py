#!/usr/bin/env python3
"""本地快速检测：MongoDB 连接 + 可选线上 /api/health。

用法:
  1) 在 backend/.env 写好 MONGO_URL，或先设置环境变量
  2) python test_connection.py
  3) 顺带测线上健康检查:
     python test_connection.py https://usdt1-liard.vercel.app
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import urlopen

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")


def _mask_url(url: str) -> str:
    """隐藏连接串里的密码，方便打印。"""
    if "://" not in url or "@" not in url:
        return url
    scheme, rest = url.split("://", 1)
    creds, host = rest.rsplit("@", 1)
    if ":" in creds:
        user, _pwd = creds.split(":", 1)
        return f"{scheme}://{user}:***@{host}"
    return f"{scheme}://***@{host}"


def test_mongo() -> bool:
    mongo_url = (
        os.environ.get("MONGO_URL")
        or os.environ.get("MONGODB_URI")
        or ""
    ).strip().strip('"').strip("'")

    print("=== 1) MongoDB ===")
    if not mongo_url:
        print("FAIL: 未找到 MONGO_URL / MONGODB_URI")
        print("      请在 backend/.env 填写，或先执行:")
        print('      $env:MONGO_URL="mongodb+srv://..."')
        return False

    print("URL:", _mask_url(mongo_url))
    try:
        import certifi
        from pymongo import MongoClient
    except ImportError as e:
        print("FAIL: 缺少依赖，先安装: pip install pymongo certifi python-dotenv")
        print("     ", e)
        return False

    try:
        kwargs = {"serverSelectionTimeoutMS": 8000}
        if mongo_url.startswith("mongodb+srv://") or "mongodb.net" in mongo_url:
            kwargs["tlsCAFile"] = certifi.where()
        client = MongoClient(mongo_url, **kwargs)
        info = client.admin.command("ping")
        client.close()
        print("OK:  ping 成功 ->", info)
        return True
    except Exception as e:
        print("FAIL:", type(e).__name__, str(e)[:300])
        print("提示: 检查 Atlas Network Access、用户密码、连接串是否正确")
        return False


def test_health(base_url: str) -> bool:
    base = base_url.rstrip("/")
    url = f"{base}/api/health"
    print("\n=== 2) 线上 /api/health ===")
    print("URL:", url)
    try:
        with urlopen(url, timeout=15) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            data = json.loads(body)
            print("HTTP:", resp.status)
            print("JSON:", data)
            ok = data.get("database") == "connected" or data.get("status") == "ok"
            print("OK" if ok else "FAIL: 接口通了，但数据库仍未连接（检查 Vercel 环境变量并 Redeploy）")
            return ok
    except HTTPError as e:
        print("FAIL: HTTP", e.code, e.reason)
        return False
    except URLError as e:
        print("FAIL: 无法访问", e.reason)
        return False
    except Exception as e:
        print("FAIL:", type(e).__name__, e)
        return False


def main() -> int:
    mongo_ok = test_mongo()
    health_ok = True
    if len(sys.argv) > 1:
        health_ok = test_health(sys.argv[1])
    else:
        print("\n(可选) 测线上: python test_connection.py https://你的域名.vercel.app")

    print("\n=== 结果 ===")
    print("MongoDB:", "通过" if mongo_ok else "失败")
    if len(sys.argv) > 1:
        print("Health: ", "通过" if health_ok else "失败")

    return 0 if mongo_ok and health_ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
