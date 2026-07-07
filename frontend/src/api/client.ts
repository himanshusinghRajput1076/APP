/**
 * IDEACON API client — axios wrapper with token injection.
 */
import axios, { AxiosInstance } from "axios";
import { storage } from "@/src/utils/storage";

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

if (!BASE_URL) {
  console.warn("EXPO_PUBLIC_BACKEND_URL missing");
}

export const TOKEN_KEY = "ideacon.token";

export const api: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 30000,
});

api.interceptors.request.use(async (config) => {
  const token = await storage.secureGet<string>(TOKEN_KEY, "");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function wsUrl(userId: string, token: string) {
  const base = BASE_URL || "";
  const wsBase = base.replace(/^http/, "ws");
  return `${wsBase}/api/ws/${userId}?token=${encodeURIComponent(token)}`;
}

export type Role = "student" | "investor" | "growing_startup" | "admin";

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  kyc_status: "pending" | "submitted" | "approved" | "rejected";
  trial_expires_at?: string;
  subscription?: any;
  credits: number;
  photo?: string | null;
  sector?: string;
  bio?: string;
  website?: string;
  company_name?: string;
  investment_amount?: number;
  linkedin?: string;
  skills?: string[];
  active: boolean;
};
