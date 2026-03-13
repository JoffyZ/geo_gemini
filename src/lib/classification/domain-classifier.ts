import { redis } from '@/lib/redis';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type DomainCategory =
  | 'Media'
  | 'Social'
  | 'Forum'
  | 'Blog'
  | 'Corporate'
  | 'Academic'
  | 'Government'
  | 'Other';

const WHITELIST: Record<string, DomainCategory> = {
  // Social/Forum
  'reddit.com': 'Forum',
  'twitter.com': 'Social',
  'x.com': 'Social',
  'facebook.com': 'Social',
  'instagram.com': 'Social',
  'linkedin.com': 'Social',
  'quora.com': 'Forum',
  'stackoverflow.com': 'Forum',
  'zhihu.com': 'Forum',
  'v2ex.com': 'Forum',

  // Media
  'nytimes.com': 'Media',
  'theverge.com': 'Media',
  'techcrunch.com': 'Media',
  'bloomberg.com': 'Media',
  'reuters.com': 'Media',
  'bbc.co.uk': 'Media',
  'bbc.com': 'Media',
  'wsj.com': 'Media',
  'forbes.com': 'Media',
  'theguardian.com': 'Media',
  'guardian.com': 'Media',
  'caixin.com': 'Media',
  '36kr.com': 'Media',
  'ithome.com': 'Media',
  'cnn.com': 'Media',
  'foxnews.com': 'Media',
  'cnbc.com': 'Media',

  // Blog Platforms
  'medium.com': 'Blog',
  'substack.com': 'Blog',
  'wordpress.com': 'Blog',
  'blogspot.com': 'Blog',
  'dev.to': 'Blog',
  'hashnode.com': 'Blog',

  // Academic/Gov/Special
  'wikipedia.org': 'Academic',
  'arxiv.org': 'Academic',
  'scholar.google.com': 'Academic',
  'mit.edu': 'Academic',
  'stanford.edu': 'Academic',
  'harvard.edu': 'Academic',
  'github.com': 'Corporate', // Or 'Social' for developers, but Corporate fits better for source type
};

const CACHE_KEY_PREFIX = 'domain_classification:';

/**
 * Extracts the main domain from a URL or hostname.
 */
export function extractDomain(url: string): string {
  try {
    const hostname = url.includes('://') ? new URL(url).hostname : url.split('/')[0];
    const parts = hostname.split('.');
    if (parts.length > 2) {
      // Basic handling for common TLDs like .co.uk
      const lastTwo = parts.slice(-2).join('.');
      const commonSecondLevelTlds = ['co.uk', 'gov.cn', 'edu.cn', 'com.cn', 'org.cn', 'net.cn'];
      if (commonSecondLevelTlds.includes(lastTwo)) {
        return parts.slice(-3).join('.').toLowerCase().replace(/^www\./, '');
      }
      return parts.slice(-2).join('.').toLowerCase().replace(/^www\./, '');
    }
    return hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return url.toLowerCase().replace(/^www\./, '');
  }
}

/**
 * Classifies a domain into a category using Whitelist + LLM Fallback.
 */
export async function classifyDomain(domain: string): Promise<DomainCategory> {
  const normalizedDomain = domain.toLowerCase().trim().replace(/^www\./, '');

  // 1. Check Whitelist
  if (WHITELIST[normalizedDomain]) {
    return WHITELIST[normalizedDomain];
  }

  // Handle common patterns
  if (normalizedDomain.endsWith('.gov') || normalizedDomain.includes('.gov.')) {
    return 'Government';
  }
  if (normalizedDomain.endsWith('.edu') || normalizedDomain.includes('.edu.')) {
    return 'Academic';
  }

  // 2. Check Cache
  try {
    const cached = await redis.get<DomainCategory>(CACHE_KEY_PREFIX + normalizedDomain);
    if (cached) return cached;
  } catch (error) {
    console.error('Redis cache error:', error);
  }

  // 3. LLM Fallback
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Classify the following domain into one of these categories: Media, Social, Forum, Blog, Corporate, Academic, Government, Other. Return ONLY the category name.',
        },
        {
          role: 'user',
          content: `Domain: ${normalizedDomain}`,
        },
      ],
      max_tokens: 10,
      temperature: 0,
    });

    const category = response.choices[0]?.message?.content?.trim() as DomainCategory;
    const validCategories: DomainCategory[] = [
      'Media',
      'Social',
      'Forum',
      'Blog',
      'Corporate',
      'Academic',
      'Government',
      'Other',
    ];

    if (category && validCategories.includes(category)) {
      // Cache the result for 30 days
      await redis.set(CACHE_KEY_PREFIX + normalizedDomain, category, { ex: 60 * 60 * 24 * 30 });
      return category;
    }
  } catch (error) {
    console.error('LLM classification error:', error);
  }

  return 'Other';
}
