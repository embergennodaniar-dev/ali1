import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList,
  Alert, ActivityIndicator, SafeAreaView, ScrollView, Modal, Switch,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { api, MenuItem } from '../../utils/api';

const ACCENT = '#E05A33';
const ADMIN_TOKEN_KEY = 'admin_token';

const CATEGORIES = [
  { value: 'heavy', label: { kk: 'Toydırımlı awqatlar', ru: 'Сытные блюда' } },
  { value: 'light', label: { kk: 'Jeńil awqatlar', ru: 'Лёгкие блюда' } },
  { value: 'drinks', label: { kk: 'Ishimlikler', ru: 'Напитки' } },
  { value: 'games', label: { kk: 'Oyın-záwıq', ru: 'Игры' } },
];

const emptyForm = {
  name: '', price: '', category: 'heavy', ingredients: '',
  is_group_only: false, is_game: false, is_available: true, min_group_size: 1,
};

export default function AdminScreen() {
  const { t, lang } = useLanguage();
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    AsyncStorage.getItem(ADMIN_TOKEN_KEY).then((stored) => {
      if (stored) { setToken(stored); loadMenu(stored); }
    });
  }, []);

  const loadMenu = async (tok?: string) => {
    setLoadingMenu(true);
    try {
      const items = await api.getMenu();
      setMenuItems(items);
    } catch {
      // ignore
    } finally {
      setLoadingMenu(false);
    }
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) return;
    setLoginLoading(true);
    try {
      const { token: tok } = await api.adminLogin(username, password);
      await AsyncStorage.setItem(ADMIN_TOKEN_KEY, tok);
      setToken(tok);
      loadMenu(tok);
    } catch {
      Alert.alert('Error', t.loginError);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem(ADMIN_TOKEN_KEY);
    setToken(null);
    setMenuItems([]);
  };

  const openAddModal = () => {
    setEditItem(null);
    setForm(emptyForm);
    setModalVisible(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditItem(item);
    setForm({
      name: item.name, price: String(item.price), category: item.category,
      ingredients: item.ingredients, is_group_only: item.is_group_only,
      is_game: item.is_game, is_available: item.is_available,
      min_group_size: item.min_group_size,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !token) return;
    const payload = {
      name: form.name, price: parseInt(form.price) || 0, category: form.category,
      ingredients: form.ingredients, is_group_only: form.is_group_only,
      is_game: form.is_game, is_available: form.is_available, min_group_size: form.min_group_size,
    };
    try {
      if (editItem) {
        await api.updateMenuItem(editItem.id, payload, token);
      } else {
        await api.createMenuItem(payload, token);
      }
      setModalVisible(false);
      loadMenu(token);
    } catch {
      Alert.alert('Error', 'Could not save item');
    }
  };

  const handleDelete = (item: MenuItem) => {
    Alert.alert(t.delete, t.confirmDelete, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.delete, style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteMenuItem(item.id, token!);
            loadMenu(token!);
          } catch {
            Alert.alert('Error', 'Could not delete item');
          }
        },
      },
    ]);
  };

  // Login Screen
  if (!token) {
    return (
      <SafeAreaView style={styles.loginContainer} testID="admin-login-screen">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.loginContent}>
          <View style={styles.loginHeader}>
            <Text style={styles.loginEmoji}>🔐</Text>
            <Text style={styles.loginTitle}>{t.adminTitle}</Text>
          </View>
          <View style={styles.loginForm}>
            <TextInput
              testID="admin-username-input"
              style={styles.loginInput}
              value={username}
              onChangeText={setUsername}
              placeholder={t.username}
              placeholderTextColor="#A3A3A3"
              autoCapitalize="none"
            />
            <TextInput
              testID="admin-password-input"
              style={styles.loginInput}
              value={password}
              onChangeText={setPassword}
              placeholder={t.password}
              placeholderTextColor="#A3A3A3"
              secureTextEntry
            />
            <TouchableOpacity
              testID="admin-login-btn"
              style={[styles.loginBtn, loginLoading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              activeOpacity={0.7}
              disabled={loginLoading}
            >
              {loginLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginBtnText}>{t.loginBtn}</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Admin Panel
  return (
    <SafeAreaView style={styles.container} testID="admin-panel-screen">
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>{t.adminMenuTitle}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity testID="add-item-btn" onPress={openAddModal} activeOpacity={0.7} style={styles.addBtn}>
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity testID="logout-btn" onPress={handleLogout} activeOpacity={0.7} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={20} color="#737373" />
          </TouchableOpacity>
        </View>
      </View>

      {loadingMenu ? (
        <ActivityIndicator style={styles.loader} color={ACCENT} />
      ) : (
        <FlatList
          data={menuItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.adminCard} testID={`admin-item-${item.id}`}>
              <View style={styles.adminCardLeft}>
                <Text style={styles.adminItemName}>{item.name}</Text>
                <Text style={styles.adminItemMeta}>
                  {CATEGORIES.find((c) => c.value === item.category)?.label[lang] || item.category}
                  {item.price > 0 ? ` · ${item.price.toLocaleString()} ${t.sum}` : ` · ${t.free}`}
                </Text>
              </View>
              <View style={styles.adminCardActions}>
                <TouchableOpacity testID={`edit-item-${item.id}`} onPress={() => openEditModal(item)} activeOpacity={0.7} style={styles.editBtn}>
                  <Ionicons name="pencil-outline" size={16} color={ACCENT} />
                </TouchableOpacity>
                <TouchableOpacity testID={`delete-item-${item.id}`} onPress={() => handleDelete(item)} activeOpacity={0.7} style={styles.delBtn}>
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editItem ? t.editItem : t.addItem}</Text>
              <TouchableOpacity testID="close-modal-btn" onPress={() => setModalVisible(false)} activeOpacity={0.7}>
                <Ionicons name="close-circle" size={28} color="#0A0A0A" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalForm}>
              <Text style={styles.formLabel}>{t.itemName}</Text>
              <TextInput
                testID="item-name-input"
                style={styles.formInput}
                value={form.name}
                onChangeText={(v) => setForm({ ...form, name: v })}
                placeholder={t.itemName}
                placeholderTextColor="#A3A3A3"
              />
              <Text style={styles.formLabel}>{t.itemPrice}</Text>
              <TextInput
                testID="item-price-input"
                style={styles.formInput}
                value={form.price}
                onChangeText={(v) => setForm({ ...form, price: v })}
                placeholder="0"
                placeholderTextColor="#A3A3A3"
                keyboardType="numeric"
              />
              <Text style={styles.formLabel}>{t.itemCategory}</Text>
              <View style={styles.categoryRow}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    testID={`category-btn-${cat.value}`}
                    style={[styles.catBtn, form.category === cat.value && styles.catBtnActive]}
                    onPress={() => setForm({ ...form, category: cat.value })}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.catBtnText, form.category === cat.value && styles.catBtnTextActive]}>
                      {cat.label[lang]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.formLabel}>{t.itemIngredients}</Text>
              <TextInput
                testID="item-ingredients-input"
                style={[styles.formInput, styles.textArea]}
                value={form.ingredients}
                onChangeText={(v) => setForm({ ...form, ingredients: v })}
                placeholder={t.itemIngredients}
                placeholderTextColor="#A3A3A3"
                multiline
              />
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>{t.isGroupOnly}</Text>
                <Switch
                  testID="group-only-switch"
                  value={form.is_group_only}
                  onValueChange={(v) => setForm({ ...form, is_group_only: v })}
                  trackColor={{ false: '#E5E5E5', true: ACCENT }}
                />
              </View>
              <TouchableOpacity
                testID="save-item-btn"
                style={styles.saveBtn}
                onPress={handleSave}
                activeOpacity={0.7}
              >
                <Text style={styles.saveBtnText}>{t.save}</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // Login
  loginContainer: { flex: 1, backgroundColor: '#FAFAFA' },
  loginContent: { flex: 1, padding: 24, justifyContent: 'center' },
  loginHeader: { alignItems: 'center', marginBottom: 48 },
  loginEmoji: { fontSize: 56, marginBottom: 12 },
  loginTitle: { fontSize: 24, fontWeight: '800', color: '#0A0A0A', letterSpacing: -0.5 },
  loginForm: { gap: 14 },
  loginInput: {
    backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#0A0A0A', borderWidth: 1, borderColor: '#E5E5E5',
  },
  loginBtn: {
    backgroundColor: ACCENT, borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginTop: 8,
  },
  loginBtnDisabled: { backgroundColor: '#E5E5E5' },
  loginBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  // Panel
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  panelHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E5E5',
  },
  panelTitle: { fontSize: 18, fontWeight: '800', color: '#0A0A0A' },
  headerActions: { flexDirection: 'row', gap: 8 },
  addBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center',
  },
  logoutBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#F2F2F2',
    alignItems: 'center', justifyContent: 'center',
  },
  loader: { flex: 1 },
  list: { padding: 12, gap: 8 },
  adminCard: {
    backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#E5E5E5',
  },
  adminCardLeft: { flex: 1, gap: 2 },
  adminItemName: { fontSize: 15, fontWeight: '700', color: '#0A0A0A' },
  adminItemMeta: { fontSize: 12, color: '#737373' },
  adminCardActions: { flexDirection: 'row', gap: 8 },
  editBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFF3F0',
    alignItems: 'center', justifyContent: 'center',
  },
  delBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#FEF2F2',
    alignItems: 'center', justifyContent: 'center',
  },
  // Modal
  modalContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E5E5',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0A0A0A' },
  modalForm: { padding: 20, gap: 4 },
  formLabel: { fontSize: 12, fontWeight: '700', color: '#737373', letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 12, marginBottom: 6 },
  formInput: {
    backgroundColor: '#FAFAFA', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#0A0A0A', borderWidth: 1, borderColor: '#E5E5E5',
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catBtn: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    backgroundColor: '#F2F2F2', borderWidth: 1, borderColor: '#E5E5E5',
  },
  catBtnActive: { backgroundColor: '#FFF3F0', borderColor: ACCENT },
  catBtnText: { fontSize: 12, fontWeight: '600', color: '#737373' },
  catBtnTextActive: { color: ACCENT },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  switchLabel: { fontSize: 15, color: '#0A0A0A', fontWeight: '500' },
  saveBtn: {
    backgroundColor: ACCENT, borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginTop: 24,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
