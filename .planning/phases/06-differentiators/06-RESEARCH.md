# Phase 6: Differentiators - Research

**Researched:** 2026-03-09
**Domain:** AI Volume, Localized Prompt Engineering, Domain Classification
**Confidence:** HIGH

## Summary

Phase 6 focuses on transforming a raw monitoring tool into a "commercially prioritized advisor." By integrating **AI Volume** (search trends/volume) and **Localized Prompt Generation**, the system will not only monitor brand voice but also tell users *which* questions are worth monitoring and optimizing for.

**Primary recommendation:** Use **DataForSEO** or **Keywords Everywhere** for high-precision volume data, and migrate from unofficial Trends libraries to the **Official Google Trends API (Alpha)** or **SerpApi** for reliability.

## Standard Stack

### Core
| Library / API | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **Official Google Trends API** | Alpha (2025) | Trends Data | First-party, consistent scaling, avoids 429 errors. |
| **DataForSEO API** | v3 | Keyword Volume | Developer favorite, pay-as-you-go, high concurrency support. |
| **Keywords Everywhere API** | v1 | Budget Volume | Cheapest source ($0.0001/keyword) directly from Google Ads. |
| **OpenAI GPT-4o / Claude 3.5** | Latest | Prompt Gen & Classification | SOTA for multilingual intent understanding. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `google-trends-LiteLo` | ^1.0.0 | Local Trends | Use as a fallback for 24h/48h "hot" trends via Puppeteer. |
| `https-proxy-agent` | ^7.0.0 | Proxy Management | Mandatory if using any unofficial scrapers. |
| `zod` | ^3.x | Data Validation | Structuring AI-generated questions and classification results. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `google-trends-api` (npm) | **SerpApi** | SerpApi is paid but highly stable; the npm package is unmaintained and prone to 429s. |
| Semrush / Ahrefs API | **DataForSEO** | Semrush API is $500+/mo; DataForSEO is pay-as-you-go ($100 min). |

## Architecture Patterns

### 1. Two-Step Localized Prompt Generation
To ensure high-quality monitoring, we use a cascaded generation logic:

**Step 1: Keyword Expansion**
- Input: Seed keyword (e.g., "GEO Tool").
- AI Output: 10-15 LSI (Latent Semantic Indexing) keywords and related entities.

**Step 2: Intent-based Question Generation**
- Input: Expanded keywords + Target Country + Business Category.
- AI Logic: Generate questions mapping to the marketing funnel:
    - *Awareness*: "What is [Category]?"
    - *Consideration*: "Best [Category] for [Use Case]?"
    - *Conversion*: "[Brand] vs [Competitor] reviews."
- Output: Structured JSON list of questions with locale-specific phrasing.

### 2. Commercial Priority Scoring (CPS)
We prioritize monitoring tasks using a formulaic approach:
`CPS = (Volume_Score * 0.4) + (Intent_Value * 0.4) + (Trend_Velocity * 0.2)`

- **Volume_Score**: Logarithmic scale of monthly search volume.
- **Intent_Value**: Assigned weights (Transactional: 1.0, Commercial: 0.8, Informational: 0.5).
- **Trend_Velocity**: % growth in Google Trends over the last 30/90 days.

### 3. Hybrid Domain Classification
**Logic:**
1.  **Level 1 (Whitelist):** Check domain against a static list (e.g., Top 1000 media/forums).
2.  **Level 2 (LLM Classifier):** If unknown, use a lightweight LLM prompt to classify based on domain name and TLD hints.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Google Trends Scraper | Custom Request Wrapper | Official API / SerpApi | Google's anti-bot (429/CAPTCHA) is extremely aggressive. |
| Domain Authority | Custom Crawler | Moz/Ahrefs/DataForSEO DA | Measuring "authority" requires a massive index of the entire web. |
| Global Proxy Pool | DIY Proxy Server | Bright Data / Oxylabs | Managing residential IPs across 100+ countries is a full-time DevOps job. |

## Common Pitfalls

### Pitfall 1: Google Trends Relative Scaling
- **What goes wrong:** Google Trends returns values 0-100 relative to the peak of that specific query, making comparison between different keywords impossible.
- **How to avoid:** Use the **Official Google Trends API (Alpha)** which provides "Consistently Scaled Data," or use a tool like **Glimpse** to get absolute volumes.

### Pitfall 2: Localized Intent Hallucination
- **What goes wrong:** LLMs may generate questions that make grammatical sense but are never actually searched for in a specific culture (e.g., using "sneakers" in a UK context where "trainers" is the search term).
- **How to avoid:** Always feed **real keyword volume data** back into the LLM as "evidence" during Step 2 of the prompt generation.

## Code Examples

### 1. Domain Classification Prompt (Verified)
```typescript
const CLASSIFICATION_PROMPT = `
Identify the category of the following domain: {{domain}}.
Categories: [Media, News, Forum, Blog, Social Media, Ecommerce, Government, Education].
Output format: JSON { "domain": string, "category": string, "confidence": number }.
Rules: If unsure, return "Unknown". Only output JSON.
`;
```

### 2. Commercial Priority Logic
```typescript
function calculatePriority(volume: number, intent: 'high' | 'medium' | 'low', trend: number) {
  const vScore = Math.log10(volume + 1) / 6; // Normalized to 0-1
  const iScore = intent === 'high' ? 1.0 : intent === 'medium' ? 0.6 : 0.3;
  const tScore = Math.min(trend / 100, 1.5); // Cap growth at 150%
  
  return (vScore * 0.4) + (iScore * 0.4) + (tScore * 0.2);
}
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest |
| Quick run command | `npm run test` |
| Full suite command | `npm run test:all` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command |
|--------|----------|-----------|-------------------|
| DIFF-01 | AI Volume integration (DataForSEO/SerpApi) | Integration | `vitest tests/integration/volume.test.ts` |
| DIFF-02 | Localized Prompt Workflow (2-step) | Unit (Mocked LLM) | `vitest tests/unit/prompt-gen.test.ts` |
| DIFF-03 | Domain Classification Accuracy | Unit | `vitest tests/unit/domain-classifier.test.ts` |

## Sources

### Primary (HIGH confidence)
- **Google Trends Official API Alpha Docs** (July 2025 release)
- **DataForSEO API Documentation**
- **Keywords Everywhere API Pricing/Docs**

### Secondary (MEDIUM confidence)
- **SerpApi Google Trends Endpoint** (verified stable in community)
- **Tranco/Cisco Umbrella Top 1M Lists** (standard for domain whitelisting)

### Tertiary (LOW confidence)
- `google-trends-LiteLo` (New library, requires further stress testing for 429 errors)

## Metadata
**Research date:** 2026-03-09
**Valid until:** 2026-06-09 (Fast-moving AI/SEO domain)
