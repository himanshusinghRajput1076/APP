/**
 * Admin Dashboard — analytics + user management + plans + branding.
 */
import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Modal, Image, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "@/src/theme/ThemeProvider";
import { useAuth } from "@/src/context/AuthContext";
import { spacing, typography } from "@/src/theme/tokens";
import { Card, Badge, Btn, Chip, Input } from "@/src/components/ui";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";

export default function AdminDashboard() {
  const { theme, toggle, mode } = useTheme();
  const router = useRouter();
  const { user, signOut } = useAuth();

  const [activeTab, setActiveTab] = useState<"users" | "plans" | "settings">("users");

  const [analytics, setAnalytics] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);

  // User management
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [selectedKyc, setSelectedKyc] = useState<any>(null);
  const [userEditMode, setUserEditMode] = useState(false);
  const [uName, setUName] = useState("");
  const [uEmail, setUEmail] = useState("");
  const [uRole, setURole] = useState("");
  const [uCredits, setUCredits] = useState("");
  const [uActive, setUActive] = useState(true);
  const [uKyc, setUKyc] = useState("");
  const [uSubPlan, setUSubPlan] = useState("");
  const [uSubDays, setUSubDays] = useState("");

  // Plans settings
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [pName, setPName] = useState("");
  const [pAmountRupees, setPAmountRupees] = useState("");
  const [pCredits, setPCredits] = useState("");
  const [pLimit, setPLimit] = useState("");
  const [pIgnite, setPIgnite] = useState("");
  const [pFeatures, setPFeatures] = useState("");

  // Branding & payment settings
  const [compName, setCompName] = useState("");
  const [compLogo, setCompLogo] = useState("");
  const [upiId, setUpiId] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [bankAccName, setBankAccName] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccNo, setBankAccNo] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [a, u, p, s] = await Promise.all([
        api.get("/admin/analytics"),
        api.get("/admin/users", { params: filter ? { role: filter } : {} }),
        api.get("/admin/plans"),
        api.get("/settings/public"),
      ]);
      setAnalytics(a.data);
      setUsers(u.data.users || []);
      setPlans(p.data.plans || []);
      
      const sData = s.data;
      setCompName(sData.company_name || "");
      setCompLogo(sData.company_logo || "");
      setUpiId(sData.upi_id || "");
      setQrUrl(sData.qr_code_url || "");
      if (sData.bank_details) {
        setBankAccName(sData.bank_details.account_name || "");
        setBankName(sData.bank_details.bank_name || "");
        setBankAccNo(sData.bank_details.account_number || "");
        setBankIfsc(sData.bank_details.ifsc_code || "");
      }
    } catch { /* ignore */ }
    setRefreshing(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const openUser = async (u: any) => {
    setSelectedUser(u);
    setUName(u.name || "");
    setUEmail(u.email || "");
    setURole(u.role || "");
    setUCredits(String(u.credits || 0));
    setUActive(u.active !== false);
    setUKyc(u.kyc_status || "pending");
    setUSubPlan(u.subscription?.plan_id || "none");
    setUSubDays("");
    setUserEditMode(false);
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

  const saveUserEdits = async () => {
    if (!selectedUser) return;
    try {
      let subPayload = null;
      if (uSubPlan !== "none") {
        const days = parseInt(uSubDays) || 30;
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + days);
        subPayload = { plan_id: uSubPlan, expires_at: expiry.toISOString() };
      }

      await api.put(`/admin/users/${selectedUser.id}`, {
        name: uName,
        email: uEmail,
        role: uRole,
        credits: parseInt(uCredits) || 0,
        active: uActive,
        kyc_status: uKyc,
        subscription: subPayload === null && uSubPlan === "none" ? {} : subPayload,
      });
      setSelectedUser(null);
      load();
      Alert.alert("Success", "User details updated successfully.");
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.detail || "Could not update user.");
    }
  };

  const openPlan = (p: any) => {
    setSelectedPlan(p);
    setPName(p.name || "");
    setPAmountRupees(String(p.amount_rupees || 0));
    setPCredits(String(p.credits || 0));
    setPLimit(String(p.limit || 0));
    setPIgnite(String(p.ignite_tokens || 0));
    setPFeatures((p.features || []).join(", "));
  };

  const savePlanEdits = async () => {
    if (!selectedPlan) return;
    try {
      const amtPaise = Math.round(parseFloat(pAmountRupees) * 100);
      const featsList = pFeatures.split(",").map(f => f.trim()).filter(Boolean);
      await api.put(`/admin/plans/${selectedPlan.id}`, {
        name: pName,
        amount: amtPaise,
        credits: parseInt(pCredits) || 0,
        limit: parseInt(pLimit) || 0,
        ignite_tokens: parseInt(pIgnite) || 0,
        features: featsList,
      });
      setSelectedPlan(null);
      load();
      Alert.alert("Success", "Subscription plan updated successfully.");
    } catch {
      Alert.alert("Error", "Could not update subscription plan.");
    }
  };

  const saveGlobalSettings = async () => {
    try {
      await api.put("/admin/settings", {
        company_name: compName,
        company_logo: compLogo,
        upi_id: upiId,
        qr_code_url: qrUrl,
        bank_details: {
          account_name: bankAccName,
          bank_name: bankName,
          account_number: bankAccNo,
          ifsc_code: bankIfsc,
        },
      });
      load();
      Alert.alert("Success", "Global branding and payment settings saved.");
    } catch {
      Alert.alert("Error", "Could not save settings.");
    }
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
        {/* Header */}
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

        {/* Dynamic Section Tabs */}
        <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: theme.border, paddingHorizontal: spacing.lg, gap: 16 }}>
          <TouchableOpacity onPress={() => setActiveTab("users")} style={{ paddingVertical: 12, borderBottomWidth: activeTab === "users" ? 2 : 0, borderBottomColor: theme.primary }}>
            <Text style={{ color: activeTab === "users" ? theme.text : theme.textMuted, fontWeight: "700" }}>Users</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab("plans")} style={{ paddingVertical: 12, borderBottomWidth: activeTab === "plans" ? 2 : 0, borderBottomColor: theme.primary }}>
            <Text style={{ color: activeTab === "plans" ? theme.text : theme.textMuted, fontWeight: "700" }}>Plans</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab("settings")} style={{ paddingVertical: 12, borderBottomWidth: activeTab === "settings" ? 2 : 0, borderBottomColor: theme.primary }}>
            <Text style={{ color: activeTab === "settings" ? theme.text : theme.textMuted, fontWeight: "700" }}>Settings</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={theme.primary} />}
        >
          {activeTab === "users" && (
            <>
              {/* KPIs — dense grid */}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                <KpiCell label="TOTAL USERS" value={analytics?.total_users ?? 0} color={theme.primary} />
                <KpiCell label="ACTIVE SUBS" value={analytics?.active_subscriptions ?? 0} color={theme.secondary} />
                <KpiCell label="REVENUE (₹)" value={`${analytics?.total_revenue_inr?.toFixed(0) ?? 0}`} color={theme.primary} />
                <KpiCell label="PITCHES" value={analytics?.total_pitches ?? 0} color={theme.secondary} />
                <KpiCell label="MESSAGES" value={analytics?.total_messages ?? 0} color={theme.primary} />
                <KpiCell label="TICKETS" value={analytics?.total_tickets ?? 0} color={theme.secondary} />
              </View>

              {/* Users list */}
              <View style={{ marginTop: spacing.lg }}>
                <Text style={{ ...typography.caption, color: theme.textMuted, marginBottom: 12 }}>USERS LIST</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
                  <Chip label="All" active={!filter} onPress={() => setFilter(null)} />
                  <Chip label="Students" active={filter === "student"} onPress={() => setFilter("student")} />
                  <Chip label="Investors" active={filter === "investor"} onPress={() => setFilter("investor")} />
                  <Chip label="Startups" active={filter === "growing_startup"} onPress={() => setFilter("growing_startup")} />
                </ScrollView>

                <View style={{ gap: 8 }}>
                  {users.map((u) => (
                    <TouchableOpacity key={u.id} testID={`admin-user-${u.id}`} onPress={() => openUser(u)} activeOpacity={0.85}>
                      <Card style={{ padding: 12 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: theme.text, fontWeight: "700" }}>{u.name}</Text>
                            <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 2 }}>{u.email} · {u.role}</Text>
                          </View>
                          <Badge
                            text={u.kyc_status?.toUpperCase() ?? "UNKNOWN"}
                            color={u.kyc_status === "approved" ? theme.secondary : u.kyc_status === "submitted" ? theme.warning : theme.textMuted}
                          />
                        </View>
                      </Card>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          )}

          {activeTab === "plans" && (
            <View style={{ gap: 12 }}>
              <Text style={{ ...typography.caption, color: theme.textMuted, marginBottom: 4 }}>MANAGE SUBSCRIPTIONS</Text>
              {plans.map((p) => (
                <TouchableOpacity key={p.id} onPress={() => openPlan(p)} activeOpacity={0.85}>
                  <Card style={{ padding: 14 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ color: theme.text, fontSize: 16, fontWeight: "800" }}>{p.name || p.id}</Text>
                      <Text style={{ color: theme.primary, fontWeight: "700" }}>₹{p.amount_rupees}</Text>
                    </View>
                    <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 4 }}>
                      Role: {p.role} · Credits: {p.credits} · Days: {p.days}
                    </Text>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {activeTab === "settings" && (
            <View style={{ gap: 16 }}>
              <Text style={{ ...typography.caption, color: theme.textMuted }}>BRANDING CONFIGURATION</Text>
              <Input label="Company Name" value={compName} onChangeText={setCompName} />
              <Input label="Company Logo URL" value={compLogo} onChangeText={setCompLogo} placeholder="https://logo-url.png" />
              
              <Text style={{ ...typography.caption, color: theme.textMuted, marginTop: 10 }}>PAYMENTS GATEWAY & QR</Text>
              <Input label="UPI ID" value={upiId} onChangeText={setUpiId} placeholder="merchant@upi" />
              <Input label="Payment QR Image URL" value={qrUrl} onChangeText={setQrUrl} placeholder="https://qr-image-url.png" />
              
              <Text style={{ ...typography.caption, color: theme.textMuted, marginTop: 10 }}>MANUAL BANK DETAILS</Text>
              <Input label="Account Name" value={bankAccName} onChangeText={setBankAccName} />
              <Input label="Bank Name" value={bankName} onChangeText={setBankName} />
              <Input label="Account Number" value={bankAccNo} onChangeText={setBankAccNo} keyboardType="number-pad" />
              <Input label="IFSC Code" value={bankIfsc} onChangeText={setBankIfsc} autoCapitalize="characters" />

              <Btn title="Save Settings" onPress={saveGlobalSettings} variant="primary" style={{ marginTop: 10 }} />
            </View>
          )}
        </ScrollView>

        {/* User detail editor modal */}
        <Modal visible={!!selectedUser} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setSelectedUser(null)}>
          <View style={{ flex: 1, backgroundColor: theme.overlay, justifyContent: "flex-end" }}>
            <View style={{ backgroundColor: theme.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderColor: theme.borderStrong, maxHeight: "88%" }}>
              <View style={{ padding: spacing.md, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: theme.border }}>
                <Text style={{ color: theme.text, fontSize: 18, fontWeight: "800" }}>
                  {userEditMode ? "Edit User Details" : "User Details"}
                </Text>
                <TouchableOpacity onPress={() => setSelectedUser(null)}><Ionicons name="close" size={22} color={theme.text} /></TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
                {selectedUser ? (
                  <>
                    {userEditMode ? (
                      <View style={{ gap: 14 }}>
                        <Input label="Name" value={uName} onChangeText={setUName} />
                        <Input label="Email" value={uEmail} onChangeText={setUEmail} keyboardType="email-address" />
                        <Input label="Role" value={uRole} onChangeText={setURole} placeholder="student, investor, growing_startup" />
                        <Input label="Credits" value={uCredits} onChangeText={setUCredits} keyboardType="number-pad" />
                        
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 }}>
                          <Text style={{ color: theme.textMuted }}>Account Active</Text>
                          <TouchableOpacity onPress={() => setUActive(!uActive)} style={{ padding: 6, borderWidth: 1, borderColor: theme.border, borderRadius: 4 }}>
                            <Text style={{ color: theme.text, fontWeight: "700" }}>{uActive ? "ACTIVE" : "DISABLED"}</Text>
                          </TouchableOpacity>
                        </View>

                        <Input label="KYC Status" value={uKyc} onChangeText={setUKyc} placeholder="pending, approved, rejected, submitted" />
                        
                        <Input label="Manual Subscription Plan" value={uSubPlan} onChangeText={setUSubPlan} placeholder="student_basic, startup_pro, none" />
                        {uSubPlan !== "none" && (
                          <Input label="Subscription Duration (Days)" value={uSubDays} onChangeText={setUSubDays} keyboardType="number-pad" placeholder="30" />
                        )}

                        <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                          <Btn title="Save Changes" onPress={saveUserEdits} variant="primary" style={{ flex: 1 }} />
                          <Btn title="Cancel" onPress={() => setUserEditMode(false)} variant="outline" />
                        </View>
                      </View>
                    ) : (
                      <>
                        <Row label="Name" value={selectedUser.name} />
                        <Row label="Email" value={selectedUser.email} />
                        <Row label="Role" value={selectedUser.role} />
                        <Row label="KYC" value={selectedUser.kyc_status} />
                        <Row label="Active" value={selectedUser.active ? "yes" : "no"} />
                        <Row label="Credits" value={String(selectedUser.credits || 0)} />
                        <Row label="Subscription" value={selectedUser.subscription?.plan_id || "none"} />
                        {selectedUser.subscription && (
                          <Row label="Expires" value={new Date(selectedUser.subscription.expires_at).toLocaleDateString()} />
                        )}

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
                          <Btn title="Edit User Account" onPress={() => setUserEditMode(true)} variant="primary" />
                          {selectedUser.kyc_status === "submitted" ? (
                            <>
                              <Btn title="Approve KYC" onPress={approve} variant="secondary" />
                              <Btn title="Reject KYC" onPress={reject} variant="danger" />
                            </>
                          ) : null}
                          <Btn title={selectedUser.active ? "Disable Account" : "Enable Account"} onPress={toggleActive} variant="outline" />
                        </View>
                      </>
                    )}
                  </>
                ) : null}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Plan editor modal */}
        <Modal visible={!!selectedPlan} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setSelectedPlan(null)}>
          <View style={{ flex: 1, backgroundColor: theme.overlay, justifyContent: "flex-end" }}>
            <View style={{ backgroundColor: theme.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderColor: theme.borderStrong, maxHeight: "88%" }}>
              <View style={{ padding: spacing.md, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: theme.border }}>
                <Text style={{ color: theme.text, fontSize: 18, fontWeight: "800" }}>Edit Plan Details</Text>
                <TouchableOpacity onPress={() => setSelectedPlan(null)}><Ionicons name="close" size={22} color={theme.text} /></TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
                {selectedPlan ? (
                  <View style={{ gap: 14 }}>
                    <Input label="Plan Name" value={pName} onChangeText={setPName} />
                    <Input label="Amount (Rupees)" value={pAmountRupees} onChangeText={setPAmountRupees} keyboardType="number-pad" />
                    <Input label="Credits Granted" value={pCredits} onChangeText={setPCredits} keyboardType="number-pad" />
                    <Input label="Search Limit" value={pLimit} onChangeText={setPLimit} keyboardType="number-pad" />
                    <Input label="Ignite Tokens" value={pIgnite} onChangeText={setPIgnite} keyboardType="number-pad" />
                    <Input label="Features (Comma separated)" value={pFeatures} onChangeText={setPFeatures} multiline />

                    <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                      <Btn title="Save Changes" onPress={savePlanEdits} variant="primary" style={{ flex: 1 }} />
                      <Btn title="Cancel" onPress={() => setSelectedPlan(null)} variant="outline" />
                    </View>
                  </View>
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
