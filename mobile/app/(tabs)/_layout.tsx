import { Tabs } from 'expo-router';
import { useColorScheme, StyleSheet, View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';

type TabIconProps = {
  focused: boolean;
  color: string;
  label: string;
};

function TabIcon({ focused, color, label }: TabIconProps) {
  return (
    <View style={styles.tabIconContainer}>
      <View style={[styles.tabDot, { backgroundColor: focused ? color : 'transparent' }]} />
      <Text style={[styles.tabLabel, { color, opacity: focused ? 1 : 0.6 }]}>{label}</Text>
    </View>
  );
}

function TabBarBackground() {
  return (
    <LinearGradient
      colors={['rgba(200, 190, 175, 0.95)', 'rgba(180, 168, 150, 0.98)']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const theme = colorScheme === 'dark' ? 'night' : 'day';
  const colors = Colors[theme];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarBackground: () => <TabBarBackground />,
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          paddingTop: Spacing.sm,
          paddingBottom: insets.bottom > 0 ? insets.bottom : Spacing.md,
          height: 70 + (insets.bottom > 0 ? insets.bottom : Spacing.md),
          borderTopLeftRadius: BorderRadius.xl,
          borderTopRightRadius: BorderRadius.xl,
          position: 'absolute',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 8,
        },
        tabBarActiveTintColor: '#4B4B4B',
        tabBarInactiveTintColor: '#8A8680',
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color} label="Chat" />
          ),
        }}
      />
      <Tabs.Screen
        name="activities"
        options={{
          title: 'Activities',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color} label="Activ" />
          ),
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Journal',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color} label="Journ" />
          ),
        }}
      />
      <Tabs.Screen
        name="entries"
        options={{
          title: 'Entries',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color} label="Entri" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color} label="Profi" />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  tabDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
});
