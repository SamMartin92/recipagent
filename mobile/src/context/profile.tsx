import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { fetchProfile, saveProfile } from "@/api/server";
import { useAuth } from "@/context/auth";
import { DEFAULT_PROFILE, type Profile } from "@/types/profile";

// Holds the profile once for the whole app, so every screen can read it.

type ProfileContextValue = {
  profile: Profile;
  setProfile: (update: (prev: Profile) => Profile) => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [profile, setProfileState] = useState<Profile>(DEFAULT_PROFILE);

  // The last version the server has. Used to skip saving when nothing changed
  // (including right after loading). null = not loaded yet, so don't save.
  const lastSaved = useRef<string | null>(null); 

  useEffect(() => {
    lastSaved.current = null; // reset when the user changes
    if (!token) {
      setProfileState(DEFAULT_PROFILE);
      return;
    }
    fetchProfile(token)
      .then((loaded) => {
        lastSaved.current = JSON.stringify(loaded);
        setProfileState(loaded);
      })
      .catch((err) => {
        console.error("Failed to load profile", err);
      })}, [token]);

  // Save changes one second after the last edit (debounce), so typing in the
  // notes box sends one request, not one per letter.
  useEffect(() => {
    if (!token || lastSaved.current === null) return;
    const json = JSON.stringify(profile);
    if (json === lastSaved.current) return; // nothing new to save

    const timer = setTimeout(() => {
      saveProfile(token, profile)
        .then(() => {
          lastSaved.current = json;
        })
        .catch((err) => console.log("Couldn't save profile:", err));
    }, 1000);

        // If the profile changes again within the second, cancel this save;
      // the next run of this effect schedules a fresh one.
      return () => clearTimeout(timer);
    }, [profile, token]);
        
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