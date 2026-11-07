---
name: frontend-freeze
description: >-
  Strictly preserve frontend UI, layouts, styles, badges, and user-facing presentation.
  Use this skill whenever working on tasks involving backend logic, engine integration,
  state management, database, performance, or bugfixes to ensure no frontend visual changes
  are made unless explicitly requested by the user.
---

# Frontend Freeze & Preservation Skill

## Purpose
Enforce strict protection of the frontend user interface. The agent must never alter, clutter, restyle, or modify visual components, badges, text, themes, or layouts unless the user explicitly and directly requests frontend UI modifications in their prompt.

## Rules of Engagement

1. **Explicit Request Requirement**:
   - Unless the user prompt explicitly states "thay đổi frontend", "sửa giao diện", "thêm nút", "đổi màu", "thay đổi style" or similar direct UI instructions, treat the entire frontend presentation as FROZEN.
   - For tasks involving backend logic, AI engine integration, chess algorithms, database management, audio systems, or performance optimizations, implement all functionality strictly behind the scenes (in utility modules, engines, workers, data models, or headless hooks) without altering user-facing DOM structures or styling.

2. **No Unrequested Visual Badges or Labels**:
   - Do NOT add technical tags, engine badges, version labels, debug counters, or indicator elements to the UI unless explicitly instructed.
   - Preserve natural narrative strings, character descriptions, and clean aesthetic layouts.

3. **Check Target Files**:
   - Before modifying any `.tsx`, `.jsx`, `.css`, or presentation file:
     - Verify if the edit affects visual rendering or layout.
     - If it does, stop and ask if it is explicitly requested by the user.
     - If not requested, route the functionality through headless state, background logic, or existing user-facing hooks without altering DOM structure or CSS.

4. **Diff Verification**:
   - Always run a diff against the pre-task checkpoint or baseline to confirm zero unintended UI modifications before completing any task.
