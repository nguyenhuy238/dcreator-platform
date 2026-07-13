function requiredEnv(name: "RESEND_API_KEY" | "PASSWORD_RESET_FROM_EMAIL") {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

export const env = {
  get RESEND_API_KEY() {
    return requiredEnv("RESEND_API_KEY");
  },
  get PASSWORD_RESET_FROM_EMAIL() {
    return requiredEnv("PASSWORD_RESET_FROM_EMAIL");
  }
};
