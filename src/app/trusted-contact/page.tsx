"use client";

import { useState, useEffect } from "react";
import TopNav from "@/components/TopNav";
import { useLanguage } from "@/components/LanguageContext";
import { useWallet } from "@/components/WalletContext";
import Link from "next/link";

const translations: Record<string, Record<string, string>> = {
  tr: {
    title: "Güvenilir Kişiler",
    subtitle: "Acil durum kişileri ve yetkili temsilciler",
    legalNoticeTitle: "Önemli Yasal Uyarı",
    legalNoticeDesc: "Bu rol işlem yetkisi vermez. Güvenilir kişiler varlık transferi başlatamaz, çekim yapamaz veya ticaret işlemi gerçekleştiremez.",
    verificationTitle: "Doğrulama Süreci",
    verificationDesc: "Tüm güvenilir kişiler, atanmalarının ardından kimlik doğrulama sürecinden geçmelidir.",
    financialExecutor: "Mali İcra Memuru",
    financialExecutorDesc: "Belirlenen koşullar altında hesap işlemlerini yürütme yetkisi",
    legalRepresentative: "Hukuki Temsilci",
    legalRepresentativeDesc: "Hukuki konularda sizin adınıza hareket edebilir",
    emergencyContact: "Acil Durum İletişimi",
    emergencyContactDesc: "Acil durumlarda veya hesap kurtarma için irtibat",
    addContact: "Güvenilir Kişi Ekle",
    noContactAssigned: "atanmış kişi yok",
    name: "Ad Soyad",
    email: "E-posta",
    phone: "Telefon",
    relationship: "İlişki",
    family: "Aile",
    businessPartner: "İş Ortağı",
    lawyer: "Avukat",
    other: "Diğer",
    verified: "Doğrulanmış",
    pending: "Beklemede",
    unverified: "Doğrulanmamış",
    addedOn: "Eklenme Tarihi",
    edit: "Düzenle",
    remove: "Kaldır",
    save: "Kaydet",
    cancel: "İptal",
    resendVerification: "Doğrulamayı Yeniden Gönder",
    back: "Geri",
    spouse: "Eş",
    sibling: "Kardeş",
  },
  en: {
    title: "Trusted Contacts",
    subtitle: "Emergency contacts and authorized representatives",
    legalNoticeTitle: "Important Legal Notice",
    legalNoticeDesc: "This role does not grant transactional authority. Trusted contacts cannot initiate asset transfers, make withdrawals, or execute trades.",
    verificationTitle: "Verification Process",
    verificationDesc: "All trusted contacts must undergo identity verification after being assigned.",
    financialExecutor: "Financial Executor",
    financialExecutorDesc: "Authorized to execute account operations under specified conditions",
    legalRepresentative: "Legal Representative",
    legalRepresentativeDesc: "May act on your behalf in legal matters",
    emergencyContact: "Emergency Contact",
    emergencyContactDesc: "Contacted in emergencies or for account recovery",
    addContact: "Add Trusted Contact",
    noContactAssigned: "no contact assigned",
    name: "Full Name",
    email: "Email",
    phone: "Phone",
    relationship: "Relationship",
    family: "Family",
    businessPartner: "Business Partner",
    lawyer: "Lawyer",
    other: "Other",
    verified: "Verified",
    pending: "Pending",
    unverified: "Unverified",
    addedOn: "Added on",
    edit: "Edit",
    remove: "Remove",
    save: "Save",
    cancel: "Cancel",
    resendVerification: "Resend Verification",
    back: "Back",
    spouse: "Spouse",
    sibling: "Sibling",
  },
  de: {
    title: "Vertrauenspersonen",
    subtitle: "Notfallkontakte und autorisierte Vertreter",
    legalNoticeTitle: "Wichtiger Rechtshinweis",
    legalNoticeDesc: "Diese Rolle gewährt keine Transaktionsbefugnis.",
    verificationTitle: "Verifizierungsprozess",
    verificationDesc: "Alle Vertrauenspersonen müssen eine Identitätsprüfung durchlaufen.",
    financialExecutor: "Finanzvollstrecker",
    financialExecutorDesc: "Berechtigt, Kontooperationen unter festgelegten Bedingungen auszuführen",
    legalRepresentative: "Rechtsvertreter",
    legalRepresentativeDesc: "Kann in rechtlichen Angelegenheiten in Ihrem Namen handeln",
    emergencyContact: "Notfallkontakt",
    emergencyContactDesc: "Wird in Notfällen oder zur Kontowiederherstellung kontaktiert",
    addContact: "Vertrauensperson hinzufügen",
    noContactAssigned: "kein Kontakt zugewiesen",
    name: "Vollständiger Name", email: "E-Mail", phone: "Telefon", relationship: "Beziehung",
    family: "Familie", businessPartner: "Geschäftspartner", lawyer: "Anwalt", other: "Andere",
    verified: "Verifiziert", pending: "Ausstehend", unverified: "Nicht verifiziert",
    addedOn: "Hinzugefügt am", edit: "Bearbeiten", remove: "Entfernen", save: "Speichern", cancel: "Abbrechen",
    resendVerification: "Verifizierung erneut senden", back: "Zurück", spouse: "Ehepartner", sibling: "Geschwister",
  },
  fr: {
    title: "Contacts de confiance",
    subtitle: "Contacts d'urgence et représentants autorisés",
    legalNoticeTitle: "Avis juridique important",
    legalNoticeDesc: "Ce rôle n'accorde pas d'autorité transactionnelle.",
    verificationTitle: "Processus de vérification",
    verificationDesc: "Tous les contacts de confiance doivent subir une vérification d'identité.",
    financialExecutor: "Exécuteur financier",
    financialExecutorDesc: "Autorisé à exécuter des opérations de compte sous des conditions spécifiées",
    legalRepresentative: "Représentant légal",
    legalRepresentativeDesc: "Peut agir en votre nom dans les affaires juridiques",
    emergencyContact: "Contact d'urgence",
    emergencyContactDesc: "Contacté en cas d'urgence ou pour la récupération du compte",
    addContact: "Ajouter un contact de confiance",
    noContactAssigned: "aucun contact assigné",
    name: "Nom complet", email: "E-mail", phone: "Téléphone", relationship: "Relation",
    family: "Famille", businessPartner: "Partenaire commercial", lawyer: "Avocat", other: "Autre",
    verified: "Vérifié", pending: "En attente", unverified: "Non vérifié",
    addedOn: "Ajouté le", edit: "Modifier", remove: "Supprimer", save: "Enregistrer", cancel: "Annuler",
    resendVerification: "Renvoyer la vérification", back: "Retour", spouse: "Conjoint", sibling: "Frère/Sœur",
  },
  ar: {
    title: "جهات الاتصال الموثوقة",
    subtitle: "جهات اتصال الطوارئ والممثلين المعتمدين",
    legalNoticeTitle: "إشعار قانوني مهم",
    legalNoticeDesc: "هذا الدور لا يمنح صلاحية المعاملات.",
    verificationTitle: "عملية التحقق",
    verificationDesc: "يجب على جميع جهات الاتصال الموثوقة الخضوع للتحقق من الهوية.",
    financialExecutor: "المنفذ المالي",
    financialExecutorDesc: "مصرح بتنفيذ عمليات الحساب وفقًا للشروط المحددة",
    legalRepresentative: "الممثل القانوني",
    legalRepresentativeDesc: "يمكنه التصرف نيابة عنك في المسائل القانونية",
    emergencyContact: "جهة اتصال الطوارئ",
    emergencyContactDesc: "يتم الاتصال بها في حالات الطوارئ أو لاستعادة الحساب",
    addContact: "إضافة جهة اتصال موثوقة",
    noContactAssigned: "لم يتم تعيين جهة اتصال",
    name: "الاسم الكامل", email: "البريد الإلكتروني", phone: "الهاتف", relationship: "العلاقة",
    family: "العائلة", businessPartner: "شريك تجاري", lawyer: "محامي", other: "أخرى",
    verified: "تم التحقق", pending: "قيد الانتظار", unverified: "لم يتم التحقق",
    addedOn: "أضيف في", edit: "تعديل", remove: "إزالة", save: "حفظ", cancel: "إلغاء",
    resendVerification: "إعادة إرسال التحقق", back: "رجوع", spouse: "الزوج/الزوجة", sibling: "الأخ/الأخت",
  },
  ru: {
    title: "Доверенные контакты",
    subtitle: "Экстренные контакты и уполномоченные представители",
    legalNoticeTitle: "Важное юридическое уведомление",
    legalNoticeDesc: "Эта роль не предоставляет полномочий на проведение операций.",
    verificationTitle: "Процесс верификации",
    verificationDesc: "Все доверенные контакты должны пройти проверку личности.",
    financialExecutor: "Финансовый исполнитель",
    financialExecutorDesc: "Уполномочен выполнять операции по счёту при определённых условиях",
    legalRepresentative: "Юридический представитель",
    legalRepresentativeDesc: "Может действовать от вашего имени в юридических вопросах",
    emergencyContact: "Экстренный контакт",
    emergencyContactDesc: "Связывается в экстренных случаях или для восстановления аккаунта",
    addContact: "Добавить доверенный контакт",
    noContactAssigned: "контакт не назначен",
    name: "Полное имя", email: "Email", phone: "Телефон", relationship: "Отношение",
    family: "Семья", businessPartner: "Деловой партнёр", lawyer: "Адвокат", other: "Другое",
    verified: "Подтверждён", pending: "На рассмотрении", unverified: "Не подтверждён",
    addedOn: "Добавлен", edit: "Редактировать", remove: "Удалить", save: "Сохранить", cancel: "Отмена",
    resendVerification: "Повторить верификацию", back: "Назад", spouse: "Супруг(а)", sibling: "Брат/Сестра",
  },
};

