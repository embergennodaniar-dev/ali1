import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator, SafeAreaView, RefreshControl, Modal, ScrollView,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { api, ChatSession, ChatMessage } from '../../utils/api';

const ACCENT = '#E05A33';

export default function HistoryScreen() {
  const { t, lang } = useLanguage();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSession, setSelectedSession] = useState<{ session: ChatSession; messages: ChatMessage[] } | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const loadSessions = useCallback(async () => {
    try {
      const data = await api.getSessions();
      setSessions(data.filter((s) => s.message_count > 1));
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadSessions(); }, [loadSessions]));

  const openSession = async (session: ChatSession) => {
    try {
      const data = await api.getSession(session.session_id);
      setSelectedSession(data);
      setModalVisible(true);
    } catch {
      Alert.alert('Error', 'Could not load conversation');
    }
  };

  const deleteSession = (sessionId: string) => {
    Alert.alert(t.deleteConfirm, t.deleteMessage, [
      { text: t.no, style: 'cancel' },
      {
        text: t.yes,
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteSession(sessionId);
            setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
          } catch {
            Alert.alert('Error', 'Could not delete session');
          }
        },
      },
    ]);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'kk-KZ', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  };

  const renderItem = ({ item }: { item: ChatSession }) => (
    <TouchableOpacity
      testID={`session-item-${item.session_id}`}
      style={styles.sessionCard}
      onPress={() => openSession(item)}
      activeOpacity={0.7}
    >
      <View style={styles.sessionLeft}>
        <View style={styles.sessionIcon}>
          <Ionicons name="chatbubbles-outline" size={20} color={ACCENT} />
        </View>
        <View style={styles.sessionInfo}>
          <Text style={styles.sessionPreview} numberOfLines={1}>
            {item.preview || (lang === 'kk' ? 'Sáwbet' : 'Чат')}
          </Text>
          <Text style={styles.sessionMeta}>
            {item.message_count} {t.messagesCount} · {formatDate(item.updated_at)}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        testID={`delete-session-${item.session_id}`}
        onPress={() => deleteSession(item.session_id)}
        activeOpacity={0.7}
        style={styles.deleteBtn}
      >
        <Ionicons name="trash-outline" size={18} color="#A3A3A3" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} testID="history-screen">
      {loading ? (
        <ActivityIndicator style={styles.loader} color={ACCENT} />
      ) : sessions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="time-outline" size={56} color="#E5E5E5" />
          <Text style={styles.emptyText}>{t.noHistory}</Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.session_id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadSessions(); }} tintColor={ACCENT} />
          }
        />
      )}

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {lang === 'kk' ? 'Sáwbet' : 'Чат'}
            </Text>
            <TouchableOpacity
              testID="close-modal-btn"
              onPress={() => setModalVisible(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={28} color="#0A0A0A" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalMessages}>
            {selectedSession?.messages.map((msg) => (
              <View
                key={msg.id}
                style={[styles.modalMsgRow, msg.role === 'user' ? styles.modalMsgUser : styles.modalMsgAI]}
              >
                <View style={[styles.modalBubble, msg.role === 'user' ? styles.modalBubbleUser : styles.modalBubbleAI]}>
                  <Text style={[styles.modalBubbleText, msg.role === 'user' ? styles.textUser : styles.textAI]}>
                    {msg.content}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  loader: { flex: 1 },
  list: { padding: 16, gap: 10 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 16, color: '#A3A3A3', fontWeight: '500' },
  sessionCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#E5E5E5',
  },
  sessionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  sessionIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF3F0',
    alignItems: 'center', justifyContent: 'center',
  },
  sessionInfo: { flex: 1 },
  sessionPreview: { fontSize: 15, fontWeight: '600', color: '#0A0A0A' },
  sessionMeta: { fontSize: 12, color: '#A3A3A3', marginTop: 2 },
  deleteBtn: { padding: 8 },
  // Modal
  modalContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E5E5',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0A0A0A' },
  modalMessages: { padding: 16, gap: 10 },
  modalMsgRow: { flexDirection: 'row' },
  modalMsgUser: { justifyContent: 'flex-end' },
  modalMsgAI: { justifyContent: 'flex-start' },
  modalBubble: { maxWidth: '80%', padding: 12, borderRadius: 16 },
  modalBubbleUser: { backgroundColor: '#0A0A0A', borderBottomRightRadius: 4 },
  modalBubbleAI: { backgroundColor: '#F2F2F2', borderBottomLeftRadius: 4 },
  modalBubbleText: { fontSize: 14, lineHeight: 20 },
  textUser: { color: '#FFFFFF' },
  textAI: { color: '#0A0A0A' },
});
