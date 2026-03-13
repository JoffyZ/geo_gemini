export const COUNTRIES = [
  { code: 'US', name: '美国' },
  { code: 'CN', name: '中国' },
  { code: 'JP', name: '日本' },
  { code: 'DE', name: '德国' },
  { code: 'FR', name: '法国' },
  { code: 'GB', name: '英国' },
  { code: 'KR', name: '韩国' },
  { code: 'IN', name: '印度' },
  { code: 'BR', name: '巴西' },
  { code: 'RU', name: '俄罗斯' },
  { code: 'CA', name: '加拿大' },
  { code: 'AU', name: '澳大利亚' },
  { code: 'SG', name: '新加坡' },
  { code: 'AE', name: '阿联酋' },
] as const;

export type CountryCode = typeof COUNTRIES[number]['code'];
