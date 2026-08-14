# AGENTS.md

Guía de desarrollo, arquitectura y reglas operativas para agentes de IA que contribuyen en la base de código de **Floating Personal Gantt**.

---

## 🚀 Comandos de Construcción y Prueba

### Instalar Dependencias
```powershell
npm install
```

### Ejecutar en Modo Desarrollo (Hot Reload)
```powershell
npm run dev
```

### Ejecutar Linters y Verificación de Tipos
```powershell
npm run lint
npm run typecheck
```

### Ejecutar Pruebas Unitarias
```powershell
npm test
```

### Compilar y Empaquetar Ejecutable para Windows
```powershell
npm run build
npm run package:win
# O mediante el script:
.\scripts\build_exe.ps1
```

---

## 🏛️ Reglas Arquitectónicas y de Flujo de Trabajo

1. **Privacidad y Persistencia Local**:
   - Toda la información reside en local dentro de `%APPDATA%/floating-personal-gantt/`.
   - La persistencia está desacoplada: `config.json` (preferencias/ventana) y `projects.json` (datos de proyectos/tareas).
   - Nunca incluir telemetría ni llamadas externas innecesarias.

2. **Rendimiento y Ligereza Visual**:
   - Renderizado optimizado a 60 FPS con aceleración por hardware.
   - Efectos translúcidos vía CSS Glassmorphism y control de eventos del cursor nativo (`setIgnoreMouseEvents`).

3. **Fuente Única de Verdad de Versión**:
   - La versión reside en `package.json`.
   - Seguir estrictamente el estándar **Semantic Versioning** (`MAJOR.MINOR.PATCH`).

4. **Flujo de Git y Manejo de Ramas (Git Flow)**:
   - **NUNCA realizar commits directamente sobre la rama `main`**.
   - Crear ramas descriptivas: `feat/nombre-funcionalidad`, `fix/correccion-bug`, `refactor/mejora-arquitectura`.
   - Mensajes de commit bajo el estándar **Conventional Commits**:
     - `feat: ...` (nuevas características)
     - `fix: ...` (corrección de errores)
     - `docs: ...` (documentación)
     - `refactor: ...` (refactorización sin cambio funcional)
     - `style: ...` (estilos, formateo)
     - `test: ...` (pruebas unitarias)
     - `ci: ...` (workflows y automatización)
     - `build: ...` (sistema de empaquetado o dependencias)

5. **Regla de Versionamiento Obligatoria (SemVer & GitHub Releases)**:
   - Todo cambio o Pull Request DEBE actualizar la versión en `package.json` antes de fusionar a `main`:
     - **Corrección de errores (`fix:`)**: Incrementar versión `PATCH` (ej. `v0.1.0` -> `v0.1.1`).
     - **Nueva funcionalidad (`feat:`)**: Incrementar versión `MINOR` (ej. `v0.1.x` -> `v0.2.0`).
     - **Cambio mayor o de compatibilidad (`BREAKING CHANGE`)**: Incrementar versión `MAJOR` (ej. `v1.0.0`).
   - Tras fusionar un PR a `main`, se debe etiquetar y publicar la **Release Oficial en GitHub** con las notas de versión correspondientes.
