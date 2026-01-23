// app/auth/register.tsx
// Register Screen with Real API Integration + OAuth

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
    createAccount: 'Hesap Oluştur',
    subtitle: 'Auxite\'a katılın',
    name: 'Ad Soyad',
    namePlaceholder: 'John Doe',
    email: 'E-posta',
    emailPlaceholder: 'ornek@email.com',
    password: 'Şifre',
    passwordPlaceholder: '••••••••',
    confirmPassword: 'Şifre Tekrar',
    passwordHint: 'Min 8 karakter, 1 büyük, 1 küçük harf, 1 rakam',
    register: 'Kayıt Ol',
    registering: 'Kayıt yapılıyor...',
    or: 'veya',
    continueWithGoogle: 'Google ile devam et',
    continueWithApple: 'Apple ile devam et',
    hasAccount: 'Zaten hesabınız var mı?',
    login: 'Giriş Yap',
    invalidName: 'Adınızı girin',
    invalidEmail: 'Geçerli bir e-posta girin',
    weakPassword: 'Şifre gereksinimleri karşılamıyor',
    passwordMismatch: 'Şifreler eşleşmiyor',
    emailExists: 'Bu e-posta zaten kayıtlı',
    registerError: 'Kayıt başarısız. Tekrar deneyin.',
    networkError: 'Bağlantı hatası. İnternet bağlantınızı kontrol edin.',
    termsText: 'Kayıt olarak',
    termsLink: 'Kullanım Şartları',
    andText: 've',
    privacyLink: 'Gizlilik Politikası',
    acceptText: "'nı kabul etmiş olursunuz.",
  },
  en: {
    createAccount: 'Create Account',
    subtitle: 'Join Auxite today',
    name: 'Full Name',
    namePlaceholder: 'John Doe',
    email: 'Email',
    emailPlaceholder: 'example@email.com',
    password: 'Password',
    passwordPlaceholder: '••••••••',
    confirmPassword: 'Confirm Password',
    passwordHint: 'Min 8 chars, 1 uppercase, 1 lowercase, 1 number',
    register: 'Sign Up',
    registering: 'Creating account...',
    or: 'or',
    continueWithGoogle: 'Continue with Google',
    continueWithApple: 'Continue with Apple',
    hasAccount: 'Already have an account?',
    login: 'Sign In',
    invalidName: 'Enter your name',
    invalidEmail: 'Enter a valid email',
    weakPassword: 'Password does not meet requirements',
    passwordMismatch: 'Passwords do not match',
    emailExists: 'This email is already registered',
    registerError: 'Registration failed. Please try again.',
    networkError: 'Connection error. Check your internet.',
    termsText: 'By signing up, you agree to our',
    termsLink: 'Terms of Service',
    andText: 'and',
    privacyLink: 'Privacy Policy',
    acceptText: '.',
  },
  de: {
    createAccount: 'Konto erstellen',
    subtitle: 'Werden Sie Teil von Auxite',
    name: 'Vollständiger Name',
    namePlaceholder: 'Max Mustermann',
    email: 'E-Mail',
    emailPlaceholder: 'beispiel@email.com',
    password: 'Passwort',
    passwordPlaceholder: '••••••••',
    confirmPassword: 'Passwort bestätigen',
    passwordHint: 'Min 8 Zeichen, 1 Groß-, 1 Kleinbuchstabe, 1 Zahl',
    register: 'Registrieren',
    registering: 'Konto wird erstellt...',
    or: 'oder',
    continueWithGoogle: 'Mit Google fortfahren',
    continueWithApple: 'Mit Apple fortfahren',
    hasAccount: 'Bereits ein Konto?',
    login: 'Anmelden',
    invalidName: 'Geben Sie Ihren Namen ein',
    invalidEmail: 'Geben Sie eine gültige E-Mail ein',
    weakPassword: 'Passwort erfüllt Anforderungen nicht',
    passwordMismatch: 'Passwörter stimmen nicht überein',
    emailExists: 'Diese E-Mail ist bereits registriert',
    registerError: 'Registrierung fehlgeschlagen. Versuchen Sie es erneut.',
    networkError: 'Verbindungsfehler. Überprüfen Sie Ihre Internetverbindung.',
    termsText: 'Mit der Registrierung akzeptieren Sie unsere',
    termsLink: 'Nutzungsbedingungen',
    andText: 'und',
    privacyLink: 'Datenschutzrichtlinie',
    acceptText: '.',
  },
  fr: {
    createAccount: 'Créer un compte',
    subtitle: 'Rejoignez Auxite',
    name: 'Nom complet',
    namePlaceholder: 'Jean Dupont',
    email: 'E-mail',
    emailPlaceholder: 'exemple@email.com',
    password: 'Mot de passe',
    passwordPlaceholder: '••••••••',
    confirmPassword: 'Confirmer le mot de passe',
    passwordHint: 'Min 8 car., 1 majuscule, 1 minuscule, 1 chiffre',
    register: "S'inscrire",
    registering: 'Création du compte...',
    or: 'ou',
    continueWithGoogle: 'Continuer avec Google',
    continueWithApple: 'Continuer avec Apple',
    hasAccount: 'Déjà un compte?',
    login: 'Se connecter',
    invalidName: 'Entrez votre nom',
    invalidEmail: 'Entrez un e-mail valide',
    weakPassword: 'Le mot de passe ne répond pas aux exigences',
    passwordMismatch: 'Les mots de passe ne correspondent pas',
    emailExists: 'Cet e-mail est déjà enregistré',
    registerError: "L'inscription a échoué. Veuillez réessayer.",
    networkError: 'Erreur de connexion. Vérifiez votre internet.',
    termsText: "En vous inscrivant, vous acceptez nos",
    termsLink: "Conditions d'utilisation",
    andText: 'et',
    privacyLink: 'Politique de confidentialité',
    acceptText: '.',
  },
  ar: {
    createAccount: 'إنشاء حساب',
    subtitle: 'انضم إلى Auxite',
    name: 'الاسم الكامل',
    namePlaceholder: 'محمد أحمد',
    email: 'البريد الإلكتروني',
    emailPlaceholder: 'example@email.com',
    password: 'كلمة المرور',
    passwordPlaceholder: '••••••••',
    confirmPassword: 'تأكيد كلمة المرور',
    passwordHint: '8 أحرف على الأقل، حرف كبير، حرف صغير، رقم',
    register: 'إنشاء حساب',
    registering: 'جاري إنشاء الحساب...',
    or: 'أو',
    continueWithGoogle: 'المتابعة مع Google',
    continueWithApple: 'المتابعة مع Apple',
    hasAccount: 'لديك حساب بالفعل؟',
    login: 'تسجيل الدخول',
    invalidName: 'أدخل اسمك',
    invalidEmail: 'أدخل بريد إلكتروني صالح',
    weakPassword: 'كلمة المرور لا تلبي المتطلبات',
    passwordMismatch: 'كلمات المرور غير متطابقة',
    emailExists: 'هذا البريد مسجل بالفعل',
    registerError: 'فشل التسجيل. حاول مرة أخرى.',
    networkError: 'خطأ في الاتصال. تحقق من الإنترنت.',
    termsText: 'بالتسجيل، أنت توافق على',
    termsLink: 'شروط الخدمة',
    andText: 'و',
    privacyLink: 'سياسة الخصوصية',
    acceptText: '.',
  },
  ru: {
    createAccount: 'Создать аккаунт',
    subtitle: 'Присоединяйтесь к Auxite',
    name: 'Полное имя',
    namePlaceholder: 'Иван Иванов',
    email: 'Эл. почта',
    emailPlaceholder: 'example@email.com',
    password: 'Пароль',
    passwordPlaceholder: '••••••••',
    confirmPassword: 'Подтвердите пароль',
    passwordHint: 'Мин 8 символов, 1 заглавная, 1 строчная, 1 цифра',
    register: 'Регистрация',
    registering: 'Создание аккаунта...',
    or: 'или',
    continueWithGoogle: 'Продолжить с Google',
    continueWithApple: 'Продолжить с Apple',
    hasAccount: 'Уже есть аккаунт?',
    login: 'Войти',
    invalidName: 'Введите ваше имя',
    invalidEmail: 'Введите корректный email',
    weakPassword: 'Пароль не соответствует требованиям',
    passwordMismatch: 'Пароли не совпадают',
    emailExists: 'Этот email уже зарегистрирован',
    registerError: 'Ошибка регистрации. Попробуйте снова.',
    networkError: 'Ошибка соединения. Проверьте интернет.',
    termsText: 'Регистрируясь, вы соглашаетесь с',
    termsLink: 'Условиями использования',
    andText: 'и',
    privacyLink: 'Политикой конфиденциальности',
    acceptText: '.',
  },
};

