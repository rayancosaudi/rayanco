"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { deleteListingImage, reorderListingImages } from "@/app/actions/admin-listings";
import { createClient } from "@/lib/supabase/client";
import { ACCEPT_ATTR, formatBytes, ImageInputError, processImage, validateImageFile } from "@/lib/images/processImage";
import { mediaUrl } from "@/lib/listings/media";
import { IconCamera } from "./icons";

export type UploadedImage = {
  id: string;
  storage_key: string;
  thumb_key: string | null;
  width: number | null;
  height: number | null;
  bytes: number | null;
};

type Stage = "queued" | "compressing" | "uploading" | "verifying" | "error";
type Pending = { tempId: string; name: string; stage: Stage; before: number; after?: number; error?: string };

const STAGE_LABEL: Record<Stage, string> = {
  queued: "Waiting…",
  compressing: "Compressing…",
  uploading: "Uploading…",
  verifying: "Checking…",
  error: "Failed",
};

const CONCURRENCY = 2;

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
  return json;
}

type SignedUpload = { kind: "large" | "thumb" | "incoming"; bucket: string; path: string; token: string };
type UploadUrls = { uuid: string; uploads: SignedUpload[] };

/** Direct browser → Supabase Storage upload using a one-shot token from /api/upload-url. */
async function putToStorage(u: SignedUpload, blob: Blob, contentType: string) {
  const { error } = await createClient().storage.from(u.bucket).uploadToSignedUrl(u.path, u.token, blob, { contentType });
  if (error) throw new Error(`Upload failed (${error.message})`);
}

/** Compress → upload to storage → verify on the server → returns the saved row. */
async function uploadOne(listingId: string, file: File, onStage: (s: Stage, after?: number) => void): Promise<UploadedImage> {
  onStage("compressing");
  const processed = await processImage(file);

  onStage("uploading", processed.mode === "webp" ? processed.large.blob.size + processed.thumb.blob.size : processed.jpeg.blob.size);
  let urls: UploadUrls;
  if (processed.mode === "webp") {
    urls = await postJson<UploadUrls>("/api/upload-url", {
      mode: "webp",
      listingId,
      contentType: "image/webp",
      largeBytes: processed.large.blob.size,
      thumbBytes: processed.thumb.blob.size,
    });
    const byKind = Object.fromEntries(urls.uploads.map((u) => [u.kind, u]));
    await Promise.all([
      putToStorage(byKind.large, processed.large.blob, "image/webp"),
      putToStorage(byKind.thumb, processed.thumb.blob, "image/webp"),
    ]);
  } else {
    urls = await postJson<UploadUrls>("/api/upload-url", {
      mode: "fallback",
      listingId,
      contentType: "image/jpeg",
      bytes: processed.jpeg.blob.size,
    });
    await putToStorage(urls.uploads[0], processed.jpeg.blob, "image/jpeg");
  }

  onStage("verifying");
  const { image } = await postJson<{ image: UploadedImage }>("/api/images/verify", {
    listingId,
    uuid: urls.uuid,
    mode: processed.mode,
  });
  return image;
}

