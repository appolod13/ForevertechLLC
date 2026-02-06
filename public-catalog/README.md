# ForeverTech Public Catalog

## 1. Architecture Decisions

### Tech Stack
- **Framework**: Next.js 14+ (App Router) for robust SSR/SSG and SEO capabilities.
- **Language**: TypeScript for type safety and developer experience.
- **Styling**: Tailwind CSS for utility-first, responsive design with consistent design tokens.
- **Icons**: Lucide React for lightweight, consistent iconography.
- **State Management**: React Hooks (`useState`, `useEffect`) combined with Server-Sent Events (SSE) for real-time updates.
- **Animation**: Framer Motion for smooth, hardware-accelerated interactions.
- **Containerization**: Docker for consistent deployment across environments.

### Key Architectural Patterns
- **Server-Side Rendering (SSR)**: Initial page load fetches data on the server (`page.tsx`) to ensure SEO friendliness and fast First Contentful Paint (FCP).
- **Client-Side Hydration**: Interactive components (`CatalogGrid`, `CatalogItem`) hydrate on the client to enable dynamic features.
- **Real-Time Updates**: Implemented using Server-Sent Events (SSE) via a dedicated `/api/events` endpoint on the backend. This avoids polling overhead and ensures immediate content availability.
- **Lazy Loading**: Native Next.js `Image` component handles lazy loading and optimization of media assets.

## 2. API Contracts

### `GET /api/catalog/posts`
- **Description**: Fetches the complete history of posts for the initial catalog view.
- **Response**:
  ```json
  {
    "success": true,
    "posts": [
      {
        "content": "string",
        "timestamp": "ISO8601 string",
        "ipfsHash": "string",
        "metadata": {
          "mediaUrl": "string (optional)",
          "title": "string (optional)",
          "price": "number (optional)"
        }
      }
    ]
  }
  ```

### `GET /api/events` (SSE)
- **Description**: Streaming endpoint for real-time updates.
- **Events**:
  - `new_post`: Emitted when a new post is created via the Unified Composer.
    - **Payload**: Same structure as a single post item above.

## 3. Testing Strategy

### Unit Testing
- **Tools**: Jest + React Testing Library
- **Focus**:
  - Component rendering (CatalogItem, Header).
  - Utility functions (currency conversion, date formatting).
  - Hook logic (SSE connection management).

### E2E Testing
- **Tools**: Cypress
- **Flows**:
  - User visits homepage -> Loads initial posts.
  - New post created on backend -> Appears in grid via SSE.
  - User filters posts -> Grid updates.
  - Responsive layout checks on mobile/desktop.

## 4. Performance Benchmarks (Targets)

- **Lighthouse Performance Score**: > 90
- **First Contentful Paint (FCP)**: < 1.5s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Time to Interactive (TTI)**: < 3.5s
- **Cumulative Layout Shift (CLS)**: < 0.1

### Optimizations
- **Image Optimization**: Using `next/image` for automatic WebP conversion and resizing.
- **Code Splitting**: Automatic per-route code splitting.
- **Font Optimization**: Using `next/font` to self-host and preload fonts.

## 5. Accessibility Audit Results (Target: WCAG 2.1 AA)

- **Color Contrast**: All text elements meet 4.5:1 ratio.
- **Keyboard Navigation**: All interactive elements (buttons, links) are focusable and have visible focus states.
- **Screen Readers**:
  - Images have `alt` text.
  - Semantic HTML (`main`, `header`, `nav`, `article`) used throughout.
  - ARIA labels used for icon-only buttons.

## 6. Analytics Implementation Details

- **Provider**: Google Analytics 4 (GA4) via `@next/third-parties/google`.
- **Events Tracked**:
  - `page_view`: Standard page tracking.
  - `view_item`: When a catalog item is viewed/hovered.
  - `add_to_cart`: Click on "Buy" buttons.
  - `purchase`: Successful transaction (mocked).
  - `filter_usage`: Interaction with search/filter controls.
