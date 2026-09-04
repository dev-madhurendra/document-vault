import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from "cloudinary";
import streamifier from "streamifier";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  resource_type: string;
  format: string;
  bytes: number;
}

export function uploadBufferToCloudinary(
  buffer: Buffer,
  folder: string
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
        type: "upload",
        access_mode: "public", // Fixes 401 Unauthorized on newer Cloudinary accounts
      },
      (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
        if (error || !result) return reject(error);
        resolve(result as CloudinaryUploadResult);
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

export function deleteFromCloudinary(publicId: string, resourceType: string) {
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

// Fix for generating direct download URLs
export function buildDownloadUrl(
  publicId: string,
  resourceType: string,
  downloadName: string,
  format?: string
) {
  // Clean custom filename (remove special characters/spaces)
  const safeFileName = downloadName.replace(/[^a-zA-Z0-9_-]/g, "_");

  return cloudinary.url(publicId, {
    resource_type: resourceType,
    flags: `attachment:${safeFileName}`, // Custom filename goes in the attachment flag
    format: format,
    secure: true,
  });
}

// Fix for generating view/preview URLs
export function buildViewUrl(publicId: string, resourceType: string, format?: string) {
  return cloudinary.url(publicId, {
    resource_type: resourceType,
    format: format,
    secure: true,
    type: "upload",
  });
}

// Generates thumbnail for images and rasterized first page for PDFs
export function buildThumbnailUrl(publicId: string, resourceType: string, format?: string) {
  const isPdf = format === "pdf";

  // PDFs can be transformed into JPG thumbnails under resource_type 'image'
  if (resourceType !== "image" && !isPdf) return null;

  return cloudinary.url(publicId, {
    resource_type: "image",
    format: isPdf ? "jpg" : format,
    page: isPdf ? 1 : undefined,
    secure: true,
    transformation: [{ width: 400, height: 280, crop: "fill", gravity: "north" }],
  });
}