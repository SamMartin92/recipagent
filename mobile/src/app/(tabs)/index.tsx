import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getSuggestions } from "../../api/recipes";
import { fetchIngredients, markIngredientsUsed, addIngredient as saveIngredient, Ingredient } from "@/api/server";
import { Suggestion } from "@/types/recipe";
import { useProfile } from "@/context/profile";
import { useAuth } from "@/context/auth";


export default function IngredientsScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const { token } = useAuth();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [lastIngredients, setLastIngredients] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [newItem, setNewItem] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null); // null = no recipe showing

  // Most-used first; ties sorted alphabetically.
  const sorted = [...ingredients].sort(
    (a, b) => b.useCount - a.useCount || a.name.localeCompare(b.name)
  );

  function toggle(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  async function refresh() {
    if (!token) return;
    try {
      setIngredients(await fetchIngredients(token));
    } catch (err) {
      Alert.alert("Couldn't load ingredients", String(err));
    }
  }

  useEffect(() => {
    refresh();
  }, [token]);

  async function addIngredient() {
    const name = newItem.trim();
    if (!name || !token) return;
    setNewItem("");
    await saveIngredient(token, name);
    await refresh();
    setSelected((prev) => new Set(prev).add(name));
  }

  async function suggestRecipe() {
    if (selected.size === 0) {
      Alert.alert("Pick some ingredients first");
      return;
    }

    const chosen = [...selected];
    // Bump the use count of everything selected, so it moves up the list.
    if (token) {
      markIngredientsUsed(token, chosen).then(refresh);
    }
    setSelected(new Set());

    setLoading(true);

    try {
      const list = await getSuggestions(chosen, profile);
      setLastIngredients(chosen);
      setSuggestions(list);
    } catch (err) {
      Alert.alert("Couldn't get suggestions", String(err));
    } finally {
      setLoading(false);
    }
  }

  if (suggestions !== null) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <Text style={styles.title}>Suggestions</Text>
        <ScrollView contentContainerStyle={styles.cardList}>
          {suggestions.map((s, index) => (
            <Pressable
              key={index}
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: "/recipe",
                  params: {
                    suggestion: JSON.stringify(s),
                    ingredients: JSON.stringify(lastIngredients),
                  },
                })
              }
            >
              <Text style={styles.cardTitle}>{s.title}</Text>
              <Text style={styles.cardDescription}>{s.description}</Text>
              <Text style={styles.cardMeta}>{s.minutes} min</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={styles.footer}>
          <Pressable style={styles.suggestButton} onPress={() => setSuggestions(null)}>
            <Text style={styles.suggestText}>Back to ingredients</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <Text style={styles.title}>foodbrɐin.</Text>
      <Text style={styles.subtitle}>Tap what you have</Text>

      <ScrollView
        contentContainerStyle={styles.grid}
        keyboardShouldPersistTaps="handled"
      >
        {sorted.map((item) => {
          const isSelected = selected.has(item.name);
          return (
            <Pressable
              key={item.name}
              onPress={() => toggle(item.name)}
              style={[styles.chip, isSelected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {item.name}
                {item.useCount > 0 && ` (${item.useCount})`}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          placeholder="Add an ingredient"
          placeholderTextColor="#8a8a8a"
          value={newItem}
          onChangeText={setNewItem}
          onSubmitEditing={addIngredient}
          returnKeyType="done"
        />
        <Pressable style={styles.addButton} onPress={addIngredient}>
          <Text style={styles.addButtonText}>Add</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        {selected.size > 0 && (
          <Pressable onPress={() => setSelected(new Set())}>
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        )}
        <Pressable
          style={[styles.suggestButton, (selected.size === 0 || loading) && styles.suggestDisabled]}
          onPress={suggestRecipe}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.suggestText}>
              Suggest a recipe{selected.size > 0 ? ` (${selected.size})` : ""}
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const GREEN = "#2f7d4f";

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#ffffff", paddingHorizontal: 16 },
  title: { fontSize: 28, fontWeight: "700", color: "#1a1a1a", marginTop: 8 },
  subtitle: { fontSize: 15, color: "#666666", marginBottom: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingBottom: 16 },
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
  addRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
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
  addButton: {
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#1a1a1a",
  },
  addButtonText: { color: "#ffffff", fontWeight: "600" },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 16,
    paddingBottom: 24,
  },
  clearText: { color: "#666666", fontSize: 15 },
  suggestButton: {
    backgroundColor: GREEN,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  suggestDisabled: { opacity: 0.4 },
  suggestText: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
  cardList: { gap: 12, paddingVertical: 16 },
  card: {
    borderWidth: 1,
    borderColor: "#d0d0d0",
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#f7f7f7",
  },
  cardTitle: { fontSize: 18, fontWeight: "600", color: "#1a1a1a", marginBottom: 4 },
  cardDescription: { fontSize: 15, color: "#444444", marginBottom: 8 },
  cardMeta: { fontSize: 13, color: "#2f7d4f", fontWeight: "600" },
});

