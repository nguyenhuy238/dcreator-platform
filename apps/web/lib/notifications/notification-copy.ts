const viCopyMap: Record<string, string> = {
  "Dong gop thanh cong": "Đóng góp thành công",
  "Ban da dong gop thanh cong.": "Bạn đã đóng góp thành công.",
  "Nhan voucher": "Nhận voucher",
  "Ban vua nhan duoc voucher moi.": "Bạn vừa nhận được voucher mới.",
  "Nhan nhiem vu": "Nhận nhiệm vụ",
  "Ban da nhan nhiem vu thanh cong.": "Bạn đã nhận nhiệm vụ thành công.",
  "Da nop proof": "Đã nộp minh chứng",
  "Proof cua ban da duoc gui.": "Minh chứng của bạn đã được gửi.",
  "Proof duoc duyet": "Minh chứng được duyệt",
  "Proof cua ban da duoc phe duyet.": "Minh chứng của bạn đã được phê duyệt.",
  "Proof bi tu choi": "Minh chứng bị từ chối",
  "Proof cua ban da bi tu choi.": "Minh chứng của bạn đã bị từ chối.",
  "Don nhiem vu duoc duyet": "Đơn nhiệm vụ được duyệt",
  "Don xin lam nhiem vu cua ban da duoc duyet.": "Đơn xin làm nhiệm vụ của bạn đã được duyệt.",
  "Don nhiem vu bi tu choi": "Đơn nhiệm vụ bị từ chối",
  "Don xin lam nhiem vu cua ban da bi tu choi.": "Đơn xin làm nhiệm vụ của bạn đã bị từ chối.",
  "Video duoc duyet": "Video được duyệt",
  "Video review cua ban da duoc duyet.": "Video review của bạn đã được duyệt.",
  "Video bi tu choi": "Video bị từ chối",
  "Video review cua ban da bi tu choi.": "Video review của bạn đã bị từ chối.",
  "Nhiem vu hoan thanh": "Nhiệm vụ hoàn thành",
  "Nhiem vu cua ban da duoc duyet hoan thanh.": "Nhiệm vụ của bạn đã được duyệt hoàn thành.",
  "Buoc cuoi bi tu choi": "Bước cuối bị từ chối",
  "Buoc hoan thanh cua ban da bi tu choi.": "Bước hoàn thành của bạn đã bị từ chối.",
  "Duyet creator": "Duyệt Creator",
  "Don dang ky creator da duoc duyet.": "Đơn đăng ký Creator đã được duyệt.",
  "Duyet brand": "Duyệt Brand",
  "Don dang ky brand da duoc duyet.": "Đơn đăng ký Brand đã được duyệt.",
  "Campaign duoc duyet": "Campaign được duyệt",
  "Campaign cua ban da duoc duyet.": "Campaign của bạn đã được duyệt.",
  "Campaign bi tu choi": "Campaign bị từ chối",
  "Campaign cua ban da bi tu choi.": "Campaign của bạn đã bị từ chối.",
  "Thanh toan thanh cong": "Thanh toán thành công",
  "Giao dich thanh toan da thanh cong.": "Giao dịch thanh toán đã thành công.",
  "Thanh toan that bai": "Thanh toán thất bại",
  "Giao dich thanh toan that bai.": "Giao dịch thanh toán thất bại.",
  "Yeu cau payout": "Yêu cầu payout",
  "Yeu cau payout da duoc tao.": "Yêu cầu payout đã được tạo.",
  "Payout duoc duyet": "Payout được duyệt",
  "Yeu cau payout da duoc phe duyet.": "Yêu cầu payout đã được phê duyệt.",
  "Payout bi tu choi": "Payout bị từ chối",
  "Yeu cau payout da bi tu choi.": "Yêu cầu payout đã bị từ chối.",
  "Creator application approved": "Yêu cầu Creator đã được duyệt",
  "Creator application updated": "Yêu cầu Creator đã cập nhật",
  "Brand application approved": "Yêu cầu Brand đã được duyệt",
  "Brand application updated": "Yêu cầu Brand đã cập nhật"
};

export function normalizeNotificationText(value: string) {
  return viCopyMap[value] ?? value;
}

export function formatNotificationDateTime(value: string) {
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
