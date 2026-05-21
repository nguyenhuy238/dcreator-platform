export type NotificationEmailPayload = {
  to: string;
  subject: string;
  html: string;
};

export interface EmailNotificationProvider {
  send(payload: NotificationEmailPayload): Promise<void>;
}

class NoopEmailProvider implements EmailNotificationProvider {
  async send(payload: NotificationEmailPayload) {
    // Placeholder provider for standalone mode; replace by Resend/SMTP adapter later.
    console.info("email_notification_noop", payload);
  }
}

let provider: EmailNotificationProvider = new NoopEmailProvider();

export function setEmailNotificationProvider(nextProvider: EmailNotificationProvider) {
  provider = nextProvider;
}

export function getEmailNotificationProvider() {
  return provider;
}
