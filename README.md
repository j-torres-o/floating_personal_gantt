# 📊 Floating Personal Gantt

[![CI Workflow](https://github.com/j-torres-o/floating_personal_gantt/actions/workflows/ci.yml/badge.svg)](https://github.com/j-torres-o/floating_personal_gantt/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows-0078D6.svg?logo=windows)](https://www.microsoft.com/windows)
[![Version](https://img.shields.io/badge/Version-0.1.1-emerald.svg)](package.json)

> **Floating Personal Gantt** es una aplicación de escritorio ultraligera, moderna y compacta para Windows diseñada para la planificación visual de tareas a mediano plazo mediante diagramas de Gantt interactivos con modo flotante (*Always-on-Top*), transparencias dinámicas y widget HUD colapsable.

---

## ✨ Características Principales

- 🪟 **Ventana Flotante y Always-on-Top**: Se mantiene siempre visible sobre tus programas con control de opacidad graduable.
- 👻 **Modo Click-Through (Fantasma)**: Permite que los clics del mouse atraviesen la ventana para monitorear el Gantt mientras trabajas en otras aplicaciones sin interferencias. Reactivación rápida desde la **Bandeja del Sistema (System Tray)**.
- 🧊 **Estética Glassmorphism / Frosted Glass**: Diseño translúcido con desenfoque de fondo moderno, compatible con temas Claro y Oscuro.
- ⏱️ **Mini-Barra HUD con Carrusel**: Modo colapsable ultra-compacto que muestra las tareas activas del día y sus días restantes con rotación visual.
- 📊 **Gantt Interactivo Drag & Drop**: Arrastra barras para desplazar fechas y estira los extremos laterales para ajustar la duración con snapping automático a días/semanas/meses.
- 🏷️ **Estados Visuales de Tareas**:
  - **Pendiente**: Borde punteado.
  - **En curso**: Animación de pulso sutil constante.
  - **Finalizada**: Texto tachado y opacidad atenuada.
  - **Vencida**: Alerta roja sutil pulsante si superó la fecha límite sin finalizar.
- 📁 **Gestión Multi-Proyecto**: Cambio rápido entre múltiples proyectos independientes.
- 💾 **Persistencia Desacoplada con Auto-Save**: Configuración (`config.json`) y datos de proyectos (`projects.json`) guardados instantáneamente en local de forma separada.
- 🖼️ **Exportación**: Respaldo completo en JSON y exportación directa de la vista gráfica a imagen PNG.
- 🚀 **Inicio con Windows**: Opción para iniciar automáticamente minimizado o en modo HUD al encender la PC.

---

## 🏗️ Arquitectura y Diseño

Para ver la especificación técnica completa y los diagramas arquitectónicos de estados y flujos, consulta:
👉 **[Documento de Arquitectura (docs/architecture.md)](docs/architecture.md)**

```
                  ┌─────────────────────────────────────────┐
                  │          Floating Personal Gantt        │
                  ├────────────────────┬────────────────────┤
                  │   Vista Expandida  │    Mini-Barra HUD  │
                  │   (Gantt Completo) │   (Carrusel de Día)│
                  └─────────┬──────────┴──────────┬─────────┘
                            │                     │
                            ▼                     ▼
                  ┌─────────────────────────────────────────┐
                  │    Runtime de Escritorio & System Tray  │
                  │    - Transparencia & Always-on-Top      │
                  │    - Click-Through (Modo Fantasma)      │
                  └────────────────────┬────────────────────┘
                                       │
                        ┌──────────────┴──────────────┐
                        ▼                             ▼
                 [ config.json ]              [ projects.json ]
                 (Ajustes/Ventana)            (Proyectos/Tareas)
```

---

## 🚀 Inicio Rápido para Desarrollo

### Requisitos Previos
- [Node.js](https://nodejs.org/) (versión 18 o superior)
- Windows 10/11

### Instalación
```powershell
# Clonar el repositorio
git clone https://github.com/j-torres-o/floating_personal_gantt.git
cd floating_personal_gantt

# Instalar dependencias
npm install

# Iniciar la aplicación en modo desarrollo
npm run dev
```

---

## 🧪 Pruebas y Validación de Calidad

```powershell
# Ejecutar linters
npm run lint

# Comprobación de tipos TypeScript
npm run typecheck

# Ejecutar pruebas unitarias
npm test
```

---

## 📦 Generar Ejecutable para Windows

Para generar el instalador / ejecutable portable:
```powershell
.\scripts\build_exe.ps1
```

---

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor revisa [CONTRIBUTING.md](CONTRIBUTING.md) y [AGENTS.md](AGENTS.md) antes de enviar un Pull Request.

---

## 📄 Licencia

Este proyecto está distribuido bajo los términos de la Licencia MIT. Consulta el archivo [LICENSE](LICENSE) para más detalles.
