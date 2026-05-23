"use client";

import { useState } from "react";
import type { InputHTMLAttributes } from "react";

export function PasswordInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input {...props} type={visible ? "text" : "password"} className={`dc-input pr-16 ${className}`.trim()} />
      <button
        type="button"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
        onClick={() => setVisible((prev) => !prev)}
        aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
      >
        {visible ? "Ẩn" : "Hiện"}
      </button>
    </div>
  );
}
