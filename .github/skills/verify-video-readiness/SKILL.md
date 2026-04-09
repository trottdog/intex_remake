---
name: verify-video-readiness
description: Audit whether the team is truly ready to record or submit class videos. Use this when verifying that required features are visible, links are public, demos are readable, and each class video proves the claimed work.
argument-hint: [video plan, feature list, links, demo flow]
user-invocable: true
---

# Verify Video Readiness

Use this skill before recording or submitting videos.

## Core rule

Do not assume that implemented work will earn points.
Only visible, understandable, class-specific proof counts.

## Verify

- each required class video exists or has a clear shot list
- the correct class requirements are shown in the correct video
- features are shown, not merely described
- links are public/unlisted and accessible
- UI text is readable at video resolution
- security items are shown in devtools where needed
- ML is shown both in notebook context and in app integration
- credentials and login flow are tested
- demo path fits within time limits

## Output

Return:
- What is safe to claim
- What is risky to claim
- What must still be recorded
- Which links still need verification
- Final result: Ready / Not ready