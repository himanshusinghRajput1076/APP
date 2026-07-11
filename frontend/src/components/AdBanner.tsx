import React from "react";
import { Platform, View, Text } from "react-native";

let BannerAd: any = null;
let BannerAdSize: any = null;
let TestIds: any = null;

if (Platform.OS !== "web") {
  try {
    const ads = require("react-native-google-mobile-ads");
    BannerAd = ads.BannerAd;
    BannerAdSize = ads.BannerAdSize;
    TestIds = ads.TestIds;
  } catch (e) {
    console.warn("Failed to load react-native-google-mobile-ads", e);
  }
}

export function AdBanner() {
  if (Platform.OS === "web" || !BannerAd) {
    // Return a mock placeholder for web testing
    return (
      <View
        style={{
          height: 50,
          backgroundColor: "#222",
          borderColor: "#444",
          borderWidth: 1,
          alignItems: "center",
          justifyContent: "center",
          marginVertical: 10,
        }}
      >
        <Text style={{ color: "#aaa", fontSize: 10, letterSpacing: 1 }}>
          [SPONSOR AD PREVIEW (WEB MOCK)]
        </Text>
      </View>
    );
  }

  return (
    <View style={{ alignItems: "center", marginVertical: 10 }}>
      <BannerAd
        unitId={TestIds.BANNER}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdFailedToLoad={(error: any) => {
          console.error("Ad failed to load: ", error);
        }}
      />
    </View>
  );
}
