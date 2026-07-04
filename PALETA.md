# 🎨 Paleta de Colores - Cafetería CAM 15

**Tema:** Cafetería cálida, acogedora y accesible (WCAG AA+ compliant, colorblind-safe)

## 🌈 Colores Principales

| Color | Código | Hex | Uso |
|-------|--------|-----|-----|
| 🤍 **Fondo** | `--background` | `#FAF7F2` | Fondo principal (crema cálido) |
| ☕ **Principal** | `--primary-azul` | `#0F4C5C` | Headers, botones primarios, elementos clave |
| 🌿 **Secundario** | `--primary-verde` | `#2A7F62` | Elementos secundarios, éxito |
| 🌾 **Acentos** | `--primary-mostaza` | `#C69214` | Highlights, llamadas a acción |
| 🖤 **Texto** | `--foreground` | `#222222` | Texto principal (gris casi negro) |
| 💬 **Texto Secundario** | `--text-secondary` | `#4B5563` | Texto secundario (gris oscuro) |

## 📋 Colores de Estado

| Estado | Hex | Tailwind |
|--------|-----|----------|
| ✅ **Éxito** | `#2E7D32` | `--success` |
| ⚠️ **Advertencia** | `#C69214` | `--warning` |
| ❌ **Error** | `#B3261E` | `--danger` |

## 🎯 Colores Secundarios (Soporte Tailwind)

| Tipo | Hex | Variable |
|------|-----|----------|
| Fondo Secundario | `#F1F3F4` | `--bg-secondary` |
| Gris Oscuro | `#222222` | `--primary-gris-oscuro` |
| Gris Claro | `#F1F3F4` | `--primary-gris-claro` |
| Crema | `#FAF7F2` | `--primary-crema` |
| Sand | `#FAF7F2` | `--accent-sand` |
| Tan | `#C69214` | `--accent-tan` |

## 🔍 Aplicación en el UI

### Header y Navegación
- Background: `#0F4C5C` (azul petróleo)
- Texto: Blanco (#FFFFFF)
- Hover: `#0D3A47` (azul petróleo oscuro)

### Botones Primarios
- Background: `#0F4C5C` (azul petróleo)
- Hover: `#0D3A47` (azul petróleo oscuro)
- Texto: Blanco

### Botones Secundarios
- Background: `#2A7F62` (verde azulado)
- Hover: Más oscuro del verde
- Texto: Blanco

### Acentos y Destaque
- Color: `#C69214` (mostaza suave)
- Uso: Focus rings, detalles, callouts

### Fondos
- Primario: `#FAF7F2` (crema cálido)
- Secundario: `#F1F3F4` (gris muy claro)

## ♿ Características de Accesibilidad

✅ **WCAG AA+ Compliant**: Contraste mínimo 4.5:1
✅ **Colorblind Safe**: Paleta diseñada sin rojo-verde o azul-amarillo confusos
✅ **Sin Gradientes**: Colores sólidos únicamente (evita fatiga visual)
✅ **Focus Rings**: 4px sólidos en azul petróleo con offset
✅ **Touch Targets**: Mínimo 44px × 44px para elementos interactivos

## 📦 Cómo Usar en el Código

### CSS Variables (Recomendado)
```css
background-color: var(--background);
color: var(--foreground);
background-color: var(--primary-azul);
```

### Tailwind Classes
```tsx
className="bg-blue-900 text-blue-900 border-emerald-700"
```

### Valores Directos
```tsx
style={{ backgroundColor: '#0F4C5C' }}
```

## 📍 Archivos Configurados

- ✅ `frontend/app/globals.css` - Variables CSS centralizadas
- ✅ `frontend/components/Navigation.tsx` - Header/navegación
- ✅ `frontend/app/page.tsx` - Dashboard principal
- ✅ `frontend/app/ventas/page.tsx` - Página de ventas
- ✅ `frontend/app/login/page.tsx` - Página de login
- ✅ `frontend/app/cajas/page.tsx` - Gestión de cajas
- ✅ `frontend/app/productos/page.tsx` - Gestión de productos
- ✅ `frontend/app/recibos/page.tsx` - Historial de recibos
- ✅ `frontend/app/deudores/page.tsx` - Gestión de deudores
- ✅ `frontend/app/caja/page.tsx` - Operaciones de caja
- ✅ `frontend/app/monedas/page.tsx` - Selector de monedas

---

**Última actualización:** 2026-07-04
**Estado:** ✅ Implementada en todas las páginas
