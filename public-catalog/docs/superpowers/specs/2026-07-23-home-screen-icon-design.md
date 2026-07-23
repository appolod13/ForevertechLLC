# Home Screen Icon Design

## Goal

Make `PixelQrypt` appear as a save-to-home-screen web app with the user's approved red-and-white logo, so customers see that logo in browser tabs and on phone home screens after installing or saving the site.

## Approved Direction

- Use the attached red circular logo with the white letterform as the source asset for all icon variants.
- Keep the installed app name as `PixelQrypt`.
- Preserve the current installable web app setup and replace only the brand image assets and their references where needed.
- Support the main icon surfaces users will see:
  - browser tab favicon
  - bookmark/shortcut icon
  - Apple touch icon for iPhone home-screen saves
  - Android/PWA manifest icons for installed app shortcuts

## Existing Project Context

- The app already defines metadata icons in `src/app/layout.tsx`.
- The app already exposes a manifest in `src/app/manifest.ts`.
- Existing PNG icon files already exist under `public/icons/`, so the cleanest change is to regenerate those branded assets rather than introduce a second icon system.

## Approaches Considered

### Recommended: Replace Existing Icon Assets

Use the approved logo to regenerate the favicon, Apple touch icon, and PWA icon sizes already referenced by the app.

Why this is recommended:

- keeps the current metadata structure intact
- minimizes code churn
- works for browser tabs, iPhone saves, and Android install prompts
- avoids changing app behavior unrelated to branding

### Alternative: SVG-Only Browser Icon Update

Point the tab icon at the existing SVG logo only.

Why this was not chosen:

- does not fully cover phone home-screen icons
- may leave installed app icons inconsistent across platforms

### Alternative: Full Install Branding Refresh

Update icons plus additional theming such as splash appearance and app naming.

Why this was not chosen:

- expands scope beyond the user's request
- delays the core goal of making the saved app show the logo

## Implementation

- Create branded icon assets from the approved logo at the sizes needed by the current app:
  - `favicon.ico`
  - `32x32` favicon PNG
  - `180x180` Apple touch icon
  - `192x192` PWA icon
  - `512x512` PWA icon
  - `512x512` maskable PWA icon
- Replace or update the existing icon files in `public/` and `public/icons/`.
- Keep `src/app/layout.tsx` metadata aligned with the branded assets.
- Keep `src/app/manifest.ts` aligned with the branded install icons and standalone app behavior.

## Validation

- Run the existing metadata and manifest tests.
- Verify the referenced icon files exist at the paths used by the app.
- Check edited files for diagnostics after the changes.

## Out Of Scope

- Renaming the app away from `PixelQrypt`
- Redesigning the logo itself
- Broader mobile UX or splash-screen changes unrelated to icon branding
