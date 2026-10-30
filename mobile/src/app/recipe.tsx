import { useLocalSearchParams } from "expo-router";
import { useEffect, useState, useRef } from "react";
import type { ComponentRef } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { getRecipe, sendChat } from "@/api/recipes";
import type { ChatMessage, Recipe, Suggestion } from "@/types/recipe";
import { useProfile } from "@/context/profile";

// Opened from a suggestion card. Params arrive as strings, so the card and
// ingredients are passed as JSON and parsed back here.
export default function RecipeScreen() {
  const params = useLocalSearchParams<{ suggestion: string; ingredients: string }>();
  const { profile } = useProfile();
  const ingredients = JSON.parse(params.ingredients) as string[];
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState<string | null>(null);


  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollViewRef = useRef<ComponentRef<typeof ScrollView>>(null);

  // Runs when the screen opens: ask the Worker for the full recipe.
  useEffect(() => {
    const suggestion = JSON.parse(params.suggestion) as Suggestion;

    getRecipe(suggestion, ingredients, profile)
      .then(setRecipe)
      .catch((err) => setError(String(err)));
  }, [params.suggestion, params.ingredients]);

  async function send() {
    const text = input.trim();
    if (!text || !recipe || sending) return;
 
    // The LLM remembers nothing, so we send the whole chat every time.
    const history: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(history);
    setInput("");
    setSending(true);
 
    try {
      const reply = await sendChat(recipe, ingredients, profile, history);
      setMessages([...history, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages([...history, { role: "assistant", content: `Sorry, something went wrong: ${err}` }]);
    } finally {
      setSending(false);
    }
  }

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
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={100} // roughly the header height, so the input clears the keyboard
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.screen}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
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
 
        {messages.length > 0 && <Text style={styles.heading}>Chat</Text>}
        {messages.map((m, i) => (
          <View
            key={i}
            style={[styles.bubble, m.role === "user" ? styles.userBubble : styles.botBubble]}
          >
            <Text style={m.role === "user" ? styles.userText : styles.body}>{m.content}</Text>
          </View>
        ))}
        {sending && <ActivityIndicator style={styles.typing} />}
      </ScrollView>
 
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ask or tweak, e.g. make it serve 4"
          placeholderTextColor="#8a8a8a"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={send}
          returnKeyType="send"
          editable={!sending}
        />
        <Pressable
          style={[styles.sendButton, (!input.trim() || sending) && styles.disabled]}
          onPress={send}
          disabled={!input.trim() || sending}
        >
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
 
const GREEN = "#2f7d4f";
 
const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#ffffff" },
  screen: { padding: 16, paddingBottom: 24 },
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
  bubble: { borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 8, maxWidth: "85%" },
  userBubble: { alignSelf: "flex-end", backgroundColor: GREEN },
  botBubble: { alignSelf: "flex-start", backgroundColor: "#f0f0f0" },
  userText: { fontSize: 16, lineHeight: 22, color: "#ffffff" },
  typing: { alignSelf: "flex-start", marginTop: 4 },
  inputRow: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    backgroundColor: "#ffffff",
  },
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
  sendButton: { justifyContent: "center", paddingHorizontal: 16, borderRadius: 10, backgroundColor: GREEN },
  sendText: { color: "#ffffff", fontWeight: "600" },
  disabled: { opacity: 0.4 },
});