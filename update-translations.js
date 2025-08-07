#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Ruta al archivo de traducciones
const translationsFile = path.join(__dirname, 'locales', 'es.default.json');

// Traducciones críticas faltantes
const criticalTranslations = {
  "products": {
    "product": {
      "coming_soon": "Próximamente",
      "add_to_wishlist": "Añadir a favoritos",
      "quick_add_to_cart": "Añadir rápidamente al carrito",
      "color_swatch_label": "Color: {{ color }}",
      "media": {
        "zoom_image": "Ampliar imagen",
        "play_video": "Reproducir video",
        "load_model": "Cargar modelo 3D",
        "video_alt": "Video: {{ title }}",
        "load_image": "Cargar imagen {{ index }}"
      },
      "view_in_space_label": "Ver en espacio 3D",
      "view_in_space": "Ver en espacio 3D",
      "quantity": {
        "label": "Cantidad",
        "decrease": "Reducir cantidad de {{ product }}",
        "increase": "Aumentar cantidad de {{ product }}"
      },
      "next_incoming_date": "Próximo envío: {{ date }}",
      "notify_when_available": "Notificarme cuando esté disponible",
      "price": {
        "from_price_html": "Desde {{ price }}"
      },
      "shipping_policy_html": "Envío calculado en el <a href=\"{{ link }}\">checkout</a>",
      "taxes_included_and_shipping_policy_html": "Impuestos incluidos. <a href=\"{{ link }}\">Envío</a> calculado en el checkout"
    }
  },
  "collections": {
    "filters": {
      "remove_filter": "Eliminar filtro {{ filter }}: {{ value }}",
      "price_from": "Precio desde",
      "price_to": "Precio hasta",
      "clear_price": "Limpiar precio",
      "search_placeholder": "Buscar en {{ filter }}",
      "show_more": "Mostrar más",
      "show_less": "Mostrar menos"
    },
    "general": {
      "products_count": "{{ count }} productos",
      "no_products": "No hay productos",
      "no_products_message": "No se encontraron productos que coincidan con los filtros aplicados",
      "empty": "Colección vacía",
      "empty_message": "Esta colección no tiene productos",
      "browse_all": "Explorar todos los productos",
      "load_more": "Cargar más",
      "loading": "Cargando...",
      "filter_and_sort": "Filtrar y ordenar",
      "no_products_html": "No se encontraron productos. <a href=\"/collections/all\">Ver todos los productos</a>",
      "items": "artículos"
    },
    "sorting": {
      "options": {
        "manual": "Destacados",
        "best_selling": "Más vendidos",
        "title_ascending": "Alfabéticamente, A-Z",
        "title_descending": "Alfabéticamente, Z-A",
        "price_ascending": "Precio, menor a mayor",
        "price_descending": "Precio, mayor a menor",
        "created_descending": "Fecha, nueva a antigua",
        "created_ascending": "Fecha, antigua a nueva"
      }
    },
    "view": {
      "grid": "Vista de cuadrícula",
      "list": "Vista de lista"
    }
  },
  "general": {
    "search": {
      "title": "Buscar",
      "placeholder": "Buscar productos...",
      "search": "Buscar",
      "submit": "Enviar búsqueda",
      "loading": "Buscando..."
    },
    "instagram": {
      "loading": "Cargando publicaciones de Instagram...",
      "demo_caption": "Publicación de ejemplo {{ number }}",
      "view_post": "Ver publicación en Instagram",
      "learn_more": "Aprender más",
      "error_title": "Error al cargar Instagram",
      "follow_us": "Síguenos en Instagram @{{ username }}"
    },
    "newsletter": {
      "name": "Nombre",
      "name_placeholder": "Tu nombre",
      "email": "Email",
      "email_placeholder": "Tu email",
      "submitting": "Enviando..."
    },
    "continue_shopping": "Continuar comprando"
  },
  "templates": {
    "404": {
      "title": "Página no encontrada",
      "subtext": "La página que buscas no existe",
      "go_back": "Volver atrás",
      "popular_links": "Enlaces populares",
      "browse_collections": "Explora nuestras colecciones",
      "search_products": "Busca productos específicos",
      "read_blog": "Lee nuestro blog",
      "account_access": "Accede a tu cuenta"
    }
  },
  "sections": {
    "cart": {
      "empty_description": "Tu carrito está vacío. ¡Agrega algunos productos para comenzar!"
    },
    "header": {
      "blog": "Blog"
    }
  }
};

// Función para fusionar objetos de forma recursiva
function mergeDeep(target, source) {
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key]) {
        target[key] = {};
      }
      mergeDeep(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

// Función principal
function updateTranslations() {
  try {
    // Leer el archivo actual
    let currentContent = fs.readFileSync(translationsFile, 'utf8');
    
    // Remover comentarios del inicio del archivo si existen
    const jsonStartIndex = currentContent.indexOf('{');
    if (jsonStartIndex > 0) {
      currentContent = currentContent.substring(jsonStartIndex);
    }
    
    const currentTranslations = JSON.parse(currentContent);
    
    // Crear backup con el contenido original
    const originalContent = fs.readFileSync(translationsFile, 'utf8');
    const backupFile = translationsFile.replace('.json', '.backup.json');
    fs.writeFileSync(backupFile, originalContent);
    console.log(`✅ Backup creado: ${backupFile}`);
    
    // Fusionar las traducciones
    const updatedTranslations = mergeDeep(currentTranslations, criticalTranslations);
    
    // Escribir el archivo actualizado preservando los comentarios
    const updatedJSON = JSON.stringify(updatedTranslations, null, 2);
    const header = `/*
 * ------------------------------------------------------------
 * IMPORTANT: The contents of this file are auto-generated.
 *
 * This file may be updated by the Shopify admin language editor
 * or related systems. Please exercise caution as any changes
 * made to this file may be overwritten.
 * ------------------------------------------------------------
 */
`;
    const updatedContent = header + updatedJSON;
    fs.writeFileSync(translationsFile, updatedContent);
    
    console.log('✅ Traducciones actualizadas exitosamente');
    console.log(`📝 Archivo actualizado: ${translationsFile}`);
    console.log(`📊 Traducciones agregadas: ${Object.keys(criticalTranslations).length} secciones principales`);
    
    // Mostrar estadísticas
    const addedKeys = countKeys(criticalTranslations);
    console.log(`🔢 Total de claves agregadas: ${addedKeys}`);
    
  } catch (error) {
    console.error('❌ Error al actualizar traducciones:', error.message);
    process.exit(1);
  }
}

// Función para contar claves en un objeto
function countKeys(obj) {
  let count = 0;
  for (const key in obj) {
    if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      count += countKeys(obj[key]);
    } else {
      count++;
    }
  }
  return count;
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  console.log('🔄 Actualizando traducciones del tema Pitagora...\n');
  updateTranslations();
  console.log('\n🎉 ¡Proceso completado!');
  console.log('\n📋 Próximos pasos:');
  console.log('1. Revisar el archivo locales/es.default.json');
  console.log('2. Probar el tema en modo desarrollo');
  console.log('3. Verificar que no aparezcan errores de "Translation missing"');
}

module.exports = { updateTranslations, criticalTranslations }; 