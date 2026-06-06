Audience: project stakeholders, engineering leads, operations leadership
Objective: explain the app's design shell, system architecture, code structure, standout capabilities, and the highest-signal code review findings in one concise deck.

Narrative Arc:
1. Establish the platform as a unified maintenance operating system rather than a single module.
2. Show how the user experience is structured across web, mobile, and Kelvin AI.
3. Explain how the backend, database, and cognitive service fit together.
4. Summarize the codebase shape and the operational depth already present.
5. Close with the most important review findings, fixes, and next architectural move.

Slide List:
1. Title: Maintenance Management System - Design, Architecture & Code Review
2. Platform snapshot with repo-backed metrics
3. Experience design and universal-login shell
4. Mobile and Kelvin AI operating model
5. System architecture across presentation, application, and intelligence/data layers
6. Code structure and codebase organization metrics
7. Salient app capabilities across execution, planning, and knowledge workflows
8. Code review findings, fixes, and residual risks
9. Recommended next move: scoped contractor workspace on the same database

Source Plan:
- deploy/README.md
- deploy/client/src/App.tsx
- deploy/client/src/modules/core/pages/EnterpriseHub.tsx
- deploy/client/src/modules/procurement/pages/DashboardPage.tsx
- deploy/client/src/modules/cognitive/ChatInterface.tsx
- deploy/mobile/app/(tabs)/index.tsx
- deploy/mobile/package.json
- deploy/server/src/index.ts
- deploy/server/src/controllers/authController.ts
- deploy/server/prisma/schema.prisma
- deploy/cognitive/main.py
- deploy/cognitive/llm_service.py

Visual System:
- Clean operations-tech palette: navy, slate, teal, amber, and off-white.
- Strong title typography with compact, card-based content blocks.
- Subtle industrial geometry and restrained accent shapes instead of generic templates.
- Brand anchor via ONGC logo and mobile app icon where useful.

Asset Needs:
- Existing workspace assets only: ONGC logo and mobile app icon.
- No screenshot dependency; visuals are structured to stay accurate even as the UI evolves.

Editability Plan:
- All visible copy as native text boxes.
- All cards, bands, and accents as native shapes.
- Speaker notes carry file-based source references for each slide.
