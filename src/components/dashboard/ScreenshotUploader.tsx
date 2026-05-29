// src/components/dashboard/ScreenshotUploader.tsx
"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const MAX_FILES = 5;
const MAX_BYTES_PER_FILE = 5 * 1024 * 1024;
const MAX_DIMENSION = 1600; // 압축 후 긴 변 최대 픽셀
const JPEG_QUALITY = 0.85;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

type Props = {
  onAnalyze: (files: File[]) => void;
  isAnalyzing: boolean;
  label?: string;
};

export function ScreenshotUploader({ onAnalyze, isAnalyzing, label = "스크린샷 분석" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<File[]>([]);

  const handleFiles = async (incoming: FileList | File[]) => {
    const list = Array.from(incoming);
    if (list.length === 0) return;
    if (list.length + pending.length > MAX_FILES) {
      toast.error(`한 번에 최대 ${MAX_FILES}장까지만 분석할 수 있어요.`);
      return;
    }

    const compressed: File[] = [];
    for (const f of list) {
      if (!ACCEPTED_TYPES.includes(f.type)) {
        toast.error(`${f.name}: jpg, png, webp만 업로드할 수 있어요.`);
        continue;
      }
      try {
        const c = await compressImage(f);
        if (c.size > MAX_BYTES_PER_FILE) {
          toast.error(`${f.name}: 5MB 이하로 압축에 실패했어요. 더 작은 화면으로 캡처해주세요.`);
          continue;
        }
        compressed.push(c);
      } catch {
        toast.error(`${f.name}: 이미지를 읽지 못했어요.`);
      }
    }
    if (compressed.length > 0) {
      setPending((prev) => [...prev, ...compressed]);
    }
  };

  const removePending = (idx: number) =>
    setPending((prev) => prev.filter((_, i) => i !== idx));

  const submit = () => {
    if (pending.length === 0) {
      toast.error("이미지를 추가해주세요.");
      return;
    }
    onAnalyze(pending);
    setPending([]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (isAnalyzing) return;
    await handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50/50 p-6 text-center text-sm text-zinc-500"
      >
        <p>
          잔고 화면 스크린샷을 끌어다 놓거나{" "}
          <button
            type="button"
            className="text-blue-600 underline"
            onClick={() => inputRef.current?.click()}
            disabled={isAnalyzing}
          >
            파일 선택
          </button>{" "}
          (한 번에 최대 {MAX_FILES}장, 종목 많으면 분석 후 추가 업로드)
        </p>
        <p className="mt-1 text-xs text-zinc-400">
          해외주식은 <strong>원화 환산 평가금액</strong> 컬럼이 보이는 화면을 캡처해주세요.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          multiple
          className="hidden"
          onChange={async (e) => {
            if (e.target.files) await handleFiles(e.target.files);
          }}
        />
      </div>

      {pending.length > 0 && (
        <ul className="space-y-1 text-xs text-zinc-600">
          {pending.map((f, i) => (
            <li key={i} className="flex items-center justify-between rounded bg-zinc-100 px-2 py-1">
              <span className="truncate">
                {f.name} ({(f.size / 1024).toFixed(0)} KB)
              </span>
              <button
                type="button"
                className="ml-2 text-zinc-400 hover:text-red-600"
                onClick={() => removePending(i)}
                aria-label="제거"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <Button
        type="button"
        onClick={submit}
        disabled={isAnalyzing || pending.length === 0}
        className="w-full"
      >
        {isAnalyzing ? "분석 중…" : `${label} (${pending.length}장)`}
      </Button>
    </div>
  );
}

// canvas로 긴 변 MAX_DIMENSION 이하로 리사이즈 + jpeg 변환. 메모리·전송량 절감.
async function compressImage(file: File): Promise<File> {
  const dataUrl = await fileToDataUrl(file);
  const img = await dataUrlToImage(dataUrl);
  const { width, height } = scaleDown(img.width, img.height, MAX_DIMENSION);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas context unavailable");
  ctx.drawImage(img, 0, 0, width, height);
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob returned null"))),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
    type: "image/jpeg",
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}

function dataUrlToImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = url;
  });
}

function scaleDown(w: number, h: number, max: number) {
  if (w <= max && h <= max) return { width: w, height: h };
  const ratio = w >= h ? max / w : max / h;
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}
