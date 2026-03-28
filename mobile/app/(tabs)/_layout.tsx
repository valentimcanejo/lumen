// app/(tabs)/_layout.tsx
import { View, StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

type TabIconProps = { name: string; focusedName: string; color: string; focused: boolean };

function TabIcon({ name, focusedName, color, focused }: TabIconProps) {
  return (
    <View style={[ti.wrap, focused && ti.wrapActive]}>
      <Ionicons name={(focused ? focusedName : name) as any} size={22} color={color} />
    </View>
  );
}

const ti = StyleSheet.create({
  wrap: {
    width: 44,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  wrapActive: {
    backgroundColor: "#F5C77A18",
  },
});

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: "#0B0F14",
          borderTopColor: "#13192A",
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 6,
          paddingTop: 6,
        },
        tabBarActiveTintColor: "#F5C77A",
        tabBarInactiveTintColor: "#3A4558",
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="flash-outline" focusedName="flash" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="tracks"
        options={{
          title: "Trilhas",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="map-outline" focusedName="map" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "Biblioteca",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="library-outline" focusedName="library" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="person-outline" focusedName="person" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{ href: null, title: "Ranking" }}
      />
    </Tabs>
  );
}
