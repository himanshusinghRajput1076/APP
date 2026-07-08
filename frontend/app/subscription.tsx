/**
 * Subscription screen — plans + Razorpay-style payment (mock mode).
 */
import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Modal, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/src/theme/ThemeProvider";
import { useAuth } from "@/src/context/AuthContext";
import { spacing, typography, radius } from "@/src/theme/tokens";
import { Btn, Card, Badge } from "@/src/components/ui";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";

const PLAN_LABELS: Record<string, { name: string; features: string[] }> = {
  student_basic: {
    name: "Founder Basic",
    features: ["10 investor profiles", "Unlimited pitching", "In-app chat", "Digital ID Card", "40+ sector browse"],
  },
  student_pro: {
    name: "Founder Pro",
    features: ["30 investor profiles", "Priority pitch review", "1-on-1 mentorship sessions", "Pro Digital ID", "Company setup assist", "End-to-end fundraising help"],
  },
  investor_basic: {
    name: "Partner Basic",
    features: ["50 founder profiles", "Sector-based discovery", "In-app chat", "Pro Digital ID", "40+ sector filters"],
  },
  startup_basic: {
    name: "Startup Basic",
    features: ["40 investor profiles", "Company pitch feed", "In-app chat", "Digital ID Card", "Growth analytics"],
  },
  startup_pro: {
    name: "Startup Pro",
    features: ["60 investor profiles", "Priority visibility", "Investment intro help", "End-to-end services", "Compliance assist", "Pro Digital ID"],
  },
};

