/**
 * PRD requires staff-number based auth UX (no email shown).
 * We map staff_number -> deterministic email used by the auth provider.
 */
export function staffNumberToEmail(staffNumber: string) {
  const normalized = staffNumber.trim();
  return `${normalized}@rail.local`;
}
