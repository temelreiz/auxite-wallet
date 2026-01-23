// app/auth/login.tsx
// Login Screen with Real API Integration + OAuth

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStore } from '@/stores/useStore';

WebBrowser.maybeCompleteAuthSession();

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://wallet.auxite.io';

const translations = {
  tr: {
    welcome: 'Hoş Geldiniz',
    subtitle: 'Hesabınıza giriş yapın',
    email: 'E-posta',
    emailPlaceholder: 'ornek@email.com',
    password: 'Şifre',
    passwordPlaceholder: '••••••••',
    forgotPassword: 'Şifremi Unuttum',
    login: 'Giriş Yap',
    loggingIn: 'Giriş yapılıyor...',
    or: 'veya',
    continueWithGoogle: 'Google ile devam et',
    continueWithApple: 'Apple ile devam et',
    noAccount: 'Hesabınız yok mu?',
    register: 'Kayıt Ol',
    invalidEmail: 'Geçerli bir e-posta girin',
    invalidPassword: 'Şifre en az 6 karakter olmalı',
    loginError: 'Giriş başarısız. Bilgilerinizi kontrol edin.',
    networkError: 'Bağlantı hatası. İnternet bağlantınızı kontrol edin.',
    verifyEmail: 'Lütfen e-postanızı doğrulayın',
  },
  en: {
    welcome: 'Welcome Back',
    subtitle: 'Sign in to your account',
    email: 'Email',
    emailPlaceholder: 'example@email.com',
    password: 'Password',
    passwordPlaceholder: '••••••••',
    forgotPassword: 'Forgot Password?',
    login: 'Sign In',
    loggingIn: 'Signing in...',
    or: 'or',
    continueWithGoogle: 'Continue with Google',
    continueWithApple: 'Continue with Apple',
    noAccount: "Don't have an account?",
    register: 'Sign Up',
    invalidEmail: 'Enter a valid email',
    invalidPassword: 'Password must be at least 6 characters',
    loginError: 'Login failed. Please check your credentials.',
    networkError: 'Connection error. Check your internet.',
    verifyEmail: 'Please verify your email',
  },
  de: {
    welcome: 'Willkommen zurück',
    subtitle: 'Melden Sie sich an',
    email: 'E-Mail',
    emailPlaceholder: 'beispiel@email.com',
    password: 'Passwort',
    passwordPlaceholder: '••••••••',
    forgotPassword: 'Passwort vergessen?',
    login: 'Anmelden',
    loggingIn: 'Anmeldung...',
    or: 'oder',
    continueWithGoogle: 'Mit Google fortfahren',
    continueWithApple: 'Mit Apple fortfahren',
    noAccount: 'Noch kein Konto?',
    register: 'Registrieren',
    invalidEmail: 'Geben Sie eine gültige E-Mail ein',
    invalidPassword: 'Passwort muss mindestens 6 Zeichen haben',
    loginError: 'Anmeldung fehlgeschlagen. Überprüfen Sie Ihre Daten.',
    networkError: 'Verbindungsfehler. Überprüfen Sie Ihre Internetverbindung.',
    verifyEmail: 'Bitte bestätigen Sie Ihre E-Mail',
  },
  fr: {
    welcome: 'Bon retour',
    subtitle: 'Connectez-vous à votre compte',
    email: 'E-mail',
    emailPlaceholder: 'exemple@email.com',
    password: 'Mot de passe',
    passwordPlaceholder: '••••••••',
    forgotPassword: 'Mot de passe oublié?',
    login: 'Se connecter',
    loggingIn: 'Connexion...',
    or: 'ou',
    continueWithGoogle: 'Continuer avec Google',
    continueWithApple: 'Continuer avec Apple',
    noAccount: "Vous n'avez pas de compte?",
    register: "S'inscrire",
    invalidEmail: 'Entrez un e-mail valide',
    invalidPassword: 'Le mot de passe doit contenir au moins 6 caractères',
    loginError: 'Échec de la connexion. Vérifiez vos identifiants.',
    networkError: 'Erreur de connexion. Vérifiez votre internet.',
    verifyEmail: 'Veuillez vérifier votre e-mail',
  },
  ar: {
    welcome: 'مرحباً بعودتك',
    subtitle: 'سجل الدخول إلى حسابك',
    email: 'البريد الإلكتروني',
    emailPlaceholder: 'example@email.com',
    password: 'كلمة المرور',
    passwordPlaceholder: '••••••••',
    forgotPassword: 'نسيت كلمة المرور؟',
    login: 'تسجيل الدخول',
    loggingIn: 'جاري تسجيل الدخول...',
    or: 'أو',
    continueWithGoogle: 'المتابعة مع Google',
    continueWithApple: 'المتابعة مع Apple',
    noAccount: 'ليس لديك حساب؟',
    register: 'إنشاء حساب',
    invalidEmail: 'أدخل بريد إلكتروني صالح',
    invalidPassword: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
    loginError: 'فشل تسجيل الدخول. تحقق من بياناتك.',
    networkError: 'خطأ في الاتصال. تحقق من الإنترنت.',
    verifyEmail: 'يرجى التحقق من بريدك الإلكتروني',
  },
  ru: {
    welcome: 'С возвращением',
    subtitle: 'Войдите в свой аккаунт',
    email: 'Эл. почта',
    emailPlaceholder: 'example@email.com',
    password: 'Пароль',
    passwordPlaceholder: '••••••••',
    forgotPassword: 'Забыли пароль?',
    login: 'Войти',
    loggingIn: 'Вход...',
    or: 'или',
    continueWithGoogle: 'Продолжить с Google',
    continueWithApple: 'Продолжить с Apple',
    noAccount: 'Нет аккаунта?',
    register: 'Регистрация',
    invalidEmail: 'Введите корректный email',
    invalidPassword: 'Пароль должен быть не менее 6 символов',
    loginError: 'Ошибка входа. Проверьте данные.',
    networkError: 'Ошибка соединения. Проверьте интернет.',
    verifyEmail: 'Пожалуйста, подтвердите email',
  },
};

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { theme, language } = useStore();
  const systemIsDark = colorScheme === 'dark';
  const isDark = theme === 'system' ? systemIsDark : theme === 'dark';
  const t = translations[language as keyof typeof translations] || translations.en;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Google OAuth
  const [googleRequest, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  });

  // Handle Google Response
  useEffect(() => {
    if (googleResponse?.type === 'success') {
      handleGoogleAuth(googleResponse.authentication?.idToken);
    }
  }, [googleResponse]);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // ════════════════════════════════════════════════════════════════════════════
  // AUTH SUCCESS HANDLER
  // ════════════════════════════════════════════════════════════════════════════

  const handleAuthSuccess = async (data: any) => {
    // Save token and user
    await AsyncStorage.setItem('authToken', data.token);
    await AsyncStorage.setItem('user', JSON.stringify(data.user));

    // Update store
    useStore.getState().setIsLoggedIn(true);
    useStore.getState().setUserEmail(data.user.email);

    // Check if wallet setup needed
    if (data.requiresWalletSetup || !data.user.walletAddress) {
      router.replace('/wallet-onboarding');
    } else {
      // Set wallet info and go to main app
      useStore.getState().setWalletAddress(data.user.walletAddress);
      router.replace('/(tabs)');
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // EMAIL/PASSWORD LOGIN
  // ════════════════════════════════════════════════════════════════════════════

  const handleLogin = async () => {
    setError('');

    if (!validateEmail(email)) {
      setError(t.invalidEmail);
      return;
    }

    if (password.length < 6) {
      setError(t.invalidPassword);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || t.loginError);
        return;
      }

      // Check if email verification needed
      if (data.requiresEmailVerification) {
        // Store email for verification screen
        await AsyncStorage.setItem('pendingVerificationEmail', email);
        router.push('/auth/verify-email');
        return;
      }

      await handleAuthSuccess(data);

    } catch (err) {
      setError(t.networkError);
    } finally {
      setIsLoading(false);
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // GOOGLE AUTH
  // ════════════════════════════════════════════════════════════════════════════

  const handleGoogleAuth = async (idToken?: string | null) => {
    if (!idToken) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, language }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || t.loginError);
        return;
      }

      await handleAuthSuccess(data);

    } catch (err) {
      setError(t.networkError);
    } finally {
      setIsLoading(false);
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // APPLE AUTH
  // ════════════════════════════════════════════════════════════════════════════

  const handleAppleAuth = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      setIsLoading(true);
      setError('');

      const response = await fetch(`${API_URL}/api/auth/apple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identityToken: credential.identityToken,
          user: {
            email: credential.email,
            name: credential.fullName ? {
              firstName: credential.fullName.givenName,
              lastName: credential.fullName.familyName,
            } : null,
          },
          language,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || t.loginError);
        return;
      }

      await handleAuthSuccess(data);

    } catch (err: any) {
      if (err.code !== 'ERR_CANCELED') {
        setError(t.networkError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={[styles.logoCircle, { backgroundColor: '#10b98120' }]}>
            <Ionicons name="diamond" size={40} color="#10b981" />
          </View>
          <Text style={[styles.logoText, { color: isDark ? '#fff' : '#0f172a' }]}>
            Auxite
          </Text>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: isDark ? '#fff' : '#0f172a' }]}>
            {t.welcome}
          </Text>
          <Text style={[styles.subtitle, { color: isDark ? '#94a3b8' : '#64748b' }]}>
            {t.subtitle}
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: isDark ? '#94a3b8' : '#64748b' }]}>
              {t.email}
            </Text>
            <View style={[
              styles.inputContainer,
              { backgroundColor: isDark ? '#1e293b' : '#fff', borderColor: isDark ? '#334155' : '#e2e8f0' }
            ]}>
              <Ionicons name="mail-outline" size={20} color={isDark ? '#64748b' : '#94a3b8'} />
              <TextInput
                style={[styles.input, { color: isDark ? '#fff' : '#0f172a' }]}
                placeholder={t.emailPlaceholder}
                placeholderTextColor={isDark ? '#475569' : '#cbd5e1'}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: isDark ? '#94a3b8' : '#64748b' }]}>
              {t.password}
            </Text>
            <View style={[
              styles.inputContainer,
              { backgroundColor: isDark ? '#1e293b' : '#fff', borderColor: isDark ? '#334155' : '#e2e8f0' }
            ]}>
              <Ionicons name="lock-closed-outline" size={20} color={isDark ? '#64748b' : '#94a3b8'} />
              <TextInput
                style={[styles.input, { color: isDark ? '#fff' : '#0f172a' }]}
                placeholder={t.passwordPlaceholder}
                placeholderTextColor={isDark ? '#475569' : '#cbd5e1'}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={isDark ? '#64748b' : '#94a3b8'}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={() => router.push('/auth/forgot-password')}
          >
            <Text style={styles.forgotPasswordText}>{t.forgotPassword}</Text>
          </TouchableOpacity>

          {/* Error */}
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Login Button */}
          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#10b981', '#059669']}
              style={styles.loginButtonGradient}
            >
              {isLoading ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.loginButtonText}>{t.loggingIn}</Text>
                </>
              ) : (
                <Text style={styles.loginButtonText}>{t.login}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]} />
            <Text style={[styles.dividerText, { color: isDark ? '#64748b' : '#94a3b8' }]}>
              {t.or}
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]} />
          </View>

          {/* Google Button */}
          <TouchableOpacity
            style={[styles.oauthButton, { backgroundColor: isDark ? '#1e293b' : '#fff', borderColor: isDark ? '#334155' : '#e2e8f0' }]}
            onPress={() => googlePromptAsync()}
            disabled={!googleRequest || isLoading}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-google" size={20} color="#EA4335" />
            <Text style={[styles.oauthButtonText, { color: isDark ? '#fff' : '#0f172a' }]}>
              {t.continueWithGoogle}
            </Text>
          </TouchableOpacity>

          {/* Apple Button (iOS only) */}
          {Platform.OS === 'ios' && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={isDark 
                ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE 
                : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
              }
              cornerRadius={12}
              style={styles.appleButton}
              onPress={handleAppleAuth}
            />
          )}
        </View>

        {/* Register Link */}
        <View style={styles.registerContainer}>
          <Text style={[styles.registerText, { color: isDark ? '#94a3b8' : '#64748b' }]}>
            {t.noAccount}
          </Text>
          <TouchableOpacity onPress={() => router.push('/auth/register')}>
            <Text style={styles.registerLink}> {t.register}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '700',
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
  },
  form: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef2f2',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    flex: 1,
  },
  loginButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  loginButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 13,
  },
  oauthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 10,
    marginBottom: 12,
  },
  oauthButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  appleButton: {
    height: 52,
    width: '100%',
    marginBottom: 12,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    fontSize: 14,
  },
  registerLink: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
  },
});
