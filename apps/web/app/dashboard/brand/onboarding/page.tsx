"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { ErrorState, LoadingSkeleton, PageHeader, SectionHeader } from "@/app/components/dcreator/ui/base";

const BCC_AGREEMENT_TERMS = `HỢP ĐỒNG BCC dCreator v1

Bên A: Brand (sau đây gọi tắt là “Brand”)
Bên B: dCreator (sau đây gọi tắt là “dCreator”)

1. Mục đích hợp đồng
Hợp đồng này xác lập quyền và nghĩa vụ giữa Brand và dCreator trong việc hợp tác triển khai chiến dịch, phát hành voucher/reward, quản lý tồn kho và thanh toán doanh thu trên nền tảng dCreator.

2. Phạm vi hợp tác
Brand cung cấp sản phẩm, voucher, reward và thông tin liên quan cho chiến dịch. dCreator cung cấp nền tảng vận hành, hiển thị, thanh toán và hỗ trợ giao dịch giữa Brand và người dùng.

3. Nghĩa vụ của Brand
- Cung cấp thông tin sản phẩm, giá, tồn kho và điều kiện đổi quà chính xác.
- Đảm bảo chất lượng sản phẩm, nguồn gốc, an toàn, khuyến mại và các chứng từ cần thiết.
- Quản lý tồn kho và voucher để tránh oversell.
- Xử lý hoàn tiền, đổi trả và khiếu nại khách hàng theo chính sách dCreator.
- Hỗ trợ dCreator trong quá trình giải quyết tranh chấp.

4. Nghĩa vụ của dCreator
- Cung cấp nền tảng hiển thị chiến dịch và quản lý đơn hàng.
- Hỗ trợ thanh toán, xác thực voucher và thông báo trạng thái đơn hàng.
- Hỗ trợ Brand trong việc kết nối khách hàng và xử lý sự cố kỹ thuật.
- Không chịu trách nhiệm trực tiếp về chất lượng sản phẩm, giao hàng hoặc tranh chấp nội dung giữa Brand và khách hàng.

5. Doanh thu và phí
- Commission nền tảng: 10% trên doanh thu hợp lệ của chiến dịch.
- Phần doanh thu còn lại thuộc về Brand theo tỷ lệ thỏa thuận.
- Brand chịu trách nhiệm thanh toán toàn bộ các khoản thuế và phí phát sinh liên quan.

6. Quản lý voucher và tồn kho
Brand chịu trách nhiệm phát hành voucher theo tồn kho thực tế. Trong trường hợp oversell, Brand phải chịu trách nhiệm hủy đơn, hoàn tiền hoặc bồi thường theo quy định dCreator.

7. Kết nối thông tin bổ sung
Brand có thể đề xuất các yêu cầu bổ sung về chiến dịch, voucher, điều kiện đổi quà hoặc trợ giá. Các yêu cầu này chỉ có hiệu lực khi được dCreator chấp thuận và ghi nhận bằng văn bản bổ sung hoặc phụ lục hợp đồng.

8. Thuế, giấy phép và pháp lý
Brand chịu toàn bộ nghĩa vụ về thuế, hóa đơn, giấy phép kinh doanh, chứng nhận chất lượng và các quy định pháp lý liên quan đến hàng hóa/dịch vụ cung cấp.

9. Bảo mật dữ liệu
Brand cam kết bảo mật thông tin khách hàng và chỉ sử dụng dữ liệu cho mục đích phục vụ đơn hàng, đổi quà và chăm sóc khách hàng. Brand không được sử dụng sai mục đích hoặc chia sẻ dữ liệu trái phép.

10. Hiệu lực và điều khoản chung
Brand xác nhận đã đọc, hiểu và đồng ý với nội dung hợp đồng BCC khi hoàn tất BCC. URL hợp đồng BCC đã ký chỉ là tài liệu phụ được đính kèm để lưu giữ văn bản chính thức.`;

type Onboarding = {
  completed: boolean;
  legalName: string;
  industry: string;
  taxCode: string;
  businessLicenseUrl: string;
  productCategories: string;
  inventoryDescription: string;
  revenueSharePercent: number;
  commissionRatePercent: number;
  bccAgreementVersion: string;
  bccAgreementAccepted: boolean;
  bccAgreementTerms: string;
  legalResponsibilityAccepted: boolean;
  contractFileUrl: string;
  contractSignedAt: string | null;
  supplementaryBccReviewApproved: boolean;
  reviewStatus: "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "NEEDS_REVISION" | null;
};

