import { NextResponse } from "next/server";
import { fail } from "@/lib/api-response";

type VietQrBank = {
  id: number;
  name: string;
  code: string;
  bin: string;
  shortName: string;
  logo: string;
  transferSupported: number;
  lookupSupported: number;
};

type VietQrResponse = {
  code: string;
  desc: string;
  data?: VietQrBank[];
};

export async function GET() {
  try {
    const response = await fetch("https://api.vietqr.io/v2/banks", {
      next: { revalidate: 86400 }
    });

    if (!response.ok) {
      return fail("Không thể tải danh sách ngân hàng VietQR", 502, "VIETQR_BANKS_FETCH_FAILED");
    }

    const payload = (await response.json()) as VietQrResponse;
    if (payload.code !== "00" || !payload.data) {
      return fail("VietQR không trả về danh sách ngân hàng hợp lệ", 502, "VIETQR_BANKS_INVALID_RESPONSE");
    }

    const banks = payload.data
      .filter((item) => item.transferSupported === 1)
      .map((item) => ({
        id: item.id,
        name: item.name,
        code: item.code,
        bin: item.bin,
        shortName: item.shortName,
        logo: item.logo,
        lookupSupported: item.lookupSupported === 1
      }));

    return NextResponse.json(
      { success: true, data: banks },
      {
        status: 200,
        headers: {
          "Cache-Control": "s-maxage=86400, stale-while-revalidate=43200"
        }
      }
    );
  } catch {
    return fail("Không thể kết nối VietQR", 502, "VIETQR_UNAVAILABLE");
  }
}
