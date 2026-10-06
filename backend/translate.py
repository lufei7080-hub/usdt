"""Admin translation helpers (Google free endpoint + optional DeepSeek)."""

from __future__ import annotations

import hashlib
import json
import logging
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from typing import Optional

logger = logging.getLogger(__name__)

PROVIDER_GOOGLE = "google"
PROVIDER_DEEPSEEK = "deepseek"

SUPPORTED_TARGETS = frozenset({"zh", "he", "ar", "en"})

DEEPSEEK_API_KEY = (os.environ.get("DEEPSEEK_API_KEY") or "").strip()
DEEPSEEK_BASE_URL = (
    os.environ.get("DEEPSEEK_BASE_URL") or "https://api.deepseek.com"
).strip().rstrip("/")
DEEPSEEK_MODEL = (os.environ.get("DEEPSEEK_MODEL") or "deepseek-chat").strip()

_cache: dict[str, str] = {}
_CACHE_MAX = 2000

_CJK_RE = re.compile(r"[\u4e00-\u9fff]")
_HEBREW_RE = re.compile(r"[\u0590-\u05FF]")
_ARABIC_RE = re.compile(r"[\u0600-\u06FF]")
_LATIN_RE = re.compile(r"[A-Za-z]")

# Google Translate target codes
_GOOGLE_LANG = {
    "zh": "zh-CN",
    "he": "he",
    "ar": "ar",
    "en": "en",
}


def is_cjk_text(text: str) -> bool:
    if not text:
        return False
    cjk = len(_CJK_RE.findall(text))
    return cjk >= max(1, len(text.strip()) // 4)


def is_hebrew_text(text: str) -> bool:
    """True if text contains any Hebrew letter (for RTL / mixed detection)."""
    if not text:
        return False
    return bool(_HEBREW_RE.search(text))


def is_arabic_text(text: str) -> bool:
    """True if text contains any Arabic letter (for RTL / mixed detection)."""
    if not text:
        return False
    return bool(_ARABIC_RE.search(text))


def is_rtl_text(text: str) -> bool:
    """True if text contains Hebrew or Arabic script."""
    return is_hebrew_text(text) or is_arabic_text(text)


def _script_majority(text: str, pattern: re.Pattern) -> bool:
    """True when script chars are a meaningful share of the string (not a single letter)."""
    if not text:
        return False
    s = text.strip()
    if not s:
        return False
    n = len(pattern.findall(s))
    return n >= max(1, len(s) // 4)


def is_english_text(text: str) -> bool:
    """Mostly Latin letters, little CJK / Hebrew / Arabic."""
    if not text:
        return False
    s = text.strip()
    latin = len(_LATIN_RE.findall(s))
    if latin < max(1, len(s) // 4):
        return False
    if _CJK_RE.search(s) or _HEBREW_RE.search(s) or _ARABIC_RE.search(s):
        return False
    return True


def normalize_provider(provider: Optional[str]) -> str:
    p = (provider or "").strip().lower()
    if p in ("deepseek", "ds"):
        return PROVIDER_DEEPSEEK
    if p in ("google", "gtx", "谷歌", "google_translate"):
        return PROVIDER_GOOGLE
    if DEEPSEEK_API_KEY:
        return PROVIDER_DEEPSEEK
    return PROVIDER_GOOGLE


def normalize_gender(gender: Optional[str]) -> str:
    g = (gender or "male").strip().lower()
    if g in ("female", "f", "woman", "女", "女性"):
        return "female"
    return "male"


def normalize_target(target: Optional[str]) -> str:
    t = (target or "zh").strip().lower()
    if t not in SUPPORTED_TARGETS:
        raise ValueError("target must be zh, he, ar, or en")
    return t


def _cache_key(text: str, target: str, provider: str, gender: str = "male") -> str:
    raw = f"{provider}:{target}:{gender}:{text}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _cache_get(
    text: str, target: str, provider: str, gender: str = "male"
) -> Optional[str]:
    return _cache.get(_cache_key(text, target, provider, gender))


def _cache_set(
    text: str, target: str, provider: str, gender: str, value: str
) -> None:
    if len(_cache) >= _CACHE_MAX:
        for k in list(_cache.keys())[:200]:
            _cache.pop(k, None)
    _cache[_cache_key(text, target, provider, gender)] = value


def _google_translate(text: str, target_lang: str) -> str:
    params = urllib.parse.urlencode(
        {
            "client": "gtx",
            "sl": "auto",
            "tl": target_lang,
            "dt": "t",
            "q": text,
        },
        encoding="utf-8",
    )
    url = f"https://translate.googleapis.com/translate_a/single?{params}"
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            ),
            "Accept": "*/*",
        },
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"Google Translate HTTP {e.code}") from e
    except urllib.error.URLError as e:
        raise RuntimeError(f"Google Translate network error: {e.reason}") from e

    data = json.loads(raw)
    if not data or not data[0]:
        raise RuntimeError("Google Translate empty result")
    parts = []
    for item in data[0]:
        if item and item[0]:
            parts.append(item[0])
    out = "".join(parts).strip()
    if not out:
        raise RuntimeError("Google Translate empty result")
    return out


