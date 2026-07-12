import React from "react";
import { View, Text } from "react-native";

const BannerAd = () => (
  <View style={{ height: 50, backgroundColor: "#222", justifyContent: "center", alignItems: "center" }}>
    <Text style={{ color: "#aaa" }}>[SPONSOR AD PREVIEW (WEB MOCK)]</Text>
  </View>
);

const BannerAdSize = {
  ANCHORED_ADAPTIVE_BANNER: "ANCHORED_ADAPTIVE_BANNER",
};

const TestIds = {
  BANNER: "ca-app-pub-3940256099942544/6300978111",
};

const initialize = () => Promise.resolve({});

const defaultExport = () => ({
  initialize,
});

export default defaultExport;
export { BannerAd, BannerAdSize, TestIds };
