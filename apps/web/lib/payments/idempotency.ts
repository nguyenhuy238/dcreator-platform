import type { PaymentTransactionStatus } from "@prisma/client";

export function isPaymentTerminalStatus(status: PaymentTransactionStatus) {
  return status === "SUCCESS" || status === "FAILED";
}

export function shouldProcessPaymentWebhook(currentStatus: PaymentTransactionStatus) {
  return currentStatus === "PENDING";
}
