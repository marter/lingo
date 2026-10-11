export type AgeBand = "7-9" | "10-12" | "13+";

export interface Child {
  id: string;
  nickname: string;
  avatar: string;
  age_band: AgeBand;
}

/** What a shared device sees (family token). */
export interface Family {
  has_pin: boolean;
  email_verified: boolean;
  children: Child[];
}

/** The parent area's view (parent token). */
export interface ParentMe extends Family {
  email: string;
}

export interface ProfileOptions {
  avatars: string[];
  age_bands: AgeBand[];
  max_children: number;
}
