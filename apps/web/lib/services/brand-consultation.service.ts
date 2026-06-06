import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { AppError } from "@/lib/errors";

export type BrandConsultationStatus = "NEW" | "CONTACTED" | "ARCHIVED";

export type BrandConsultationRecord = {
  id: string;
  name: string;
  phone: string;
  facebookUrl: string;
  source: string;
  note: string | null;
  status: BrandConsultationStatus;
  submittedByUserId: string | null;
  submittedByEmail: string | null;
  submittedByName: string | null;
  createdAt: string;
  updatedAt: string;
};

type BrandConsultationInput = {
  name: string;
  phone: string;
  facebookUrl: string;
  source?: string;
  note?: string;
  submittedByUserId?: string | null;
  submittedByEmail?: string | null;
  submittedByName?: string | null;
};

const STORAGE_FILE = path.join(process.cwd(), ".tmp", "brand-consultations.json");

async function ensureStorageDir() {
  await mkdir(path.dirname(STORAGE_FILE), { recursive: true });
}

async function readRecords() {
  try {
    const raw = await readFile(STORAGE_FILE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(Boolean) as BrandConsultationRecord[];
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "ENOENT") {
      return [];
    }
    throw new AppError("Không thể đọc dữ liệu tư vấn brand.", 500, "BRAND_CONSULTATION_STORAGE_READ_FAILED");
  }
}

async function writeRecords(records: BrandConsultationRecord[]) {
  await ensureStorageDir();
  await writeFile(STORAGE_FILE, JSON.stringify(records, null, 2), "utf8");
}

export async function createBrandConsultation(input: BrandConsultationInput) {
  const now = new Date().toISOString();
  const records = await readRecords();
  const record: BrandConsultationRecord = {
    id: randomUUID(),
    name: input.name.trim(),
    phone: input.phone.trim(),
    facebookUrl: input.facebookUrl.trim(),
    source: (input.source?.trim() || "brand_landing_consultation"),
    note: input.note?.trim() || null,
    status: "NEW",
    submittedByUserId: input.submittedByUserId ?? null,
    submittedByEmail: input.submittedByEmail ?? null,
    submittedByName: input.submittedByName ?? null,
    createdAt: now,
    updatedAt: now
  };

  records.unshift(record);
  await writeRecords(records);
  return record;
}

export async function listBrandConsultationsForAdmin(input?: { query?: string }) {
  const records = await readRecords();
  const query = input?.query?.trim().toLowerCase() ?? "";
  const filtered = query
    ? records.filter((record) =>
        [record.name, record.phone, record.facebookUrl, record.source, record.submittedByEmail, record.submittedByName]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query))
      )
    : records;

  return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
