// components/TrustCard.tsx
// Ana sayfada gösterilecek Trust Center kartı

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useStore } from '@/stores/useStore';

interface TrustCardProps {
  compact?: boolean;
}

export default function TrustCard({ compact = false }: TrustCardProps) {
  const colorScheme = useColorScheme();
  const { theme, language } = useStore();
  const systemIsDark = colorScheme === 'dark';
  const isDark = theme === 'system' ? systemIsDark : theme === 'dark';

  const [totalReserves, setTotalReserves] = useState('$487M');
  const [backingRatio, setBackingRatio] = useState(100);

  const t = {
    title: language === 'en' ? 'Trust Center' : 'Güven Merkezi',
    subtitle: language === 'en' ? 'Backed 1:1 by Physical Assets' : '1:1 Fiziksel Varlık Destekli',
    totalReserves: language === 'en' ? 'Total Reserves' : 'Toplam Rezerv',
    backed: language === 'en' ? 'Fully Backed' : 'Tam Karşılıklı',
    viewDetails: language === 'en' ? 'View Details' : 'Detayları Gör',
    reserves: language === 'en' ? 'Reserves' : 'Rezervler',
    audits: language === 'en' ? 'Audits' : 'Denetim',
    custody: language === 'en' ? 'Custody' : 'Saklama',
  };

  useEffect(() => {
    // Fetch trust data
    fetchTrustData();
  }, []);

  const fetchTrustData = async () => {
    try {
      const res = await fetch('https://auxite-wallet.vercel.app/api/trust/overview');
      if (res.ok) {
        const data = await res.json();
        setTotalReserves(data.totalReserves);
      }
    } catch (e) {
      // Use default values
    }
  };

  const handlePress = () => {
    router.push('/(tabs)/trust');
  };

  const handleQuickLink = (screen: string) => {
    router.push(`/(tabs)/trust/${screen}` as any);
  };

  // Compact version for smaller spaces
  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactCard, { backgroundColor: isDark ? '#1e293b' : '#fff' }]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#10b981', '#059669']}
          style={styles.compactIcon}
        >
          <Ionicons name="shield-checkmark" size={20} color="#fff" />
        </LinearGradient>
        <View style={styles.compactContent}>
          <Text style={[styles.compactTitle, { color: isDark ? '#fff' : '#0f172a' }]}>
            {t.title}
          </Text>
          <Text style={[styles.compactSubtitle, { color: isDark ? '#94a3b8' : '#64748b' }]}>
            {backingRatio}% {t.backed}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={isDark ? '#475569' : '#94a3b8'} />
      </TouchableOpacity>
    );
  }

  // Full version
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={isDark ? ['#064e3b', '#0f172a'] : ['#10b981', '#059669']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark" size={28} color="#fff" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>{t.title}</Text>
            <Text style={styles.subtitle}>{t.subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.6)" />
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{totalReserves}</Text>
            <Text style={styles.statLabel}>{t.totalReserves}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{backingRatio}%</Text>
            <Text style={styles.statLabel}>{t.backed}</Text>
          </View>
        </View>

        {/* Quick Links */}
        <View style={styles.quickLinks}>
          {[
            { key: 'reserves', icon: 'analytics', label: t.reserves },
            { key: 'audits', icon: 'document-text', label: t.audits },
            { key: 'custody', icon: 'lock-closed', label: t.custody },
          ].map((link) => (
            <TouchableOpacity
              key={link.key}
              style={styles.quickLink}
              onPress={() => handleQuickLink(link.key)}
            >
              <Ionicons name={link.icon as any} size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.quickLinkText}>{link.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Live indicator */}
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Live</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  gradient: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  stats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 16,
  },
  quickLinks: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  quickLink: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 10,
    borderRadius: 10,
  },
  quickLinkText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  liveIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ade80',
    marginRight: 4,
  },
  liveText: {
    fontSize: 10,
    color: '#4ade80',
    fontWeight: '600',
  },

  // Compact styles
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  compactIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  compactContent: {
    flex: 1,
  },
  compactTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  compactSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
});