def _deepseek_translate(system: str, user_text: str) -> str:
    if not DEEPSEEK_API_KEY:
        raise RuntimeError("DEEPSEEK_API_KEY not configured")
    payload = {
        "model": DEEPSEEK_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user_text},
        ],
        "temperature": 0.1,
        "max_tokens": 2048,
    }
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"{DEEPSEEK_BASE_URL}/v1/chat/completions",
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=35) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")[:200]
        raise RuntimeError(f"DeepSeek HTTP {e.code}: {detail}") from e
    except urllib.error.URLError as e:
        raise RuntimeError(f"DeepSeek network error: {e.reason}") from e

    data = json.loads(raw)
    out = (
        (((data.get("choices") or [{}])[0].get("message") or {}).get("content")) or ""
    ).strip()
    if len(out) >= 2 and out[0] in "\"'「『" and out[-1] in "\"'」』":
        out = out[1:-1].strip()
    if not out:
        raise RuntimeError("DeepSeek empty result")
    return out


_ISRAEL_CHAT_STYLE = (
    "Write like Israeli citizens chat online today (WhatsApp / Telegram / live chat): "
    "natural, direct, concise, everyday register — not literary, not bureaucratic, "
    "not textbook-formal. Keep local payment and crypto names as Israelis write them "
    "(BIT, PayBox, USDT, ILS, בנק, etc.). Prefer short sentences people actually send."
)


def _build_translate_system(target: str, gender: str) -> str:
    """DeepSeek system prompts; customer gender affects gendered forms where needed."""
    g = normalize_gender(gender)
    customer_zh = "男性" if g == "male" else "女性"
    customer_en = "male" if g == "male" else "female"

    if target == "zh":
        return (
            "你是专业翻译。将用户消息翻译成简体中文。"
            "只输出译文本身，不要解释、不加引号、不添加前后缀。"
            "若原文已是简体中文，原样返回。"
            "保留数字、货币符号、专有名词与换行。"
            f"语境：以色列客户为{customer_zh}；客服人员为男性。"
            "如原文含性别相关称呼或语法，译文语气与之一致即可。"
            "译文应符合中文客服在即时通讯里的自然说法，不要文言腔。"
        )

    if target == "ar":
        address_hint = (
            "address the customer in masculine 2nd person "
            "(أنت and matching masculine verb/adjective forms)"
            if g == "male"
            else "address the customer in feminine 2nd person "
            "(أنتِ and matching feminine verb/adjective forms)"
        )
        return (
            "You are a professional translator for Israeli customer support. "
            "Translate the user message into natural Arabic as Israeli Arab citizens "
            "and Arabic speakers in Israel use online (Levantine / Israeli everyday chat "
            "register — clear and conversational, not heavy Classical MSA, not Gulf dialect). "
            "Output ONLY the Arabic translation — no explanations, no quotes, no prefixes. "
            "If the text is already Arabic, return it unchanged. "
            "Keep numbers, currency symbols, proper nouns (BIT, PayBox, USDT), and line breaks. "
            f"{_ISRAEL_CHAT_STYLE} "
            f"The Israeli customer is {customer_en}. When the message addresses or refers "
            f"to the customer, {address_hint}. Prefer correct gender agreement; "
            "do not invent gender words that are not implied by the source. "
            "The support agent (staff) is male; when the source is the agent's words, "
            "use masculine forms for the agent's self-reference where Arabic requires gender."
        )

    if target == "en":
        return (
            "You are a professional translator for Israeli customer support. "
            "Translate the user message into natural English as used by Israeli citizens "
            "online and in live chat with support — clear, direct, concise international "
            "English (not stiff formal British legalese, not slang-heavy). "
            "Output ONLY the English translation — no explanations, no quotes, no prefixes. "
            "If the text is already English, return it unchanged. "
            "Keep numbers, currency symbols, proper nouns (BIT, PayBox, USDT, ILS), and line breaks. "
            f"{_ISRAEL_CHAT_STYLE} "
            f"The Israeli customer is {customer_en}; use matching pronouns (he/she, his/her) "
            "only when the source clearly refers to the customer in third person. "
            "Second-person you is gender-neutral. "
            "The support agent (staff) is male when first-person gender is needed."
        )

    # Hebrew (default outbound target)
    address_hint = (
        "address the customer in masculine 2nd person (אתה, and matching verb/adjective forms)"
        if g == "male"
        else "address the customer in feminine 2nd person (את, and matching verb/adjective forms)"
    )
    customer_he = "masculine" if g == "male" else "feminine"
    return (
        "You are a professional translator for Israeli customer support. "
        "Translate the user message into natural modern Israeli Hebrew (עברית ישראלית) "
        "as people write in WhatsApp / Telegram / live chat in Israel — spoken register, "
        "not literary or overly formal. "
        "Output ONLY the Hebrew translation — no explanations, no quotes, no prefixes. "
        "If the text is already Hebrew, return it unchanged. "
        "Keep numbers, currency symbols, proper nouns (BIT, PayBox, USDT), and line breaks. "
        f"{_ISRAEL_CHAT_STYLE} "
        f"The Israeli customer is {customer_en}. When the message addresses or refers "
        f"to the customer, {address_hint}. Prefer correct {customer_he} gendered "
        "grammar; do not invent gender words that are not implied by the source. "
        "The support agent (staff) is male; when the source is the agent's words, "
        "use masculine forms for the agent's self-reference where Hebrew requires gender."
    )


