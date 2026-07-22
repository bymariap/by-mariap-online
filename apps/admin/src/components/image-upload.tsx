import { useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 8 * 1024 * 1024;

export function ImageUpload({
  value,
  onChange,
  folder,
  max,
  onUploadingChange,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  folder: "products" | "avatars";
  max: number;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  function setBusy(b: boolean) {
    setUploading(b);
    onUploadingChange?.(b);
  }

  async function handleFile(file: File) {
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Formato no permitido (usa JPG, PNG o WebP)");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("La imagen supera los 8 MB");
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", folder);
      const { url } = await api.upload<{ url: string }>("/admin/uploads", form);
      onChange([...value, url]);
    } catch (e: any) {
      toast.error(e?.message ?? "Error al subir la imagen");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.map((url) => (
          <div key={url} className="relative">
            <img
              src={url}
              alt=""
              className="h-20 w-20 rounded object-cover border"
            />
            <button
              type="button"
              onClick={() => onChange(value.filter((u) => u !== url))}
              className="absolute -right-2 -top-2 h-5 w-5 rounded-full bg-destructive text-xs text-white"
              aria-label="Quitar imagen"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      {value.length < max && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? "Subiendo…" : "+ Subir imagen"}
        </Button>
      )}
    </div>
  );
}
