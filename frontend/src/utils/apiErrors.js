/** Maps API error codes to i18n keys (t.errors.* or t.chat.*) */

const ERROR_TO_ERRORS_KEY = {
  SESSION_EXPIRED: 'sessionExpired',
  INVALID_TOKEN: 'invalidToken',
  INVALID_ACCESS_KEY: 'invalidAccessKey',
  RATE_LIMITED: 'rateLimited',
  DEFAULT_PASSWORD_FORBIDDEN: 'defaultPasswordForbidden',
  INVALID_IP_FORMAT: 'invalidIpFormat',
  RESERVED_ADMIN_PATH: 'reservedAdminPath',
  PASSWORD_TOO_SHORT: 'passwordTooShort',
  EMPTY_FILE: 'emptyFile',
  IMAGE_NOT_FOUND: 'imageNotFound',
  SESSION_CREATE_FAILED: 'sessionCreateFailed',
  DB_NOT_CONFIGURED: 'dbNotConfigured',
  DB_CONNECTION_FAILED: 'dbConnectionFailed',
  MESSAGE_EMPTY: 'messageEmpty',
  MESSAGE_TOO_LONG: 'messageTooLong',
  REGISTRATION_REQUIRED: 'registrationRequired',
  SESSION_NOT_FOUND: 'sessionNotFound',
  BLACKLISTED: 'blacklisted',
  ACCESS_DENIED_REGION: 'accessDeniedRegion',
  SESSION_ID_REQUIRED: 'sessionIdRequired',
  SESSION_ACCESS_DENIED: 'sessionAccessDenied',
  IMAGE_ACCESS_DENIED: 'imageAccessDenied',
  JWT_SECRET_NOT_CONFIGURED: 'jwtSecretNotConfigured',
  REQUEST_FAILED: 'requestFailed',
  TRANSLATE_FAILED: 'requestFailed',
  TRANSLATE_MODULE_MISSING: 'requestFailed',
};

const SUCCESS_TO_TOAST_KEY = {
  CONFIG_SAVED: 'settingsSaved',
  WHITELIST_ADDED: 'ipAdded',
  WHITELIST_REMOVED: 'ipRemoved',
  BLACKLIST_ADDED: 'ipBlocked',
  BLACKLIST_REMOVED: 'ipUnblocked',
  SESSION_DELETED: 'sessionDeleted',
  NOTE_SAVED: 'noteSaved',
};

const ERROR_TO_CHAT_KEY = {
  INVALID_ISRAELI_PHONE: 'phoneInvalid',
  NAME_REQUIRED: 'nameRequired',
  IMAGE_TYPE_NOT_SUPPORTED: 'imageUnsupported',
  IMAGE_TOO_LARGE: 'imageTooLarge',
};

/** Legacy Chinese API responses (pre-migration) */
const LEGACY_DETAIL_MAP = {
  '登录状态已过期，请重新登录': 'SESSION_EXPIRED',
  '无效的访问凭证': 'INVALID_TOKEN',
  'IP 格式无效': 'INVALID_IP_FORMAT',
  '文件为空': 'EMPTY_FILE',
  '仅支持 JPG/PNG/GIF/WebP/BMP，HEIC/HEIF 暂不支持': 'IMAGE_TYPE_NOT_SUPPORTED',
  '图片不能超过 4MB': 'IMAGE_TOO_LARGE',
  '图片不能超过 20MB': 'IMAGE_TOO_LARGE',
  '登录尝试过于频繁，请稍后再试': 'RATE_LIMITED',
  '安全限制：生产环境禁止使用默认后台密码，请先修改 adminPassword': 'DEFAULT_PASSWORD_FORBIDDEN',
  '访问密钥错误 (Invalid Access Key)': 'INVALID_ACCESS_KEY',
  '安全拦截：后台密码不得少于 6 个字符。': 'PASSWORD_TOO_SHORT',
  '请输入有效的以色列手机号码 (05XXXXXXXX)': 'INVALID_ISRAELI_PHONE',
  '请输入您的姓名': 'NAME_REQUIRED',
  '会话创建失败，请重试': 'SESSION_CREATE_FAILED',
  '数据库未配置，请在 Vercel 设置 MONGO_URL 环境变量': 'DB_NOT_CONFIGURED',
  '数据库连接失败，请稍后重试': 'DB_CONNECTION_FAILED',
  '消息内容不能为空': 'MESSAGE_EMPTY',
  '消息过长': 'MESSAGE_TOO_LONG',
  '请先完成姓名和手机号验证': 'REGISTRATION_REQUIRED',
  '图片不存在': 'IMAGE_NOT_FOUND',
  '会话不存在': 'SESSION_NOT_FOUND',
  '你已被拉黑，无法继续聊天。': 'BLACKLISTED',
  'Access Denied: 香港地区已被拦截。': 'ACCESS_DENIED_REGION',
};

const hasChinese = (text) => /[\u4e00-\u9fff]/.test(text);

export const resolveApiError = (detail, t, fallback) => {
  const fb = fallback || t?.errors?.requestFailed || 'Request failed';
  if (!detail || typeof detail !== 'string') return fb;

  let code = LEGACY_DETAIL_MAP[detail] || detail.trim();
  if (code.startsWith('RESERVED_ADMIN_PATH')) code = 'RESERVED_ADMIN_PATH';
  if (code.startsWith('安全拦截：禁止使用系统保留路由')) code = 'RESERVED_ADMIN_PATH';

  const chatKey = ERROR_TO_CHAT_KEY[code];
  if (chatKey && t?.chat?.[chatKey]) return t.chat[chatKey];

  const errKey = ERROR_TO_ERRORS_KEY[code];
  if (errKey && t?.errors?.[errKey]) return t.errors[errKey];

  if (hasChinese(detail)) return fb;
  if (ERROR_TO_ERRORS_KEY[code] || ERROR_TO_CHAT_KEY[code]) return fb;
  return detail;
};

export const resolveApiSuccess = (message, t, fallback = '') => {
  if (!message || typeof message !== 'string') return fallback;
  // Prefer explicit fallback (adminZh) so admin UI stays Chinese regardless of visitor locale.
  if (fallback) return fallback;
  const toastKey = SUCCESS_TO_TOAST_KEY[message.trim()];
  if (toastKey && t?.admin?.toast?.[toastKey]) return t.admin.toast[toastKey];
  return message;
};