export default function RegisterScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { theme, language } = useStore();
  const systemIsDark = colorScheme === 'dark';
  const isDark = theme === 'system' ? systemIsDark : theme === 'dark';
  const t = translations[language as keyof typeof translations] || translations.en;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Google OAuth
  const [googleRequest, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  });

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      handleGoogleAuth(googleResponse.authentication?.idToken);
    }
  }, [googleResponse]);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePassword = (password: string) => {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
  };

  // ════════════════════════════════════════════════════════════════════════════
  // AUTH SUCCESS HANDLER
  // ════════════════════════════════════════════════════════════════════════════

  const handleAuthSuccess = async (data: any) => {
    await AsyncStorage.setItem('authToken', data.token);
    await AsyncStorage.setItem('user', JSON.stringify(data.user));

    useStore.getState().setIsLoggedIn(true);
    useStore.getState().setUserEmail(data.user.email);

    if (data.requiresWalletSetup || !data.user.walletAddress) {
      router.replace('/wallet-onboarding');
    } else {
      useStore.getState().setWalletAddress(data.user.walletAddress);
      router.replace('/(tabs)');
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // EMAIL/PASSWORD REGISTER
  // ════════════════════════════════════════════════════════════════════════════

  const handleRegister = async () => {
    setError('');

    if (!name.trim()) {
      setError(t.invalidName);
      return;
    }

    if (!validateEmail(email)) {
      setError(t.invalidEmail);
      return;
    }

    if (!validatePassword(password)) {
      setError(t.weakPassword);
      return;
    }

    if (password !== confirmPassword) {
      setError(t.passwordMismatch);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, language }),
      });

      const data = await response.json();

      if (!data.success) {
        if (data.error?.includes('already registered') || data.error?.includes('zaten kayıtlı')) {
          setError(t.emailExists);
        } else {
          setError(data.error || t.registerError);
        }
        return;
      }

      // Store email for verification
      await AsyncStorage.setItem('pendingVerificationEmail', email);
      
      // Go to email verification screen
      router.push('/auth/verify-email');

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
        setError(data.error || t.registerError);
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
        setError(data.error || t.registerError);
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
            {t.createAccount}
          </Text>
          <Text style={[styles.subtitle, { color: isDark ? '#94a3b8' : '#64748b' }]}>
            {t.subtitle}
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Name */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: isDark ? '#94a3b8' : '#64748b' }]}>
              {t.name}
            </Text>
            <View style={[
              styles.inputContainer,
              { backgroundColor: isDark ? '#1e293b' : '#fff', borderColor: isDark ? '#334155' : '#e2e8f0' }
            ]}>
              <Ionicons name="person-outline" size={20} color={isDark ? '#64748b' : '#94a3b8'} />
              <TextInput
                style={[styles.input, { color: isDark ? '#fff' : '#0f172a' }]}
                placeholder={t.namePlaceholder}
                placeholderTextColor={isDark ? '#475569' : '#cbd5e1'}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          </View>

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
            <Text style={[styles.passwordHint, { color: isDark ? '#64748b' : '#94a3b8' }]}>
              {t.passwordHint}
            </Text>
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: isDark ? '#94a3b8' : '#64748b' }]}>
              {t.confirmPassword}
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
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
              />
            </View>
          </View>

          {/* Error */}
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Terms */}
          <Text style={[styles.termsText, { color: isDark ? '#64748b' : '#94a3b8' }]}>
            {t.termsText}{' '}
            <Text style={styles.termsLink}>{t.termsLink}</Text>
            {' '}{t.andText}{' '}
            <Text style={styles.termsLink}>{t.privacyLink}</Text>
            {t.acceptText}
          </Text>

          {/* Register Button */}
          <TouchableOpacity
            style={styles.registerButton}
            onPress={handleRegister}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#10b981', '#059669']}
              style={styles.registerButtonGradient}
            >
              {isLoading ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.registerButtonText}>{t.registering}</Text>
                </>
              ) : (
                <Text style={styles.registerButtonText}>{t.register}</Text>
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

          {/* Apple Button */}
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

        {/* Login Link */}
        <View style={styles.loginContainer}>
          <Text style={[styles.loginText, { color: isDark ? '#94a3b8' : '#64748b' }]}>
            {t.hasAccount}
          </Text>
          <TouchableOpacity onPress={() => router.push('/auth/login')}>
            <Text style={styles.loginLink}> {t.login}</Text>
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
    paddingTop: 50,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '700',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  form: {
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  passwordHint: {
    fontSize: 11,
    marginTop: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef2f2',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    flex: 1,
  },
  termsText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  termsLink: {
    color: '#10b981',
    fontWeight: '600',
  },
  registerButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  registerButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
    paddingVertical: 12,
    gap: 10,
    marginBottom: 10,
  },
  oauthButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  appleButton: {
    height: 48,
    width: '100%',
    marginBottom: 10,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
  },
  loginLink: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
  },
});
