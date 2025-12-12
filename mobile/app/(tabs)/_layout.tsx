import { Tabs } from 'expo-router';
import { useColorScheme, StyleSheet, View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Home, Activity, BookOpen, User, HelpCircle } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';

type TabIconProps = {
  focused: boolean;
  color: string;
  label: string;
  Icon: typeof Home;
};

function TabIcon({ focused, color, label, Icon }: TabIconProps) {
  return (
    <View style={styles.tabIconContainer}>
      <Icon size={18} color={color} strokeWidth={1.5} />
      <Text style={[styles.tabLabel, { color, opacity: focused ? 1 : 0.7 }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function TabBarBackground() {
  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={[
          'rgba(168, 181, 170, 0.673)',
          'rgba(158, 173, 160, 0.873)',
          'rgba(148, 165, 150, 0.973)',
          'rgba(138, 158, 142, 1.0)',
          'rgba(128, 150, 134, 1.0)',
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

  const TAB_BAR_HEIGHT = 60;
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
          paddingTop: 8,
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
        tabBarActiveTintColor: '#E8E5DE',
        tabBarInactiveTintColor: '#E8E5DE',
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color} label="Home" Icon={Home} />
          ),
        }}
      />
      <Tabs.Screen
        name="activities"
        options={{
          title: 'Activity',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color} label="Activity" Icon={Activity} />
          ),
        }}
      />
      <Tabs.Screen
        name="entries"
        options={{
          title: 'Entries',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color} label="Entries" Icon={BookOpen} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color} label="Profile" Icon={User} />
          ),
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Help',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color} label="Help" Icon={HelpCircle} />
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
    gap: 2,
    minWidth: 50,
    marginTop: 20,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '400',
    letterSpacing: 0.3,
    textAlign: 'center',
    fontFamily: 'Georgia',
  },
});
