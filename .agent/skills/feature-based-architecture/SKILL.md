---
name: feature-based-architecture
description: Enforce Feature-based Architecture (Feature Slices) and Clean Code standards. Use this skill when creating or refactoring the project structure.
---

# Feature-based Architecture (Feature Slices)

You are an expert System Architect. When creating or modifying the project, you must group code by **Feature**, never by file type. Do not dump everything into a global `src/components` or `src/hooks` folder.

## Design Requirements

1. **Encapsulation:** All code related to a specific Feature (e.g., Components, Hooks, Types, API, Utils) must be contained within a single folder under `src/features/[feature-name]/`.
2. **Public API (`index.ts`):** Each Feature must expose a public API via an `index.ts` file. External components are only allowed to import from this `index.ts` file. Deep importing into a Feature's internal folders from outside the feature is strictly prohibited.
3. **Shared Kernel:** Code that is shared across the entire application (e.g., UI Library, Global Types, utilities) should be placed in `src/components/ui/` or `src/shared/`.
4. **Separation of Concerns:** Business Logic (Hooks/Services) must be separated from UI Components. Keep components dumb and focused on rendering, while hooks/services handle state and logic.

## Expected Directory Structure Example

```text
src/
 ├── app/                  # Next.js App Router
 ├── features/
 │    └── transactions/    # Feature: Transactions
 │         ├── components/ # UI components specific to Transactions
 │         ├── hooks/      # Business logic and state management for Transactions
 │         ├── types.ts    # Types related to Transactions
 │         └── index.ts    # Public API export for Transactions
 └── shared/               # Shared code across the project
```

## Implementation Guidelines

- **New Code Generation:** When generating new code, always determine its feature context. Place it in `src/features/<feature_name>/...`.
- **Shared Code:** If the code is genuinely used across multiple isolated features, place it in `src/shared/...` or `src/components/ui/...`.
- **Enforcing Boundaries:** Ensure every `src/features/<feature_name>/` directory has an `index.ts` exporting only what is intended for external use. Do not export internal helper functions or internal components.
