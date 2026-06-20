"use client";

import { useState } from "react";
import type { InputHTMLAttributes } from "react";
import { Eye, EyeSlash } from "@phosphor-icons/react";

export function PasswordInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input {...props} type={visible ? "text" : "password"} className={`dc-input pr-16 ${className}`.trim()} />
      <button
        type="button"
        className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
        onClick={() => setVisible((prev) => !prev)}
        aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        title={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
      >
        {visible ? <EyeSlash size={18} weight="bold" /> : <Eye size={18} weight="bold" />}
      </button>
    </div>
  );
}
