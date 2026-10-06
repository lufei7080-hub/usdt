# -*- coding: utf-8 -*-
"""CLI: set adminPath + adminPassword in MongoDB exchange_db.config"""

from __future__ import annotations

import getpass
import os
import sys
from pathlib import Path

APP_DIR = Path(__file__).resolve().parent


def main() -> int:
    try:
        import bcrypt
        import certifi
        from dotenv import load_dotenv
        from pymongo import MongoClient
    except ImportError:
        print("缺少依赖。请先运行本目录的 run.bat 安装，或执行：")
        print("  pip install -r requirements.txt")
        return 1

    load_dotenv(APP_DIR / ".env")
    backend_env = APP_DIR.parent / "backend" / ".env"
    if backend_env.is_file():
        load_dotenv(backend_env, override=False)

    print("=" * 48)
    print("  天枢台 — 设置后台登录密码")
    print("=" * 48)
    print()

    mongo_url = (
        os.environ.get("MONGO_URL")
        or os.environ.get("MONGODB_URI")
        or ""
    ).strip().strip('"').strip("'")

    if mongo_url:
        print(f"已检测到 MONGO_URL（来自 .env）")
        use = input("直接使用？[Y/n]: ").strip().lower()
        if use in ("n", "no"):
            mongo_url = ""
    if not mongo_url:
        mongo_url = input("请输入 MONGO_URL: ").strip().strip('"').strip("'")
    if not mongo_url:
        print("错误：MONGO_URL 不能为空")
        return 1

    admin_path = input("后台路径（如 /my-secret，回车保持/不改）: ").strip()
    password = getpass.getpass("新登录密码（至少 6 位，输入时不显示）: ").strip()
    if not password:
        print("错误：密码不能为空")
        return 1
    if len(password) < 6:
        print("错误：密码至少 6 位")
        return 1
    if password == "change-me-dev-only":
        print("错误：请勿使用开发默认密码")
        return 1
    confirm = getpass.getpass("再输入一次确认: ").strip()
    if password != confirm:
        print("错误：两次密码不一致")
        return 1

    print()
    print("正在连接 MongoDB…")
    kwargs = {
        "serverSelectionTimeoutMS": 20000,
        "connectTimeoutMS": 20000,
    }
    try:
        if mongo_url.startswith("mongodb+srv://"):
            client = MongoClient(mongo_url, **kwargs)
        elif "mongodb.net" in mongo_url:
            client = MongoClient(mongo_url, tlsCAFile=certifi.where(), **kwargs)
        else:
            client = MongoClient(mongo_url, **kwargs)
        client.admin.command("ping")
    except Exception as e:
        print(f"连接失败: {e}")
        return 1

    db = client["exchange_db"]
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    update = {"adminPassword": hashed}

    if admin_path:
        path = "/" + admin_path.strip().strip("/")
        if path != "/":
            path = path.lower()
        if path == "/" or path.startswith(("/api", "/static", "/frontend")):
            print("错误：后台路径不可用")
            client.close()
            return 1
        update["adminPath"] = path

    existing = db.config.find_one({}) or {}
    if "buyRate" not in existing:
        update.setdefault("buyRate", 4.4)
    if "sellRate" not in existing:
        update.setdefault("sellRate", 3.3)
    if "adminPath" not in existing and "adminPath" not in update:
        update["adminPath"] = (os.environ.get("ADMIN_PATH") or "/admin-dev").strip() or "/admin-dev"
        if not update["adminPath"].startswith("/"):
            update["adminPath"] = "/" + update["adminPath"]

    db.config.update_one({}, {"$set": update}, upsert=True)
    client.close()

    final_path = update.get("adminPath") or existing.get("adminPath") or "/admin-dev"
    print()
    print("✓ 已保存到 MongoDB（exchange_db.config）")
    print(f"  后台路径: {final_path}")
    print("  密码: 已写入 bcrypt 哈希")
    print()
    print("请用浏览器打开: https://你的域名" + final_path)
    print("然后用刚设置的密码登录。")
    return 0


if __name__ == "__main__":
    try:
        code = main()
    except KeyboardInterrupt:
        print("\n已取消")
        code = 130
    sys.exit(code)
