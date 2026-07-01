import fs from 'fs';
import path from 'path';

const TMP_DIR = path.join(__dirname, '..', '.tmp-files');

function ensureTmpDir(): void {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

/** Minimal, structurally-valid single-page PDF — enough for any file-type/size check that inspects magic bytes or parses the file. */
const MINIMAL_PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
    '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF'
);

/** Minimal valid 1x1 JPEG. */
const MINIMAL_JPG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLFRgTEA4dHyMhHx0eIiwoJSw0MC4uLCwsNjc' +
    '8QUFFRUdJSUnMTIiHiEqLTgyMjEyODIzOzs4Nzc4ODU2NDD/2wBDAQwMDBQNDgsMDBEQEBAODBAQDBAQEBUQFBQVFRQUFA' +
    'wMDBAUFA0NDQ0PDw0PDxAQEBAQEBAQEBAQEBAQEP/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAA' +
    'j/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAEA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPwB/2Q==',
  'base64'
);

export function getSamplePdfPath(): string {
  ensureTmpDir();
  const p = path.join(TMP_DIR, 'sample-license.pdf');
  fs.writeFileSync(p, MINIMAL_PDF);
  return p;
}

export function getSampleJpgPath(): string {
  ensureTmpDir();
  const p = path.join(TMP_DIR, 'sample-license.jpg');
  fs.writeFileSync(p, MINIMAL_JPG);
  return p;
}

export function getDisallowedFileTypePath(): string {
  ensureTmpDir();
  const p = path.join(TMP_DIR, 'sample-license.docx');
  fs.writeFileSync(p, Buffer.from('This is not a real docx, just a disallowed extension for A3-06.'));
  return p;
}

/** A file over the 5MB upload limit (see A3-07), padded with zero bytes. */
export function getOversizedFilePath(): string {
  ensureTmpDir();
  const p = path.join(TMP_DIR, 'oversized-license.pdf');
  fs.writeFileSync(p, Buffer.concat([MINIMAL_PDF, Buffer.alloc(6 * 1024 * 1024)]));
  return p;
}
