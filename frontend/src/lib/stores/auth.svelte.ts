/**
 * Auth Store (Svelte 5 Runes) — Sistem Asesmen ASN
 */

import { ApiClient } from "../api/client";
import type { User } from "../types";

class AuthState {
  user = $state<User | null>(null);
  token = $state<string | null>(null);
  isLoading = $state<boolean>(true);
  error = $state<string | null>(null);

  get isAuthenticated(): boolean {
    return this.user !== null && this.token !== null;
  }

  get isAdmin(): boolean {
    return this.user?.role === "ADMIN";
  }

  get isPeserta(): boolean {
    return this.user?.role === "PESERTA";
  }

  async init() {
    if (typeof window === "undefined") {
      this.isLoading = false;
      return;
    }

    const savedToken = ApiClient.getToken();
    if (!savedToken) {
      this.isLoading = false;
      return;
    }

    this.token = savedToken;
    this.isLoading = true;

    try {
      const res = await ApiClient.get<{ user: User }>("/auth/me");
      if (res.success && res.data?.user) {
        this.user = res.data.user;
      } else {
        this.logout();
      }
    } catch (err: any) {
      this.logout();
    } finally {
      this.isLoading = false;
    }
  }

  async login(nip: string, password: string): Promise<boolean> {
    this.isLoading = true;
    this.error = null;

    try {
      const res = await ApiClient.post<{ token: string; user: User }>("/auth/login", {
        nip,
        password,
      });

      if (res.success && res.data) {
        this.token = res.data.token;
        this.user = res.data.user;
        ApiClient.setToken(res.data.token);
        return true;
      } else {
        this.error = res.message || "Kombinasi NIP dan password tidak sesuai.";
        return false;
      }
    } catch (err: any) {
      this.error = err.message || "Gagal melakukan proses masuk.";
      return false;
    } finally {
      this.isLoading = false;
    }
  }

  logout() {
    this.user = null;
    this.token = null;
    this.error = null;
    ApiClient.removeToken();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }
}

export const auth = new AuthState();
