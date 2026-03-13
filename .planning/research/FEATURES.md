# Feature Landscape

**Domain:** GEO (Generative Engine Optimization) Monitoring Platform
**Researched:** 2026-03-13

## Table Stakes

Features users expect from GEO monitoring platforms. Missing any of these = product feels incomplete or unusable.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Multi-AI Platform Monitoring** | Industry standard to track ChatGPT, Perplexity, Gemini, Claude at minimum. Single-platform monitoring is incomplete. | Medium | All competitors (Topify, Otterly, AIbase) support 3-5 platforms minimum. Modern users expect 6-10 platform coverage. |
| **Brand Mention Tracking** | Core reason users need GEO monitoring - know if/when AI mentions your brand. | Low | Simple presence/absence detection. Binary metric. |
| **Mention Rate (Visibility Score)** | Users need to quantify brand visibility with a percentage metric. | Low | Industry standard metric. Formula: (mentions / total queries) × 100. |
| **Ranking Position** | When brand is mentioned in a list, users expect position tracking (1st, 2nd, 3rd). | Medium | Ranking logic varies: whole-answer vs section-based. Choose one methodology and document it. |
| **Competitor Comparison** | Users always ask "How do I compare vs competitors?" Must support multiple competitor tracking. | Medium | Minimum: Add/remove competitors, view side-by-side metrics (mention rate, ranking, sentiment). |
| **Trend Visualization** | Historical data is useless without trend charts. Users expect line/bar charts for metrics over time. | Medium | All platforms provide time-series charts. Time ranges: 7d, 14d, 30d, 90d, custom. |
| **Dashboard Overview** | Users expect a single-page summary of key metrics without drilling into sub-pages. | Medium | KPI cards + trend charts + top performers/decliners. Filterable by AI platform, date range. |
| **Prompt Library Management** | Users need to organize and manage questions being monitored. CRUD operations expected. | Medium | Add/delete/edit prompts, bulk import (CSV), categorization/tagging, search/filter. |
| **Citation Source Tracking** | When AI cites sources, users need to see which websites/URLs were referenced. | High | Requires parsing AI responses for citations. Different platforms format citations differently. |
| **Scheduled Monitoring** | Users expect automatic daily/weekly monitoring, not manual triggering. | Medium | Daily is standard. Weekly/custom intervals for budget constraints. |
| **Data Export** | Users need to export data for reports/presentations. CSV/Excel expected for all charts. | Low | One-click export for dashboards, charts, raw data. |
| **Time/Platform Filtering** | All data views must be filterable by date range and AI platform. | Low | Standard UI pattern. Apply globally or per-module. |

## Differentiators

