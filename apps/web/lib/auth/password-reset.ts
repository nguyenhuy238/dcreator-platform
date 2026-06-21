import { randomBytes } from "node:crypto";
import { env } from "@/lib/env";

const TEMPORARY_PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";

export function createTemporaryPassword(length = 12) {
  const bytes = randomBytes(length);
  let password = "";
  for (const byte of bytes) {
    password += TEMPORARY_PASSWORD_CHARS[byte % TEMPORARY_PASSWORD_CHARS.length];
  }
  return password;
}

export async function sendTemporaryPasswordEmail(input: { email: string; temporaryPassword: string; loginUrl: string }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      from: env.PASSWORD_RESET_FROM_EMAIL,
      to: input.email,
      subject: "Mật khẩu tạm dCreator",
      html: `
        <p>Bạn vừa yêu cầu khôi phục mật khẩu dCreator.</p>
        <p>Mật khẩu tạm của bạn là: <strong>${input.temporaryPassword}</strong></p>
        <p>Đăng nhập bằng email của bạn và mật khẩu tạm này tại: <a href="${input.loginUrl}">${input.loginUrl}</a></p>
        <p>Sau khi đăng nhập, hãy vào Cài đặt tài khoản và đổi mật khẩu mới. Ở trường mật khẩu hiện tại, nhập mật khẩu tạm trong email này.</p>
        <p>Nếu bạn không yêu cầu, vui lòng liên hệ hỗ trợ ngay.</p>
      `,
      text: [
        "Bạn vừa yêu cầu khôi phục mật khẩu dCreator.",
        "",
        `Mật khẩu tạm của bạn là: ${input.temporaryPassword}`,
        "",
        `Đăng nhập tại: ${input.loginUrl}`,
        "",
        "Sau khi đăng nhập, hãy vào Cài đặt tài khoản và đổi mật khẩu mới. Ở trường mật khẩu hiện tại, nhập mật khẩu tạm trong email này.",
        "",
        "Nếu bạn không yêu cầu, vui lòng liên hệ hỗ trợ ngay."
      ].join("\n")
    })
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`TEMPORARY_PASSWORD_EMAIL_FAILED:${response.status}:${detail}`);
  }
}
