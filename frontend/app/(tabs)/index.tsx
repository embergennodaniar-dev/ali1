import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ImageBackground,
  Animated, Dimensions, ScrollView, TextInput, Alert,
  ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView,
  Modal,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import QRCode from 'react-native-qrcode-svg';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';

const { width } = Dimensions.get('window');
const ACCENT = '#E05A33';

const BG_IMAGES = [
  'https://images.pexels.com/photos/32558904/pexels-photo-32558904.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.unsplash.com/photo-1671048116858-e8ef69175b2d?w=1200&q=80',
  'https://images.pexels.com/photos/10522937/pexels-photo-10522937.jpeg?auto=compress&cs=tinysrgb&w=1200',
];

const MOOD_EMOJIS = ['', '😢', '😟', '😔', '😐', '🙂', '😊', '😃', '😄', '🤩', '🥳'];
const MOOD_LABELS_KK = ['', 'Júda nashar', 'Nashar', 'Kóńilsiz', 'Tómen', 'Orta', 'Jaqsı', 'Júda jaqsı', 'Quwanıshlı', 'Bek shadlı', 'Ajayıp!'];
const MOOD_LABELS_RU = ['', 'Плохо', 'Грустно', 'Так себе', 'Нормально', 'Хорошо', 'Хорошо', 'Весело', 'Отлично', 'Супер', 'Класс!'];

const ALLERGENS_KK = ['Gósh', 'Geshir', 'Piyaz', 'Gúrish', 'Pomidor', 'Sır', 'Nan/Gluten', 'Zeytun', 'Alma', 'Tuxum', 'Sút'];
const ALLERGENS_RU = ['Мясо', 'Морковь', 'Лук', 'Рис', 'Помидор', 'Сыр', 'Глютен', 'Оливки', 'Яблоко', 'Яйцо', 'Молоко'];

const TIME_SLOTS_KK = ['10:00–12:00', '12:00–14:00', '14:00–17:00', '17:00–19:00', '19:00–21:00', '21:00–23:00'];
const TIME_SLOTS_RU = ['10:00–12:00', '12:00–14:00', '14:00–17:00', '17:00–19:00', '19:00–21:00', '21:00–23:00'];

interface Params {
  mood: number;
  hunger: string;
  budget: string;
  group: 'jalgiz' | 'topar';
  groupSize: number;
  allergies: string[];
  time: string;
}

type Phase = 'landing' | 'steps' | 'processing' | 'result';

