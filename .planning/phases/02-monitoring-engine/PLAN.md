# Phase 2: Monitoring Engine Implementation - PLAN

## Goal
Implement a geo-specific monitoring engine capable of querying multiple AI platforms and parsing the results into a structured format for analysis.

## Tasks & Scope

### T008: Geo-Specific Adapter Factory & OpenAI Adapter
- **Objective**: Establish the core pattern for platform-specific adapters with geographical awareness.
- **Scope**: Define `GeoAdapter` interface, create `AdapterFactory`, and implement OpenAI adapter.
- **Output**: `src/lib/adapters/interface.ts`, `factory.ts`, `providers/openai.ts`.

### T009: Multi-Provider Expansion
- **Objective**: Extend the monitoring engine to support a broader range of AI and search platforms.
- **Scope**: Implement adapters for Perplexity, Gemini, and Google AI Overviews (via SerpApi).
- **Output**: `src/lib/adapters/providers/perplexity.ts`, `gemini.ts`, `google_ai_overviews.ts`.

### T010: Structured LLM Parsing Service
- **Objective**: Convert unstructured AI responses into standardized JSON data.
- **Scope**: Create a parsing service using structured output models (e.g., GPT-4o-mini).
- **Key Fields**: Brand mentions, ranking, sentiment, sources.
- **Output**: `src/lib/parsing/llm-parser.ts`, `src/lib/parsing/prompts.ts`.

### T011: Prompt Explorer (POC UI)
- **Objective**: Provide a functional interface to test and validate monitoring queries across all platforms.
- **Scope**: Build an interactive UI for platform selection, country code, and prompt testing.
- **Output**: `src/app/dashboard/explorer/page.tsx`, `src/app/api/explorer/route.ts`.

## Success Criteria
- [x] Abstract factory pattern successfully decouples platform logic from the main application.
- [x] Multi-platform support (ChatGPT, Perplexity, Gemini, Google AI Overviews) implemented.
- [x] Unstructured data correctly parsed into structured formats matching the database schema.
- [x] Functional POC UI available for manual verification and testing.
