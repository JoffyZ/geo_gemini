# Stack Research: GEO Monitoring System

**Date:** 2026-03-13
**Status:** Recommended
**Target Environment:** Node.js, TypeScript, PostgreSQL, TimescaleDB, Redis/BullMQ

## Executive Summary
This document recommends a modern, high-performance, and TypeScript-first technology stack for the GEO Monitoring System. The selection prioritizes developer velocity (DX), type safety, and minimal runtime overhead to ensure the system is both robust and scalable for future SaaS expansion.

---

## 1. Frontend & UI Layer
*Goal: Minimalist, high performance, and rapid dashboard development.*

- **Framework:** **Next.js 15+ (App Router)**
  - *Rationale:* Server-side rendering (SSR) for fast initial loads, excellent SEO (if public pages are added), and seamless API route integration.
- **UI Component Library:** **Shadcn UI** (built on **Tailwind CSS** + **Radix UI**)
  - *Rationale:* It is not a traditional "library" but a collection of reusable components you copy into your project. This ensures 0% unnecessary runtime overhead and 100% customization. Extremely minimalist and modern aesthetic.
- **State Management & Data Fetching:** **TanStack Query (React Query) v5**
  - *Rationale:* Essential for managing the asynchronous nature of GEO monitoring data (polling job statuses, caching dashboard metrics, handling retries).
- **Icons:** **Lucide React**
  - *Rationale:* Clean, consistent, and tree-shakeable icon set that pairs perfectly with Shadcn UI.

## 2. Data Visualization (Charts)
*Goal: Interactive, responsive, and lightweight.*

- **Primary Recommendation:** **Recharts**
  - *Rationale:* Composited with React components, making it extremely easy to build responsive line charts (mention trends) and bar charts (competitor comparisons). It handles SVG rendering efficiently for standard dashboard needs.
- **Alternative (for complex/large datasets):** **Apache ECharts**
  - *Rationale:* Use if you need to render thousands of data points or highly complex custom visualizations (e.g., source network graphs). It is more performant for canvas-based rendering but has a steeper learning curve.

## 3. Backend & Data Access
*Goal: Type-safe, high-performance ORM and robust job processing.*

- **ORM:** **Drizzle ORM**
  - *Rationale:* A "headful" ORM that feels like writing SQL but with full TypeScript type safety. It has significantly lower overhead than Prisma and native support for PostgreSQL features (including TimescaleDB extensions). It is perfect for high-performance data ingestion.
- **API Client:** **Axios** (Backend) / **Ky** (Frontend)
  - *Rationale:* Axios remains the standard for backend service-to-service communication with robust interceptor support. Ky is a smaller, modern fetch-based alternative for the browser.
- **Validation:** **Zod**
  - *Rationale:* The gold standard for TypeScript schema validation. Used for validating API requests, environment variables, and—crucially—LLM parsing outputs.

## 4. LLM Parsing & Extraction
*Goal: Reliable, structured data extraction from unpredictable AI responses.*

- **Schema-Based Extraction:** **OpenAI / Anthropic Structured Outputs**
  - *Rationale:* Instead of complex regex, use the native "JSON Mode" or "Structured Outputs" (via Zod schemas) provided by GPT-4o or Claude 3.5 Sonnet. This ensures the LLM returns data in the exact format required for the database.
- **Orchestration:** **LangChain.js** (Lightweight usage) or **Braintrust**
  - *Rationale:* Use LangChain for its standard "Output Parsers" and "Prompt Templates." If cost-tracking and evaluation become critical, Braintrust provides excellent observability into LLM performance and costs.
- **Alternative (Low Cost):** **Instructor** (JS/TS port)
  - *Rationale:* A dedicated library for getting structured data from LLMs using Zod. Very "thin" and focused compared to LangChain.

## 5. Infrastructure & DevTools

- **Database Extension:** **TimescaleDB**
  - *Rationale:* Essential for the `monitoring_metrics` table. Use "Hypertables" for automatic time-partitioning and "Continuous Aggregates" for pre-computing dashboard stats without slow `COUNT/AVG` queries.
- **Job Queue:** **BullMQ** (on Redis)
  - *Rationale:* Best-in-class for Node.js. Handles retries with exponential backoff, delayed jobs (scheduled monitoring), and concurrency control (crucial for rate-limiting AI API calls).
- **Logging:** **Pino**
  - *Rationale:* Extremely low-overhead JSON logger. Essential for high-volume background workers.
- **Testing:** **Vitest**
  - *Rationale:* Faster and more modern than Jest, with native TypeScript support.

---

## Summary Recommendation Table

| Category | Tool | Why |
|----------|------|-----|
| **Frontend** | Next.js + Shadcn UI | Minimalist, modern, high DX |
| **Charts** | Recharts | React-native, easy to customize |
| **ORM** | Drizzle ORM | High performance, SQL-like, type-safe |
| **Parsing** | OpenAI Structured Outputs + Zod | 100% reliable JSON extraction |
| **Metrics** | TimescaleDB | Optimized for trend analysis |
| **Jobs** | BullMQ | Robust retry and rate-limiting logic |
