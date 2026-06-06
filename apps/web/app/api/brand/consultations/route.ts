import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { getCurrentUserFromServer } from "@/lib/auth/current-user";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { toErrorResponse } from "@/lib/errors";
import { createBrandConsultation } from "@/lib/services/brand-consultation.service";
import { brandConsultationCreateSchema } from "@/lib/validators/brand-consultation";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const payload = brandConsultationCreateSchema.parse(await request.json());
    const currentUser = await getCurrentUserFromServer();

    const record = await createBrandConsultation({
      ...payload,
      submittedByUserId: currentUser?.id ?? null,
      submittedByEmail: currentUser?.email ?? null,
      submittedByName: currentUser?.displayName ?? null
    });

    return ok(record, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}

