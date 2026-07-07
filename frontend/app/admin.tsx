/**
 * Admin Dashboard — analytics + user management.
 */
import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Modal, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "@/src/theme/ThemeProvider";
import { useAuth } from "@/src/context/AuthContext";
import { spacing, typography } from "@/src/theme/tokens";
import { Card, Badge, Btn, Chip } from "@/src/components/ui";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";

export default function AdminDashboard() {
  const { theme, toggle, mode } = useTheme();
  const router = useRouter();
  const { user, signOut } = useAuth();

  const [analytics, setAnalytics] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [selectedKyc, setSelectedKyc] = useState<any>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [a, u] = await Promise.all([
        api.get("/admin/analytics"),
        api.get("/admin/users", { params: filter ? { role: filter } : {} }),
      ]);
      setAnalytics(a.data);
      setUsers(u.data.users || []);
    } catch { /* ignore */ }
    setRefreshing(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const openUser = async (u: any) => {
    setSelectedUser(u);
    try {
      const r = await api.get(`/admin/kyc/${u.id}`);
      setSelectedKyc(r.data.kyc);
    } catch { setSelectedKyc(null); }
  };

  const approve = async () => {
    if (!selectedUser) return;
    await api.post(`/admin/kyc/${selectedUser.id}/approve`);
    setSelectedUser(null);
    load();
  };
  const reject = async () => {
    if (!selectedUser) return;
    await api.post(`/admin/kyc/${selectedUser.id}/reject`);
    setSelectedUser(null);
    load();
  };
  const toggleActive = async () => {
    if (!selectedUser) return;
    await api.post(`/admin/user/${selectedUser.id}/toggle-active`);
    setSelectedUser(null);
    load();
  };

  if (!user || user.role !== "admin") {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: theme.text }}>Admin access required</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={{ color: theme.primary, fontSize: 10, letterSpacing: 3, fontWeight: "700" }}>CONTROL ROOM</Text>
            <Text style={{ color: theme.text, fontSize: 22, fontWeight: "900", marginTop: 2 }}>Admin Dashboard</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity testID="admin-theme" onPress={toggle} style={{ width: 40, height: 40, borderWidth: 1, borderColor: theme.border, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={mode === "dark" ? "sunny-outline" : "moon-outline"} size={18} color={theme.text} />
            </TouchableOpacity>
            <TouchableOpacity testID="admin-logout" onPress={signOut} style={{ width: 40, height: 40, borderWidth: 1, borderColor: theme.border, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="log-out-outline" size={18} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={theme.primary} />}
        >
          {/* KPIs — dense grid (Control Room) */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            <KpiCell label="TOTAL USERS" value={analytics?.total_users ?? 0} color={theme.primary} />
            <KpiCell label="ACTIVE SUBS" value={analytics?.active_subscriptions ?? 0} color={theme.secondary} />
            <KpiCell label="REVENUE (₹)" value={`${analytics?.total_revenue_inr?.toFixed(0) ?? 0}`} color={theme.primary} />
            <KpiCell label="PITCHES" value={analytics?.total_pitches ?? 0} color={theme.secondary} />
            <KpiCell label="MESSAGES" value={analytics?.total_messages ?? 0} color={theme.primary} />
            <KpiCell label="TICKETS" value={analytics?.total_tickets ?? 0} color={theme.secondary} />
          </View>

          {/* Role breakdown */}
          <Card style={{ marginTop: spacing.lg }}>
            <Text style={{ ...typography.caption, color: theme.textMuted }}>USERS BY ROLE</Text>
            <View style={{ marginTop: 12, gap: 8 }}>
              {analytics?.users_by_role && Object.entries(analytics.users_by_role).map(([role, count]) => (
                <View key={role} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: theme.text }}>{role.replace("_", " ").toUpperCase()}</Text>
                  <Text style={{ color: theme.primary, fontWeight: "700" }}>{String(count)}</Text>
                </View>
              ))}
            </View>
          </Card>

          <Card style={{ marginTop: 12 }}>
            <Text style={{ ...typography.caption, color: theme.textMuted }}>KYC STATUS</Text>
            <View style={{ marginTop: 12, gap: 8 }}>
              <Row label="Submitted" value={String(analytics?.kyc?.submitted ?? 0)} color={theme.warning} />
              <Row label="Approved" value={String(analytics?.kyc?.approved ?? 0)} color={theme.secondary} />
              <Row label="Rejected" value={String(analytics?.kyc?.rejected ?? 0)} color={theme.error} />
            </View>
          </Card>

          {/* Users list */}
          <View style={{ marginTop: spacing.lg }}>
            <Text style={{ ...typography.caption, color: theme.textMuted, marginBottom: 12 }}>USERS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
              <Chip label="All" active={!filter} onPress={() => setFilter(null)} testID="admin-filter-all" />
              <Chip label="Students" active={filter === "student"} onPress={() => setFilter("student")} testID="admin-filter-student" />
              <Chip label="Investors" active={filter === "investor"} onPress={() => setFilter("investor")} testID="admin-filter-investor" />
              <Chip label="Startups" active={filter === "growing_startup"} onPress={() => setFilter("growing_startup")} testID="admin-filter-startup" />
            </ScrollView>

            <View style={{ gap: 8 }}>
              {users.map((u) => (
                <TouchableOpacity
                  key={u.id}
                  testID={`admin-user-${u.id}`}
                  onPress={() => openUser(u)}
                  activeOpacity={0.85}
                >
                  <Card style={{ padding: 12 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: theme.text, fontWeight: "700" }}>{u.name}</Text>
                        <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 2 }}>{u.email} · {u.role}</Text>
                      </View>
                      <Badge
                        text={u.kyc_status.toUpperCase()}
                        color={u.kyc_status === "approved" ? theme.secondary : u.kyc_status === "submitted" ? theme.warning : theme.textMuted}
                      />
                    </View>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* User detail modal */}
        <Modal visible={!!selectedUser} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setSelectedUser(null)}>
          <View style={{ flex: 1, backgroundColor: theme.overlay, justifyContent: "flex-end" }}>
            <View style={{ backgroundColor: theme.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderColor: theme.borderStrong, maxHeight: "88%" }}>
              <View style={{ padding: spacing.md, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: theme.border }}>
                <Text style={{ color: theme.text, fontSize: 18, fontWeight: "800" }}>User Details</Text>
                <TouchableOpacity testID="close-user-modal" onPress={() => setSelectedUser(null)}><Ionicons name="close" size={22} color={theme.text} /></TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
                {selectedUser ? (
                  <>
                    <Row label="Name" value={selectedUser.name} />
                    <Row label="Email" value={selectedUser.email} />
                    <Row label="Role" value={selectedUser.role} />
                    <Row label="KYC" value={selectedUser.kyc_status} />
                    <Row label="Active" value={selectedUser.active ? "yes" : "no"} />
                    <Row label="Credits" value={String(selectedUser.credits || 0)} />
                    <Row label="Subscription" value={selectedUser.subscription?.plan_id || "none"} />
                    {selectedKyc ? (
                      <View style={{ marginTop: 12 }}>
                        <Text style={{ ...typography.caption, color: theme.textMuted }}>KYC DATA</Text>
                        <View style={{ marginTop: 8, gap: 6 }}>
                          <Row label="PAN" value={selectedKyc.pan} />
                          <Row label="Aadhar" value={selectedKyc.aadhar} />
                          <Row label="Mobile" value={selectedKyc.mobile} />
                          <Row label="Institution" value={selectedKyc.college_or_school_name || "—"} />
                        </View>
                        {selectedKyc.id_photo ? <Image source={{ uri: selectedKyc.id_photo }} style={{ width: "100%", height: 180, marginTop: 12, borderRadius: 6 }} /> : null}
                      </View>
                    ) : null}

                    <View style={{ marginTop: 20, gap: 10 }}>
                      {selectedUser.kyc_status === "submitted" ? (
                        <>
                          <Btn title="Approve KYC" onPress={approve} variant="secondary" testID="approve-kyc-btn" />
                          <Btn title="Reject KYC" onPress={reject} variant="danger" testID="reject-kyc-btn" />
                        </>
                      ) : null}
                      <Btn title={selectedUser.active ? "Disable Account" : "Enable Account"} onPress={toggleActive} variant="outline" testID="toggle-active-btn" />
                    </View>
                  </>
                ) : null}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

function KpiCell({ label, value, color }: { label: string; value: string | number; color: string }) {
  const { theme } = useTheme();
  return (
    <View style={{
      flex: 1, minWidth: "31%",
      padding: spacing.md,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      minHeight: 92,
      justifyContent: "space-between",
    }}>
      <Text style={{ color: theme.textMuted, fontSize: 9, letterSpacing: 1.5, fontWeight: "600" }}>{label}</Text>
      <Text style={{ color, fontSize: 24, fontWeight: "900" }} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
      <Text style={{ color: theme.textMuted, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: color || theme.text, fontWeight: "700" }} numberOfLines={1}>{value}</Text>
    </View>
  );
}
