import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useProfile } from "@/context/profile";
import { useAuth } from "@/context/auth";

const DIETS = ["Vegetarian", "Vegan", "Pescatarian", "Gluten-free"];

export default function ProfileScreen() {
  const { profile, setProfile } = useProfile();
  const [newBasic, setNewBasic] = useState("");
  const { username, signOut } = useAuth();

  function addBasic() {
    const name = newBasic.trim();
    if (!name) return;
    setProfile((prev) => {
      const exists = prev.basics.some((b) => b.toLowerCase() === name.toLowerCase());
      return exists ? prev : { ...prev, basics: [...prev.basics, name] };
    });
    setNewBasic("");
  }

  function removeBasic(name: string) {
    setProfile((prev) => ({ ...prev, basics: prev.basics.filter((b) => b !== name) }));
  }

  function toggleDiet(name: string) {
    setProfile((prev) => ({
      ...prev,
      diets: prev.diets.includes(name)
        ? prev.diets.filter((d) => d !== name)
        : [...prev.diets, name],
    }));
  }

  function setNotes(notes: string) {
  setProfile((prev) => ({ ...prev, notes }));
}

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Profile</Text>

        {/* Basic ingredients */}
        <Text style={styles.heading}>Basic ingredients</Text>
        <Text style={styles.hint}>Things you always have. Recipes can use these. Tap one to remove it.</Text>
        <View style={styles.chips}>
          {profile.basics.map((b) => (
            <Pressable key={b} style={styles.chip} onPress={() => removeBasic(b)}>
              <Text style={styles.chipText}>{b} ✕</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.addRow}>
          <TextInput
            style={styles.input}
            placeholder="Add a basic, e.g. butter"
            placeholderTextColor="#8a8a8a"
            value={newBasic}
            onChangeText={setNewBasic}
            onSubmitEditing={addBasic}
            returnKeyType="done"
          />
          <Pressable style={styles.addButton} onPress={addBasic}>
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </View>

        {/* Diet: pick any number; none selected = no restrictions */}
        <Text style={styles.heading}>Diet</Text>
        <View style={styles.chips}>
          {DIETS.map((d) => {
            const isSelected = profile.diets.includes(d);
            return (
              <Pressable
                key={d}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => toggleDiet(d)}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{d}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Likes and dislikes */}
        <Text style={styles.heading}>Likes and dislikes</Text>
        <TextInput
          style={[styles.input, styles.notes]}
          placeholder="e.g. Don't like spicy food. Avoid processed ingredients."
          placeholderTextColor="#8a8a8a"
          value={profile.notes}
          onChangeText={setNotes}
          multiline
          maxLength={500}
          textAlignVertical="top"
        />
        <Text style={{ fontSize: 12, color: "#666666", marginTop: 4 }}>{profile.notes.length}/500</Text>

        <Pressable style={styles.signOutButton} onPress={signOut}>
          <Text style={styles.signOutButtonText}>Log out ({username})</Text>
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  );
}

const GREEN = "#2f7d4f";

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#ffffff" },
  content: { paddingHorizontal: 16, paddingBottom: 48 },
  title: { fontSize: 28, fontWeight: "700", color: "#1a1a1a", marginTop: 8 },
  heading: { fontSize: 18, fontWeight: "700", color: "#1a1a1a", marginTop: 24, marginBottom: 4 },
  hint: { fontSize: 14, color: "#666666", marginBottom: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8, marginBottom: 12 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#d0d0d0",
    backgroundColor: "#f7f7f7",
  },
  chipSelected: { backgroundColor: GREEN, borderColor: GREEN },
  chipText: { fontSize: 15, color: "#1a1a1a" },
  chipTextSelected: { color: "#ffffff", fontWeight: "600" },
  addRow: { flexDirection: "row", gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d0d0d0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#1a1a1a",
  },
  addButton: { justifyContent: "center", paddingHorizontal: 16, borderRadius: 10, backgroundColor: "#1a1a1a" },
  addButtonText: { color: "#ffffff", fontWeight: "600" },
  signOutButton: { alignSelf: "flex-start", marginTop: 24, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: "#b00020" },
  signOutButtonText: { color: "#ffffff", fontWeight: "600" },
  notes: { minHeight: 120, marginTop: 8 },
});