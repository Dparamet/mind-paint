import type { EditorDocument, SavedProject } from '../types/editor';

export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

export function downloadJson(project: SavedProject) {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${project.name.replace(/\s+/g, '-').toLowerCase() || 'mind-paint'}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadPdfFromDataUrl(dataUrl: string, filename: string) {
  const imageBytes = atob(dataUrl.split(',')[1]);
  const imageObject = `<< /Type /XObject /Subtype /Image /Width 1200 /Height 800 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n${imageBytes}\nendstream`;
  const content = 'q 595 0 0 397 0 99 cm /Im0 Do Q';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 595] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>',
    imageObject,
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  const bytes = Uint8Array.from(pdf, (char) => char.charCodeAt(0) & 0xff);
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function readJsonFile(file: File): Promise<SavedProject> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        resolve(validateImportedProject(parsed));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function validateImportedProject(value: unknown): SavedProject {
  const project = value as Partial<SavedProject>;
  if (!project || typeof project !== 'object') {
    throw new Error('Invalid project JSON');
  }
  if (!Array.isArray(project.layers) || !Array.isArray(project.elements)) {
    throw new Error('Project JSON must include layers and elements');
  }
  const now = Date.now();
  return {
    id: typeof project.id === 'string' ? project.id : crypto.randomUUID(),
    name: typeof project.name === 'string' ? project.name : 'Imported project',
    width: typeof project.width === 'number' ? project.width : 1600,
    height: typeof project.height === 'number' ? project.height : 1000,
    layers: project.layers as EditorDocument['layers'],
    elements: project.elements as EditorDocument['elements'],
    createdAt: typeof project.createdAt === 'number' ? project.createdAt : now,
    updatedAt: now,
  };
}
