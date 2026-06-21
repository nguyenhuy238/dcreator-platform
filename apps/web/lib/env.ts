function requiredEnv(name: "RESEND_API_KEY" | "PASSWORD_RESET_FROM_EMAIL") {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

export const env = {
  RESEND_API_KEY: requiredEnv("RESEND_API_KEY"),
  PASSWORD_RESET_FROM_EMAIL: requiredEnv("PASSWORD_RESET_FROM_EMAIL")
};
