import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ACCEPTED_IMAGE_TYPES, uploadMedia } from "@/lib/media";

// Reused by the Insights editor (cover image) and the Newsletter
// composer (per-template hero image) — a file picker that uploads
// straight to the shared media endpoint and drops the returned URL
// into the field, with a thumbnail preview and a manual-URL fallback
// for anyone who'd rather paste an existing link.
export function ImageUploadField({
  label,
  value,
  onChange,
  helpText,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  helpText?: string;
}) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadMedia(file);
      onChange(url);
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description:
          err?.response?.data?.message || "Could not upload that file.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}

      {value ? (
        <div className="relative w-full max-w-xs overflow-hidden rounded-md border">
          <img src={value} alt="" className="h-32 w-full object-cover" />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute right-1.5 top-1.5 h-6 w-6"
            onClick={() => onChange("")}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : null}

      <div className="flex gap-2">
        <Input
          type="url"
          placeholder="https:// or upload a file"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1"
        />
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES}
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <Button
          type="button"
          variant="outline"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="mr-2 h-4 w-4" />
          )}
          Upload
        </Button>
      </div>
    </div>
  );
}
