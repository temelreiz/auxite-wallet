"use client";

import { useState, useEffect } from "react";
import TopNav from "@/components/TopNav";
import { useLanguage } from "@/components/LanguageContext";
import { useWallet } from "@/components/WalletContext";
import Link from "next/link";

const translations: Record<string, Record<string, string>> = {
  tr: {
    title: "Kurumsal Müşteri Masası",
    subtitle: "Özel ilişki yönetimi ve destek",
    contactTeam: "Ekiple İletişim",
    myMessages: "Mesajlarım",
    dedicatedTeam: "Özel İlişki Ekibi",
    available: "Müsait",
    responseTime: "Yanıt Süresi",
    businessHours: "< 4 iş saati",
    serviceTier: "Hizmet Seviyesi",
    institutionalClient: "Kurumsal Müşteri",
    prioritySupport: "Öncelikli Destek",
    dedicatedLine: "Özel Hat",
    extendedHours: "Uzatılmış Saatler",
    secureMessage: "Güvenli Mesaj",
    secureMessageDesc: "Şifreli iletişim kanalı üzerinden mesaj gönderin",
    priorityEmail: "Öncelikli E-posta",
    priorityEmailDesc: "Doğrudan ilişki yöneticinize e-posta gönderin",
    emergencyLine: "Acil Hat",
    emergencyLineDesc: "7/24 acil destek hattı",
    allocationInquiry: "Tahsis Sorgusu",
    yieldQuestion: "Getiri Sorusu",
    documentRequest: "Belge Talebi",
    accountChange: "Hesap Değişikliği",
    operatingHours: "Çalışma Saatleri",
    monFri: "Pzt-Cum 09:00-18:00 CET",
    encryptedNotice: "Tüm iletişimler uçtan uca şifrelenmiştir",
    newMessage: "Yeni Mesaj",
    subject: "Konu",
    category: "Kategori",
    message: "Mesaj",
    send: "Gönder",
    cancel: "İptal",
    open: "Açık",
    pending: "Beklemede",
    resolved: "Çözüldü",
    noMessages: "Henüz mesaj yok",
    noMessagesDesc: "Destek ekibine yeni bir mesaj gönderin",
    general: "Genel",
    allocation: "Tahsis",
    redemption: "Çekim",
    security: "Güvenlik",
    compliance: "Uyumluluk",
    technical: "Teknik",
    back: "Geri",
    sending: "Gönderiliyor...",
    messageSent: "Mesaj gönderildi",
    relationshipManager: "İlişki Yöneticisi",
    seniorAdvisor: "Kıdemli Danışman",
  },
  en: {
    title: "Institutional Client Desk",
    subtitle: "Dedicated relationship management and support",
    contactTeam: "Contact Team",
    myMessages: "My Messages",
    dedicatedTeam: "Dedicated Relationship Team",
    available: "Available",
    responseTime: "Response Time",
    businessHours: "< 4 business hours",
    serviceTier: "Service Tier",
    institutionalClient: "Institutional Client",
    prioritySupport: "Priority Support",
    dedicatedLine: "Dedicated Line",
    extendedHours: "Extended Hours",
    secureMessage: "Secure Message",
    secureMessageDesc: "Send a message through the encrypted communication channel",
    priorityEmail: "Priority Email",
    priorityEmailDesc: "Send an email directly to your relationship manager",
    emergencyLine: "Emergency Line",
    emergencyLineDesc: "24/7 emergency support line",
    allocationInquiry: "Allocation Inquiry",
    yieldQuestion: "Yield Question",
    documentRequest: "Document Request",
    accountChange: "Account Change",
    operatingHours: "Operating Hours",
    monFri: "Mon-Fri 09:00-18:00 CET",
    encryptedNotice: "All communications are end-to-end encrypted",
    newMessage: "New Message",
    subject: "Subject",
    category: "Category",
    message: "Message",
    send: "Send",
    cancel: "Cancel",
    open: "Open",
    pending: "Pending",
    resolved: "Resolved",
    noMessages: "No messages yet",
    noMessagesDesc: "Send a new message to the support team",
    general: "General",
    allocation: "Allocation",
    redemption: "Redemption",
    security: "Security",
    compliance: "Compliance",
    technical: "Technical",
    back: "Back",
    sending: "Sending...",
    messageSent: "Message sent",
    relationshipManager: "Relationship Manager",
    seniorAdvisor: "Senior Advisor",
  },
  de: {
    title: "Institutioneller Kundendienst",
    subtitle: "Dediziertes Beziehungsmanagement und Support",
    contactTeam: "Team kontaktieren", myMessages: "Meine Nachrichten",
    dedicatedTeam: "Dediziertes Beziehungsteam", available: "Verfügbar",
    responseTime: "Antwortzeit", businessHours: "< 4 Geschäftsstunden",
    serviceTier: "Service-Stufe", institutionalClient: "Institutioneller Kunde",
    prioritySupport: "Prioritäts-Support", dedicatedLine: "Dedizierte Leitung", extendedHours: "Erweiterte Zeiten",
    secureMessage: "Sichere Nachricht", secureMessageDesc: "Senden Sie eine verschlüsselte Nachricht",
    priorityEmail: "Prioritäts-E-Mail", priorityEmailDesc: "E-Mail an Ihren Beziehungsmanager",
    emergencyLine: "Notfall-Leitung", emergencyLineDesc: "24/7 Notfall-Support",
    allocationInquiry: "Allokationsanfrage", yieldQuestion: "Renditefrage",
    documentRequest: "Dokumentenanfrage", accountChange: "Kontoänderung",
    operatingHours: "Öffnungszeiten", monFri: "Mo-Fr 09:00-18:00 CET",
    encryptedNotice: "Alle Kommunikationen sind Ende-zu-Ende verschlüsselt",
    newMessage: "Neue Nachricht", subject: "Betreff", category: "Kategorie", message: "Nachricht",
    send: "Senden", cancel: "Abbrechen", open: "Offen", pending: "Ausstehend", resolved: "Gelöst",
    noMessages: "Noch keine Nachrichten", noMessagesDesc: "Senden Sie eine neue Nachricht",
    general: "Allgemein", allocation: "Allokation", redemption: "Einlösung", security: "Sicherheit",
    compliance: "Compliance", technical: "Technisch", back: "Zurück", sending: "Wird gesendet...",
    messageSent: "Nachricht gesendet", relationshipManager: "Beziehungsmanager", seniorAdvisor: "Senior Berater",
  },
  fr: {
    title: "Bureau Client Institutionnel",
    subtitle: "Gestion de relation dédiée et support",
    contactTeam: "Contacter l'équipe", myMessages: "Mes messages",
    dedicatedTeam: "Équipe de relation dédiée", available: "Disponible",
    responseTime: "Temps de réponse", businessHours: "< 4 heures ouvrables",
    serviceTier: "Niveau de service", institutionalClient: "Client institutionnel",
    prioritySupport: "Support prioritaire", dedicatedLine: "Ligne dédiée", extendedHours: "Heures étendues",
    secureMessage: "Message sécurisé", secureMessageDesc: "Envoyez un message chiffré",
    priorityEmail: "E-mail prioritaire", priorityEmailDesc: "E-mail direct à votre gestionnaire",
    emergencyLine: "Ligne d'urgence", emergencyLineDesc: "Support d'urgence 24/7",
    allocationInquiry: "Demande d'allocation", yieldQuestion: "Question rendement",
    documentRequest: "Demande de document", accountChange: "Modification de compte",
    operatingHours: "Heures d'ouverture", monFri: "Lun-Ven 09:00-18:00 CET",
    encryptedNotice: "Toutes les communications sont chiffrées de bout en bout",
    newMessage: "Nouveau message", subject: "Sujet", category: "Catégorie", message: "Message",
    send: "Envoyer", cancel: "Annuler", open: "Ouvert", pending: "En attente", resolved: "Résolu",
    noMessages: "Pas encore de messages", noMessagesDesc: "Envoyez un nouveau message",
    general: "Général", allocation: "Allocation", redemption: "Rachat", security: "Sécurité",
    compliance: "Conformité", technical: "Technique", back: "Retour", sending: "Envoi...",
    messageSent: "Message envoyé", relationshipManager: "Gestionnaire de relation", seniorAdvisor: "Conseiller senior",
  },
  ar: {
    title: "مكتب العملاء المؤسسيين",
    subtitle: "إدارة العلاقات المخصصة والدعم",
    contactTeam: "التواصل مع الفريق", myMessages: "رسائلي",
    dedicatedTeam: "فريق العلاقات المخصص", available: "متاح",
    responseTime: "وقت الاستجابة", businessHours: "< 4 ساعات عمل",
    serviceTier: "مستوى الخدمة", institutionalClient: "عميل مؤسسي",
    prioritySupport: "دعم أولوية", dedicatedLine: "خط مخصص", extendedHours: "ساعات ممتدة",
    secureMessage: "رسالة آمنة", secureMessageDesc: "إرسال رسالة مشفرة",
    priorityEmail: "بريد إلكتروني أولوية", priorityEmailDesc: "بريد مباشر لمدير العلاقات",
    emergencyLine: "خط الطوارئ", emergencyLineDesc: "دعم طوارئ 24/7",
    allocationInquiry: "استفسار التخصيص", yieldQuestion: "سؤال العائد",
    documentRequest: "طلب وثيقة", accountChange: "تغيير الحساب",
    operatingHours: "ساعات العمل", monFri: "الاثنين-الجمعة 09:00-18:00 CET",
    encryptedNotice: "جميع الاتصالات مشفرة من طرف إلى طرف",
    newMessage: "رسالة جديدة", subject: "الموضوع", category: "الفئة", message: "الرسالة",
    send: "إرسال", cancel: "إلغاء", open: "مفتوح", pending: "قيد الانتظار", resolved: "تم الحل",
    noMessages: "لا توجد رسائل بعد", noMessagesDesc: "أرسل رسالة جديدة لفريق الدعم",
    general: "عام", allocation: "التخصيص", redemption: "الاسترداد", security: "الأمان",
    compliance: "الامتثال", technical: "تقني", back: "رجوع", sending: "جاري الإرسال...",
    messageSent: "تم إرسال الرسالة", relationshipManager: "مدير العلاقات", seniorAdvisor: "مستشار أول",
  },
  ru: {
    title: "Институциональная служба поддержки",
    subtitle: "Персональное управление отношениями и поддержка",
    contactTeam: "Связаться с командой", myMessages: "Мои сообщения",
    dedicatedTeam: "Персональная команда", available: "Доступна",
    responseTime: "Время ответа", businessHours: "< 4 рабочих часов",
    serviceTier: "Уровень обслуживания", institutionalClient: "Институциональный клиент",
    prioritySupport: "Приоритетная поддержка", dedicatedLine: "Выделенная линия", extendedHours: "Расширенные часы",
    secureMessage: "Безопасное сообщение", secureMessageDesc: "Отправить зашифрованное сообщение",
    priorityEmail: "Приоритетный email", priorityEmailDesc: "Email менеджеру отношений",
    emergencyLine: "Экстренная линия", emergencyLineDesc: "Экстренная поддержка 24/7",
    allocationInquiry: "Запрос аллокации", yieldQuestion: "Вопрос о доходности",
    documentRequest: "Запрос документа", accountChange: "Изменение аккаунта",
    operatingHours: "Часы работы", monFri: "Пн-Пт 09:00-18:00 CET",
    encryptedNotice: "Все сообщения защищены сквозным шифрованием",
    newMessage: "Новое сообщение", subject: "Тема", category: "Категория", message: "Сообщение",
    send: "Отправить", cancel: "Отмена", open: "Открыто", pending: "В обработке", resolved: "Решено",
    noMessages: "Сообщений пока нет", noMessagesDesc: "Отправьте новое сообщение команде",
    general: "Общее", allocation: "Аллокация", redemption: "Погашение", security: "Безопасность",
    compliance: "Соответствие", technical: "Техническое", back: "Назад", sending: "Отправка...",
    messageSent: "Сообщение отправлено", relationshipManager: "Менеджер отношений", seniorAdvisor: "Старший консультант",
  },
};

