# Guía de Desarrollo Local (Development Guide)

Esta guía detalla el entorno de desarrollo, arquitectura de módulos y flujos de trabajo para desarrolladores de **Floating Personal Gantt**.

---

## 🛠️ Entorno de Desarrollo

### Stack Tecnológico
- **Lenguaje**: TypeScript 5+
- **Bundler & Dev Server**: Vite
- **UI Engine**: HTML5 Canvas / SVG / Vanilla CSS Glassmorphism
- **Runtime de Escritorio**: Desktop Frameless Engine con integración de System Tray y Win32 native hooks para click-through y transparencias.
- **Testing**: Vitest / Playwright

---

## 📂 Estructura del Código Fuente

```
src/
├── main/                  # Proceso principal del runtime de escritorio
│   ├── main.ts            # Creación de ventana, gestión de ciclo de vida e IPC
│   └── tray.ts            # Controlador de la bandeja del sistema y menús
├── renderer/              # Capa de presentación (UI Frontend)
│   ├── index.html         # Punto de entrada HTML
│   ├── index.css          # Tokens de diseño, Glassmorphism, temas claro/oscuro
│   ├── main.ts            # Inicialización del frontend y orquestación
│   ├── components/        # Componentes modulares
│   │   ├── TitleBar.ts    # Barra de título personalizada (arrastre, minimizar a HUD, cerrar)
│   │   ├── Toolbar.ts     # Filtros, buscador, opacidad, proyectos y zoom
│   │   ├── GanttChart.ts  # Motor de renderizado del diagrama de Gantt y Drag & Drop
│   │   ├── MiniWidget.ts  # Mini-barra HUD con carrusel de tareas activas
│   │   ├── TaskModal.ts   # Modal emergente para creación y edición de tareas
│   │   └── ContextMenu.ts # Menú contextual flotante para clic derecho en tareas
│   ├── services/          # Servicios y lógica de negocio
│   │   ├── storage.ts     # Persistencia desacoplada (config.json vs projects.json)
│   │   ├── exporter.ts    # Exportador a imagen PNG y export/import JSON
│   │   └── dateUtils.ts   # Utilidades de cálculo temporal y escalas
│   └── types/             # Definiciones de tipos TypeScript
│       ├── config.ts      # Tipos para la configuración del sistema
│       └── project.ts     # Tipos para proyectos, categorías y tareas
```

---

## 🔄 Flujo de Desarrollo

1. **Modo Desarrollo con Hot-Reload**:
   ```powershell
   npm run dev
   ```
2. **Validación de Código**:
   ```powershell
   npm run lint
   npm run typecheck
   npm test
   ```
3. **Compilación de Producción**:
   ```powershell
   npm run build
   ```
