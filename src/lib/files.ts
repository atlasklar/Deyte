import { LIMITS } from "@/config/product";
import type { Attachment } from "./types";
import { uid } from "./util";

/** Applies the upload bounds. Returns accepted files and a message for anything rejected. */
export function validateScreenshots(files: File[], alreadySelected = 0) {
  const errors: string[] = [];
  let accepted = files.filter((f) => f.type.startsWith("image/"));
  if (accepted.length < files.length) errors.push("Only images can be uploaded.");
  const tooBig = accepted.filter((f) => f.size > LIMITS.screenshotMaxMB * 1024 * 1024);
  if (tooBig.length) errors.push(`Each screenshot must be under ${LIMITS.screenshotMaxMB} MB.`);
  accepted = accepted.filter((f) => !tooBig.includes(f));
  const room = LIMITS.screenshotsPerReview - alreadySelected;
  if (accepted.length > room) {
    errors.push(`Up to ${LIMITS.screenshotsPerReview} screenshots per review.`);
    accepted = accepted.slice(0, Math.max(0, room));
  }
  return { accepted, error: errors[0] };
}

/** A small JPEG preview, so the thread keeps a record without storing the original. */
export async function makeThumb(file: File, max = 220): Promise<Attachment> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const ratio = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * ratio);
    canvas.height = Math.round(img.height * ratio);
    canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { id: uid("att"), name: file.name, thumb: canvas.toDataURL("image/jpeg", 0.6) };
  } catch {
    return { id: uid("att"), name: file.name, thumb: "" };
  } finally {
    URL.revokeObjectURL(url);
  }
}
