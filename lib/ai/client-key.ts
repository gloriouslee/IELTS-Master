const KEY = 'ielts-deepseek-api-key';
export const getDeepSeekKey = () => typeof window === 'undefined' ? '' : sessionStorage.getItem(KEY) || '';
export const setDeepSeekKey = (key: string) => sessionStorage.setItem(KEY, key.trim());
export const clearDeepSeekKey = () => sessionStorage.removeItem(KEY);
export const isDeepSeekKeyConfigured = () => Boolean(getDeepSeekKey());
export const maskedDeepSeekKey = () => { const key = getDeepSeekKey(); return key ? `${key.slice(0, 4)}••••${key.slice(-4)}` : ''; };
