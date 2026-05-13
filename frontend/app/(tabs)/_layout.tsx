import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, TouchableOpacity, Text, StyleSheet, Image } from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';

const ACCENT = '#E05A33';
const INACTIVE = '#A3A3A3';

export default function TabLayout() {
  const { t, lang, setLang } = useLanguage();
  const { user, logout } = useAuth();
  const router = useRouter();

  const LangToggle = () => (
    <View style={styles.langToggle}>
      {(['kk', 'ru'] as const).map((l) => (
        <TouchableOpacity
          key={l}
          testID={`lang-btn-${l}`}
          onPress={() => setLang(l)}
          style={[styles.langBtn, lang === l && styles.langBtnActive]}
          activeOpacity={0.7}
        >
          <Text style={[styles.langText, lang === l && styles.langTextActive]}>
            {l === 'kk' ? 'QQ' : 'RU'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const UserAvatar = () => {
    if (!user) return null;
    return (
      <TouchableOpacity
        testID="user-avatar-btn"
        onPress={() => {
          logout().then(() => router.replace('/welcome'));
        }}
        style={styles.avatarBtn}
        activeOpacity={0.8}
      >
        {user.picture ? (
          <Image source={{ uri: user.picture }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarLetter}>{user.name?.[0]?.toUpperCase() || 'U'}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: ACCENT,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E5E5',
          height: 62,
          paddingBottom: 10,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTintColor: '#0A0A0A',
        headerTitleStyle: { fontWeight: '800', fontSize: 18 },
        headerShadowVisible: false,
        headerLeft: () => <UserAvatar />,
        headerLeftContainerStyle: { paddingLeft: 16 },
        headerRight: () => <LangToggle />,
        headerRightContainerStyle: { paddingRight: 16 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.chat,
          tabBarIcon: ({ color, size }) => <Ionicons name="sparkles-outline" size={size} color={color} />,
          headerTitle: '🍽️ Mood-to-Menu',
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t.history,
          tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: t.menu,
          tabBarIcon: ({ color, size }) => <Ionicons name="restaurant-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: t.admin,
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  langToggle: {
    flexDirection: 'row', backgroundColor: '#F2F2F2', borderRadius: 20, padding: 3,
  },
  langBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16 },
  langBtnActive: { backgroundColor: '#FFFFFF', elevation: 2 },
  langText: { fontSize: 12, fontWeight: '600', color: '#A3A3A3' },
  langTextActive: { color: '#0A0A0A' },
  avatarBtn: { marginLeft: 4 },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  avatarFallback: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#E05A33',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
