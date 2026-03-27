const ALLOWED_EXTENSIONS = ['.txt', '.md'];

export function isValidFileExtension(filename: string): boolean {
  const lower = filename.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}