interface Ticket {
  id: string;
  subject: string;
  category: string;
  status: string;
  preview: string;
  createdAt: string;
}

interface AssignedRM {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  whatsapp: string;
  photoUrl: string;
  initials: string;
  status: string;
  available: boolean;
  languages: string[];
}

export default function SupportPage() {
  const { lang } = useLanguage();
  const { address } = useWallet();
  const t = translations[lang] || translations.en;

  const [activeTab, setActiveTab] = useState<"contact" | "messages">("contact");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [newTicket, setNewTicket] = useState({ subject: "", category: "general", message: "" });
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [assignedRM, setAssignedRM] = useState<AssignedRM | null>(null);

  // Fetch assigned RM
  useEffect(() => {
    if (!address) return;
    const fetchRM = async () => {
      try {
        const res = await fetch(`/api/user/relationship-manager?address=${address}`);
        if (res.ok) {
          const data = await res.json();
          if (data.manager) setAssignedRM(data.manager);
        }
      } catch {}
    };
    fetchRM();
  }, [address]);

  // Fetch tickets
  useEffect(() => {
    if (!address) return;
    const fetchTickets = async () => {
      try {
        const res = await fetch(`/api/support/ticket?address=${address}`);
        if (res.ok) {
          const data = await res.json();
          setTickets(data.tickets || []);
        }
      } catch {}
    };
    fetchTickets();
  }, [address]);

  const handleSendTicket = async () => {
    if (!address || !newTicket.subject || !newTicket.message) return;
    setSending(true);
    try {
      const res = await fetch("/api/support/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, ...newTicket }),
      });
      if (res.ok) {
        const data = await res.json();
        setTickets(prev => [{ id: data.ticketId, subject: newTicket.subject, category: newTicket.category, status: "open", preview: newTicket.message.substring(0, 100), createdAt: new Date().toISOString() }, ...prev]);
        setNewTicket({ subject: "", category: "general", message: "" });
        setShowNewMessage(false);
        setSuccessMsg(t.messageSent);
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err) {
      console.error("Send ticket error:", err);
    } finally {
      setSending(false);
    }
  };

  const statusColors: Record<string, { text: string; bg: string }> = {
    open: { text: "text-blue-500", bg: "bg-blue-500/15" },
    pending: { text: "text-[#BFA181]", bg: "bg-[#BFA181]/15" },
    resolved: { text: "text-[#2F6F62]", bg: "bg-[#2F6F62]/15" },
  };

  const quickActions = [
    { label: t.allocationInquiry, color: "#BFA181", icon: "📦" },
    { label: t.yieldQuestion, color: "#2F6F62", icon: "📈" },
    { label: t.documentRequest, color: "#3b82f6", icon: "📄" },
    { label: t.accountChange, color: "#8b5cf6", icon: "⚙️" },
  ];

  const contactChannels = [
    { label: t.secureMessage, desc: t.secureMessageDesc, color: "#3b82f6", icon: "💬" },
    { label: t.priorityEmail, desc: t.priorityEmailDesc, color: "#8b5cf6", icon: "✉️" },
    { label: t.emergencyLine, desc: t.emergencyLineDesc, color: "#ef4444", icon: "🚨" },
  ];

  return (
    <div className="min-h-screen bg-[#f8f5f0] dark:bg-[#0a0a0a]">
      <TopNav />
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-5">
          <Link href="/client-center" className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition">
            <svg className="w-5 h-5 text-slate-800 dark:text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{t.title}</h1>
            <p className="text-sm text-slate-500 dark:text-zinc-400">{t.subtitle}</p>
          </div>
        </div>

        {/* Success Message */}
        {successMsg && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-[#2F6F62]/15 border border-[#2F6F62]/30 mb-4">
            <svg className="w-4 h-4 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="text-sm text-[#2F6F62] font-medium">{successMsg}</span>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex bg-white dark:bg-zinc-800/50 rounded-xl p-1 border border-stone-200 dark:border-zinc-700/50 mb-5">
          {[
            { key: "contact" as const, label: t.contactTeam },
            { key: "messages" as const, label: t.myMessages },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${
                activeTab === tab.key
                  ? "bg-[#BFA181] text-white"
                  : "text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-700/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "contact" ? (
          <>
            {/* Dedicated Relationship Team */}
            <div className="bg-white dark:bg-zinc-800/50 rounded-xl border border-stone-200 dark:border-zinc-700/50 p-4 mb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#BFA181]/15 flex items-center justify-center">
                  <span className="text-lg">👥</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-white">{t.dedicatedTeam}</h3>
                </div>
                {assignedRM?.available && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#2F6F62] animate-pulse" />
                    <span className="text-xs text-[#2F6F62] font-medium">{t.available}</span>
                  </div>
                )}
              </div>

              {/* Team Members — Dynamic from API */}
              <div className="space-y-3 mb-4">
                {assignedRM ? (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#BFA181] flex items-center justify-center text-white text-xs font-bold">
                      {assignedRM.initials}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-white">{assignedRM.name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400">{assignedRM.title}</p>
                    </div>
                    {assignedRM.available && (
                      <div className="ml-auto flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#2F6F62]" />
                        <span className="text-[10px] text-[#2F6F62] font-medium">{t.available}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-zinc-700 flex items-center justify-center animate-pulse" />
                    <div className="space-y-1">
                      <div className="w-24 h-3 rounded bg-slate-200 dark:bg-zinc-700 animate-pulse" />
                      <div className="w-16 h-2 rounded bg-slate-200 dark:bg-zinc-700 animate-pulse" />
                    </div>
                  </div>
                )}
              </div>

              <div className="h-px bg-stone-200 dark:bg-zinc-700 mb-3" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-zinc-400">{t.responseTime}</span>
                <span className="text-xs text-[#2F6F62] font-semibold">{t.businessHours}</span>
              </div>
            </div>

            {/* Service Tier */}
            <div className="bg-white dark:bg-zinc-800/50 rounded-xl border border-stone-200 dark:border-zinc-700/50 p-4 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#BFA181]/15 flex items-center justify-center">
                  <span className="text-lg">🏅</span>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium tracking-wider">{t.serviceTier}</p>
                  <p className="text-lg font-bold text-slate-800 dark:text-white">{t.institutionalClient}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {[t.prioritySupport, t.dedicatedLine, t.extendedHours].map(badge => (
                  <span key={badge} className="px-3 py-1 rounded-full text-[11px] font-semibold bg-[#BFA181]/15 text-[#BFA181]">
                    {badge}
                  </span>
                ))}
              </div>
            </div>

            {/* Contact Channels — Functional */}
            <div className="space-y-2 mb-4">
              {/* Secure Message */}
              <div
                onClick={() => setActiveTab("messages")}
                className="bg-white dark:bg-zinc-800/50 rounded-xl border border-stone-200 dark:border-zinc-700/50 p-4 flex items-center gap-3 cursor-pointer hover:shadow-sm transition"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-500/10">
                  <span className="text-lg">💬</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">{t.secureMessage}</p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{t.secureMessageDesc}</p>
                </div>
                <svg className="w-4 h-4 text-slate-400 dark:text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </div>

              {/* Priority Email */}
              <a
                href={assignedRM?.email ? `mailto:${assignedRM.email}?subject=Auxite Client Request` : "#"}
                className="bg-white dark:bg-zinc-800/50 rounded-xl border border-stone-200 dark:border-zinc-700/50 p-4 flex items-center gap-3 cursor-pointer hover:shadow-sm transition block"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-purple-500/10">
                  <span className="text-lg">✉️</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">{t.priorityEmail}</p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{t.priorityEmailDesc}</p>
                </div>
                <svg className="w-4 h-4 text-slate-400 dark:text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </a>

              {/* Emergency Line */}
              <a
                href={assignedRM?.phone ? `tel:${assignedRM.phone}` : "#"}
                className="bg-white dark:bg-zinc-800/50 rounded-xl border border-stone-200 dark:border-zinc-700/50 p-4 flex items-center gap-3 cursor-pointer hover:shadow-sm transition block"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-500/10">
                  <span className="text-lg">🚨</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">{t.emergencyLine}</p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{t.emergencyLineDesc}</p>
                </div>
                <svg className="w-4 h-4 text-slate-400 dark:text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </a>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {quickActions.map(action => (
                <div key={action.label} className="bg-white dark:bg-zinc-800/50 rounded-xl border border-stone-200 dark:border-zinc-700/50 p-3.5 flex items-center gap-2.5 cursor-pointer hover:shadow-sm transition">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: action.color + "15" }}>
                    <span className="text-base">{action.icon}</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-white">{action.label}</span>
                </div>
              ))}
            </div>

            {/* Operating Hours */}
            <div className="flex items-center justify-between bg-white dark:bg-zinc-800/50 rounded-xl border border-stone-200 dark:border-zinc-700/50 px-4 py-3 mb-4">
              <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">{t.operatingHours}</span>
              <span className="text-xs text-slate-800 dark:text-white font-semibold">{t.monFri}</span>
            </div>

            {/* Encrypted Notice */}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-[#2F6F62]/10 border border-[#2F6F62]/30 mb-8">
              <svg className="w-4 h-4 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
              <span className="text-xs text-[#2F6F62] font-medium">{t.encryptedNotice}</span>
            </div>
          </>
        ) : (
          <>
            {/* New Message Button */}
            <button onClick={() => setShowNewMessage(true)} className="w-full py-3 rounded-xl bg-[#BFA181] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#BFA181]/90 transition mb-4">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              {t.newMessage}
            </button>

            {/* New Message Form */}
            {showNewMessage && (
              <div className="bg-white dark:bg-zinc-800/50 rounded-xl border border-stone-200 dark:border-zinc-700/50 p-4 mb-4">
                <input type="text" placeholder={t.subject} value={newTicket.subject} onChange={(e) => setNewTicket(p => ({ ...p, subject: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-zinc-700 bg-[#f8f5f0] dark:bg-[#0a0a0a] text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#BFA181] mb-3" />
                <select value={newTicket.category} onChange={(e) => setNewTicket(p => ({ ...p, category: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-zinc-700 bg-[#f8f5f0] dark:bg-[#0a0a0a] text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#BFA181] mb-3">
                  <option value="general">{t.general}</option>
                  <option value="allocation">{t.allocation}</option>
                  <option value="redemption">{t.redemption}</option>
                  <option value="security">{t.security}</option>
                  <option value="compliance">{t.compliance}</option>
                  <option value="technical">{t.technical}</option>
                </select>
                <textarea placeholder={t.message} value={newTicket.message} onChange={(e) => setNewTicket(p => ({ ...p, message: e.target.value }))} rows={4} className="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-zinc-700 bg-[#f8f5f0] dark:bg-[#0a0a0a] text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#BFA181] mb-3 resize-none" />
                <div className="flex gap-2">
                  <button onClick={handleSendTicket} disabled={sending || !newTicket.subject || !newTicket.message} className="px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#BFA181] text-white hover:bg-[#BFA181]/90 transition disabled:opacity-50">
                    {sending ? t.sending : t.send}
                  </button>
                  <button onClick={() => { setShowNewMessage(false); setNewTicket({ subject: "", category: "general", message: "" }); }} className="px-4 py-2.5 rounded-lg text-xs font-semibold border border-stone-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-700/50 transition">
                    {t.cancel}
                  </button>
                </div>
              </div>
            )}

            {/* Messages List */}
            {tickets.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-zinc-700 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400 dark:text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                </div>
                <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">{t.noMessages}</p>
                <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">{t.noMessagesDesc}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tickets.map(ticket => {
                  const statusCfg = statusColors[ticket.status] || statusColors.open;
                  return (
                    <div key={ticket.id} className="bg-white dark:bg-zinc-800/50 rounded-xl border border-stone-200 dark:border-zinc-700/50 p-4 cursor-pointer hover:shadow-sm transition">
                      <div className="flex items-center justify-between mb-1.5">
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-white truncate flex-1 mr-2">{ticket.subject}</h3>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${statusCfg.bg} ${statusCfg.text} flex-shrink-0`}>
                          {t[ticket.status] || ticket.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 mb-2">{ticket.preview}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-400 dark:text-zinc-500">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                        <svg className="w-4 h-4 text-slate-400 dark:text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
