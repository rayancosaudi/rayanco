import imageCompression from "browser-image-compression";

/**
 * Browser image pipeline (CLAUDE.md §8a step 1). Used by <ImageUploader> for every admin upload.
 * HEIC → JPEG (heic2any, loaded on demand) → two WebP versions with EXIF orientation applied
 * and all metadata stripped (canvas re-encode drops EXIF, including GPS).
 */

export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"] as const;
export const ACCEPT_ATTR = `${ACCEPTED_TYPES.join(",")},.heic,.heif`;
export const MAX_INPUT_BYTES = 25 * 1024 * 1024;

export type ImageVersion = { blob: Blob; width: number; height: number };

export type ProcessedImage =
  | { mode: "webp"; large: ImageVersion; thumb: ImageVersion; originalBytes: number }
  /** Browser can't encode WebP: send a JPEG for server-side conversion. */
  | { mode: "fallback"; jpeg: ImageVersion; originalBytes: number };

export class ImageInputError extends Error {}

function isHeic(file: File): boolean {
  return /image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

/** Throws ImageInputError with a message staff can read. */
export function validateImageFile(file: File): void {
  const typeOk = (ACCEPTED_TYPES as readonly string[]).includes(file.type) || isHeic(file);
  if (!typeOk) throw new ImageInputError(`${file.name}: only JPG, PNG, WebP or iPhone (HEIC) photos are allowed.`);
  if (file.size > MAX_INPUT_BYTES) throw new ImageInputError(`${file.name}: photo is larger than 25 MB.`);
}

async function heicToJpeg(file: File): Promise<File> {
  const { default: heic2any } = await import("heic2any");
  const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
  const blob = Array.isArray(out) ? out[0] : out;
  return new File([blob], file.name.replace(/\.hei[cf]$/i, ".jpg"), { type: "image/jpeg" });
}

async function dimensions(blob: Blob): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(blob);
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return size;
}

async function compress(
  file: File,
  opts: { maxEdge: number; maxSizeMB: number; quality: number; fileType: "image/webp" | "image/jpeg" },
): Promise<ImageVersion> {
  const blob = await imageCompression(file, {
    maxWidthOrHeight: opts.maxEdge,
    maxSizeMB: opts.maxSizeMB,
    initialQuality: opts.quality,
    fileType: opts.fileType,
    useWebWorker: true,
    preserveExif: false,
  });
  return { blob, ...(await dimensions(blob)) };
}

let webpSupport: Promise<boolean> | undefined;

/** Old Safari's canvas.toBlob silently returns PNG for 'image/webp'. */
function canEncodeWebp(): Promise<boolean> {
  webpSupport ??= new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 2;
    canvas.toBlob((b) => resolve(b?.type === "image/webp"), "image/webp", 0.8);
  });
  return webpSupport;
}

export async function processImage(file: File): Promise<ProcessedImage> {
  validateImageFile(file);
  const originalBytes = file.size;
  const source = isHeic(file) ? await heicToJpeg(file) : file;

  if (await canEncodeWebp()) {
    // Sequential, not parallel: keeps peak memory low on cheap phones.
    const large = await compress(source, { maxEdge: 1600, maxSizeMB: 0.3, quality: 0.8, fileType: "image/webp" });
    const thumb = await compress(source, { maxEdge: 480, maxSizeMB: 0.06, quality: 0.75, fileType: "image/webp" });
    if (large.blob.type === "image/webp" && thumb.blob.type === "image/webp") {
      return { mode: "webp", large, thumb, originalBytes };
    }
  }
  const jpeg = await compress(source, { maxEdge: 2400, maxSizeMB: 4, quality: 0.85, fileType: "image/jpeg" });
  return { mode: "fallback", jpeg, originalBytes };
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