export function ImageUploader({
  listingId,
  initialImages,
  editable,
}: {
  listingId: string;
  initialImages: UploadedImage[];
  editable: boolean;
}) {
  const [images, setImages] = useState(initialImages);
  const [pending, setPending] = useState<Pending[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const patch = (tempId: string, p: Partial<Pending>) =>
    setPending((list) => list.map((x) => (x.tempId === tempId ? { ...x, ...p } : x)));

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setMessage(null);
    const jobs: { tempId: string; file: File }[] = [];
    const rejected: string[] = [];
    for (const file of Array.from(fileList)) {
      try {
        validateImageFile(file);
        jobs.push({ tempId: crypto.randomUUID(), file });
      } catch (e) {
        rejected.push(e instanceof ImageInputError ? e.message : `${file.name}: not a photo.`);
      }
    }
    if (rejected.length) setMessage(rejected.join(" "));
    setPending((list) => [
      ...list,
      ...jobs.map((j) => ({ tempId: j.tempId, name: j.file.name, stage: "queued" as const, before: j.file.size })),
    ]);

    // Small worker pool: at most two photos in memory at once.
    const queue = [...jobs];
    const worker = async () => {
      for (let job = queue.shift(); job; job = queue.shift()) {
        const { tempId, file } = job;
        try {
          const image = await uploadOne(listingId, file, (stage, after) => patch(tempId, { stage, ...(after ? { after } : {}) }));
          setImages((list) => [...list, image]);
          setPending((list) => list.filter((x) => x.tempId !== tempId));
        } catch (e) {
          patch(tempId, { stage: "error", error: e instanceof Error ? e.message : "Upload failed" });
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, worker));
    if (inputRef.current) inputRef.current.value = "";
  }

  function saveOrder(next: UploadedImage[]) {
    const previous = images;
    setImages(next);
    startSaving(async () => {
      const res = await reorderListingImages(listingId, next.map((i) => i.id));
      if (!res.ok) {
        setImages(previous);
        setMessage(res.error);
      }
    });
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    saveOrder(next);
  }

  function makeCover(index: number) {
    if (index === 0) return;
    const next = [...images];
    const [img] = next.splice(index, 1);
    saveOrder([img, ...next]);
  }

  function remove(id: string) {
    startSaving(async () => {
      const res = await deleteListingImage(listingId, id);
      if (res.ok) setImages((list) => list.filter((i) => i.id !== id));
      else setMessage(res.error);
    });
  }

  const busy = pending.some((p) => p.stage !== "error");

  return (
    <section aria-labelledby="photos-heading" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="photos-heading" className="font-display text-lg font-bold text-steel-900">
          Photos <span className="text-sm font-normal text-steel-500">({images.length})</span>
        </h2>
        {isSaving ? <span className="text-xs text-steel-500">Saving…</span> : null}
      </div>

      {editable ? (
        <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-steel-200 bg-steel-50/60 p-5 text-center transition-colors hover:border-accent-500 hover:bg-accent-50/40">
          <span className="grid size-12 place-items-center rounded-full bg-accent-500/10 text-accent-600">
            <IconCamera className="size-6" />
          </span>
          <span className="text-base font-bold text-steel-900">Take or add photos</span>
          <span className="text-xs text-steel-500">JPG, PNG, WebP or iPhone HEIC · up to 25 MB each · auto-compressed</span>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_ATTR}
            capture="environment"
            multiple
            className="sr-only"
            onChange={(e) => void handleFiles(e.currentTarget.files)}
          />
        </label>
      ) : null}

      {editable ? (
        <label className="inline-flex cursor-pointer text-sm font-semibold text-accent-600 underline">
          Choose from gallery instead
          <input
            type="file"
            accept={ACCEPT_ATTR}
            multiple
            className="sr-only"
            onChange={(e) => {
              void handleFiles(e.currentTarget.files);
              e.currentTarget.value = "";
            }}
          />
        </label>
      ) : null}

      {message ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {message}
        </p>
      ) : null}

      {pending.length ? (
        <ul className="space-y-2" aria-live="polite">
          {pending.map((p) => (
            <li key={p.tempId} className="flex items-center justify-between gap-3 rounded-lg bg-steel-50 px-3 py-2.5 text-sm">
              <span className="min-w-0 truncate text-steel-700">{p.name}</span>
              <span className={`shrink-0 text-xs font-semibold ${p.stage === "error" ? "text-red-700" : "text-steel-600"}`}>
                {p.stage === "error" ? p.error : STAGE_LABEL[p.stage]}
                {p.after ? ` · ${formatBytes(p.before)} → ${formatBytes(p.after)}` : ` · ${formatBytes(p.before)}`}
              </span>
              {p.stage === "error" ? (
                <button
                  type="button"
                  className="shrink-0 text-xs font-bold text-steel-500 underline"
                  onClick={() => setPending((list) => list.filter((x) => x.tempId !== p.tempId))}
                >
                  Dismiss
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {images.length ? (
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {images.map((img, index) => (
            <li key={img.id} className="overflow-hidden rounded-xl border border-steel-100 bg-white">
              <div className="relative aspect-[4/3] bg-steel-100">
                <Image
                  src={mediaUrl(img.thumb_key ?? img.storage_key)}
                  alt=""
                  fill
                  sizes="(min-width: 640px) 30vw, 45vw"
                  className="object-cover"
                  unoptimized
                />
                {index === 0 ? (
                  <span className="absolute start-2 top-2 rounded-md bg-accent-500 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-white shadow">
                    Cover
                  </span>
                ) : null}
              </div>
              <div className="flex items-center justify-between gap-1 px-2 py-1.5 text-xs text-steel-500">
                <span>{img.bytes ? formatBytes(img.bytes) : ""}</span>
                {editable ? (
                  <span className="flex gap-1">
                    <IconButton label="Move earlier" disabled={index === 0 || isSaving || busy} onClick={() => move(index, -1)}>
                      ↑
                    </IconButton>
                    <IconButton
                      label="Move later"
                      disabled={index === images.length - 1 || isSaving || busy}
                      onClick={() => move(index, 1)}
                    >
                      ↓
                    </IconButton>
                    {index > 0 ? (
                      <IconButton label="Make cover photo" disabled={isSaving || busy} onClick={() => makeCover(index)}>
                        ★
                      </IconButton>
                    ) : null}
                    <IconButton label="Delete photo" disabled={isSaving} onClick={() => remove(img.id)} danger>
                      ✕
                    </IconButton>
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-steel-500">No photos yet. The first photo becomes the cover.</p>
      )}
    </section>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`grid size-9 place-items-center rounded-lg text-sm font-bold disabled:opacity-30 ${
        danger ? "text-red-700 hover:bg-red-50" : "text-steel-700 hover:bg-steel-100"
      }`}
    >
      {children}
    </button>
  );
}