Features that set products apart. Not expected by default, but provide competitive advantage.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **AI Volume (Query Volume Estimation)** | Helps users prioritize high-traffic questions. Answers "Which questions matter most?" | High | CORE DIFFERENTIATOR for this project. AthenaHQ's QVEM model shows this is cutting-edge. Data sources: Google Trends → SEO tools → proprietary ML models. |
| **Prompt Generator (AI-Powered Question Generation)** | Saves hours of manual brainstorming. Users input keyword → system generates relevant question set. | High | LLM-based generation. Topify offers this. Differentiator when combined with AI Volume scoring. |
| **Sentiment Analysis** | Tracks not just "mentioned" but "how" - positive/neutral/negative tone. | High | Uses NLP/LLM to classify tone. Conductor, HubSpot, Nightwatch offer this. Critical for brand reputation. |
| **Optimization Effect Tracking** | Answers "Did my content changes improve AI rankings?" Links actions → outcomes. | Very High | CORE DIFFERENTIATOR. Requires: action logging (content published, optimized) + correlation analysis with ranking changes. Few platforms do this well. |
| **Prompt Explorer (Single-Query Testing)** | Lets users test one question instantly before adding to monitoring. Fast validation loop. | Low | Topify calls this "Prompt Explorer." Reduces friction for new users. |
| **Citation Category Analysis** | Groups citation sources by type: forums, media, blogs, brand sites, academic. | Medium | Helps users understand "Where should I publish content?" More actionable than raw URL lists. |
| **Website Content Monitoring** | Shows which specific URLs from your site are cited by AI. | Medium | Helps content teams see ROI of published articles. Otterly, Topify offer this. |
| **Competitor Citation Analysis** | Tracks which sites competitors' brands are cited from. Reveals their content strategy. | High | Advanced feature. Requires tracking competitors' mention contexts + parsing their citations. |
| **Hallucination Detection** | Flags when AI makes false/incorrect statements about your brand. | High | Critical for brand safety. Requires LLM-based fact-checking against ground truth. Topify offers this. |
| **Multi-Brand Tracking** | Monitor multiple brands under one account (for agencies, multi-product companies). | Medium | SaaS scalability feature. Important for future but not v1. |
| **Alert System** | Slack/email notifications for ranking drops, new mentions, negative sentiment. | Medium | Proactive monitoring. Users don't need to check dashboard daily. |
| **Share of Voice** | What % of all brand mentions in your category belong to you? | Medium | Competitive positioning metric. Requires tracking all competitors in vertical. |
| **Question Categorization** | Organize prompts by topic, funnel stage, product line, geography. | Low | Helps large prompt libraries stay organized. Important at scale. |
| **AI Platform Coverage (8-10 platforms)** | Beyond basic 4 (ChatGPT, Perplexity, Gemini, Claude), add Copilot, Grok, DeepSeek, Llama. | Medium | Peec AI monitors 10 platforms. More coverage = more comprehensive insights. |
| **Seasonality Trends** | Identify seasonal patterns in AI Volume and mention rates. | Medium | AthenaHQ's QVEM offers this. Helps plan content calendars. |
| **LLM Conversion Rate** | Track conversions from AI search visitors (if trackable via UTM or referrer). | Very High | Emerging metric. Requires analytics integration. AI search visitors convert 4.4x higher than organic. |
| **Prompt Performance Scoring** | Composite score combining volume, visibility, ranking, sentiment. Single metric to prioritize. | Medium | Simplifies decision-making. ZipTie's "AI Success Score" does this. |

## Anti-Features

Features to explicitly NOT build (or deprioritize).

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **AI Content Generation** | Scope creep. Monitoring ≠ content creation. Dilutes focus. Many better tools exist (Jasper, Copy.ai). | Focus on monitoring + insights. Let users use their preferred content tools. Provide content recommendations, not generation. |
| **Real-Time Streaming Monitoring** | Over-engineered for v1. AI responses don't change minute-to-minute. Daily monitoring sufficient. | Scheduled daily/weekly runs. Real-time adds cost/complexity without proportional value. |
| **Mobile Native App** | Web-first. Desktop is primary use case for analytics dashboards. Mobile adds 2x dev time. | Responsive web design. Progressive Web App if mobile demand proves high. |
| **Multi-Language UI Localization** | v1 serves English/Chinese users. More languages = translation maintenance burden. | English + Chinese interface. Add languages when user base demands it. |
| **Built-In CRM/Analytics Platform** | Not our core competency. Integration > duplication. | Integrate with existing tools (Google Analytics, HubSpot, Salesforce) via API/webhooks. |
| **AI Response Caching/Storage** | Storing full AI responses = compliance/privacy risk + storage costs. Extract metrics, discard raw. | Store structured data (mentions, rankings, citations), not full text responses. |
| **White-Label/Reseller Features** | Premature for v1. Adds complexity (billing, multi-tenancy UX). | Build for single-brand internal use. Add multi-tenancy later when validated. |
| **Manual AI Querying Interface** | Users want automation, not manual tools. Prompt Explorer is enough for testing. | Prompt Explorer for single tests. All monitoring should be scheduled/automated. |
| **Video/Image Content Analysis** | AI platforms increasingly show visual content. But parsing complexity is very high for v1. | Text-only monitoring for v1. Flag as future enhancement when multimodal becomes standard. |
| **Social Media Monitoring** | Different domain. GEO ≠ social listening. Tools like Brandwatch do this better. | Stay focused on AI search engines. Link to social tools if users need integration. |

