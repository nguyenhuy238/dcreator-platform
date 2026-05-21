"use client";

import { FormEvent, useEffect, useState } from "react";
import styles from "../wallet.module.css";

type WalletResponse = {
  success: boolean;
  data?: {
    wallet: { pointsBalance: number; cashBalanceVnd: number };
    transactions: Array<{
      id: string;
      type: string;
      pointsDelta: number;
      cashDeltaVnd: number;
      createdAt: string;
    }>;
    pendingPayments: Array<{ id: string; orderCode: string; requestedAmountVnd: number; status: string }>;
  };
  error?: string;
};

function formatVnd(value: number) {
  return `${value.toLocaleString("vi-VN")} VND`;
}

export function WalletPageClient() {
  const [data, setData] = useState<WalletResponse["data"] | null>(null);
  const [statusText, setStatusText] = useState("");
  const [amountVnd, setAmountVnd] = useState(100000);
  const [idempotencyKey, setIdempotencyKey] = useState(`topup-${Date.now()}`);

  const load = async () => {
    const response = await fetch("/api/wallet/me", { cache: "no-store" });
    const body = (await response.json()) as WalletResponse;
    if (!response.ok || !body.success || !body.data) {
      throw new Error(body.error ?? "Cannot load wallet");
    }
    setData(body.data);
  };

  useEffect(() => {
    load().catch((error) => setStatusText(error.message));
  }, []);

  const handleTopup = async (event: FormEvent) => {
    event.preventDefault();
    setStatusText("Dang tao payment...");
    try {
      const response = await fetch("/api/wallet/topup/create-payment", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amountVnd, idempotencyKey })
      });
      const body = (await response.json()) as {
        success: boolean;
        data?: { paymentUrl: string; status: string };
        error?: string;
      };
      if (!response.ok || !body.success || !body.data) {
        throw new Error(body.error ?? "Create payment failed");
      }
      setStatusText(`Payment pending: ${body.data.status}`);
      window.open(body.data.paymentUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Top-up failed");
    }
  };

  const handlePayoutRequest = async () => {
    setStatusText("Dang tao payout request...");
    const response = await fetch("/api/creator/payout-request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        amountVnd: 50000,
        note: "Rut hoa hong creator",
        idempotencyKey: `payout-${Date.now()}`
      })
    });
    const body = (await response.json()) as { success: boolean; error?: string };
    if (!response.ok || !body.success) {
      setStatusText(body.error ?? "Payout request failed");
      return;
    }
    setStatusText("Payment success: payout request created");
    await load();
  };

  if (!data) {
    return (
      <main className="container">
        <h1>Wallet</h1>
        <p>{statusText || "Loading..."}</p>
      </main>
    );
  }

  return (
    <main className={`container ${styles.layout}`}>
      <section className="card">
        <h1>Wallet / N-Points</h1>
        <div className={styles.balanceGrid}>
          <article className={styles.balanceCard}>
            <p className={styles.title}>N-Points balance</p>
            <p className={styles.amount}>{data.wallet.pointsBalance.toLocaleString("vi-VN")} points</p>
          </article>
          <article className={styles.balanceCard}>
            <p className={styles.title}>Creator commission wallet</p>
            <p className={styles.amount}>{formatVnd(data.wallet.cashBalanceVnd)}</p>
            <button type="button" onClick={handlePayoutRequest}>
              Tao payout request
            </button>
          </article>
        </div>
        <p
          className={
            statusText.includes("success") ? styles.success : statusText.includes("failed") ? styles.fail : styles.pending
          }
        >
          {statusText || "Payment pending state se hien thi tai day."}
        </p>
      </section>

      <section className="card">
        <h2>Top-up</h2>
        <form onSubmit={handleTopup}>
          <label>
            So tien nap (VND)
            <input
              type="number"
              min={1000}
              value={amountVnd}
              onChange={(event) => setAmountVnd(Number(event.target.value))}
            />
          </label>
          <label>
            Idempotency key
            <input value={idempotencyKey} onChange={(event) => setIdempotencyKey(event.target.value)} />
          </label>
          <button type="submit">Tao payment</button>
        </form>
        <h3>Payment pending</h3>
        {data.pendingPayments.length === 0 ? (
          <p>Khong co giao dich pending.</p>
        ) : (
          data.pendingPayments.map((payment) => (
            <article key={payment.id} className={styles.balanceCard}>
              <p>{payment.orderCode}</p>
              <p>{formatVnd(payment.requestedAmountVnd)}</p>
              <p>{payment.status}</p>
            </article>
          ))
        )}
      </section>

      <section className="card">
        <h2>Transaction history</h2>
        {data.transactions.map((transaction) => (
          <article key={transaction.id} className={styles.balanceCard}>
            <strong>{transaction.type}</strong>
            <p>Points: {transaction.pointsDelta > 0 ? "+" : ""}{transaction.pointsDelta}</p>
            <p>Cash: {transaction.cashDeltaVnd > 0 ? "+" : ""}{formatVnd(transaction.cashDeltaVnd)}</p>
            <p>{new Date(transaction.createdAt).toLocaleString("vi-VN")}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
