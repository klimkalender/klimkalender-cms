import type { Profile } from "@/types";

  export function lookupProfileName(profiles: Profile[], userId: string | null | undefined): string {
    if (!userId) return '-';
    const profile = profiles.find(p => p.id === userId);
    return profile ? profile.username || profile.full_name || profile.username || '?' : '-';
  }