## Feature Dependencies

Critical sequencing for development:

```
Foundation Layer (Must Build First):
├── Prompt Library Management
├── AI Platform Connections (API integrations)
├── Scheduled Monitoring (cron/queue system)
└── Response Parsing (brand detection, ranking extraction)

Core Metrics Layer (Depends on Foundation):
├── Brand Mention Tracking
├── Mention Rate Calculation
├── Ranking Position Tracking
└── Citation Source Extraction

Analytics Layer (Depends on Core Metrics):
├── Trend Visualization (requires historical data)
├── Competitor Comparison (requires multi-brand tracking)
├── Dashboard Overview (aggregates all metrics)
└── Data Export

Advanced Features (Depends on Analytics):
├── AI Volume Integration (requires prompt library)
├── Prompt Generator (requires AI Volume data)
├── Sentiment Analysis (requires mention contexts)
├── Optimization Effect Tracking (requires trend data + action logging)
└── Hallucination Detection (requires fact database)
```

**Key Dependency Notes:**
- **AI Volume** can be built in parallel with monitoring, but needs prompt library schema finalized
- **Sentiment Analysis** requires storing mention context (text snippets), not just binary detection
- **Optimization Tracking** is highest value but requires all other layers operational first

## MVP Recommendation

Prioritize these features for v1 (1-2 month timeline):

### Phase 1: Core Monitoring (Week 1-3)
1. Prompt Library Management (CRUD + bulk import)
2. Multi-AI Platform Monitoring (ChatGPT, Perplexity, Gemini, Claude minimum)
3. Brand Mention Detection + Mention Rate
4. Ranking Position Tracking
5. Scheduled Daily Monitoring

### Phase 2: Analytics & Insights (Week 4-5)
6. Dashboard Overview (KPI cards + basic charts)
7. Trend Visualization (time-series charts)
8. Competitor Comparison (basic)
9. Citation Source Tracking + Top Sources List
10. Data Export (CSV for all views)

### Phase 3: Differentiators (Week 6-8)
11. **AI Volume Integration** (Google Trends API → basic scoring)
12. **Prompt Explorer** (single-query testing)
13. **Prompt Generator** (keyword → question list via LLM)
14. Sentiment Analysis (positive/neutral/negative)
15. Website Content Monitoring (track own domain citations)

### Defer to v2:
- Optimization Effect Tracking (requires v1 usage data)
- Hallucination Detection (complex, lower priority)
- Advanced AI Volume (ML models, paid data sources)
- Alert System (nice-to-have, not critical)
- 8-10 platform coverage (start with 4, expand based on demand)

## Feature Complexity by Module

| Module | Table Stakes Complexity | Differentiator Opportunity |
|--------|------------------------|---------------------------|
| **Dashboard** | Medium (aggregation + visualization) | Low (standard patterns) |
| **Prompt Management** | Medium (CRUD + bulk ops) | **HIGH (Prompt Generator + AI Volume)** |
| **Competitor Analysis** | Medium (multi-brand tracking) | High (citation source analysis) |
| **Citation Analysis** | High (parsing varies by platform) | Medium (categorization + trends) |
| **Website Monitoring** | Medium (domain filtering) | Low (straightforward feature) |
| **Data Export** | Low (standard CSV/Excel) | None |

## Platform-Specific Notes

### Multi-Platform Coverage Standards (2026):
- **Minimum viable:** 4 platforms (ChatGPT, Perplexity, Gemini, Claude)
- **Competitive:** 6 platforms (+ Copilot, Google AI Overviews)
- **Leading:** 8-10 platforms (+ Grok, DeepSeek, Llama, SearchGPT)

