export function needsDateOfBirth(profile: { date_of_birth?: string | null } | null): boolean {
  return profile?.date_of_birth === '1900-01-01';
}
