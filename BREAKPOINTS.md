# Standardized Breakpoint System - Pitagora Theme

## Overview
The Pitagora theme uses a standardized, mobile-first breakpoint system to ensure consistent responsive design across all components.

## Breakpoint Values

| Name | Variable | Value | Device Type |
|------|----------|-------|-------------|
| XS   | `--breakpoint-xs` | 480px | Extra small devices (phones) |
| SM   | `--breakpoint-sm` | 640px | Small devices (large phones) |
| MD   | `--breakpoint-md` | 768px | Medium devices (tablets) |
| LG   | `--breakpoint-lg` | 1024px | Large devices (laptops) |
| XL   | `--breakpoint-xl` | 1200px | Extra large devices (desktops) |
| 2XL  | `--breakpoint-2xl` | 1400px | 2X Extra large devices |

## Usage Guidelines

### 1. Use CSS Custom Properties
Always reference breakpoints through CSS custom properties instead of hardcoded values:

```css
/* ✅ Correct - Using CSS custom properties */
@media (min-width: var(--breakpoint-md)) {
  .component {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
  }
}

/* ❌ Incorrect - Hardcoded values */
@media (min-width: 768px) {
  .component {
    display: grid;
  }
}
```

### 2. Mobile-First Approach
Follow mobile-first design principles:

```css
/* Base styles (mobile) */
.card {
  width: 100%;
  padding: 1rem;
}

/* Tablet and up */
@media (min-width: var(--breakpoint-md)) {
  .card {
    width: 50%;
    padding: 2rem;
  }
}

/* Desktop and up */
@media (min-width: var(--breakpoint-lg)) {
  .card {
    width: 33.333%;
    padding: 3rem;
  }
}
```

### 3. Common Patterns

#### Responsive Grid
```css
.product-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr; /* Mobile: 1 column */
}

@media (min-width: var(--breakpoint-xs)) {
  .product-grid {
    grid-template-columns: repeat(2, 1fr); /* Small: 2 columns */
  }
}

@media (min-width: var(--breakpoint-md)) {
  .product-grid {
    grid-template-columns: repeat(3, 1fr); /* Tablet: 3 columns */
  }
}

@media (min-width: var(--breakpoint-lg)) {
  .product-grid {
    grid-template-columns: repeat(4, 1fr); /* Desktop: 4 columns */
  }
}
```

#### Navigation Menu
```css
.nav-menu {
  display: none; /* Hidden on mobile */
}

@media (min-width: var(--breakpoint-md)) {
  .nav-menu {
    display: flex; /* Visible on tablet+ */
  }
}

.mobile-menu {
  display: block; /* Visible on mobile */
}

@media (min-width: var(--breakpoint-md)) {
  .mobile-menu {
    display: none; /* Hidden on tablet+ */
  }
}
```

#### Typography Scaling
```css
.heading {
  font-size: 1.5rem; /* Mobile */
}

@media (min-width: var(--breakpoint-md)) {
  .heading {
    font-size: 2rem; /* Tablet */
  }
}

@media (min-width: var(--breakpoint-lg)) {
  .heading {
    font-size: 2.5rem; /* Desktop */
  }
}
```

### 4. Container Queries (Future-Proof)
For modern browsers supporting container queries, you can also use:

```css
@container (min-width: var(--breakpoint-md)) {
  .card {
    display: flex;
    align-items: center;
  }
}
```

## JavaScript Integration

Access breakpoints in JavaScript through CSS custom properties:

```javascript
// Get breakpoint value
const mdBreakpoint = getComputedStyle(document.documentElement)
  .getPropertyValue('--breakpoint-md')
  .trim();

// Create media query
const mediaQuery = window.matchMedia(`(min-width: ${mdBreakpoint})`);

// Listen for changes
mediaQuery.addEventListener('change', (e) => {
  if (e.matches) {
    // Tablet+ view
    console.log('Switched to tablet+ view');
  } else {
    // Mobile view
    console.log('Switched to mobile view');
  }
});
```

## Migration Guide

### For Existing Components
1. Identify all hardcoded breakpoint values
2. Replace with CSS custom properties
3. Ensure mobile-first approach
4. Test across all breakpoints

### Common Breakpoint Replacements
- `480px` → `var(--breakpoint-xs)`
- `640px` → `var(--breakpoint-sm)`
- `767px` → `calc(var(--breakpoint-md) - 1px)` (for max-width)
- `768px` → `var(--breakpoint-md)`
- `990px` → Use `var(--breakpoint-lg)` instead
- `1024px` → `var(--breakpoint-lg)`
- `1200px` → `var(--breakpoint-xl)`
- `1400px` → `var(--breakpoint-2xl)`

## Testing Checklist

When implementing responsive design:

- [ ] Test at 320px (smallest mobile)
- [ ] Test at 479px (just before XS breakpoint)
- [ ] Test at 480px (XS breakpoint)
- [ ] Test at 639px (just before SM breakpoint)
- [ ] Test at 640px (SM breakpoint)
- [ ] Test at 767px (just before MD breakpoint)
- [ ] Test at 768px (MD breakpoint)
- [ ] Test at 1023px (just before LG breakpoint)
- [ ] Test at 1024px (LG breakpoint)
- [ ] Test at 1199px (just before XL breakpoint)
- [ ] Test at 1200px (XL breakpoint)
- [ ] Test at 1399px (just before 2XL breakpoint)
- [ ] Test at 1400px+ (2XL breakpoint)

## Performance Considerations

- Use `min-width` media queries for better performance (mobile-first)
- Avoid excessive nesting of media queries
- Group related styles within media queries
- Consider using `@supports` for feature detection alongside breakpoints

## Documentation Standards

When creating new components, document the responsive behavior:

```css
/**
 * Product Card Component
 * 
 * Responsive behavior:
 * - Mobile (< 480px): Full width, stacked layout
 * - Small (480px+): 2-column grid
 * - Medium (768px+): 3-column grid  
 * - Large (1024px+): 4-column grid
 * - Extra Large (1200px+): 5-column grid
 */
.product-card {
  /* Component styles */
}
```

This standardized system ensures consistency, maintainability, and a better user experience across all devices.