export default function Subscription() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user, refresh } = useAuth();

  const [plans, setPlans] = useState<any[]>([]);
  const [paying, setPaying] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [payMethod, setPayMethod] = useState<"upi" | "card" | "qr" | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.get("/payment/plans").then(r => setPlans(r.data.plans || [])).catch(() => {});
  }, []);

  const startCheckout = (plan: any) => {
    setSelected(plan);
    setPayMethod(null);
  };

  const doPay = async () => {
    if (!selected || !payMethod) return;
    setPaying(true);
    try {
      const orderR = await api.post("/payment/create-order", { plan_id: selected.id });
      // Simulate razorpay checkout latency
      await new Promise(r => setTimeout(r, 1200));
      const verifyR = await api.post("/payment/verify", {
        order_id: orderR.data.order_id,
        payment_id: `pay_mock_${Date.now()}`,
      });
      await refresh();
      setSuccess(true);
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.log("pay error", e?.response?.data);
    } finally {
      setPaying(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={{ flexDirection: "row", alignItems: "center", padding: spacing.md }}>
          <TouchableOpacity onPress={() => router.back()} testID="back-btn" style={{ padding: 6 }}>
            <Ionicons name="chevron-back" size={26} color={theme.text} />
          </TouchableOpacity>
          <Text style={{ color: theme.textMuted, fontSize: 12, letterSpacing: 3, marginLeft: 8 }}>SUBSCRIPTION</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}>
          <Text style={{ ...typography.h1, color: theme.text }}>Choose your plan</Text>
          <Text style={{ color: theme.textMuted, marginTop: 6 }}>
            Cancel anytime. Credits included. UPI · Cards · QR supported.
          </Text>

          {user?.subscription ? (
            <Card style={{ marginTop: 20, borderColor: theme.secondary }}>
              <Text style={{ ...typography.caption, color: theme.secondary }}>CURRENT PLAN</Text>
              <Text style={{ color: theme.text, fontSize: 20, fontWeight: "800", marginTop: 4 }}>
                {PLAN_LABELS[user.subscription.plan_id]?.name || user.subscription.plan_id}
              </Text>
              <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 4 }}>
                Expires {new Date(user.subscription.expires_at).toLocaleDateString()}
              </Text>
            </Card>
          ) : null}

          <View style={{ marginTop: 24, gap: 14 }}>
            {plans.map((p) => {
              const isPro = p.tier === "pro";
              const meta = PLAN_LABELS[p.id];
              const c = isPro ? theme.secondary : theme.primary;
              return (
                <Card key={p.id} style={{ borderColor: c, borderWidth: isPro ? 2 : 1 }} testID={`plan-${p.id}`}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <View style={{ flex: 1 }}>
                      <Badge text={isPro ? "PRO · RECOMMENDED" : "BASIC"} color={c} />
                      <Text style={{ color: theme.text, fontSize: 22, fontWeight: "900", marginTop: 8 }}>{meta?.name || p.id}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ color: theme.textFaint, fontSize: 10, letterSpacing: 1 }}>PER MONTH</Text>
                      <Text style={{ color: c, fontSize: 30, fontWeight: "900" }}>₹{p.amount_rupees}</Text>
                    </View>
                  </View>
                  <View style={{ marginTop: 12, gap: 8 }}>
                    {(meta?.features || []).map((f, i) => (
                      <View key={i} style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                        <Ionicons name="checkmark-circle" size={14} color={c} style={{ marginTop: 2 }} />
                        <Text style={{ color: theme.textMuted, flex: 1 }}>{f}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={{ marginTop: 14 }}>
                    <Btn
                      testID={`subscribe-${p.id}`}
                      title={`Subscribe · ₹${p.amount_rupees}`}
                      onPress={() => startCheckout(p)}
                      variant={isPro ? "secondary" : "primary"}
                      small
                    />
                  </View>
                </Card>
              );
            })}
          </View>

          <Card style={{ marginTop: 24 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons name="lock-closed" size={20} color={theme.secondary} />
              <Text style={{ color: theme.text, fontWeight: "700" }}>Secure Payments</Text>
            </View>
            <Text style={{ color: theme.textMuted, marginTop: 6, fontSize: 12 }}>
              Powered by Razorpay. UPI, Cards, Wallets, and QR supported. Your data is encrypted end-to-end.
            </Text>
          </Card>
        </ScrollView>

        {/* Checkout modal */}
        <Modal visible={!!selected && !success} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setSelected(null)}>
          <View style={{ flex: 1, backgroundColor: theme.overlay, justifyContent: "flex-end" }}>
            <View style={{ backgroundColor: theme.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderColor: theme.borderStrong }}>
              <View style={{ padding: spacing.md, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: theme.border }}>
                <View>
                  <Text style={{ color: theme.textMuted, fontSize: 10, letterSpacing: 2 }}>CHECKOUT</Text>
                  <Text style={{ color: theme.text, fontSize: 18, fontWeight: "800", marginTop: 2 }}>
                    {selected ? PLAN_LABELS[selected.id]?.name : ""}
                  </Text>
                </View>
                <TouchableOpacity testID="close-checkout" onPress={() => setSelected(null)}><Ionicons name="close" size={22} color={theme.text} /></TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
                <Text style={{ ...typography.caption, color: theme.textMuted }}>AMOUNT TO PAY</Text>
                <Text style={{ color: theme.primary, fontSize: 40, fontWeight: "900", marginTop: 4 }}>₹{selected?.amount_rupees}</Text>

                <Text style={{ ...typography.caption, color: theme.textMuted, marginTop: 20 }}>PAYMENT METHOD</Text>
                <View style={{ gap: 10, marginTop: 12 }}>
                  <PayMethodOption id="upi" label="UPI" desc="GPay · PhonePe · Paytm · BHIM" icon="phone-portrait" active={payMethod === "upi"} onPress={() => setPayMethod("upi")} />
                  <PayMethodOption id="card" label="Credit / Debit Card" desc="Visa · Mastercard · Rupay" icon="card" active={payMethod === "card"} onPress={() => setPayMethod("card")} />
                  <PayMethodOption id="qr" label="QR Code" desc="Scan with any UPI app" icon="qr-code" active={payMethod === "qr"} onPress={() => setPayMethod("qr")} />
                </View>

                <View style={{ marginTop: 24 }}>
                  <Btn
                    title={`Pay ₹${selected?.amount_rupees}`}
                    testID="pay-btn"
                    onPress={doPay}
                    loading={paying}
                    disabled={!payMethod}
                  />
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Success modal */}
        <Modal visible={success} transparent animationType="fade" statusBarTranslucent>
          <View style={{ flex: 1, backgroundColor: theme.overlay, justifyContent: "center", padding: spacing.lg }}>
            <Confetti show={success} />
            <View style={{ backgroundColor: theme.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.secondary, padding: spacing.lg }}>
              <View style={{ alignItems: "center" }}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: theme.secondaryDim, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.secondary }}>
                  <Ionicons name="checkmark" size={34} color={theme.secondary} />
                </View>
                <Text style={{ color: theme.text, fontSize: 22, fontWeight: "900", marginTop: 14 }}>Payment Successful</Text>
                <Text style={{ color: theme.textMuted, marginTop: 6, textAlign: "center" }}>
                  Welcome to {selected ? PLAN_LABELS[selected.id]?.name : ""}. Credits added, ID upgraded.
                </Text>
              </View>
              <View style={{ marginTop: 24, gap: 10 }}>
                <Btn testID="view-idcard-btn" title="View Digital ID" onPress={() => { setSuccess(false); setSelected(null); router.replace("/id-card"); }} />
                <Btn testID="done-checkout-btn" title="Back to Home" variant="outline" onPress={() => { setSuccess(false); setSelected(null); router.replace("/(tabs)/home"); }} />
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

function PayMethodOption({ id, label, desc, icon, active, onPress }: any) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      testID={`pay-method-${id}`}
      onPress={onPress}
      activeOpacity={0.9}
      style={{
        borderWidth: 1, borderColor: active ? theme.primary : theme.border,
        backgroundColor: active ? theme.primaryDim : theme.surface,
        padding: 14, borderRadius: radius.sm,
        flexDirection: "row", alignItems: "center", gap: 12,
      }}
    >
      <View style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center", backgroundColor: theme.glass, borderRadius: 4 }}>
        <Ionicons name={icon} size={18} color={active ? theme.primary : theme.text} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.text, fontWeight: "700" }}>{label}</Text>
        <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 2 }}>{desc}</Text>
      </View>
      {active ? <Ionicons name="checkmark-circle" size={20} color={theme.primary} /> : <View style={{ width: 18, height: 18, borderWidth: 1, borderColor: theme.border, borderRadius: 9 }} />}
    </TouchableOpacity>
  );
}
acity>
  );
}
