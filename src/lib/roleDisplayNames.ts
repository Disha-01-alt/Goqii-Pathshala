// Centralized role display name mapping
// Database values: sme, sme_expert (kept for safety)
// UI display: Module Designer, SME

export const ROLE_DISPLAY_NAMES: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  sme: "Module Designer",
  sme_expert: "SME",
  learner: "Learner",
};

export function getRoleDisplayName(role: string | null): string {
  if (!role) return "";
  return ROLE_DISPLAY_NAMES[role] || role.charAt(0).toUpperCase() + role.slice(1).replace("_", " ");
}
