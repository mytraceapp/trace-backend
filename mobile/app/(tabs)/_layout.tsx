import { Tabs } from 'expo-router';
import { useColorScheme, StyleSheet, View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';

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
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={[
          'rgba(168, 181, 170, 0)',
          'rgba(158, 173, 160, 0.4)',
          'rgba(148, 165, 150, 0.6)',
          'rgba(138, 158, 142, 0.7)',
          'rgba(128, 150, 134, 0.75)',
        ]}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const theme = colorScheme === 'dark' ? 'night' : 'day';
  const colors = Colors[theme];

  const TAB_BAR_HEIGHT = 56;
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 8;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarBackground: () => <TabBarBackground />,
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          borderWidth: 0,
          borderColor: 'transparent',
          paddingTop: 6,
          paddingBottom: bottomPadding,
          height: TAB_BAR_HEIGHT + bottomPadding,
          position: 'absolute',
          elevation: 0,
          shadowColor: 'transparent',
          shadowOpacity: 0,
          shadowRadius: 0,
          shadowOffset: { width: 0, height: 0 },
        },
        tabBarItemStyle: {
          borderTopWidth: 0,
        },
        tabBarActiveTintColor: colors.tabBar.activeIcon,
        tabBarInactiveTintColor: colors.tabBar.inactiveIcon,
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
    paddingTop: 2,
  },
  tabDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginBottom: 3,
  },
  tabLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '500',
  },
});