def _already_in_target(text: str, target: str) -> bool:
    if target == "zh":
        return is_cjk_text(text) and not is_rtl_text(text)
    if target == "he":
        # Hebrew must dominate; significant CJK or Arabic means still translate
        return (
            _script_majority(text, _HEBREW_RE)
            and not is_cjk_text(text)
            and not _script_majority(text, _ARABIC_RE)
        )
    if target == "ar":
        return (
            _script_majority(text, _ARABIC_RE)
            and not is_cjk_text(text)
            and not _script_majority(text, _HEBREW_RE)
        )
    if target == "en":
        return is_english_text(text)
    return False


def _translate_via_provider(
    text: str, target: str, provider: str, gender: str = "male"
) -> tuple[str, str]:
    """Returns (translated_text, actual_provider_used)."""
    lang = _GOOGLE_LANG[target]
    if provider == PROVIDER_GOOGLE:
        return _google_translate(text, lang), PROVIDER_GOOGLE

    system = _build_translate_system(target, gender)
    try:
        return _deepseek_translate(system, text), PROVIDER_DEEPSEEK
    except Exception as e:
        logger.warning("DeepSeek failed, falling back to Google: %s", e)
        # Cache under Google only — do not poison DeepSeek+gender cache keys
        return _google_translate(text, lang), PROVIDER_GOOGLE


def translate_text(
    text: str,
    target: str,
    provider: Optional[str] = None,
    gender: Optional[str] = None,
) -> dict:
    """
    Translate text to zh / he / ar / en.
    Returns { text, provider, cached, gender }.
    provider is the engine that produced the text (may differ from request on fallback).
    """
    text = (text or "").strip()
    target = normalize_target(target)
    use_gender = normalize_gender(gender)
    if not text:
        return {
            "text": "",
            "provider": normalize_provider(provider),
            "cached": False,
            "gender": use_gender,
        }

    use_provider = normalize_provider(provider)

    if _already_in_target(text, target):
        return {
            "text": text,
            "provider": use_provider,
            "cached": True,
            "gender": use_gender,
        }

    cached = _cache_get(text, target, use_provider, use_gender)
    if cached is not None:
        return {
            "text": cached,
            "provider": use_provider,
            "cached": True,
            "gender": use_gender,
        }

    result, actual_provider = _translate_via_provider(
        text, target, use_provider, use_gender
    )
    if result:
        _cache_set(text, target, actual_provider, use_gender, result)
    return {
        "text": result or text,
        "provider": actual_provider,
        "cached": False,
        "gender": use_gender,
    }
