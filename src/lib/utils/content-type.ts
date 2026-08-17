/**
 * Identify a buffer from its magic bytes.
 *
 * Attachments arrive as PDFs or as phone photos, and the two are stored in the
 * same folder. Labelling a JPEG as application/pdf leaves Drive unable to
 * preview it and misleads anything that trusts the extension, so the type is
 * read from the content rather than assumed.
 */
export interface SniffedType {
  mimeType: string;
  extension: string;
}

const PDF: SniffedType = { mimeType: "application/pdf", extension: "pdf" };

export function sniffContentType(buffer: Buffer, fallback: SniffedType = PDF): SniffedType {
  if (buffer.length >= 4) {
    const b = buffer;
    if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return PDF; // %PDF
    if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mimeType: "image/jpeg", extension: "jpg" };
    if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { mimeType: "image/png", extension: "png" };
    if (
      buffer.length >= 12 &&
      b.subarray(0, 4).toString("ascii") === "RIFF" &&
      b.subarray(8, 12).toString("ascii") === "WEBP"
    ) {
      return { mimeType: "image/webp", extension: "webp" };
    }
  }
  return fallback;
}
