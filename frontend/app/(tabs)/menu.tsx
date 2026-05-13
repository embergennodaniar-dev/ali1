import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  SafeAreaView, RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { api, MenuItem } from '../../utils/api';

const ACCENT = '#E05A33';

const CATEGORY_ORDER = ['heavy', 'light', 'drinks', 'desserts', 'games'];

const CATEGORY_ICONS: Record<string, string> = {
  heavy: '🍖',
  light: '🥗',
  drinks: '☕',
  desserts: '🍰',
  games: '🎲',
};

export default function MenuScreen() {
  const { t, lang } = useLanguage();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMenu = useCallback(async () => {
    try {
      const items = await api.getMenu();
      setMenuItems(items);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadMenu(); }, [loadMenu]));

  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, Record<string, string>> = {
      heavy: { kk: 'Toydırımlı awqatlar', ru: 'Сытные блюда' },
      light: { kk: 'Jeńil awqatlar', ru: 'Лёгкие блюда' },
      drinks: { kk: 'Ishimlikler', ru: 'Напитки' },
      desserts: { kk: 'Tátli awqatlar', ru: 'Десерты' },
      games: { kk: 'Oyın-záwıq', ru: 'Игры' },
    };
    return labels[cat]?.[lang] || cat;
  };

  const groupedItems = CATEGORY_ORDER.reduce((acc, cat) => {
    acc[cat] = menuItems.filter((i) => i.category === cat && i.is_available);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator color={ACCENT} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} testID="menu-screen">
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadMenu(); }} tintColor={ACCENT} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t.menuTitle}</Text>
          <Text style={styles.headerSub}>
            {lang === 'kk' ? 'Jumıs waqtı: 10:00 – 23:00' : 'Работаем 10:00 – 23:00'}
          </Text>
        </View>

        {CATEGORY_ORDER.map((cat) => {
          const items = groupedItems[cat];
          if (!items || items.length === 0) return null;
          return (
            <View key={cat} style={styles.section} testID={`menu-section-${cat}`}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>{CATEGORY_ICONS[cat]}</Text>
                <Text style={styles.sectionTitle}>{getCategoryLabel(cat)}</Text>
              </View>
              {items.map((item) => (
                <View key={item.id} style={styles.menuCard} testID={`menu-item-${item.id}`}>
                  <View style={styles.cardTop}>
                    <View style={styles.cardInfo}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      {item.ingredients ? (
                        <Text style={styles.itemIngredients}>
                          {t.ingredients}: {item.ingredients}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.priceBlock}>
                      {item.is_game ? (
                        <Text style={styles.priceTagFree}>{t.free}</Text>
                      ) : (
                        <Text style={styles.priceTag}>
                          {item.price.toLocaleString()} {t.sum}
                        </Text>
                      )}
                    </View>
                  </View>
                  {item.is_group_only && (
                    <View style={styles.groupBadge}>
                      <Ionicons name="people-outline" size={12} color={ACCENT} />
                      <Text style={styles.groupBadgeText}>{t.groupOnly}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA' },
  content: { padding: 16, gap: 20 },
  header: {
    backgroundColor: '#0A0A0A', borderRadius: 16, padding: 24, gap: 4,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -1 },
  headerSub: { fontSize: 14, color: '#A3A3A3' },
  section: { gap: 10 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: ACCENT,
  },
  sectionIcon: { fontSize: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#0A0A0A' },
  menuCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#E5E5E5', gap: 8,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  cardInfo: { flex: 1, gap: 4 },
  itemName: { fontSize: 16, fontWeight: '700', color: '#0A0A0A' },
  itemIngredients: { fontSize: 13, color: '#737373', lineHeight: 18 },
  priceBlock: { alignItems: 'flex-end' },
  priceTag: { fontSize: 17, fontWeight: '800', color: '#0A0A0A' },
  priceTagFree: { fontSize: 15, fontWeight: '700', color: '#22C55E' },
  groupBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', backgroundColor: '#FFF3F0',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  groupBadgeText: { fontSize: 11, fontWeight: '600', color: ACCENT },
});
