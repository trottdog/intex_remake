# Cookie Consent Proof Script (IS 414)

Use this exact sequence to produce grading evidence for cookie consent.

## Goal

Prove that consent is functionally enforced, not just visually displayed.

## Preconditions

1. Open the deployed frontend in a browser.
2. Open DevTools to the Application/Storage cookies view.
3. Clear site cookies before starting the recording.

## Recording Steps

1. Reload the site and show the cookie banner appears.
2. Click `Accept All`.
3. In browser cookies, show:
   - `beacon_consent=all`
   - `beacon_personalization=enabled`
4. Navigate to profile consent controls and switch to `Essential Only`.
5. In browser cookies, show:
   - `beacon_consent=essential`
   - `beacon_personalization` no longer exists
6. Refresh the page and confirm values remain aligned with the selected consent.
7. Open the privacy policy page and show the Essential vs Optional section.

## Verbal Explanation (required)

State this while recording:

"Beacon stores essential preference cookies for app usability. Optional consent controls a non-essential personalization cookie. Selecting Accept All enables it; selecting Essential Only removes it. Authentication does not depend on cookies."

## Pass Criteria

All must be visible in the video:

1. Banner display and user choice.
2. Cookie-level proof of enablement/removal.
3. Persistence across reload.
4. Privacy policy explanation matching behavior.
