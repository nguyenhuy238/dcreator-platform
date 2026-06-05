import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireApprovedCreator } from "@/lib/auth/creator-guard";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { toErrorResponse } from "@/lib/errors";
import {
  deleteCreatorBankAccount,
  setDefaultCreatorBankAccount,
  updateCreatorBankAccount
} from "@/lib/services/creator-dashboard.service";
import {
  creatorBankAccountDefaultSchema,
  creatorBankAccountSchema
} from "@/lib/validators/creator-dashboard";

type Props = { params: Promise<{ bankAccountId: string }> };

export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    assertSameOrigin(request);
    const account = await requireApprovedCreator(request);
    const { bankAccountId } = await params;
    const raw = await request.json();

    if (typeof raw === "object" && raw !== null && "isDefault" in raw) {
      creatorBankAccountDefaultSchema.parse(raw);
      return ok(await setDefaultCreatorBankAccount(account.id, bankAccountId));
    }

    const payload = creatorBankAccountSchema.parse(raw);
    return ok(await updateCreatorBankAccount(account.id, bankAccountId, payload));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    assertSameOrigin(request);
    const account = await requireApprovedCreator(request);
    const { bankAccountId } = await params;
    return ok(await deleteCreatorBankAccount(account.id, bankAccountId));
  } catch (error) {
    return toErrorResponse(error);
  }
}
