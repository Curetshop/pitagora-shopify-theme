# Solución para Esquemas de Color - Shopify Online Store 2.0

## Problema
Shopify mostraba una alerta roja indicando que era necesario definir esquemas de color en los archivos `settings_data.json` y `settings_schema.json` para obtener una vista previa de los cambios.

## Solución Implementada

### 1. Configuración de `settings_schema.json`
- ✅ Se configuró correctamente el `color_scheme_group` con todos los campos necesarios
- ✅ Se agregó la etiqueta "Color schemes" al grupo
- ✅ Se definieron todos los campos de color requeridos:
  - `colors_solid_button_labels`
  - `colors_accent_1`
  - `colors_accent_2`
  - `colors_text`
  - `colors_outline_button_labels`
  - `colors_background_1`
  - `colors_background_2`
  - `gradient_accent_1`
  - `gradient_accent_2`
  - `gradient_background_1`
  - `gradient_background_2`

### 2. Configuración de `settings_data.json`
- ✅ Se agregaron nombres descriptivos a todos los esquemas de color
- ✅ Se configuró el esquema de color por defecto: `"color_schemes": "background-1"`
- ✅ Se definieron 5 esquemas de color:
  - `background-1` (Background 1)
  - `background-2` (Background 2)
  - `accent-1` (Accent 1)
  - `accent-2` (Accent 2)
  - `inverse` (Inverse)
  - `accent-3` (Accent 3) - Nuevo esquema agregado

### 3. Actualización de `snippets/css-variables.liquid`
- ✅ Se actualizaron las variables de color para usar las variables estándar de Shopify Online Store 2.0
- ✅ Se agregaron todas las variables CSS necesarias para los esquemas de color
- ✅ Se incluyeron variables para gradientes, botones, inputs, cards, etc.
- ✅ Se mantuvieron las variables personalizadas para compatibilidad

### 4. Variables CSS Agregadas
```css
/* Shopify Online Store 2.0 Color Scheme Variables */
--color-base-text: {{ settings.colors_text.red }}, {{ settings.colors_text.green }}, {{ settings.colors_text.blue }};
--color-base-background-1: {{ settings.colors_background_1.red }}, {{ settings.colors_background_1.green }}, {{ settings.colors_background_1.blue }};
--color-base-background-2: {{ settings.colors_background_2.red }}, {{ settings.colors_background_2.green }}, {{ settings.colors_background_2.blue }};
--color-base-solid-button-labels: {{ settings.colors_solid_button_labels.red }}, {{ settings.colors_solid_button_labels.green }}, {{ settings.colors_solid_button_labels.blue }};
--color-base-accent-1: {{ settings.colors_accent_1.red }}, {{ settings.colors_accent_1.green }}, {{ settings.colors_accent_1.blue }};
--color-base-accent-2: {{ settings.colors_accent_2.red }}, {{ settings.colors_accent_2.green }}, {{ settings.colors_accent_2.blue }};
--color-base-outline-button-labels: {{ settings.colors_outline_button_labels.red }}, {{ settings.colors_outline_button_labels.green }}, {{ settings.colors_outline_button_labels.blue }};
```

### 5. Esquemas de Color Definidos

#### Background 1 (Por defecto)
- Fondo principal: #ffffff
- Fondo secundario: #f3f3f3
- Texto: #121212
- Acentos: #121212, #334fb4

#### Background 2
- Fondo principal: #f3f3f3
- Fondo secundario: #ffffff
- Texto: #121212
- Acentos: #334fb4, #121212

#### Inverse
- Fondo principal: #121212
- Fondo secundario: #1f2937
- Texto: #ffffff
- Acentos: #ffffff, #e11d48

#### Accent 1
- Fondo principal: #121212
- Fondo secundario: #334fb4
- Texto: #ffffff
- Acentos: #121212, #334fb4

#### Accent 2
- Fondo principal: #334fb4
- Fondo secundario: #121212
- Texto: #ffffff
- Acentos: #334fb4, #121212

#### Accent 3 (Nuevo)
- Fondo principal: #e11d48
- Fondo secundario: #121212
- Texto: #ffffff
- Acentos: #e11d48, #121212

## Verificación
Para verificar que los esquemas de color estén funcionando correctamente:

1. **En el editor de temas de Shopify:**
   - Ve a "Personalizar" en tu tema
   - Verifica que no aparezca la alerta roja sobre esquemas de color
   - Confirma que puedes cambiar entre diferentes esquemas de color
   - Verifica que los cambios se reflejen en la vista previa

2. **En el código:**
   - Los archivos `settings_schema.json` y `settings_data.json` deben estar sincronizados
   - El archivo `snippets/css-variables.liquid` debe contener todas las variables necesarias
   - Las secciones del tema deben usar las variables CSS correctas

## Notas Importantes
- Los esquemas de color son fundamentales para Online Store 2.0
- Cada esquema debe tener valores únicos para todos los campos de color
- Las variables CSS deben usar el formato RGB para mejor compatibilidad
- Los gradientes son opcionales pero recomendados para mayor flexibilidad

## Archivos Modificados
- `config/settings_schema.json`
- `config/settings_data.json`
- `snippets/css-variables.liquid`
- `config/theme-requirements.json` (nuevo)
- `COLOR_SCHEMES_FIX.md` (nuevo)

Esta solución asegura que el tema Pitagora esté completamente compatible con Shopify Online Store 2.0 y que los esquemas de color funcionen correctamente en el editor de temas. 