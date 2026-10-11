import { ColorValue, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { resultsOverdue } from '../../src/dates';
import { useStore } from '../../src/store';
import { colors } from '../../src/theme';

const icon = (name: keyof typeof Ionicons.glyphMap) => {
  const TabIcon = ({ color, size }: { color: ColorValue; size: number }) => <Ionicons name={name} size={size} color={color} />;
  return TabIcon;
};

const pillIcon = ({ color, size }: { color: ColorValue; size: number }) => <MaterialCommunityIcons name="pill" size={size} color={color} />;

export default function TabsLayout() {
  const { exams, records } = useStore();
  // pastille rouge : un examen a eu lieu il y a plus de 24 h et attend ses résultats
  const awaitingResults = exams.some((e) => resultsOverdue(e, records));
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTitleStyle: { color: colors.text, fontSize: 20 },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border, paddingTop: 4, ...(Platform.OS === 'web' ? { height: 68, paddingBottom: 8 } : null) }, // web : sinon les libellés sont coupés
        tabBarLabelStyle: { fontSize: 13, fontWeight: '600' },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Aujourd'hui", tabBarIcon: icon('sunny-outline') }} />
      <Tabs.Screen name="medications" options={{ title: 'Médicaments', tabBarIcon: pillIcon }} />
      <Tabs.Screen name="exams" options={{ title: 'Examens', tabBarIcon: icon('calendar-outline'),
          tabBarBadge: awaitingResults ? '' : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.danger, minWidth: 10, height: 10, borderRadius: 5, top: 2 },
        }} />
      <Tabs.Screen name="records" options={{ title: 'Dossier', tabBarIcon: icon('folder-open-outline') }} />
    </Tabs>
  );
}
