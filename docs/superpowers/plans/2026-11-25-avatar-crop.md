# Avatar Crop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let users reposition and zoom a selected profile photo before it is uploaded.

**Architecture:** Keep the existing Supabase upload and settings persistence flow. Add pure crop geometry helpers, a client-side circular crop dialog, and export a 512x512 square image whose circular preview matches every existing avatar surface.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind 4, Canvas API, node:test.

**Spec:** User-approved circular crop flow in this conversation.

## Global Constraints

- Preserve the current profile settings and upload data model.
- No new runtime dependency.
- Support pointer, touch, keyboard, Thai/English, light/dark, and reduced motion.
- Validate image type and 10 MB maximum before opening the editor.

## Review Focus

- Portrait and landscape images must always cover the circular viewport without empty edges.
- Dragging and zooming must clamp the image to the crop area.
- Cancel must not upload or replace the existing avatar.
- Saving must upload a compact 512x512 image and keep the dialog open on failure.
- Object URLs and pointer listeners must be cleaned up.

---

### Task 1: Crop geometry

**Files:**
- Create: `lib/utils/avatarCrop.mjs`
- Test: `tests/avatar-crop.test.mjs`

- [ ] Write failing tests for cover scale, pan clamping, and source rectangle conversion.
- [ ] Run the focused test and verify RED.
- [ ] Implement the pure geometry functions.
- [ ] Run the focused test and verify GREEN.

### Task 2: Crop dialog and settings integration

**Files:**
- Create: `components/settings/AvatarCropDialog.tsx`
- Modify: `components/settings/SettingsForm.tsx`

- [ ] Add the crop dialog with circular mask, drag, zoom slider, reset, cancel, save, keyboard controls, and accessible labels.
- [ ] Export a 512x512 JPEG through Canvas and pass it to the existing upload function.
- [ ] Change file selection to open the editor instead of uploading immediately.
- [ ] Keep existing avatar visible until the cropped upload succeeds.

### Task 3: Verification and release

- [ ] Run focused tests, full tests, lint, TypeScript, and production build.
- [ ] Run Impeccable detector on changed UI.
- [ ] Verify the mobile flow visually at 390px in light and dark themes.
- [ ] Commit, push the feature branch, deploy production, and smoke-test the deployed settings page.
