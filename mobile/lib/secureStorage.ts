import AsyncStorage from "@react-native-async-storage/async-storage";
import aesjs from "aes-js";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

import type { SupportedStorage } from "@supabase/supabase-js";

/**
 * LargeSecureStore — Supabase's documented pattern for React Native.
 *
 * Why: `expo-secure-store` caps each value at 2048 bytes. A Supabase session
 * (access + refresh token, user object, and — for Google OAuth — provider
 * tokens) routinely exceeds that and would be truncated or rejected.
 *
 * How: for each storage key we
 *   1. generate a random 256-bit AES key and keep it in SecureStore (Keychain / Keystore), and
 *   2. AES-CTR encrypt the actual value and keep the ciphertext in AsyncStorage.
 *
 * Plaintext tokens never touch AsyncStorage. Losing the SecureStore key makes
 * the ciphertext unreadable, which is the desired fail-closed behaviour.
 */
class LargeSecureStore implements SupportedStorage {
  private async encrypt(key: string, value: string): Promise<string> {
    const encryptionKey = Crypto.getRandomValues(new Uint8Array(32));
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));

    await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(encryptionKey), {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });

    return aesjs.utils.hex.fromBytes(encryptedBytes);
  }

  private async decrypt(key: string, value: string): Promise<string | null> {
    const encryptionKeyHex = await SecureStore.getItemAsync(key);
    if (!encryptionKeyHex) return null;

    const cipher = new aesjs.ModeOfOperation.ctr(
      aesjs.utils.hex.toBytes(encryptionKeyHex),
      new aesjs.Counter(1),
    );
    const decryptedBytes = cipher.decrypt(aesjs.utils.hex.toBytes(value));
    return aesjs.utils.utf8.fromBytes(decryptedBytes);
  }

  async getItem(key: string): Promise<string | null> {
    const encrypted = await AsyncStorage.getItem(key);
    if (!encrypted) return null;
    try {
      return await this.decrypt(key, encrypted);
    } catch (error) {
      // Corrupt or key-less ciphertext — fail closed and clear it.
      console.warn("[secureStorage] decrypt failed, clearing key", key, error);
      await this.removeItem(key);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    const encrypted = await this.encrypt(key, value);
    await AsyncStorage.setItem(key, encrypted);
  }

  async removeItem(key: string): Promise<void> {
    await Promise.all([AsyncStorage.removeItem(key), SecureStore.deleteItemAsync(key)]);
  }
}

export const secureStorage = new LargeSecureStore();
