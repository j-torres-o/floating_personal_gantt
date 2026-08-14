# Guía de Contribución (CONTRIBUTING)

¡Gracias por tu interés en contribuir a **Floating Personal Gantt**! Para mantener un código limpio, estructurado y de alta calidad, seguimos las siguientes directrices.

---

## 🧭 Flujo de Trabajo (Git Flow)

1. **Crear una Rama de Trabajo**:
   - Para nuevas funcionalidades: `git checkout -b feat/nombre-funcionalidad`
   - Para corrección de errores: `git checkout -b fix/descripcion-del-bug`
   - Para refactorizaciones: `git checkout -b refactor/mejora`

2. **Convención de Commits (Conventional Commits)**:
   - Formato requerido: `<tipo>(<alcance opcional>): <descripción>`
   - Ejemplos:
     - `feat(gantt): add drag and drop task resizing`
     - `fix(tray): restore interactive window from ghost mode`
     - `docs(architecture): update data model schema`
     - `test(storage): add auto-save unit tests`

3. **Verificación Local Obligatoria antes de Push**:
   ```powershell
   npm run lint
   npm run typecheck
   npm test
   ```

4. **Creación de Pull Requests (PR)**:
   - Abrir el PR hacia la rama `main` utilizando la plantilla predefinida en `.github/PULL_REQUEST_TEMPLATE.md`.
   - Asegurarse de que todos los checks de CI pasen con éxito.
   - Solicitar revisión y resolver comentarios.

---

## 🏷️ Política de Versionamiento

- Todas las contribuciones que introduzcan cambios funcionales o correcciones deben reflejarse en un incremento de versión en `package.json` siguiendo **SemVer**.