interface Contact {
  id: string;
  role: string;
  name: string;
  email: string;
  phone: string;
  relationship: string;
  status: string;
  createdAt: string;
}

const roleConfig: Record<string, { icon: string; color: string; bgColor: string }> = {
  financial_executor: { icon: "💼", color: "#BFA181", bgColor: "bg-[#BFA181]/15" },
  legal_representative: { icon: "📄", color: "#8b5cf6", bgColor: "bg-purple-500/15" },
  emergency_contact: { icon: "📞", color: "#ef4444", bgColor: "bg-red-500/15" },
};

export default function TrustedContactPage() {
  const { lang } = useLanguage();
  const { address } = useWallet();
  const t = translations[lang] || translations.en;

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", relationship: "family" });
  const [saving, setSaving] = useState(false);

  // Fetch contacts
  useEffect(() => {
    if (!address) return;
    const fetchContacts = async () => {
      try {
        const res = await fetch(`/api/user/trusted-contacts?address=${address}`);
        if (res.ok) {
          const data = await res.json();
          setContacts(data.contacts || []);
        }
      } catch (err) {
        console.error("Fetch contacts error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchContacts();
  }, [address]);

  const handleSave = async (role: string) => {
    if (!address || !formData.name || !formData.email) return;
    setSaving(true);
    try {
      const res = await fetch("/api/user/trusted-contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, role, ...formData }),
      });
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
        setEditingRole(null);
        setFormData({ name: "", email: "", phone: "", relationship: "family" });
      }
    } catch (err) {
      console.error("Save contact error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (contactId: string) => {
    if (!address) return;
    try {
      const res = await fetch("/api/user/trusted-contacts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, contactId }),
      });
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
      }
    } catch (err) {
      console.error("Remove contact error:", err);
    }
  };

  const getContactForRole = (role: string) => contacts.find(c => c.role === role);

  const statusConfig: Record<string, { color: string; bg: string }> = {
    verified: { color: "text-[#2F6F62]", bg: "bg-[#2F6F62]/15" },
    pending: { color: "text-[#BFA181]", bg: "bg-[#BFA181]/15" },
    unverified: { color: "text-red-500", bg: "bg-red-500/15" },
  };

  const roles = [
    { key: "financial_executor", label: t.financialExecutor, desc: t.financialExecutorDesc },
    { key: "legal_representative", label: t.legalRepresentative, desc: t.legalRepresentativeDesc },
    { key: "emergency_contact", label: t.emergencyContact, desc: t.emergencyContactDesc },
  ];

  return (
    <div className="min-h-screen bg-[#f8f5f0] dark:bg-[#0a0a0a]">
      <TopNav />
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/client-center" className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition">
            <svg className="w-5 h-5 text-slate-800 dark:text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{t.title}</h1>
            <p className="text-sm text-slate-500 dark:text-zinc-400">{t.subtitle}</p>
          </div>
        </div>

        {/* Legal Notice Banner */}
        <div className="flex items-start gap-3 p-4 rounded-xl border-2 border-dashed border-[#BFA181]/50 bg-[#BFA181]/5 mb-4">
          <span className="text-xl mt-0.5">⚖️</span>
          <div>
            <h3 className="text-sm font-semibold text-[#BFA181]">{t.legalNoticeTitle}</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">{t.legalNoticeDesc}</p>
          </div>
        </div>

        {/* Verification Info Banner */}
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#2F6F62]/10 border border-[#2F6F62]/30 mb-5">
          <svg className="w-5 h-5 text-[#2F6F62] mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white">{t.verificationTitle}</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{t.verificationDesc}</p>
          </div>
        </div>

        {/* Role Sections */}
        {roles.map(role => {
          const config = roleConfig[role.key];
          const contact = getContactForRole(role.key);
          const isEditing = editingRole === role.key;
          const statusCfg = contact ? (statusConfig[contact.status] || statusConfig.pending) : null;

          return (
            <div key={role.key} className="bg-white dark:bg-zinc-800/50 rounded-xl border border-stone-200 dark:border-zinc-700/50 p-4 mb-3">
              {/* Role Header */}
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center`}>
                  <span className="text-lg">{config.icon}</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-white">{role.label}</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">{role.desc}</p>
                </div>
              </div>

              {/* Contact Details or Add Form */}
              {contact && !isEditing ? (
                <div className="ml-[52px]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-bold text-slate-800 dark:text-white">{contact.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${statusCfg?.bg} ${statusCfg?.color}`}>
                      <span className="inline-block w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: "currentColor" }} />
                      {t[contact.status] || contact.status}
                    </span>
                  </div>
                  <div className="space-y-1 mb-3">
                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-zinc-400">
                      <span>{contact.relationship}</span>
                      <span>|</span>
                      <span>{t.addedOn} {new Date(contact.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">✉️ {contact.email}</p>
                    {contact.phone && <p className="text-xs text-slate-500 dark:text-zinc-400">📞 {contact.phone}</p>}
                  </div>
                  <div className="flex gap-2">
                    {contact.status === "pending" && (
                      <button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#BFA181]/15 text-[#BFA181] hover:bg-[#BFA181]/25 transition">
                        {t.resendVerification}
                      </button>
                    )}
                    <button onClick={() => { setEditingRole(role.key); setFormData({ name: contact.name, email: contact.email, phone: contact.phone, relationship: contact.relationship }); }} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/15 text-blue-500 hover:bg-blue-500/25 transition">
                      {t.edit}
                    </button>
                    <button onClick={() => handleRemove(contact.id)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/15 text-red-500 hover:bg-red-500/25 transition">
                      {t.remove}
                    </button>
                  </div>
                </div>
              ) : isEditing ? (
                <div className="ml-[52px] space-y-3">
                  <input type="text" placeholder={t.name} value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-zinc-700 bg-[#f8f5f0] dark:bg-[#0a0a0a] text-sm text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#BFA181]" />
                  <input type="email" placeholder={t.email} value={formData.email} onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-zinc-700 bg-[#f8f5f0] dark:bg-[#0a0a0a] text-sm text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#BFA181]" />
                  <input type="tel" placeholder={t.phone} value={formData.phone} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-zinc-700 bg-[#f8f5f0] dark:bg-[#0a0a0a] text-sm text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#BFA181]" />
                  <select value={formData.relationship} onChange={(e) => setFormData(p => ({ ...p, relationship: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-zinc-700 bg-[#f8f5f0] dark:bg-[#0a0a0a] text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#BFA181]">
                    <option value="family">{t.family}</option>
                    <option value="spouse">{t.spouse}</option>
                    <option value="sibling">{t.sibling}</option>
                    <option value="business_partner">{t.businessPartner}</option>
                    <option value="lawyer">{t.lawyer}</option>
                    <option value="other">{t.other}</option>
                  </select>
                  <div className="flex gap-2">
                    <button onClick={() => handleSave(role.key)} disabled={saving} className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#BFA181] text-white hover:bg-[#BFA181]/90 transition disabled:opacity-50">
                      {saving ? "..." : t.save}
                    </button>
                    <button onClick={() => { setEditingRole(null); setFormData({ name: "", email: "", phone: "", relationship: "family" }); }} className="px-4 py-2 rounded-lg text-xs font-semibold border border-stone-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-700/50 transition">
                      {t.cancel}
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setEditingRole(role.key)} className="ml-[52px] w-[calc(100%-52px)] py-3 rounded-lg border-2 border-dashed border-stone-300 dark:border-zinc-600 text-sm font-medium text-slate-500 dark:text-zinc-400 hover:border-[#BFA181] hover:text-[#BFA181] hover:bg-[#BFA181]/5 transition">
                  + {t.addContact}
                  <span className="block text-[11px] opacity-60 mt-0.5">{t.noContactAssigned}</span>
                </button>
              )}
            </div>
          );
        })}

        <div className="h-8" />
      </div>
    </div>
  );
}
