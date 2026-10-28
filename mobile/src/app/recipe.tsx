import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import { getRecipe } from "@/api/recipes";
import type { Recipe, Suggestion } from "@/types/recipe";

// Opened from a suggestion card. Params arrive as strings, so the card and
// ingredients are passed as JSON and parsed back here.
export default function RecipeScreen() {
  const params = useLocalSearchParams<{ suggestion: string; ingredients: string }>();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Runs when the screen opens: ask the Worker for the full recipe.
  useEffect(() => {
    const suggestion = JSON.parse(params.suggestion) as Suggestion;
    const ingredients = JSON.parse(params.ingredients) as string[];

    getRecipe(suggestion, ingredients)
      .then(setRecipe)
      .catch((err) => setError(String(err)));
  }, [params.suggestion, params.ingredients]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Couldn't load the recipe.{"\n"}{error}</Text>
      </View>
    );
  }

  if (!recipe) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.muted}>Writing your recipe…</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Text style={styles.title}>{recipe.title}</Text>
      <Text style={styles.meta}>
        {recipe.minutes} min · serves {recipe.servings}
      </Text>

      <Text style={styles.heading}>Ingredients</Text>
      {recipe.ingredients.map((item, i) => (
        <Text key={i} style={styles.body}>• {item}</Text>
      ))}

      <Text style={styles.heading}>Method</Text>
      {recipe.steps.map((step, i) => (
        <View key={i} style={styles.step}>
          <Text style={styles.stepNumber}>{i + 1}</Text>
          <Text style={[styles.body, styles.stepText]}>{step}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const GREEN = "#2f7d4f";

const styles = StyleSheet.create({
  screen: { padding: 16, paddingBottom: 48, backgroundColor: "#ffffff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24, backgroundColor: "#ffffff" },
  title: { fontSize: 26, fontWeight: "700", color: "#1a1a1a" },
  meta: { fontSize: 14, color: GREEN, fontWeight: "600", marginTop: 4 },
  heading: { fontSize: 18, fontWeight: "700", color: "#1a1a1a", marginTop: 24, marginBottom: 8 },
  body: { fontSize: 16, lineHeight: 24, color: "#1a1a1a" },
  step: { flexDirection: "row", gap: 12, marginBottom: 12 },
  stepNumber: { fontSize: 16, fontWeight: "700", color: GREEN, width: 20 },
  stepText: { flex: 1 },
  muted: { fontSize: 15, color: "#666666" },
  error: { fontSize: 15, color: "#b00020", textAlign: "center" },
});