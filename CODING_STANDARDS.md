# 🎯 PITAGORA THEME - CODING STANDARDS

## 📋 **GENERAL PRINCIPLES**

### 1. **Consistency First**
- All similar functionality should follow the same patterns
- Use established conventions throughout the codebase
- Maintain consistent naming conventions

### 2. **Security by Default**
- Always sanitize user input
- Use safe DOM manipulation methods
- Validate all data before processing

### 3. **Performance Optimized**
- Minimize DOM queries
- Use efficient selectors
- Implement proper caching strategies

## 🎨 **CSS STANDARDS**

### **Variables System**
```css
/* ✅ CORRECT - Use CSS custom properties */
:root {
  --color-primary: #3b82f6;
  --color-primary-rgb: 59, 130, 246;
  --spacing-md: 1rem;
}

.button {
  background-color: var(--color-primary);
  padding: var(--spacing-md);
}

/* ❌ INCORRECT - Hardcoded values */
.button {
  background-color: #3b82f6;
  padding: 1rem;
}
```

### **Breakpoints**
```css
/* ✅ CORRECT - Use unified breakpoints */
@media (min-width: 768px) { /* Tablet */ }
@media (min-width: 1024px) { /* Desktop */ }
@media (min-width: 1200px) { /* Large Desktop */ }

/* ❌ INCORRECT - Inconsistent breakpoints */
@media (max-width: 767px) { /* Mobile */ }
@media (min-width: 768px) and (max-width: 1023px) { /* Tablet */ }
```

### **Naming Conventions**
```css
/* ✅ CORRECT - BEM methodology */
.product-card__image
.product-card__title
.product-card--featured

/* ❌ INCORRECT - Inconsistent naming */
.productCardImage
.product-card-title
.productCardFeatured
```

## 🔧 **JAVASCRIPT STANDARDS**

### **Error Handling**
```javascript
// ✅ CORRECT - Use unified error handling
try {
  const result = await fetch('/api/data');
  if (!result.ok) throw new Error('API Error');
  return await result.json();
} catch (error) {
  PitagoraTheme.errors.handle(error, 'fetchData');
}

// ❌ INCORRECT - Inconsistent error handling
try {
  const result = await fetch('/api/data');
  return await result.json();
} catch (error) {
  console.error('Error:', error);
}
```

### **DOM Manipulation**
```javascript
// ✅ CORRECT - Use safe DOM methods
PitagoraTheme.security.setInnerHTML(element, html);
element.textContent = userInput;

// ❌ INCORRECT - Unsafe DOM manipulation
element.innerHTML = userInput;
element.innerHTML = `<div>${userInput}</div>`;
```

### **Event Handling**
```javascript
// ✅ CORRECT - Use event delegation
document.addEventListener('click', (e) => {
  if (e.target.matches('[data-action]')) {
    handleAction(e.target.dataset.action);
  }
});

// ❌ INCORRECT - Inline events
<button onclick="handleClick()">Click</button>
```

### **Component Architecture**
```javascript
// ✅ CORRECT - Use component system
class ProductCard extends PitagoraTheme.components.BaseComponent {
  init() {
    this.bindEvents();
  }
  
  bindEvents() {
    this.element.addEventListener('click', this.handleClick.bind(this));
  }
}

PitagoraTheme.components.register('product-card', ProductCard);

// ❌ INCORRECT - Direct DOM manipulation
document.querySelectorAll('.product-card').forEach(card => {
  card.addEventListener('click', () => {
    // Direct manipulation
  });
});
```

## 🏗️ **LIQUID TEMPLATE STANDARDS**

### **Variable Usage**
```liquid
<!-- ✅ CORRECT - Use theme settings -->
{{ settings.color_primary }}
{{ 'general.button.submit' | t }}

<!-- ❌ INCORRECT - Hardcoded values -->
#3b82f6
Submit
```

