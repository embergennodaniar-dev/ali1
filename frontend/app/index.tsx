// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { Platform, View, ActivityIndicator } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function Index() {
  const { isAuthenticated, handleAuthCallback } = useAuth();

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash && hash.includes('session_id=')) {
        const sessionId = hash.split('session_id=')[1].split('&')[0];
        handleAuthCallback(sessionId).catch(() => {});
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, []);

  if (isAuthenticated === null) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0A0A' }}>
        <ActivityIndicator color="#E05A33" size="large" />
      </View>
    );
  }

  if (isAuthenticated) return <Redirect href="/(tabs)" />;
  return <Redirect href="/welcome" />;
}
