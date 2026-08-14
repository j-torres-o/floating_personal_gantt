import { ProjectsData } from '../../types/project';

/**
 * Descarga los proyectos en un archivo JSON plano local
 */
export function exportToJSON(data: ProjectsData, filename = 'floating-gantt-backup.json') {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Importa y valida un archivo JSON de proyectos
 */
export function importFromJSON(file: File): Promise<ProjectsData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = e.target?.result as string;
        const parsed = JSON.parse(raw);
        if (!parsed.projects || !Array.isArray(parsed.projects)) {
          throw new Error('Formato de archivo inválido. Falta el arreglo de proyectos.');
        }
        resolve(parsed as ProjectsData);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo.'));
    reader.readAsText(file);
  });
}

/**
 * Exporta la vista gráfica actual del Gantt a una imagen PNG
 */
export async function exportGanttToPNG(ganttElement: HTMLElement, projectName: string) {
  try {
    const width = ganttElement.scrollWidth || 1000;
    const height = ganttElement.scrollHeight || 600;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fondo oscuro glassmorphism
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, width, height);

    // Renderizar cabecera con título
    ctx.fillStyle = '#38BDF8';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText(`📊 ${projectName} - Floating Personal Gantt`, 20, 30);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px Outfit, sans-serif';
    ctx.fillText(`Exportado el ${new Date().toLocaleDateString('es-ES')}`, 20, 50);

    // Dibujar elementos de tareas si existen
    const taskBars = ganttElement.querySelectorAll('.gantt-task-bar');
    taskBars.forEach((el) => {
      const bar = el as HTMLElement;
      const x = bar.offsetLeft + 220; // offset de columna izquierda
      const y = bar.offsetTop + 70;
      const w = bar.offsetWidth;
      const h = bar.offsetHeight;
      const title = bar.querySelector('.task-title-text')?.textContent || bar.getAttribute('title') || '';
      const bg = bar.style.background || '#3B82F6';

      // Sombra
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 2, w, h, 6);
      ctx.fill();

      // Barra
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 6);
      ctx.fill();

      // Texto de la tarea
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '500 12px Outfit, sans-serif';
      ctx.fillText(title, x + 8, y + 18, w - 16);
    });

    // Descargar imagen generada
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}-gantt.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('Error al exportar a PNG:', err);
    alert('No se pudo generar la imagen PNG del diagrama.');
  }
}
