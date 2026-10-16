import { api } from "./api";

// Shared image/gif upload for Super-Admin-authored public content —
// Insights cover images and Newsletter campaign images. The backend
// returns a ready-to-use absolute URL (not a relative /uploads/...
// path) because the Newsletter use case needs something that
// resolves inside an email sent to someone else's inbox, not just
// inside this app — see MediaUploadController.
export async function uploadMedia(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post("/super-admin/media/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  const body = res.data;
  const url =
    body && typeof body === "object" && "data" in body
      ? body.data?.url
      : body?.url;
  if (!url) throw new Error("Upload did not return a URL.");
  return url as string;
}

export const ACCEPTED_IMAGE_TYPES =
  "image/png,image/jpeg,image/jpg,image/gif,image/webp";
