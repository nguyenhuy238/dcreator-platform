import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireApprovedCreator } from "@/lib/auth/creator-guard";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { toErrorResponse } from "@/lib/errors";
import { createCreatorBankAccount, listCreatorBankAccounts } from "@/lib/services/creator-dashboard.service";
import { creatorBankAccountSchema } from "@/lib/validators/creator-dashboard";

export async function GET(request: NextRequest) {
  try {
    const account = await requireApprovedCreator(request);
    return ok(await listCreatorBankAccounts(account.id));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const account = await requireApprovedCreator(request);
    const payload = creatorBankAccountSchema.parse(await request.json());
    return ok(await createCreatorBankAccount(account.id, payload), 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
