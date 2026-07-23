# Home Screen Icon Design

## Goal

Make PixelQrypt appear like an installable web app shortcut when users save the site to their phone home screen, while also updating the browser tab icon to use the provided red-circle logo.

## Approved Direction

- Use the provided logo as the visual basis for the tab icon and saved-home-screen app icon.
- Add a proper web app manifest so phones and browsers can use branded icons instead of generic browser shortcuts.
- Add an Apple touch icon so iPhone home-screen saves show the PixelQrypt logo.
- Keep the favicon path working for browser tabs and bookmarks.

## Implementation

- Generate branded icon assets at standard sizes:
  - favicon
  - Apple touch icon
  - Android/PWA manifest icons
- Update `src/app/layout.tsx` metadata to reference the new icons and manifest.
- Add a `manifest.webmanifest` definition with app name, colors, and icon list.

## Validation

- Add tests for manifest contents and metadata icon wiring.
- Verify the generated icon files are present and load from the local app.
