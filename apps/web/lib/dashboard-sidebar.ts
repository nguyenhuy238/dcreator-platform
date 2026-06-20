export const DASHBOARD_SIDEBAR_COLLAPSED_KEY = "dcreator-sidebar-collapsed";

export function parseSidebarCollapsed(value: string | undefined) {
  return value === "true";
}
