import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/auth";

// Shown when nobody is logged in. After signIn succeeds, the root layout
// switches to the main app automatically.
export default function LoginScreen() {
  const { signIn } = useAuth();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const name = username.trim();
    if (!name || loading) return;
    setLoading(true);
    setError(null);
    try {
      await signIn(name);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Text style={styles.title}>Welcome to foodbrɐin.</Text>
        <Text style={styles.subtitle}>Enter your username</Text>

        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="#8a8a8a"
          value={username}
          onChangeText={setUsername}
          onSubmitEditing={submit}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
          editable={!loading}
        />
        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={[styles.button, (!username.trim() || loading) && styles.disabled]}
          onPress={submit}
          disabled={!username.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Continue</Text>
          )}
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const GREEN = "#2f7d4f";

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#ffffff" },
  content: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  title: { fontSize: 28, fontWeight: "700", color: "#1a1a1a" },
  subtitle: { fontSize: 16, color: "#666666", marginTop: 8, marginBottom: 24 },
  input: {
    borderWidth: 1,
    borderColor: "#d0d0d0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1a1a1a",
  },
  error: { color: "#b00020", fontSize: 14, marginTop: 8 },
  button: {
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  disabled: { opacity: 0.4 },
  buttonText: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
});