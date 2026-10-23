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
      const res = await ApiClient.get<any>("/auth/me");
      const user = res.data?.user || res.user;
      if (res.success && user) {
        this.user = user;
      } else {
        this.clearAuth();
      }
    } catch {
      this.clearAuth();
    } finally {
      this.isLoading = false;
    }
  }

  async login(nip: string, password: string): Promise<boolean> {
    this.isLoading = true;
    this.error = null;

    try {
      const res = await ApiClient.post<any>("/auth/login", {
        nip,
        password,
      });

      const token = res.data?.token || res.token;
      const user = res.data?.user || res.user;

      if (res.success && token && user) {
        this.token = token;
        this.user = user;
        ApiClient.setToken(token);
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

  clearAuth() {
    this.user = null;
    this.token = null;
    this.error = null;
    ApiClient.removeToken();
  }

  logout() {
    this.clearAuth();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }
}

export const auth = new AuthState();
