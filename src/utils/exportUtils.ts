import type { CanvasElement, EditorDocument, Layer, SavedProject } from '../types/editor';

const MAX_PROJECT_FILE_BYTES = 25 * 1024 * 1024;
const MAX_LAYERS = 100;
const MAX_ELEMENTS = 5000;
const MAX_DATA_URL_LENGTH = 14 * 1024 * 1024;
const ELEMENT_TYPES = new Set([
  'line', 'arrow', 'rect', 'circle', 'polygon', 'star', 'text', 'image', 'sticky', 'mindNode', 'speech',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown, min = -1_000_000, max = 1_000_000): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

function isShortString(value: unknown, max = 500): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max;
}

function hasValidBase(element: Record<string, unknown>) {
  return isShortString(element.id, 200)
    && isShortString(element.layerId, 200)
    && typeof element.type === 'string'
    && ELEMENT_TYPES.has(element.type)
    && isFiniteNumber(element.x)
    && isFiniteNumber(element.y)
    && (element.comment === undefined || (typeof element.comment === 'string' && element.comment.length <= 10_000));
}

function hasPositiveSize(element: Record<string, unknown>) {
  return isFiniteNumber(element.width, 1, 100_000) && isFiniteNumber(element.height, 1, 100_000);
}

function isValidImportedElement(value: unknown): value is CanvasElement {
  if (!isRecord(value) || !hasValidBase(value)) return false;
  switch (value.type) {
    case 'line':
      return Array.isArray(value.points)
        && value.points.length >= 2
        && value.points.length <= 20_000
        && value.points.length % 2 === 0
        && value.points.every((point) => isFiniteNumber(point));
    case 'arrow':
      return Array.isArray(value.points)
        && value.points.length >= 4
        && value.points.length <= 20_000
        && value.points.length % 2 === 0
        && value.points.every((point) => isFiniteNumber(point))
        && isFiniteNumber(value.pointerLength, 1, 1000)
        && isFiniteNumber(value.pointerWidth, 1, 1000);
    case 'rect':
    case 'sticky':
    case 'mindNode':
    case 'speech':
      return hasPositiveSize(value)
        && (value.type === 'rect' || (typeof value.text === 'string' && value.text.length <= 100_000));
    case 'circle':
      return isFiniteNumber(value.radiusX, 1, 100_000) && isFiniteNumber(value.radiusY, 1, 100_000);
    case 'polygon':
      return Number.isInteger(value.sides) && isFiniteNumber(value.sides, 3, 64) && isFiniteNumber(value.radius, 1, 100_000);
    case 'star':
      return Number.isInteger(value.numPoints)
        && isFiniteNumber(value.numPoints, 2, 64)
        && isFiniteNumber(value.outerRadius, 1, 100_000)
        && isFiniteNumber(value.innerRadius, 1, 100_000);
    case 'text':
      return typeof value.text === 'string'
        && value.text.length <= 100_000
        && isFiniteNumber(value.width, 1, 100_000)
        && isFiniteNumber(value.fontSize, 1, 1000)
        && isShortString(value.fontFamily, 200);
    case 'image':
      return hasPositiveSize(value)
        && typeof value.src === 'string'
        && value.src.length <= MAX_DATA_URL_LENGTH
        && /^data:image\/(?:png|jpeg|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(value.src);
    default:
      return false;
  }
}

function isValidLayer(value: unknown): value is Layer {
  if (!isRecord(value)) return false;
  return isShortString(value.id, 200)
    && isShortString(value.name, 200)
    && typeof value.visible === 'boolean'
    && typeof value.locked === 'boolean';
}

export function downloadSvg(dataUrl: string, width: number, height: number, filename: string) {
  // ponytail: raster-in-SVG — true vector needs serialising each Konva shape
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><image href="${dataUrl}" width="${width}" height="${height}"/></svg>`;
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

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
  if (file.size > MAX_PROJECT_FILE_BYTES) {
    return Promise.reject(new Error('Project file is too large. Maximum size is 25 MB.'));
  }
  if (file.type && file.type !== 'application/json' && file.type !== 'text/json') {
    return Promise.reject(new Error('Unsupported project file type. Use JSON.'));
  }
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

export function validateImportedProject(value: unknown): SavedProject {
  if (!isRecord(value)) {
    throw new Error('Invalid project JSON');
  }
  const project = value as Record<string, unknown>;
  if (!Array.isArray(project.layers) || !Array.isArray(project.elements)) {
    throw new Error('Project JSON must include layers and elements');
  }
  if (project.layers.length < 1 || project.layers.length > MAX_LAYERS || !project.layers.every(isValidLayer)) {
    throw new Error('Project JSON contains invalid layers');
  }
  if (project.elements.length > MAX_ELEMENTS || !project.elements.every(isValidImportedElement)) {
    throw new Error('Project JSON contains an invalid element');
  }
  const layerIds = new Set(project.layers.map((layer) => layer.id));
  if (layerIds.size !== project.layers.length || project.elements.some((element) => !layerIds.has(element.layerId))) {
    throw new Error('Project JSON contains invalid layer references');
  }
  const elementIds = new Set(project.elements.map((element) => element.id));
  if (elementIds.size !== project.elements.length) {
    throw new Error('Project JSON contains duplicate element IDs');
  }
  if (!isFiniteNumber(project.width, 1, 10_000) || !isFiniteNumber(project.height, 1, 10_000)) {
    throw new Error('Project JSON contains invalid canvas dimensions');
  }
  const now = Date.now();
  return {
    id: isShortString(project.id, 200) ? project.id : crypto.randomUUID(),
    name: isShortString(project.name, 200) ? project.name : 'Imported project',
    width: project.width,
    height: project.height,
    layers: project.layers as EditorDocument['layers'],
    elements: project.elements as EditorDocument['elements'],
    backgroundMode: project.backgroundMode === 'transparent' || project.backgroundMode === 'greenScreen'
      ? project.backgroundMode
      : 'normal',
    createdAt: isFiniteNumber(project.createdAt, 0, Number.MAX_SAFE_INTEGER) ? project.createdAt : now,
    updatedAt: now,
  };
}