### AI Volume Data Sources (Priority Order):
1. **Google Trends API** (Free, good for directional insights, rate-limited)
2. **SEO Keyword Tools** (Semrush, Ahrefs APIs - paid but accurate)
3. **AthenaHQ QVEM-style Model** (Proprietary ML combining multiple signals - future)

### Sentiment Analysis Approaches:
1. **Rule-based** (keyword matching - fast, limited accuracy)
2. **OpenAI/Claude API** (LLM classification - high accuracy, API costs)
3. **Fine-tuned Model** (custom training - best accuracy, high complexity)

## ROI Metrics (Industry Benchmarks)

Based on 2026 research findings:
- Companies with effective GEO see **300-500% ROI within 6-12 months**
- Businesses adopting GEO report **+22% ROI, +40% visibility, 4.4x traffic quality**
- **25% of traditional search traffic will shift to AI by 2026** (Gartner)
- **AI search visitors convert 4.4x higher** than traditional organic search

**Implication for Feature Prioritization:**
Focus on features that directly improve visibility (mention rate, ranking) and help users understand ROI (optimization tracking, conversion attribution).

## Sources

**Competitive Research:**
- Project PDF: `docs/GEO监测工具能力对比.pdf` (HIGH confidence - detailed competitor analysis)
- Topify AI official site and blog (MEDIUM confidence - 2026 articles)
- Otterly.ai G2 reviews and product pages (MEDIUM confidence - verified features)
- AIbase mentioned as domestic competitor (LOW confidence - limited English documentation)

**Industry Standards:**
- Search Engine Land: "Measuring GEO: What's trackable now and what's still missing" (HIGH confidence - authoritative SEO source)
- Multiple GEO tool review articles from 2026 (MEDIUM confidence - aggregated insights)
- AthenaHQ QVEM documentation (HIGH confidence - technical white paper)

**Market Research:**
- Gartner prediction on search volume shift (HIGH confidence - cited across multiple sources)
- ROI benchmarks from Superlines, Averi.ai, Hashmeta (MEDIUM confidence - industry surveys)
- Conversion rate data (MEDIUM confidence - aggregate from multiple platforms)

**Technical References:**
- Braintrust, Agenta, LangChain documentation for prompt management patterns (HIGH confidence - official docs)
- HubSpot AEO Grader, Conductor, Semrush feature pages (HIGH confidence - verified product capabilities)

## Confidence Assessment

| Area | Confidence | Reasoning |
|------|------------|-----------|
| Table Stakes Features | **HIGH** | Verified across all major platforms (Topify, Otterly, AIbase). Consistent pattern. |
| Differentiators | **MEDIUM-HIGH** | Mix of verified features (AI Volume, Prompt Generator) and emerging capabilities (optimization tracking). |
| Anti-Features | **MEDIUM** | Based on product focus analysis + common scope creep patterns. Some subjective. |
| Complexity Ratings | **MEDIUM** | Based on technical architecture understanding + competitor implementation evidence. |
| ROI Metrics | **MEDIUM** | Industry surveys/case studies, not controlled research. Range is wide (300-500%). |
| AI Volume Approach | **MEDIUM** | AthenaHQ model is well-documented, but implementation details proprietary. Google Trends API is proven. |

## Open Questions for Phase-Specific Research

These topics likely need deeper investigation when building specific features:

1. **Ranking Logic:** How exactly should we handle different AI response formats (lists, paragraphs, tables)? Whole-answer vs section-based ranking?
2. **Citation Parsing:** What's the most robust approach for extracting citations across different AI platform formats?
3. **AI Volume Accuracy:** What's the correlation between Google Trends data and actual AI query volume? Need validation.
4. **Optimization Attribution:** How do we definitively link content changes to ranking improvements given AI model updates happen independently?
5. **Sentiment Reliability:** What accuracy threshold is acceptable for sentiment analysis? When to flag for manual review?
6. **Multi-Tenancy Design:** If/when we add SaaS capabilities, what's the data isolation strategy?

---
**Last Updated:** 2026-03-13
**Next Review:** After v1 user feedback (~2 months)