export default function ChatScreen() {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>('landing');
  const [step, setStep] = useState(0);
  const [params, setParams] = useState<Params>({
    mood: 7, hunger: '', budget: '', group: 'jalgiz', groupSize: 1, allergies: [], time: '',
  });
  const [result, setResult] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [bgIndex, setBgIndex] = useState(0);
  const [qrVisible, setQrVisible] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderData, setOrderData] = useState<{
    order_id: string;
    payment_url: string;
    total: number;
  } | null>(null);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const animateToNext = (nextStep: number) => {
    Animated.timing(slideAnim, { toValue: -width, duration: 220, useNativeDriver: true }).start(() => {
      setStep(nextStep);
      setBgIndex((i) => (i + 1) % BG_IMAGES.length);
      slideAnim.setValue(width);
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 4 }).start();
    });
  };

  const startFlow = async () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
      setPhase('steps');
      setStep(0);
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    });
  };

  const nextStep = () => {
    if (step < 5) {
      animateToNext(step + 1);
    } else {
      submitToAI();
    }
  };

  const isStepValid = () => {
    switch (step) {
      case 0: return params.mood > 0;
      case 1: return params.hunger !== '';
      case 2: return params.budget !== '' && parseInt(params.budget) > 0;
      case 3: return true;
      case 4: return true;
      case 5: return params.time !== '';
      default: return false;
    }
  };

  const submitToAI = async () => {
    setPhase('processing');
    try {
      const { session_id } = await api.createSession(lang);
      setSessionId(session_id);

      const moodLabel = lang === 'kk' ? MOOD_LABELS_KK[params.mood] : MOOD_LABELS_RU[params.mood];
      const allergyText = params.allergies.length > 0 ? params.allergies.join(', ') : (lang === 'kk' ? 'Joq' : 'Нет');
      const groupText = params.group === 'jalgiz'
        ? (lang === 'kk' ? 'Jalǵız' : 'Один')
        : (lang === 'kk' ? `Topar (${params.groupSize} adam)` : `Группа (${params.groupSize} чел.)`);

      const message = lang === 'kk'
        ? `Keyipiyatım: ${params.mood}/10 (${moodLabel}), ashlıq: ${params.hunger}, byudjet: ${params.budget} swm, ${groupText}, allergiya: ${allergyText}, keliw waqtım: ${params.time}.`
        : `Настроение: ${params.mood}/10 (${moodLabel}), аппетит: ${params.hunger}, бюджет: ${params.budget} сум, ${groupText}, аллергии: ${allergyText}, время прихода: ${params.time}.`;

      const { ai_message } = await api.sendMessage(session_id, message);
      setResult(ai_message.content);
      setPhase('result');
    } catch (e) {
      Alert.alert('Error', lang === 'kk' ? 'Qátelik júz berdi' : 'Произошла ошибка');
      setPhase('landing');
    }
  };

  const askAnother = async () => {
    if (!sessionId) return;
    setPhase('processing');
    try {
      const msg = lang === 'kk' ? 'Basqasın usınıs et, bul menyunı qalamayman.' : 'Предложи другой вариант, этот не нравится.';
      const { ai_message } = await api.sendMessage(sessionId, msg);
      setResult(ai_message.content);
      setPhase('result');
    } catch {
      Alert.alert('Error', 'Failed to get suggestion');
    }
  };

  const resetFlow = () => {
    setPhase('landing');
    setStep(0);
    setParams({ mood: 7, hunger: '', budget: '', group: 'jalgiz', groupSize: 1, allergies: [], time: '' });
    setResult('');
    setSessionId('');
    setBgIndex(0);
    setQrVisible(false);
    setOrderData(null);
  };

  // Extract total amount in swm from AI markdown response.
  // Looks for the largest "= **NNNN swm**" or "**NNNN swm**" near "Esap-kitap"/"Итого"
  const extractTotalFromMarkdown = (md: string): number => {
    if (!md) return 0;
    // Match patterns like "= **75000 swm**" or "**75000 swm**" or "= 75000 swm"
    const patterns = [
      /=\s*\*\*\s*([\d\s]+)\s*swm\s*\*\*/i,
      /=\s*\*\*\s*([\d\s]+)\s*сум\s*\*\*/i,
      /\*\*\s*([\d\s]+)\s*swm\s*\*\*/i,
      /\*\*\s*([\d\s]+)\s*сум\s*\*\*/i,
      /=\s*([\d\s]+)\s*swm/i,
      /=\s*([\d\s]+)\s*сум/i,
    ];
    for (const p of patterns) {
      const m = md.match(p);
      if (m && m[1]) {
        const num = parseInt(m[1].replace(/\s/g, ''), 10);
        if (!isNaN(num) && num > 0) return num;
      }
    }
    // Fallback: sum of all "NNNN swm" matches – take the largest single amount
    const all = Array.from(md.matchAll(/([\d\s]{4,})\s*(?:swm|сум)/gi))
      .map((m) => parseInt(m[1].replace(/\s/g, ''), 10))
      .filter((n) => !isNaN(n) && n > 0);
    if (all.length === 0) return 0;
    return Math.max(...all);
  };

  const confirmOrder = async () => {
    setOrderLoading(true);
    try {
      const total = extractTotalFromMarkdown(result);
      const order = await api.createOrder({
        session_id: sessionId,
        summary: result,
        total,
        language: lang,
      });
      setOrderData({
        order_id: order.order_id,
        payment_url: order.payment_url,
        total: order.total,
      });
      setQrVisible(true);
    } catch {
      Alert.alert(
        'Error',
        lang === 'kk' ? 'Buyırtpa jaratıwda qátelik' : 'Ошибка создания заказа'
      );
    } finally {
      setOrderLoading(false);
    }
  };

  // ── LANDING ──────────────────────────────────────────────────────────────
  if (phase === 'landing') {
    return (
      <ImageBackground source={{ uri: BG_IMAGES[0] }} style={styles.fullBg} resizeMode="cover">
        <View style={styles.overlay} />
        <SafeAreaView style={styles.flex}>
          <View style={styles.landingContent}>
            <Animated.View style={{ opacity: fadeAnim }}>
              <Text style={styles.greetUser}>
                {user ? (lang === 'kk' ? `Sálem, ${user.name.split(' ')[0]}! 👋` : `Привет, ${user.name.split(' ')[0]}! 👋`) : ''}
              </Text>
              <Text style={styles.landingTitle}>Mood-to-Menu</Text>
              <Text style={styles.landingSubtitle}>
                {lang === 'kk' ? 'Keyipiyatıńızǵa qaray menyu tańlap beremiz' : 'Подберём меню по вашему настроению'}
              </Text>
            </Animated.View>

            <TouchableOpacity
              testID="byirtpa-berin-btn"
              style={styles.bigStartBtn}
              onPress={startFlow}
              activeOpacity={0.85}
            >
              <Text style={styles.bigStartBtnText}>
                {lang === 'kk' ? 'Buyırtpa beriń' : 'Начать'}
              </Text>
              <Ionicons name="arrow-forward" size={22} color="#fff" />
            </TouchableOpacity>

            <BlurView intensity={30} tint="dark" style={styles.landingHint}>
              <Text style={styles.landingHintText}>
                {lang === 'kk' ? '6 soraw · 2 minut · JI usınısı' : '6 вопросов · 2 минуты · AI рекомендация'}
              </Text>
            </BlurView>
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  // ── PROCESSING ───────────────────────────────────────────────────────────
  if (phase === 'processing') {
    return (
      <ImageBackground source={{ uri: BG_IMAGES[1] }} style={styles.fullBg} resizeMode="cover">
        <View style={styles.overlayDark} />
        <SafeAreaView style={[styles.flex, styles.center]}>
          <Text style={styles.processingEmoji}>🍽️</Text>
          <ActivityIndicator size="large" color={ACCENT} style={{ marginVertical: 16 }} />
          <Text style={styles.processingText}>
            {lang === 'kk' ? 'Jasalma intellekt menyuni talqılap atır...' : 'AI анализирует ваши предпочтения...'}
          </Text>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  // ── RESULT ────────────────────────────────────────────────────────────────
  if (phase === 'result') {
    return (
      <ImageBackground source={{ uri: BG_IMAGES[2] }} style={styles.fullBg} resizeMode="cover">
        <View style={styles.overlayDark} />
        <SafeAreaView style={styles.flex}>
          <ScrollView contentContainerStyle={styles.resultContainer} showsVerticalScrollIndicator={false}>
            <Text style={styles.resultTitle}>
              {lang === 'kk' ? '✨ Siz ushın Menyu' : '✨ Ваше Меню'}
            </Text>
            <BlurView intensity={50} tint="dark" style={styles.resultCard}>
              <Markdown style={markdownStyles}>{result}</Markdown>
            </BlurView>

            {/* Primary: Confirm & generate QR */}
            <TouchableOpacity
              testID="confirm-order-btn"
              style={styles.confirmBtn}
              onPress={confirmOrder}
              activeOpacity={0.85}
              disabled={orderLoading}
            >
              {orderLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="qr-code" size={22} color="#fff" />
                  <Text style={styles.confirmBtnText}>
                    {lang === 'kk' ? 'Buyırtpanı Tastıyıqlaw' : 'Подтвердить заказ'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.resultActions}>
              <TouchableOpacity testID="another-btn" style={styles.anotherBtn} onPress={askAnother} activeOpacity={0.8}>
                <Ionicons name="refresh" size={18} color="#fff" />
                <Text style={styles.anotherBtnText}>{lang === 'kk' ? 'Basqa variant' : 'Другой'}</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="cancel-btn" style={styles.cancelBtn} onPress={resetFlow} activeOpacity={0.8}>
                <Ionicons name="close" size={18} color="#fff" />
                <Text style={styles.anotherBtnText}>{lang === 'kk' ? 'Biykarlaw' : 'Отмена'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>

        {/* QR Code Modal */}
        <Modal
          visible={qrVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setQrVisible(false)}
        >
          <View style={styles.qrBackdrop}>
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
            <SafeAreaView style={styles.qrSafe}>
              <View style={styles.qrCard}>
                <Text style={styles.qrTitle}>
                  {lang === 'kk' ? '🎉 Buyırtpa qabıl etildi!' : '🎉 Заказ принят!'}
                </Text>
                <Text style={styles.qrSubtitle}>
                  {lang === 'kk'
                    ? 'Tólew ushın QR-kodtı kassirge kórsetiń'
                    : 'Покажите QR-код кассиру для оплаты'}
                </Text>

                <View style={styles.qrWrap}>
                  {orderData?.payment_url ? (
                    <QRCode
                      value={orderData.payment_url}
                      size={220}
                      color="#1A1A1A"
                      backgroundColor="#FFFFFF"
                    />
                  ) : null}
                </View>

                {orderData ? (
                  <>
                    <View style={styles.qrInfoRow}>
                      <Text style={styles.qrInfoLabel}>
                        {lang === 'kk' ? 'Buyırtpa №' : 'Заказ №'}
                      </Text>
                      <Text style={styles.qrInfoValue}>{orderData.order_id}</Text>
                    </View>
                    <View style={styles.qrInfoRow}>
                      <Text style={styles.qrInfoLabel}>
                        {lang === 'kk' ? 'Jámi summa' : 'Итого'}
                      </Text>
                      <Text style={styles.qrInfoValueAccent}>
                        {orderData.total.toLocaleString('ru-RU')} swm
                      </Text>
                    </View>
                  </>
                ) : null}

                <Text style={styles.qrHint}>
                  {lang === 'kk'
                    ? 'QR-kodtı skanerden ótkeriń yamasa kassirge kórsetiń'
                    : 'Отсканируйте QR-код или покажите кассиру'}
                </Text>

                <TouchableOpacity
                  testID="qr-close-btn"
                  style={styles.qrCloseBtn}
                  onPress={() => {
                    setQrVisible(false);
                    resetFlow();
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.qrCloseBtnText}>
                    {lang === 'kk' ? 'Tamam' : 'Готово'}
                  </Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </View>
        </Modal>
      </ImageBackground>
    );
  }

  // ── STEP-BY-STEP ──────────────────────────────────────────────────────────
  const STEP_LABELS_KK = ['Keyipiyat', 'Ash dárejesi', 'Byudjet', 'Kim menen', 'Allergiya', 'Keliw waqtı'];
  const STEP_LABELS_RU = ['Настроение', 'Аппетит', 'Бюджет', 'С кем', 'Аллергии', 'Время'];
  const stepLabels = lang === 'kk' ? STEP_LABELS_KK : STEP_LABELS_RU;

  return (
    <ImageBackground source={{ uri: BG_IMAGES[bgIndex] }} style={styles.fullBg} resizeMode="cover">
      <View style={styles.overlayDark} />
      <SafeAreaView style={styles.flex}>
        {/* Progress */}
        <View style={styles.progressContainer}>
          <TouchableOpacity onPress={() => { if (step > 0) animateToNext(step - 1); else resetFlow(); }} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.progressBar}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <View key={i} style={[styles.progressDot, i <= step && styles.progressDotActive]} />
            ))}
          </View>
          <Text style={styles.stepLabel}>{step + 1}/6</Text>
        </View>

        <Animated.View style={[styles.flex, { transform: [{ translateX: slideAnim }] }]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
            <View style={styles.stepContent}>
              {/* Step 0: Mood */}
              {step === 0 && (
                <BlurView intensity={45} tint="dark" style={styles.stepCard}>
                  <Text style={styles.stepTitle}>{lang === 'kk' ? '😊 Keyipiyatıńız?' : '😊 Ваше настроение?'}</Text>
                  <Text style={styles.moodEmoji}>{MOOD_EMOJIS[params.mood]}</Text>
                  <Text style={styles.moodLabel}>{lang === 'kk' ? MOOD_LABELS_KK[params.mood] : MOOD_LABELS_RU[params.mood]}</Text>
                  <View style={styles.moodScale}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <TouchableOpacity
                        key={n}
                        testID={`mood-${n}`}
                        style={[styles.moodBtn, params.mood === n && styles.moodBtnActive]}
                        onPress={() => setParams({ ...params, mood: n })}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.moodNum, params.mood === n && styles.moodNumActive]}>{n}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.moodScaleLabels}>
                    <Text style={styles.moodScaleEnd}>{lang === 'kk' ? 'Jaman' : 'Плохо'}</Text>
                    <Text style={styles.moodScaleEnd}>{lang === 'kk' ? 'Ajayıp' : 'Отлично'}</Text>
                  </View>
                </BlurView>
              )}

              {/* Step 1: Hunger */}
              {step === 1 && (
                <BlurView intensity={45} tint="dark" style={styles.stepCard}>
                  <Text style={styles.stepTitle}>{lang === 'kk' ? '🍽️ Ash dárejeńiz?' : '🍽️ Степень аппетита?'}</Text>
                  <View style={styles.hungerGrid}>
                    {[
                      { value: lang === 'kk' ? 'Júda az' : 'Мало', emoji: '🌿', desc: lang === 'kk' ? '1-3' : '1-3' },
                      { value: lang === 'kk' ? 'Orta' : 'Немного', emoji: '🥗', desc: lang === 'kk' ? '4-6' : '4-6' },
                      { value: lang === 'kk' ? 'Kóp' : 'Голоден', emoji: '🍖', desc: lang === 'kk' ? '7-8' : '7-8' },
                      { value: lang === 'kk' ? 'Júda kóp' : 'Очень голоден', emoji: '🔥', desc: lang === 'kk' ? '9-10' : '9-10' },
                    ].map((h) => (
                      <TouchableOpacity
                        key={h.value}
                        testID={`hunger-${h.value}`}
                        style={[styles.hungerCard, params.hunger === h.value && styles.hungerCardActive]}
                        onPress={() => setParams({ ...params, hunger: h.value })}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.hungerEmoji}>{h.emoji}</Text>
                        <Text style={[styles.hungerLabel, params.hunger === h.value && styles.hungerLabelActive]}>
                          {h.value}
                        </Text>
                        <Text style={styles.hungerDesc}>{h.desc}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </BlurView>
              )}

              {/* Step 2: Budget */}
              {step === 2 && (
                <BlurView intensity={45} tint="dark" style={styles.stepCard}>
                  <Text style={styles.stepTitle}>{lang === 'kk' ? '💰 Byudjet (swm)?' : '💰 Бюджет (сум)?'}</Text>
                  <View style={styles.budgetInputRow}>
                    <TextInput
                      testID="budget-input"
                      style={styles.budgetInput}
                      value={params.budget}
                      onChangeText={(v) => setParams({ ...params, budget: v.replace(/[^0-9]/g, '') })}
                      placeholder="50000"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      keyboardType="numeric"
                    />
                    <Text style={styles.budgetCurrency}>swm</Text>
                  </View>
                  <View style={styles.budgetPresets}>
                    {['30000', '50000', '80000', '100000', '150000', '200000'].map((p) => (
                      <TouchableOpacity
                        key={p}
                        testID={`budget-preset-${p}`}
                        style={[styles.presetChip, params.budget === p && styles.presetChipActive]}
                        onPress={() => setParams({ ...params, budget: p })}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.presetText, params.budget === p && styles.presetTextActive]}>
                          {parseInt(p) >= 1000 ? `${parseInt(p) / 1000}k` : p}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </BlurView>
              )}

              {/* Step 3: Group */}
              {step === 3 && (
                <BlurView intensity={45} tint="dark" style={styles.stepCard}>
                  <Text style={styles.stepTitle}>{lang === 'kk' ? '👥 Kim menen kelesiz?' : '👥 С кем придёте?'}</Text>
                  <View style={styles.groupCards}>
                    {[
                      { value: 'jalgiz', emoji: '🧍', label: lang === 'kk' ? 'Jalǵız' : 'Один' },
                      { value: 'topar', emoji: '👥', label: lang === 'kk' ? 'Topar' : 'Группа' },
                    ].map((g) => (
                      <TouchableOpacity
                        key={g.value}
                        testID={`group-${g.value}`}
                        style={[styles.groupCard, params.group === g.value && styles.groupCardActive]}
                        onPress={() => setParams({ ...params, group: g.value as 'jalgiz' | 'topar' })}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.groupEmoji}>{g.emoji}</Text>
                        <Text style={[styles.groupLabel, params.group === g.value && styles.groupLabelActive]}>
                          {g.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {params.group === 'topar' && (
                    <View style={styles.counterRow}>
                      <Text style={styles.counterLabel}>
                        {lang === 'kk' ? 'Adam sanı:' : 'Количество:'}
                      </Text>
                      <TouchableOpacity style={styles.counterBtn} onPress={() => setParams({ ...params, groupSize: Math.max(2, params.groupSize - 1) })}>
                        <Text style={styles.counterBtnText}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.counterNum}>{params.groupSize}</Text>
                      <TouchableOpacity style={styles.counterBtn} onPress={() => setParams({ ...params, groupSize: Math.min(12, params.groupSize + 1) })}>
                        <Text style={styles.counterBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </BlurView>
              )}

              {/* Step 4: Allergies */}
              {step === 4 && (
                <BlurView intensity={45} tint="dark" style={styles.stepCard}>
                  <Text style={styles.stepTitle}>{lang === 'kk' ? '🚫 Allergiyańız barma?' : '🚫 Аллергии?'}</Text>
                  <Text style={styles.stepSubtitle}>{lang === 'kk' ? 'Joq bolsa — «Joq» túymesin basıńız' : 'Если нет — нажмите "Нет"'}</Text>
                  <TouchableOpacity
                    testID="no-allergy-btn"
                    style={[styles.noAllergyBtn, params.allergies.length === 0 && styles.noAllergyBtnActive]}
                    onPress={() => setParams({ ...params, allergies: [] })}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.noAllergyText, params.allergies.length === 0 && styles.noAllergyTextActive]}>
                      {lang === 'kk' ? '✓ Allergiyam joq' : '✓ Аллергий нет'}
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.allergyChips}>
                    {(lang === 'kk' ? ALLERGENS_KK : ALLERGENS_RU).map((a, idx) => {
                      const isSelected = params.allergies.includes(a);
                      return (
                        <TouchableOpacity
                          key={a}
                          testID={`allergy-${idx}`}
                          style={[styles.allergyChip, isSelected && styles.allergyChipActive]}
                          onPress={() => {
                            setParams({
                              ...params,
                              allergies: isSelected
                                ? params.allergies.filter((x) => x !== a)
                                : [...params.allergies, a],
                            });
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.allergyText, isSelected && styles.allergyTextActive]}>{a}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </BlurView>
              )}

              {/* Step 5: Time */}
              {step === 5 && (
                <BlurView intensity={45} tint="dark" style={styles.stepCard}>
                  <Text style={styles.stepTitle}>{lang === 'kk' ? '🕐 Keliw waqtı?' : '🕐 Время прихода?'}</Text>
                  <View style={styles.timeSlots}>
                    {TIME_SLOTS_KK.map((slot) => (
                      <TouchableOpacity
                        key={slot}
                        testID={`time-${slot}`}
                        style={[styles.timeSlot, params.time === slot && styles.timeSlotActive]}
                        onPress={() => setParams({ ...params, time: slot })}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.timeSlotText, params.time === slot && styles.timeSlotTextActive]}>
                          {slot}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </BlurView>
              )}
            </View>

            {/* Next Button */}
            <View style={styles.nextContainer}>
              <TouchableOpacity
                testID="next-step-btn"
                style={[styles.nextBtn, !isStepValid() && styles.nextBtnDisabled]}
                onPress={nextStep}
                activeOpacity={0.85}
                disabled={!isStepValid()}
              >
                <Text style={styles.nextBtnText}>
                  {step === 5
                    ? (lang === 'kk' ? '🍽️ Menyunı tabıw' : '🍽️ Найти меню')
                    : (lang === 'kk' ? 'Keyingi →' : 'Далее →')}
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const markdownStyles = {
  body: { color: '#FFFFFF', fontSize: 15, lineHeight: 24 },
  strong: { color: '#F5A623', fontWeight: '700' as const },
  bullet_list_icon: { color: '#E05A33', marginTop: 6 },
  bullet_list_content: { color: '#FFFFFF', fontSize: 15, lineHeight: 22 },
  ordered_list_content: { color: '#FFFFFF', fontSize: 15 },
  paragraph: { marginBottom: 8 },
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  fullBg: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  overlayDark: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.68)' },

  // Landing
  landingContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  greetUser: { color: 'rgba(255,255,255,0.7)', fontSize: 16, textAlign: 'center', marginBottom: 4 },
  landingTitle: { fontSize: 48, fontWeight: '900', color: '#FFFFFF', textAlign: 'center', letterSpacing: -2 },
  landingSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.65)', textAlign: 'center', marginTop: 8, marginBottom: 48 },
  bigStartBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: ACCENT, borderRadius: 28,
    paddingVertical: 22, paddingHorizontal: 48,
  },
  bigStartBtnText: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 0.5 },
  landingHint: {
    marginTop: 24, borderRadius: 20, overflow: 'hidden', paddingHorizontal: 20, paddingVertical: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  landingHintText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center' },

  // Processing
  processingEmoji: { fontSize: 72 },
  processingText: { color: 'rgba(255,255,255,0.8)', fontSize: 16, textAlign: 'center', marginTop: 8 },

  // Result
  resultContainer: { padding: 20, paddingBottom: 40 },
  resultTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', marginBottom: 16 },
  resultCard: {
    borderRadius: 24, overflow: 'hidden', padding: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  resultText: { color: '#FFFFFF', fontSize: 15, lineHeight: 24 },
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#22C55E', borderRadius: 20, paddingVertical: 18, marginTop: 20,
    shadowColor: '#22C55E', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  confirmBtnText: { color: '#fff', fontWeight: '800', fontSize: 17 },
  resultActions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  likeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#22C55E', borderRadius: 18, paddingVertical: 16,
  },
  likeBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  anotherBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: ACCENT, borderRadius: 14, paddingVertical: 14,
  },
  cancelBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  anotherBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // QR Modal
  qrBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  qrSafe: { width: '100%', alignItems: 'center', paddingHorizontal: 20 },
  qrCard: {
    width: '100%', maxWidth: 380, backgroundColor: 'rgba(20,20,20,0.95)',
    borderRadius: 28, padding: 24, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  qrTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', marginBottom: 6 },
  qrSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginBottom: 20 },
  qrWrap: {
    backgroundColor: '#FFFFFF', padding: 16, borderRadius: 18, marginBottom: 20,
  },
  qrInfoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    width: '100%', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  qrInfoLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  qrInfoValue: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  qrInfoValueAccent: { color: '#F5A623', fontSize: 18, fontWeight: '800' },
  qrHint: {
    color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center',
    marginTop: 16, marginBottom: 16, paddingHorizontal: 8,
  },
  qrCloseBtn: {
    backgroundColor: ACCENT, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 48,
    width: '100%', alignItems: 'center',
  },
  qrCloseBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },

  // Progress
  progressContainer: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
  },
  backBtn: { padding: 4 },
  progressBar: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)' },
  progressDotActive: { backgroundColor: ACCENT },
  stepLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 13, width: 28, textAlign: 'right' },

  // Step card
  stepContent: { flex: 1, justifyContent: 'center', paddingHorizontal: 16, paddingBottom: 16 },
  stepCard: {
    borderRadius: 24, overflow: 'hidden', padding: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  stepTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', marginBottom: 20 },
  stepSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: 12 },

  // Mood
  moodEmoji: { fontSize: 56, textAlign: 'center', marginBottom: 4 },
  moodLabel: { fontSize: 16, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 20, fontWeight: '600' },
  moodScale: { flexDirection: 'row', justifyContent: 'center', gap: 6, flexWrap: 'wrap' },
  moodBtn: {
    width: 38, height: 38, borderRadius: 19, borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  moodBtnActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  moodNum: { color: 'rgba(255,255,255,0.6)', fontWeight: '700', fontSize: 14 },
  moodNumActive: { color: '#fff' },
  moodScaleLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  moodScaleEnd: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },

  // Hunger
  hungerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  hungerCard: {
    width: (width - 90) / 2, padding: 16, borderRadius: 16, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)',
  },
  hungerCardActive: { backgroundColor: 'rgba(224,90,51,0.3)', borderColor: ACCENT },
  hungerEmoji: { fontSize: 32, marginBottom: 8 },
  hungerLabel: { color: 'rgba(255,255,255,0.7)', fontWeight: '700', fontSize: 14, textAlign: 'center' },
  hungerLabelActive: { color: '#FFFFFF' },
  hungerDesc: { color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 2 },

  // Budget
  budgetInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  budgetInput: {
    flex: 1, color: '#FFFFFF', fontSize: 28, fontWeight: '800', textAlign: 'center',
    borderBottomWidth: 2, borderBottomColor: ACCENT, paddingBottom: 8,
  },
  budgetCurrency: { color: 'rgba(255,255,255,0.5)', fontSize: 16, fontWeight: '600' },
  budgetPresets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  presetChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.05)',
  },
  presetChipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  presetText: { color: 'rgba(255,255,255,0.6)', fontWeight: '600', fontSize: 14 },
  presetTextActive: { color: '#fff' },

  // Group
  groupCards: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  groupCard: {
    flex: 1, padding: 20, borderRadius: 18, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)',
  },
  groupCardActive: { backgroundColor: 'rgba(224,90,51,0.3)', borderColor: ACCENT },
  groupEmoji: { fontSize: 36, marginBottom: 8 },
  groupLabel: { color: 'rgba(255,255,255,0.7)', fontWeight: '700', fontSize: 16 },
  groupLabelActive: { color: '#FFFFFF' },
  counterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 8 },
  counterLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  counterBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center',
  },
  counterBtnText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  counterNum: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', minWidth: 32, textAlign: 'center' },

  // Allergies
  noAllergyBtn: {
    padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', marginBottom: 14, backgroundColor: 'rgba(255,255,255,0.06)',
  },
  noAllergyBtnActive: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  noAllergyText: { color: 'rgba(255,255,255,0.6)', fontWeight: '700', fontSize: 15 },
  noAllergyTextActive: { color: '#fff' },
  allergyChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  allergyChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.05)',
  },
  allergyChipActive: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  allergyText: { color: 'rgba(255,255,255,0.65)', fontWeight: '600', fontSize: 13 },
  allergyTextActive: { color: '#fff' },

  // Time
  timeSlots: { gap: 10 },
  timeSlot: {
    padding: 16, borderRadius: 14, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)',
  },
  timeSlotActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  timeSlotText: { color: 'rgba(255,255,255,0.7)', fontWeight: '700', fontSize: 16 },
  timeSlotTextActive: { color: '#fff' },

  // Next button
  nextContainer: { paddingHorizontal: 16, paddingBottom: Platform.OS === 'ios' ? 16 : 24 },
  nextBtn: {
    backgroundColor: ACCENT, borderRadius: 22, paddingVertical: 18,
    alignItems: 'center',
  },
  nextBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.15)' },
  nextBtnText: { color: '#fff', fontWeight: '800', fontSize: 18 },
});
