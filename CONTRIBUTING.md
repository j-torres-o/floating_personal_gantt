# Guía de Contribución (CONTRIBUTING)

¡Gracias por tu interés en contribuir a **Floating Personal Gantt**! Para mantener un código limpio, estructurado y de alta calidad, seguimos las siguientes directrices.

---

## 🧭 Flujo de Trabajo (Git Flow)

### 1. Convención de Ramas y Separación Estricta por Tipología
- **Regla Fundamental**: Cada rama y PR debe tener un **único propósito**. Nunca mezclar `fix/`, `feat/`, `refactor/` o `docs/` en un mismo branch/commit.
- `feat/nombre-funcionalidad`: Nuevas características.
- `fix/correccion-bug`: Corrección de errores reportados.
- `refactor/mejora-arquitectura`: Refactorización y reestructuración.
- `docs/documentacion`: Mejoras o adiciones a la documentación.
- `style/ajuste-visual`: Ajustes de estilo visual.
- `test/nuevas-pruebas`: Cobertura de pruebas unitarias.

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
