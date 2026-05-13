// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
import React, { useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ImageBackground,
  Animated, Dimensions, Platform, StatusBar,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useLanguage } from '../contexts/LanguageContext';

const { width, height } = Dimensions.get('window');
const BG = 'https://images.pexels.com/photos/32558904/pexels-photo-32558904.jpeg?auto=compress&cs=tinysrgb&w=1200';

export default function WelcomeScreen() {
  const { lang, setLang, t } = useLanguage();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleGoogleLogin = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
      const redirectUrl = window.location.origin + '/';
      window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
    }
  };

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <ImageBackground source={{ uri: BG }} style={styles.bg} resizeMode="cover">
      <StatusBar barStyle="light-content" />
      <View style={styles.overlay} />

      {/* Language Toggle */}
      <View style={styles.langContainer}>
        {(['kk', 'ru'] as const).map((l) => (
          <TouchableOpacity
            key={l}
            testID={`lang-${l}`}
            onPress={() => setLang(l)}
            style={[styles.langBtn, lang === l && styles.langBtnActive]}
            activeOpacity={0.8}
          >
            <Text style={[styles.langText, lang === l && styles.langTextActive]}>
              {l === 'kk' ? 'QQ' : 'RU'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Center Content */}
      <View style={styles.center}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Text style={styles.emoji}>🍽️</Text>
        </Animated.View>
        <Text style={styles.title}>Mood-to-Menu</Text>
        <Text style={styles.subtitle}>
          {lang === 'kk'
            ? 'Keyipiyatıńızǵa qaray — eń mas menyu'
            : 'Меню по вашему настроению'}
        </Text>

        {/* Google Login Card */}
        <BlurView intensity={40} tint="dark" style={styles.card}>
          <Text style={styles.cardTitle}>
            {lang === 'kk' ? 'Kiriw ushın' : 'Для входа'}
          </Text>

          <TouchableOpacity
            testID="google-login-btn"
            style={styles.googleBtn}
            onPress={handleGoogleLogin}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={0.85}
          >
            <Text style={styles.googleIcon}>G</Text>
            <Text style={styles.googleBtnText}>
              {lang === 'kk' ? 'Google menen kiriw' : 'Войти через Google'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.cardHint}>
            {lang === 'kk'
              ? 'Kiriwden keyin sáwbet tariyxıńız saqlanadı'
              : 'После входа история чатов сохраняется'}
          </Text>
        </BlurView>
      </View>

      {/* Bottom Brand */}
      <View style={styles.bottom}>
        <Text style={styles.bottomText}>
          {lang === 'kk' ? '🕐 10:00 – 23:00' : '🕐 10:00 – 23:00'}
        </Text>
        <Text style={styles.bottomHint}>
          {lang === 'kk' ? 'Restoranıń jumıs waqtı' : 'Часы работы ресторана'}
        </Text>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  langContainer: {
    position: 'absolute', top: 56, right: 24,
    flexDirection: 'row', gap: 6, zIndex: 10,
  },
  langBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  langBtnActive: { backgroundColor: '#E05A33', borderColor: '#E05A33' },
  langText: { color: 'rgba(255,255,255,0.6)', fontWeight: '700', fontSize: 13 },
  langTextActive: { color: '#fff' },
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 28, paddingTop: 40,
  },
  emoji: { fontSize: 64, marginBottom: 12 },
  title: {
    fontSize: 40, fontWeight: '900', color: '#FFFFFF',
    letterSpacing: -1.5, textAlign: 'center',
  },
  subtitle: {
    fontSize: 16, color: 'rgba(255,255,255,0.7)',
    textAlign: 'center', marginTop: 6, marginBottom: 40,
  },
  card: {
    width: '100%', borderRadius: 24, overflow: 'hidden',
    padding: 28, alignItems: 'center', gap: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  cardTitle: { fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 16,
    paddingHorizontal: 32, gap: 12, width: '100%',
  },
  googleIcon: { fontSize: 18, fontWeight: '900', color: '#EA4335' },
  googleBtnText: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  cardHint: { fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center' },
  bottom: { paddingBottom: 40, alignItems: 'center', gap: 4 },
  bottomText: { color: '#E05A33', fontSize: 15, fontWeight: '700' },
  bottomHint: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
});
