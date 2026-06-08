"use client";

import { KeyboardEvent, useState } from "react";
import { MAX_REQUIRED_HASHTAGS, getHashtagError, normalizeHashtagValue, normalizeRequiredHashtags } from "@/lib/hashtags";

type Props = {
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
};

export function RequiredHashtagInput({ value, onChange, error }: Props) {
  const [draft, setDraft] = useState("");
  const [localError, setLocalError] = useState("");
  const hashtags = normalizeRequiredHashtags(value);

  function addHashtags(rawValue: string) {
    const parts = rawValue
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (parts.length === 0) return;

    let next = [...hashtags];
    for (const part of parts) {
      const validationError = getHashtagError(part);
      if (validationError) {
        setLocalError(validationError);
        return;
      }

      const normalized = normalizeHashtagValue(part);
      if (next.some((item) => item.toLowerCase() === normalized.toLowerCase())) {
        setLocalError("Hashtag đã tồn tại.");
        return;
      }
      if (next.length >= MAX_REQUIRED_HASHTAGS) {
        setLocalError(`Tối đa ${MAX_REQUIRED_HASHTAGS} hashtag bắt buộc.`);
        return;
      }
      next = [...next, normalized];
    }

    setLocalError("");
    setDraft("");
    onChange(next);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" && event.key !== ",") return;
    event.preventDefault();
    addHashtags(draft);
  }

  return (
    <div className="grid gap-2 text-sm font-semibold text-zinc-700">
      <div className="flex items-center justify-between gap-3">
        <span>Hashtags bắt buộc</span>
        <span className="text-xs font-medium text-zinc-400">{hashtags.length}/{MAX_REQUIRED_HASHTAGS}</span>
      </div>
      <div className={`rounded-2xl border bg-white px-3 py-2 shadow-sm ${error || localError ? "border-red-300 ring-1 ring-red-200" : "border-zinc-200"}`}>
        <div className="flex flex-wrap gap-2">
          {hashtags.map((hashtag) => (
            <button
              key={hashtag}
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm font-semibold text-zinc-800 transition hover:border-zinc-300 hover:bg-white"
              onClick={() => onChange(hashtags.filter((item) => item !== hashtag))}
              title="Bấm để xóa hashtag"
            >
              {hashtag}
              <span className="text-zinc-400">x</span>
            </button>
          ))}
          <input
            className="min-w-[180px] flex-1 bg-transparent px-1 py-1.5 text-sm font-medium text-zinc-900 outline-none placeholder:text-zinc-400"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setLocalError("");
            }}
            onKeyDown={handleKeyDown}
            onBlur={() => addHashtags(draft)}
            placeholder="Nhập hashtag rồi Enter"
          />
        </div>
      </div>
      <span className="text-xs font-medium text-zinc-500">Tự thêm dấu #, phân tách bằng Enter hoặc dấu phẩy, không dùng khoảng trắng.</span>
      {error || localError ? <span className="text-xs text-red-600">{error || localError}</span> : null}
    </div>
  );
}