type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };
type ApiErrorResponse = {
  details?: {
    fieldErrors?: Record<string, string[] | undefined>;
    formErrors?: string[];
  };
  fieldErrors?: Record<string, string[] | undefined>;
};

const defaultForm: Onboarding = {
  completed: false,
  legalName: "",
  industry: "",
  taxCode: "",
  businessLicenseUrl: "",
  productCategories: "",
  inventoryDescription: "",
  revenueSharePercent: 70,
  commissionRatePercent: 10,
  bccAgreementVersion: "BCC-dCreator-v1",
  bccAgreementAccepted: false,
  bccAgreementTerms: BCC_AGREEMENT_TERMS,
  legalResponsibilityAccepted: false,
  contractFileUrl: "",
  contractSignedAt: null,
  supplementaryBccReviewApproved: false,
  reviewStatus: null
};

export default function BrandOnboardingPage() {
  const [form, setForm] = useState<Onboarding>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState("");
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [uploadingContractFile, setUploadingContractFile] = useState(false);
  const [contractUploadError, setContractUploadError] = useState("");
  const [activeAction, setActiveAction] = useState<"sign" | "request-review" | null>(null);
  const isWaitingReview = form.reviewStatus === "PENDING_REVIEW";
  const isSupplementaryBccApproved = form.supplementaryBccReviewApproved;
  const isSigned = form.completed && Boolean(form.contractSignedAt);

  function setField<K extends keyof Onboarding>(name: K, value: Onboarding[K]) {
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => {
      if (!prev[name as string]) return prev;
      const next = { ...prev } as Record<string, string>;
      delete next[name as string];
      return next;
    });
  }

  function focusFirstInvalidField(errors: Record<string, string>) {
    const firstField = Object.keys(errors)[0];
    if (!firstField) return;
    const fieldElement = document.getElementById(firstField);
    if (!fieldElement) return;
    fieldElement.scrollIntoView({ behavior: "smooth", block: "center" });
    if (typeof (fieldElement as HTMLElement).focus === "function") {
      (fieldElement as HTMLElement).focus();
    }
  }

  async function uploadContractDocument(file: File) {
    setUploadingContractFile(true);
    setContractUploadError("");
    try {
      const formData = new FormData();
      formData.append("contractDocument", file);
      const response = await fetch("/api/uploads/onboarding-doc", {
        method: "POST",
        body: formData
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Không thể tải tài liệu lên");
      }
      const url = payload.data.contractDocumentUrl as string;
      setField("contractFileUrl", url);
      return url;
    } catch (error) {
      setContractUploadError((error as Error).message || "Lỗi tải file");
      throw error;
    } finally {
      setUploadingContractFile(false);
    }
  }

  async function handleContractFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setContractFile(file);
    setFieldErrors((prev) => {
      const next = { ...prev } as Record<string, string>;
      delete next.contractFileUrl;
      return next;
    });
    if (!file) return;
    try {
      await uploadContractDocument(file);
    } catch {
      // error state already set in uploadContractDocument
    }
  }

  async function load() {
    setLoading(true);
    setError("");
    const response = await fetch("/api/brand/dashboard/onboarding", { cache: "no-store" });
    const payload = (await response.json()) as ApiResponse<Onboarding>;
    if (!response.ok || !payload.success) {
      setError(payload.success ? "Không thể tải onboarding" : payload.error);
      setLoading(false);
      return;
    }
    setForm({
      ...defaultForm,
      ...payload.data,
      bccAgreementAccepted: false,
      legalResponsibilityAccepted: false,
      supplementaryBccReviewApproved: Boolean(payload.data.supplementaryBccReviewApproved),
      bccAgreementTerms: payload.data.bccAgreementTerms || BCC_AGREEMENT_TERMS
    });
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function submitForm(requestAdminReview: boolean) {
    const actionLabel = requestAdminReview ? "gửi nội dung bổ sung" : "ký hợp đồng BCC";
    setActiveAction(requestAdminReview ? "request-review" : "sign");

    // Client-side validation to give immediate feedback
    const errors: Record<string, string> = {};
    if (!form.legalName || !form.legalName.trim()) {
      errors.legalName = "Vui lòng nhập Pháp nhân / tên công ty.";
    } else if (form.legalName.trim().length < 2) {
      errors.legalName = "Pháp nhân / tên công ty phải ít nhất 2 ký tự.";
    }
    if (!form.industry || !form.industry.trim()) {
      errors.industry = "Vui lòng nhập Ngành hàng.";
    } else if (form.industry.trim().length < 2) {
      errors.industry = "Ngành hàng phải ít nhất 2 ký tự.";
    }
    if (!form.taxCode || !form.taxCode.trim()) {
      errors.taxCode = "Vui lòng nhập Mã số thuế.";
    } else if (form.taxCode.trim().length < 3) {
      errors.taxCode = "Mã số thuế phải ít nhất 3 ký tự.";
    }
    if (!form.productCategories || !form.productCategories.trim()) {
      errors.productCategories = "Vui lòng nhập Danh mục sản phẩm.";
    } else if (form.productCategories.trim().length < 2) {
      errors.productCategories = "Danh mục sản phẩm phải ít nhất 2 ký tự.";
    }
    if (!form.inventoryDescription || form.inventoryDescription.trim().length < 10) {
      errors.inventoryDescription = "Mô tả tồn kho phải ít nhất 10 ký tự.";
    }
    const normalizedBusinessLicenseUrl = normalizeOptionalUrl(form.businessLicenseUrl);
    if (form.businessLicenseUrl.trim() && !isValidHttpUrl(normalizedBusinessLicenseUrl)) {
      errors.businessLicenseUrl = "URL giấy phép kinh doanh không hợp lệ. Ví dụ: https://example.com";
    }

    if (contractUploadError) {
      errors.contractFileUrl = contractUploadError;
    }
    if (requestAdminReview && !form.contractFileUrl) {
      errors.contractFileUrl = "Vui lòng tải lên hợp đồng/tài liệu bổ sung trước khi gửi admin duyệt.";
    }
    if (!form.bccAgreementAccepted) errors.bccAgreementAccepted = "Bạn phải đồng ý với nội dung hợp đồng BCC.";
    if (!form.legalResponsibilityAccepted) errors.legalResponsibilityAccepted = "Bạn phải xác nhận chịu trách nhiệm pháp lý.";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError(`Không thể ${actionLabel}. Vui lòng kiểm tra các trường được tô đỏ.`);
      setActiveAction(null);
      focusFirstInvalidField(errors);
      return;
    }

    setSaving(true);
    setError("");
    setFieldErrors({});
    setSuccess("");
    if (contractFile && !form.contractFileUrl) {
      try {
        await uploadContractDocument(contractFile);
      } catch {
        setSaving(false);
        setActiveAction(null);
        return;
      }
    }
    const body = {
      ...form,
      businessLicenseUrl: normalizedBusinessLicenseUrl,
      bccAgreementAccepted: form.bccAgreementAccepted,
      bccAgreementTerms: form.bccAgreementTerms,
      legalResponsibilityAccepted: form.legalResponsibilityAccepted,
      requestAdminReview: requestAdminReview
    };

    const response = await fetch("/api/brand/dashboard/onboarding", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    let payload: ApiResponse<Onboarding> | null = null;
    try {
      payload = (await response.json()) as ApiResponse<Onboarding>;
    } catch {
      setSaving(false);
      setActiveAction(null);
      setError("Lỗi phản hồi từ server.");
      return;
    }
    setSaving(false);
    if (!response.ok || !payload.success) {
      const body = payload as (ApiResponse<Onboarding> & ApiErrorResponse) | null;
      const fieldErrorsFromBody = body?.details?.fieldErrors || body?.fieldErrors;
      if (fieldErrorsFromBody && typeof fieldErrorsFromBody === "object") {
        const serverErrors: Record<string, string> = {};
        for (const [key, messages] of Object.entries(fieldErrorsFromBody)) {
          if (Array.isArray(messages) && messages.length > 0) {
            const firstMessage = messages[0];
            if (typeof firstMessage === "string") serverErrors[key] = firstMessage;
          }
        }
        if (Object.keys(serverErrors).length > 0) {
          setFieldErrors(serverErrors);
          setError(`Không thể ${actionLabel}. Vui lòng kiểm tra dữ liệu nhập.`);
          setActiveAction(null);
          focusFirstInvalidField(serverErrors);
          return;
        }
      }
      const firstFormError = body?.details?.formErrors?.[0];
      if (firstFormError) {
        setError(firstFormError);
        setActiveAction(null);
        return;
      }
      setError(payload && !payload.success ? payload.error : "Không thể lưu onboarding");
      setActiveAction(null);
      return;
    }
    setForm({
      ...defaultForm,
      ...payload.data,
      bccAgreementAccepted: requestAdminReview ? false : payload.data.bccAgreementAccepted,
      legalResponsibilityAccepted: requestAdminReview ? false : payload.data.legalResponsibilityAccepted
    });
    if (requestAdminReview) {
      setSuccess("Đã gửi nội dung bổ sung thành công. Hồ sơ đã chuyển trạng thái Chờ admin duyệt. Bạn sẽ nhận thông báo khi có kết quả.");
    } else {
      setSuccess("Ký hợp đồng BCC thành công. Hồ sơ onboarding đã được cập nhật và sẵn sàng cho các bước vận hành tiếp theo.");
    }
    setActiveAction(null);
  }

  function normalizeOptionalUrl(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  }

  function isValidHttpUrl(value: string) {
    if (!value) return true;
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }

  return (
    <>
      
      <>
        <PageHeader title="Onboarding / BCC" subtitle="Hoàn tất yêu cầu sau khi Brand được duyệt trước khi vận hành campaign." />
        {error ? <ErrorState title="Không thể xử lý onboarding" description={error} onRetry={() => void load()} /> : null}
        {success ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}
        {isSigned ? (
          <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
            Đã ký hợp đồng BCC.
          </p>
        ) : (
          <p className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-700">
            Chưa ký BCC.
          </p>
        )}
        {!isSigned && isWaitingReview ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
            Đang chờ admin duyệt yêu cầu sửa/bổ sung BCC.
          </p>
        ) : null}
        {!isSigned && form.reviewStatus === "NEEDS_REVISION" ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
            Admin yêu cầu chỉnh sửa hồ sơ BCC. Vui lòng cập nhật thông tin/tài liệu rồi gửi lại.
          </p>
        ) : null}
        {!isSigned && form.reviewStatus === "REJECTED" ? (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
            Hồ sơ BCC đã bị từ chối. Vui lòng rà soát nội dung và gửi lại hồ sơ bổ sung.
          </p>
        ) : null}
        {!isSigned && isSupplementaryBccApproved ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
            Admin đã duyệt nội dung bổ sung. Vui lòng ký lại BCC để hoàn tất.
          </p>
        ) : null}
        {loading ? (
          <LoadingSkeleton rows={5} />
        ) : (
          <form className="mt-6 grid gap-6" onSubmit={(e) => e.preventDefault()}>
            <section className="dc-card grid gap-4 p-5 md:grid-cols-2">
              <SectionHeader title="Pháp lý & ngành hàng" />
              <div className="grid gap-1">
                <input id="legalName" className={`dc-input ${fieldErrors.legalName ? "border-red-500 ring-1 ring-red-300" : ""}`} placeholder="Pháp nhân / tên công ty" value={form.legalName} onChange={(e) => setField("legalName", e.target.value)} />
                {fieldErrors.legalName ? <p className="text-sm text-red-600">{fieldErrors.legalName}</p> : null}
              </div>
              <div className="grid gap-1">
                <input id="industry" className={`dc-input ${fieldErrors.industry ? "border-red-500 ring-1 ring-red-300" : ""}`} placeholder="Ngành hàng" value={form.industry} onChange={(e) => setField("industry", e.target.value)} />
                {fieldErrors.industry ? <p className="text-sm text-red-600">{fieldErrors.industry}</p> : null}
              </div>
              <div className="grid gap-1">
                <input id="taxCode" className={`dc-input ${fieldErrors.taxCode ? "border-red-500 ring-1 ring-red-300" : ""}`} placeholder="Mã số thuế" value={form.taxCode} onChange={(e) => setField("taxCode", e.target.value)} />
                {fieldErrors.taxCode ? <p className="text-sm text-red-600">{fieldErrors.taxCode}</p> : null}
              </div>
              <div className="grid gap-1">
                <input
                  id="businessLicenseUrl"
                  className={`dc-input ${fieldErrors.businessLicenseUrl ? "border-red-500 ring-1 ring-red-300" : ""}`}
                  placeholder="Giấy phép kinh doanh URL (vd: https://facebook.com/brand)"
                  value={form.businessLicenseUrl}
                  onChange={(e) => setField("businessLicenseUrl", e.target.value)}
                />
                {fieldErrors.businessLicenseUrl ? <p className="text-sm text-red-600">{fieldErrors.businessLicenseUrl}</p> : null}
              </div>
            </section>

            <section className="dc-card grid gap-4 p-5">
              <SectionHeader title="Sản phẩm / tồn kho" />
              <div className="grid gap-1">
                <input id="productCategories" className={`dc-input ${fieldErrors.productCategories ? "border-red-500 ring-1 ring-red-300" : ""}`} placeholder="Danh mục sản phẩm" value={form.productCategories} onChange={(e) => setField("productCategories", e.target.value)} />
                {fieldErrors.productCategories ? <p className="text-sm text-red-600">{fieldErrors.productCategories}</p> : null}
              </div>
              <div className="grid gap-1">
                <textarea id="inventoryDescription" className={`dc-input min-h-28 ${fieldErrors.inventoryDescription ? "border-red-500 ring-1 ring-red-300" : ""}`} placeholder="Tồn kho, voucher, điều kiện đổi quà..." value={form.inventoryDescription} onChange={(e) => setField("inventoryDescription", e.target.value)} />
                {fieldErrors.inventoryDescription ? <p className="text-sm text-red-600">{fieldErrors.inventoryDescription}</p> : null}
              </div>
            </section>

            <section className="dc-card grid gap-4 p-5">
              <SectionHeader title="Hợp đồng BCC" />
              <p className="text-sm text-zinc-600">Nội dung bên dưới là hợp đồng BCC hiện hành giữa Brand và dCreator. Brand không thể sửa trực tiếp các điều khoản này tại đây; nếu cần thêm nội dung hoặc đề xuất sửa đổi, vui lòng gửi kèm tài liệu cho admin xem xét.</p>
              <div className="grid gap-3 text-sm text-zinc-700 md:grid-cols-3">
                <p>Chia doanh thu Brand: <span className="font-bold">{form.revenueSharePercent}%</span></p>
                <p>Commission nền tảng: <span className="font-bold">{form.commissionRatePercent}%</span></p>
                <p>Phiên bản: <span className="font-bold">{form.bccAgreementVersion}</span></p>
              </div>
              <div className="grid gap-2">
                <label className="text-sm text-zinc-600">Nội dung hợp đồng BCC</label>
                <div className="dc-card bg-zinc-50 p-4 rounded-2xl text-sm whitespace-pre-wrap overflow-y-auto max-h-96">
                  {form.bccAgreementTerms}
                </div>
              </div>
              <div className="grid gap-2">
                <label className="text-sm text-zinc-600">Tải lên hợp đồng / tài liệu bổ sung</label>
                <input
                  id="contractDocument"
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                  className={`dc-input bg-white ${fieldErrors.contractFileUrl ? "border-red-500 ring-1 ring-red-300" : ""}`}
                  disabled={uploadingContractFile}
                  onChange={handleContractFileChange}
                />
                {uploadingContractFile ? <p className="text-sm text-zinc-500">Đang tải file lên...</p> : null}
                {contractFile ? <p className="text-sm text-zinc-500">Tệp đã chọn: {contractFile.name}</p> : null}
                {form.contractFileUrl ? (
                  <p className="text-sm text-zinc-500">
                    Tệp đã upload: <a href={form.contractFileUrl} target="_blank" rel="noreferrer" className="underline">{form.contractFileUrl}</a>
                  </p>
                ) : null}
                {fieldErrors.contractFileUrl ? <p className="text-sm text-red-600">{fieldErrors.contractFileUrl}</p> : null}
                {contractUploadError ? <p className="text-sm text-red-600">{contractUploadError}</p> : null}
                <p className="text-xs text-zinc-500">
                  Chọn file hợp đồng hoặc tài liệu bổ sung để gửi admin duyệt. File sẽ được upload lên hệ thống và lưu đường dẫn.
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
                <p className="font-semibold text-zinc-900">Điều khoản chi tiết BCC</p>
                <ul className="mt-3 space-y-2 list-disc pl-5">
                  <li>Brand cam kết cung cấp thông tin sản phẩm, giá, mô tả, tồn kho, điều kiện đổi quà và voucher đầy đủ, chính xác và cập nhật kịp thời.</li>
                  <li>Brand chịu trách nhiệm pháp lý toàn bộ về chất lượng sản phẩm, nguồn gốc, an toàn, bảo hành, khuyến mại và các quy định ngành hàng.</li>
                  <li>Brand quản lý tồn kho và voucher/reward chặt chẽ để tránh oversell; trong trường hợp hết hàng, Brand phải xử lý huỷ đơn, hoàn tiền hoặc bồi thường theo chính sách dCreator.</li>
                  <li>Brand chịu trách nhiệm giải quyết khiếu nại khách hàng liên quan đến sản phẩm, voucher, đổi quà, vận chuyển và hỗ trợ dCreator khi cần.</li>
                  <li>Commission nền tảng 10% được tính trên doanh thu hợp lệ của chiến dịch theo BCC; phần doanh thu còn lại sẽ được chia cho Brand theo tỷ lệ đã thỏa thuận.</li>
                  <li>Brand chịu toàn bộ nghĩa vụ thuế, hóa đơn, giấy phép kinh doanh, chứng nhận chất lượng và mọi nghĩa vụ pháp lý liên quan đến hàng hóa/dịch vụ.</li>
                  <li>dCreator chỉ là nền tảng kết nối và hỗ trợ vận hành; không chịu trách nhiệm trực tiếp về chất lượng sản phẩm, giao hàng hoặc tranh chấp đổi trả giữa Brand và khách hàng.</li>
                  <li>Brand cam kết bảo mật dữ liệu khách hàng, không sử dụng sai mục đích và chỉ dùng cho phục vụ đơn hàng, đổi quà, chăm sóc khách hàng.</li>
                </ul>
              </div>
              <div className="grid gap-2">
                <label className={`flex gap-3 text-sm ${fieldErrors.bccAgreementAccepted || fieldErrors.legalResponsibilityAccepted ? "text-red-700" : "text-zinc-700"}`}>
                  <input
                    id="bccAgreementAccepted"
                    type="checkbox"
                    className="mt-1"
                    checked={form.bccAgreementAccepted}
                    onChange={(e) => {
                      setField("bccAgreementAccepted", e.target.checked);
                      setField("legalResponsibilityAccepted", e.target.checked);
                    }}
                  />
                  <span>Brand xác nhận đã đọc và đồng ý với nội dung hợp đồng BCC hiện hành, đồng thời chấp thuận gửi yêu cầu bổ sung hoặc hợp đồng sửa đổi cho admin xem xét.</span>
                </label>
                {fieldErrors.bccAgreementAccepted ? <p className="text-sm text-red-600">{fieldErrors.bccAgreementAccepted}</p> : null}
                {fieldErrors.legalResponsibilityAccepted ? <p className="text-sm text-red-600">{fieldErrors.legalResponsibilityAccepted}</p> : null}
              </div>
              {!isWaitingReview && !isSigned ? (
                <div className="flex gap-3">
                  <button
                    type="button"
                    className="dc-btn-primary"
                    disabled={saving}
                    onClick={() => void submitForm(false)}
                  >
                    {saving && activeAction === "sign" ? "Đang ký BCC..." : "Ký ngay (không có ý kiến)"}
                  </button>
                  <button
                    type="button"
                    className="dc-btn-outline"
                    disabled={saving}
                    onClick={() => void submitForm(true)}
                  >
                    {saving && activeAction === "request-review" ? "Đang gửi admin duyệt..." : "Gửi nội dung bổ sung & chờ admin duyệt"}
                  </button>
                </div>
              ) : null}
            </section>
          </form>
        )}
      </>
    </>
  );
}