### **Conditional Logic**
```liquid
<!-- ✅ CORRECT - Clear conditions -->
{%- if product.available -%}
  <button class="button">Add to Cart</button>
{%- else -%}
  <button class="button button--disabled">Sold Out</button>
{%- endif -%}

<!-- ❌ INCORRECT - Complex nested conditions -->
{%- if product -%}
  {%- if product.available -%}
    {%- if product.variants.size > 1 -%}
      <!-- Complex nesting -->
    {%- endif -%}
  {%- endif -%}
{%- endif -%}
```

### **Performance**
```liquid
<!-- ✅ CORRECT - Efficient queries -->
{%- assign featured_products = collections.featured.products | limit: 4 -%}
{%- for product in featured_products -%}
  <!-- Product rendering -->
{%- endfor -%}

<!-- ❌ INCORRECT - Inefficient queries -->
{%- for product in collections.all.products -%}
  {%- if product.tags contains 'featured' -%}
    <!-- Product rendering -->
  {%- endif -%}
{%- endfor -%}
```

## 🔒 **SECURITY STANDARDS**

### **Input Sanitization**
```javascript
// ✅ CORRECT - Always sanitize
const safeInput = PitagoraTheme.security.sanitizeHTML(userInput);
element.textContent = userInput; // Safe for text content

// ❌ INCORRECT - Unsafe input
element.innerHTML = userInput;
```

### **URL Validation**
```javascript
// ✅ CORRECT - Validate URLs
if (PitagoraTheme.security.isValidURL(url)) {
  window.location.href = url;
}

// ❌ INCORRECT - Direct URL usage
window.location.href = userProvidedUrl;
```

### **CSRF Protection**
```liquid
<!-- ✅ CORRECT - Include CSRF token -->
<form action="{{ routes.cart_url }}" method="post">
  {{ 'authenticity_token' | form_authenticity_token }}
  <!-- Form fields -->
</form>
```

## 📊 **PERFORMANCE STANDARDS**

### **Asset Loading**
```liquid
<!-- ✅ CORRECT - Optimized loading -->
{{ 'app.css' | asset_url | stylesheet_tag: defer: 'defer' }}
<script src="{{ 'app.js' | asset_url }}" defer="defer"></script>

<!-- ❌ INCORRECT - Blocking loading -->
<link rel="stylesheet" href="{{ 'app.css' | asset_url }}">
<script src="{{ 'app.js' | asset_url }}"></script>
```

### **Image Optimization**
```liquid
<!-- ✅ CORRECT - Responsive images -->
<img 
  src="{{ image | image_url: width: 800 }}"
  srcset="{{ image | image_url: width: 400 }} 400w,
          {{ image | image_url: width: 800 }} 800w,
          {{ image | image_url: width: 1200 }} 1200w"
  sizes="(max-width: 768px) 100vw, 50vw"
  loading="lazy"
  alt="{{ image.alt | escape }}"
>

<!-- ❌ INCORRECT - Unoptimized images -->
<img src="{{ image | image_url }}" alt="Image">
```

## 🧪 **TESTING STANDARDS**

### **Code Quality**
- All JavaScript must pass ESLint
- All CSS must pass Stylelint
- All Liquid templates must be valid

### **Browser Support**
- Modern browsers (last 2 versions)
- Mobile-first responsive design
- Progressive enhancement

### **Accessibility**
- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader compatibility
- Color contrast ratios

## 📝 **DOCUMENTATION STANDARDS**

### **Code Comments**
```javascript
/**
 * Handles product form submission
 * @param {Event} event - Form submit event
 * @param {Object} options - Form options
 * @returns {Promise<Object>} Submission result
 */
async function handleProductSubmit(event, options = {}) {
  // Implementation
}
```

### **README Updates**
- Document all new features
- Update installation instructions
- Include breaking changes
- Provide migration guides

## 🔄 **DEPLOYMENT STANDARDS**

### **Version Control**
- Semantic versioning (MAJOR.MINOR.PATCH)
- Descriptive commit messages
- Feature branch workflow
- Pull request reviews

### **Quality Assurance**
- Code review required
- Automated testing
- Performance monitoring
- Security scanning

---

**Remember**: These standards ensure consistency, security, and maintainability across the entire Pitagora theme codebase. 