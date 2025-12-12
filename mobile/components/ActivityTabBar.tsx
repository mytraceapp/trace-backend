import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Home, Activity, BookOpen, User, HelpCircle } from 'lucide-react-native';

const TAB_BAR_HEIGHT = 60;

type TabItemProps = {
  icon: typeof Home;
  label: string;
  route: string;
};

function TabItem({ icon: Icon, label, route }: TabItemProps) {
  const router = useRouter();
  
  return (
    <Pressable 
      style={styles.tabItem} 
      onPress={() => router.replace(route as any)}
    >
      <Icon size={18} color="#E8E5DE" strokeWidth={1.5} />
      <Text style={styles.tabLabel}>{label}</Text>
    </Pressable>
  );
}

export default function ActivityTabBar() {
  const insets = useSafeAreaInsets();
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 8;

  return (
    <View style={[styles.container, { height: TAB_BAR_HEIGHT + bottomPadding }]}>
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
      <View style={[styles.tabBarInner, { paddingBottom: bottomPadding }]}>
        <TabItem icon={Home} label="Home" route="/(tabs)/chat" />
        <TabItem icon={Activity} label="Activity" route="/(tabs)/activities" />
        <TabItem icon={BookOpen} label="Entries" route="/(tabs)/entries" />
        <TabItem icon={User} label="Profile" route="/(tabs)/profile" />
        <TabItem icon={HelpCircle} label="Help" route="/(tabs)/journal" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabBarInner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    paddingTop: 8,
    flex: 1,
  },
  tabItem: {
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
    color: '#E8E5DE',
    fontFamily: 'Georgia',
  },
});
