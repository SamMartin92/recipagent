import { createContext, useContext, useState, type ReactNode } from "react";

import { DEFAULT_PROFILE, type Profile } from "@/types/profile";

// Holds the profile once for the whole app, so every screen can read it.
// For now it resets on reload; later it loads from the home PC server.

type ProfileContextValue = {
  profile: Profile;
  setProfile: (update: (prev: Profile) => Profile) => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<Profile>(DEFAULT_PROFILE);
  const setProfile = (update: (prev: Profile) => Profile) => setProfileState(update);

  return (
    <ProfileContext.Provider value={{ profile, setProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

// Use in any screen: const { profile, setProfile } = useProfile();
export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used inside ProfileProvider");
  return ctx;
}