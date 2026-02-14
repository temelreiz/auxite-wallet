"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/components/LanguageContext";

interface DeliveryAddress {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  country: string;
  city: string;
  district: string;
  addressLine1: string;
  addressLine2?: string;
  postalCode: string;
  isDefault: boolean;
}

interface DeliveryRequest {
  id: string;
  token: string;
  amount: number;
  address: DeliveryAddress;
  status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
  trackingNumber?: string;
  estimatedDelivery?: string;
  createdAt: string;
  history: Array<{ status: string; timestamp: string; note?: string }>;
}

interface Props {
  walletAddress: string;
  metalBalances?: Record<string, number>;
  onClose: () => void;
}

// 6-Language translations
const translations: Record<string, Record<string, string>> = {
  tr: {
    title: "Fiziksel Teslimat",
    subtitle: "Metal varlıklarınızı fiziksel olarak teslim alın",
    newRequest: "Yeni Talep",
    myRequests: "Taleplerim",
    myAddresses: "Adreslerim",
    addAddress: "Adres Ekle",
    selectMetal: "Metal Seçin",
    amount: "Miktar (gram)",
    minAmount: "Minimum",
    yourBalance: "Bakiyeniz",
    selectAddress: "Teslimat Adresi",
    deliveryFee: "Teslimat Ücreti",
    submit: "Talep Oluştur",
    cancel: "İptal",
    noRequests: "Henüz teslimat talebiniz yok",
    noAddresses: "Henüz adres eklemediniz",
    default: "Varsayılan",
    trackingNo: "Takip No",
    statusPending: "Beklemede",
    statusConfirmed: "Onaylandı",
    statusProcessing: "Hazırlanıyor",
    statusShipped: "Kargoda",
    statusDelivered: "Teslim Edildi",
    statusCancelled: "İptal Edildi",
    addressFormLabel: "Adres Etiketi",
    addressFormFullName: "Ad Soyad",
    addressFormPhone: "Telefon",
    addressFormCountry: "Ülke",
    addressFormCity: "Şehir",
    addressFormDistrict: "İlçe",
    addressFormAddressLine1: "Adres Satırı 1",
    addressFormAddressLine2: "Adres Satırı 2 (Opsiyonel)",
    addressFormPostalCode: "Posta Kodu",
    addressFormSetDefault: "Varsayılan adres olarak ayarla",
    addressFormSave: "Kaydet",
    successRequestCreated: "Teslimat talebi oluşturuldu!",
    successAddressAdded: "Adres eklendi!",
    successRequestCancelled: "Talep iptal edildi",
    errorsInsufficientBalance: "Yetersiz bakiye",
    errorsMinAmountRequired: "Minimum miktar gerekli",
    errorsError: "Bir hata oluştu",
  },
  en: {
    title: "Physical Delivery",
    subtitle: "Receive your metal assets physically",
    newRequest: "New Request",
    myRequests: "My Requests",
    myAddresses: "My Addresses",
    addAddress: "Add Address",
    selectMetal: "Select Metal",
    amount: "Amount (grams)",
    minAmount: "Minimum",
    yourBalance: "Your Balance",
    selectAddress: "Delivery Address",
    deliveryFee: "Delivery Fee",
    submit: "Create Request",
    cancel: "Cancel",
    noRequests: "No delivery requests yet",
    noAddresses: "No addresses added yet",
    default: "Default",
    trackingNo: "Tracking No",
    statusPending: "Pending",
    statusConfirmed: "Confirmed",
    statusProcessing: "Processing",
    statusShipped: "Shipped",
    statusDelivered: "Delivered",
    statusCancelled: "Cancelled",
    addressFormLabel: "Address Label",
    addressFormFullName: "Full Name",
    addressFormPhone: "Phone",
    addressFormCountry: "Country",
    addressFormCity: "City",
    addressFormDistrict: "District",
    addressFormAddressLine1: "Address Line 1",
    addressFormAddressLine2: "Address Line 2 (Optional)",
    addressFormPostalCode: "Postal Code",
    addressFormSetDefault: "Set as default address",
    addressFormSave: "Save",
    successRequestCreated: "Delivery request created!",
    successAddressAdded: "Address added!",
    successRequestCancelled: "Request cancelled",
    errorsInsufficientBalance: "Insufficient balance",
    errorsMinAmountRequired: "Minimum amount required",
    errorsError: "An error occurred",
  },
  de: {
    title: "Physische Lieferung",
    subtitle: "Erhalten Sie Ihre Metallwerte physisch",
    newRequest: "Neue Anfrage",
    myRequests: "Meine Anfragen",
    myAddresses: "Meine Adressen",
    addAddress: "Adresse hinzufügen",
    selectMetal: "Metall auswählen",
    amount: "Menge (Gramm)",
    minAmount: "Minimum",
    yourBalance: "Ihr Guthaben",
    selectAddress: "Lieferadresse",
    deliveryFee: "Liefergebühr",
    submit: "Anfrage erstellen",
    cancel: "Abbrechen",
    noRequests: "Noch keine Lieferanfragen",
    noAddresses: "Noch keine Adressen hinzugefügt",
    default: "Standard",
    trackingNo: "Sendungsnr.",
    statusPending: "Ausstehend",
    statusConfirmed: "Bestätigt",
    statusProcessing: "In Bearbeitung",
    statusShipped: "Versendet",
    statusDelivered: "Geliefert",
    statusCancelled: "Storniert",
    addressFormLabel: "Adresslabel",
    addressFormFullName: "Vollständiger Name",
    addressFormPhone: "Telefon",
    addressFormCountry: "Land",
    addressFormCity: "Stadt",
    addressFormDistrict: "Bezirk",
    addressFormAddressLine1: "Adresszeile 1",
    addressFormAddressLine2: "Adresszeile 2 (Optional)",
    addressFormPostalCode: "Postleitzahl",
    addressFormSetDefault: "Als Standardadresse festlegen",
    addressFormSave: "Speichern",
    successRequestCreated: "Lieferanfrage erstellt!",
    successAddressAdded: "Adresse hinzugefügt!",
    successRequestCancelled: "Anfrage storniert",
    errorsInsufficientBalance: "Unzureichendes Guthaben",
    errorsMinAmountRequired: "Mindestmenge erforderlich",
    errorsError: "Ein Fehler ist aufgetreten",
  },
  fr: {
    title: "Livraison Physique",
    subtitle: "Recevez vos actifs métalliques physiquement",
    newRequest: "Nouvelle Demande",
    myRequests: "Mes Demandes",
    myAddresses: "Mes Adresses",
    addAddress: "Ajouter Adresse",
    selectMetal: "Sélectionner Métal",
    amount: "Quantité (grammes)",
    minAmount: "Minimum",
    yourBalance: "Votre Solde",
    selectAddress: "Adresse de Livraison",
    deliveryFee: "Frais de Livraison",
    submit: "Créer Demande",
    cancel: "Annuler",
    noRequests: "Aucune demande de livraison",
    noAddresses: "Aucune adresse ajoutée",
    default: "Par défaut",
    trackingNo: "N° de suivi",
    statusPending: "En attente",
    statusConfirmed: "Confirmé",
    statusProcessing: "En cours",
    statusShipped: "Expédié",
    statusDelivered: "Livré",
    statusCancelled: "Annulé",
    addressFormLabel: "Étiquette d'adresse",
    addressFormFullName: "Nom complet",
    addressFormPhone: "Téléphone",
    addressFormCountry: "Pays",
    addressFormCity: "Ville",
    addressFormDistrict: "District",
    addressFormAddressLine1: "Ligne d'adresse 1",
    addressFormAddressLine2: "Ligne d'adresse 2 (Optionnel)",
    addressFormPostalCode: "Code postal",
    addressFormSetDefault: "Définir comme adresse par défaut",
    addressFormSave: "Enregistrer",
    successRequestCreated: "Demande de livraison créée!",
    successAddressAdded: "Adresse ajoutée!",
    successRequestCancelled: "Demande annulée",
    errorsInsufficientBalance: "Solde insuffisant",
    errorsMinAmountRequired: "Quantité minimale requise",
    errorsError: "Une erreur s'est produite",
  },
  ar: {
    title: "التوصيل الفعلي",
    subtitle: "استلم أصولك المعدنية فعلياً",
    newRequest: "طلب جديد",
    myRequests: "طلباتي",
    myAddresses: "عناويني",
    addAddress: "إضافة عنوان",
    selectMetal: "اختر المعدن",
    amount: "الكمية (جرام)",
    minAmount: "الحد الأدنى",
    yourBalance: "رصيدك",
    selectAddress: "عنوان التوصيل",
    deliveryFee: "رسوم التوصيل",
    submit: "إنشاء الطلب",
    cancel: "إلغاء",
    noRequests: "لا توجد طلبات توصيل بعد",
    noAddresses: "لم تتم إضافة عناوين بعد",
    default: "افتراضي",
    trackingNo: "رقم التتبع",
    statusPending: "معلق",
    statusConfirmed: "مؤكد",
    statusProcessing: "قيد التجهيز",
    statusShipped: "تم الشحن",
    statusDelivered: "تم التوصيل",
    statusCancelled: "ملغي",
    addressFormLabel: "تسمية العنوان",
    addressFormFullName: "الاسم الكامل",
    addressFormPhone: "الهاتف",
    addressFormCountry: "البلد",
    addressFormCity: "المدينة",
    addressFormDistrict: "المنطقة",
    addressFormAddressLine1: "سطر العنوان 1",
    addressFormAddressLine2: "سطر العنوان 2 (اختياري)",
    addressFormPostalCode: "الرمز البريدي",
    addressFormSetDefault: "تعيين كعنوان افتراضي",
    addressFormSave: "حفظ",
    successRequestCreated: "تم إنشاء طلب التوصيل!",
    successAddressAdded: "تمت إضافة العنوان!",
    successRequestCancelled: "تم إلغاء الطلب",
    errorsInsufficientBalance: "رصيد غير كافٍ",
    errorsMinAmountRequired: "الحد الأدنى للكمية مطلوب",
    errorsError: "حدث خطأ",
  },
  ru: {
    title: "Физическая Доставка",
    subtitle: "Получите ваши металлические активы физически",
    newRequest: "Новый Запрос",
    myRequests: "Мои Запросы",
    myAddresses: "Мои Адреса",
    addAddress: "Добавить Адрес",
    selectMetal: "Выбрать Металл",
    amount: "Количество (граммы)",
    minAmount: "Минимум",
    yourBalance: "Ваш Баланс",
    selectAddress: "Адрес Доставки",
    deliveryFee: "Стоимость Доставки",
    submit: "Создать Запрос",
    cancel: "Отмена",
    noRequests: "Запросов на доставку пока нет",
    noAddresses: "Адреса еще не добавлены",
    default: "По умолчанию",
    trackingNo: "Номер отслеживания",
    statusPending: "В ожидании",
    statusConfirmed: "Подтверждено",
    statusProcessing: "Обрабатывается",
    statusShipped: "Отправлено",
    statusDelivered: "Доставлено",
    statusCancelled: "Отменено",
    addressFormLabel: "Название адреса",
    addressFormFullName: "Полное имя",
    addressFormPhone: "Телефон",
    addressFormCountry: "Страна",
    addressFormCity: "Город",
    addressFormDistrict: "Район",
    addressFormAddressLine1: "Адресная строка 1",
    addressFormAddressLine2: "Адресная строка 2 (Необязательно)",
    addressFormPostalCode: "Почтовый индекс",
    addressFormSetDefault: "Установить как адрес по умолчанию",
    addressFormSave: "Сохранить",
    successRequestCreated: "Запрос на доставку создан!",
    successAddressAdded: "Адрес добавлен!",
    successRequestCancelled: "Запрос отменен",
    errorsInsufficientBalance: "Недостаточный баланс",
    errorsMinAmountRequired: "Требуется минимальное количество",
    errorsError: "Произошла ошибка",
  },
};

// FIXED: Correct icon paths for all metals
const METALS = [
  { symbol: "AUXG", name: { tr: "Altın", en: "Gold", de: "Gold", fr: "Or", ar: "ذهب", ru: "Золото" }, icon: "/auxg_icon.png", minAmount: 80 },
  { symbol: "AUXS", name: { tr: "Gümüş", en: "Silver", de: "Silber", fr: "Argent", ar: "فضة", ru: "Серебро" }, icon: "/auxs_icon.png", minAmount: 5000 },
  { symbol: "AUXPT", name: { tr: "Platin", en: "Platinum", de: "Platin", fr: "Platine", ar: "بلاتين", ru: "Платина" }, icon: "/auxpt_icon.png", minAmount: 200 },
  { symbol: "AUXPD", name: { tr: "Paladyum", en: "Palladium", de: "Palladium", fr: "Palladium", ar: "بلاديوم", ru: "Палладий" }, icon: "/auxpd_icon.png", minAmount: 200 },
];

const DELIVERY_FEES: Record<string, number> = {
  AUXG: 50,
  AUXS: 75,
  AUXPT: 50,
  AUXPD: 50,
};

export function PhysicalDelivery({ walletAddress, metalBalances = {}, onClose }: Props) {
  const { lang } = useLanguage();
  const t = (key: string) => (translations as any)[lang]?.[key] || (translations as any).en[key] || key;
  const [activeTab, setActiveTab] = useState<"new" | "requests" | "addresses">("new");
  const [requests, setRequests] = useState<DeliveryRequest[]>([]);
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // New request form
  const [selectedMetal, setSelectedMetal] = useState("AUXG");
  const [amount, setAmount] = useState("");
  const [selectedAddressId, setSelectedAddressId] = useState("");

  // Address form
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState({
    label: "", fullName: "", phone: "", country: "Türkiye", city: "",
    district: "", addressLine1: "", addressLine2: "", postalCode: "", isDefault: false,
  });

  useEffect(() => { fetchData(); }, [walletAddress]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const fetchData = async () => {
    try {
      const [reqRes, addrRes] = await Promise.all([
        fetch("/api/delivery?type=requests", { headers: { "x-wallet-address": walletAddress } }),
        fetch("/api/delivery?type=addresses", { headers: { "x-wallet-address": walletAddress } }),
      ]);
      const reqData = await reqRes.json();
      const addrData = await addrRes.json();
      setRequests(reqData.requests || []);
      setAddresses(addrData.addresses || []);
      if (addrData.addresses?.length > 0) {
        const defaultAddr = addrData.addresses.find((a: DeliveryAddress) => a.isDefault);
        setSelectedAddressId(defaultAddr?.id || addrData.addresses[0].id);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async () => {
    setSubmitting(true);
    setErrorMessage("");

    const metal = METALS.find(m => m.symbol === selectedMetal);
    const balance = metalBalances[selectedMetal.toLowerCase()] || 0;
    const amountNum = parseFloat(amount);

    if (!metal || amountNum < metal.minAmount) {
      setErrorMessage(t("errorsMinAmountRequired") + ": " + metal?.minAmount + "g");
      setSubmitting(false);
      return;
    }

    if (amountNum > balance) {
      setErrorMessage(t("errorsInsufficientBalance"));
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-wallet-address": walletAddress },
        body: JSON.stringify({ token: selectedMetal, amount: amountNum, addressId: selectedAddressId }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(t("successRequestCreated"));
        setAmount("");
        fetchData();
        setActiveTab("requests");
      } else {
        setErrorMessage(data.error);
      }
    } catch (err) {
      setErrorMessage(t("errorsError"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddAddress = async () => {
    setSubmitting(true);
    setErrorMessage("");
    try {
      const res = await fetch("/api/delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-wallet-address": walletAddress },
        body: JSON.stringify({ action: "add_address", ...addressForm }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(t("successAddressAdded"));
        setShowAddressForm(false);
        setAddressForm({ label: "", fullName: "", phone: "", country: "Türkiye", city: "", district: "", addressLine1: "", addressLine2: "", postalCode: "", isDefault: false });
        fetchData();
      } else {
        setErrorMessage(data.error);
      }
    } catch (err) {
      setErrorMessage(t("errorsError"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async (id: string) => {
    try {
      const res = await fetch("/api/delivery?type=request&id=" + id, {
        method: "DELETE",
        headers: { "x-wallet-address": walletAddress },
      });
      if (res.ok) {
        setSuccessMessage(t("successRequestCancelled"));
        fetchData();
      }
    } catch (err) {
      console.error("Cancel error:", err);
    }
  };

  const selectedMetalInfo = METALS.find(m => m.symbol === selectedMetal);
  const currentBalance = metalBalances[selectedMetal.toLowerCase()] || 0;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-300 dark:border-slate-700 w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header - Responsive */}
        <div className="sticky top-0 bg-white dark:bg-slate-900 p-3 sm:p-4 border-b border-stone-300 dark:border-slate-700 flex items-center justify-between z-10">
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-white truncate">{t("title")}</h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 truncate">{t("subtitle")}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg flex-shrink-0 ml-2">
            <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mx-3 sm:mx-4 mt-3 sm:mt-4 p-2.5 sm:p-3 bg-[#2F6F62]/20 border border-[#2F6F62]/50 rounded-xl text-[#2F6F62] text-xs sm:text-sm">✅ {successMessage}</div>
        )}
        {errorMessage && (
          <div className="mx-3 sm:mx-4 mt-3 sm:mt-4 p-2.5 sm:p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-xs sm:text-sm">❌ {errorMessage}</div>
        )}

        {/* Tabs - Responsive */}
        <div className="flex border-b border-stone-300 dark:border-slate-700 overflow-x-auto">
          {[
            { id: "new", label: t("newRequest") },
            { id: "requests", label: t("myRequests") },
            { id: "addresses", label: t("myAddresses") },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 min-w-0 py-2.5 sm:py-3 px-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id ? "text-[#BFA181] border-b-2 border-[#BFA181]" : "text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-3 sm:p-4">
          {/* New Request Tab */}
          {activeTab === "new" && (
            <div className="space-y-3 sm:space-y-4">
              {/* Metal Selection - Responsive Grid */}
              <div>
                <label className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-2 block">{t("selectMetal")}</label>
                <div className="grid grid-cols-2 gap-2">
                  {METALS.map(metal => (
                    <button
                      key={metal.symbol}
                      onClick={() => setSelectedMetal(metal.symbol)}
                      className={`p-2.5 sm:p-3 rounded-xl border transition-colors ${
                        selectedMetal === metal.symbol ? "border-[#2F6F62] bg-[#2F6F62]/10" : "border-stone-300 dark:border-slate-700 hover:border-stone-400 dark:hover:border-slate-600"
                      }`}
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        <img src={metal.icon} alt={metal.symbol} className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0" />
                        <div className="text-left min-w-0 flex-1">
                          <div className="text-slate-800 dark:text-white font-medium text-sm sm:text-base">{metal.symbol}</div>
                          <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-500">{t("minAmount")}: {metal.minAmount}g</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount - Responsive */}
              <div>
                <label className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-2 block">{t("amount")}</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-stone-100 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 text-slate-800 dark:text-white text-sm sm:text-base"
                  placeholder={selectedMetalInfo?.minAmount.toString()}
                  min={selectedMetalInfo?.minAmount}
                />
                <div className="flex justify-between mt-2 text-[10px] sm:text-xs">
                  <span className="text-slate-500 dark:text-slate-500">{t("minAmount")}: {selectedMetalInfo?.minAmount}g</span>
                  <span className="text-slate-600 dark:text-slate-400">{t("yourBalance")}: {currentBalance.toFixed(2)}g</span>
                </div>
              </div>

              {/* Address Selection - Responsive */}
              <div>
                <label className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-2 block">{t("selectAddress")}</label>
                {addresses.length === 0 ? (
                  <button onClick={() => { setActiveTab("addresses"); setShowAddressForm(true); }} className="w-full p-3 sm:p-4 border border-dashed border-stone-400 dark:border-slate-600 rounded-xl text-slate-600 dark:text-slate-400 hover:border-slate-500 text-sm">
                    + {t("addAddress")}
                  </button>
                ) : (
                  <select value={selectedAddressId} onChange={(e) => setSelectedAddressId(e.target.value)} className="w-full bg-stone-100 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 text-slate-800 dark:text-white text-sm sm:text-base">
                    {addresses.map(addr => (
                      <option key={addr.id} value={addr.id}>{addr.label} - {addr.city}, {addr.country}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Fee Info - Responsive */}
              <div className="p-2.5 sm:p-3 bg-stone-100 dark:bg-slate-800/50 rounded-xl">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-slate-600 dark:text-slate-400">{t("deliveryFee")}</span>
                  <span className="text-slate-800 dark:text-white">${DELIVERY_FEES[selectedMetal]}</span>
                </div>
              </div>

              {/* Submit - Responsive */}
              <button
                onClick={handleSubmitRequest}
                disabled={submitting || !amount || !selectedAddressId || parseFloat(amount) < (selectedMetalInfo?.minAmount || 0)}
                className="w-full py-2.5 sm:py-3 bg-[#BFA181] text-slate-800 dark:text-white rounded-xl font-medium hover:bg-[#2F6F62] disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                {submitting ? "..." : t("submit")}
              </button>
            </div>
          )}

          {/* Requests Tab - Responsive */}
          {activeTab === "requests" && (
            <div className="space-y-2 sm:space-y-3">
              {loading ? (
                <div className="flex justify-center py-6 sm:py-8">
                  <div className="animate-spin w-6 h-6 sm:w-8 sm:h-8 border-2 border-stone-400 dark:border-slate-600 border-t-[#BFA181] rounded-full"></div>
                </div>
              ) : requests.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-slate-500 dark:text-slate-500">
                  <p className="text-3xl sm:text-4xl mb-2">📦</p>
                  <p className="text-sm">{t("noRequests")}</p>
                </div>
              ) : (
                requests.map(req => {
                  const metal = METALS.find(m => m.symbol === req.token);
                  return (
                    <div key={req.id} className="bg-stone-100 dark:bg-slate-800/50 rounded-xl p-3 sm:p-4 border border-stone-300 dark:border-slate-700">
                      <div className="flex items-start sm:items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          {metal?.icon && <img src={metal.icon} alt={req.token} className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0" />}
                          <div className="min-w-0">
                            <div className="text-slate-800 dark:text-white font-medium text-sm sm:text-base">{req.amount}g {req.token}</div>
                            <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-500 truncate">{req.id}</div>
                          </div>
                        </div>
                        <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full whitespace-nowrap flex-shrink-0 ${
                          req.status === "delivered" ? "bg-[#2F6F62]/20 text-[#2F6F62]" :
                          req.status === "cancelled" ? "bg-red-500/20 text-red-400" :
                          req.status === "shipped" ? "bg-blue-500/20 text-blue-400" :
                          "bg-[#BFA181]/20 text-[#BFA181]"
                        }`}>
                          {t("status" + req.status.charAt(0).toUpperCase() + req.status.slice(1))}
                        </span>
                      </div>
                      <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-500 mb-2">{req.address.city}, {req.address.country}</div>
                      {req.trackingNumber && <div className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400">{t("trackingNo")}: {req.trackingNumber}</div>}
                      {req.status === "pending" && (
                        <button onClick={() => handleCancelRequest(req.id)} className="mt-2 text-[10px] sm:text-xs text-red-400 hover:text-red-300">{t("cancel")}</button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Addresses Tab - Responsive */}
          {activeTab === "addresses" && (
            <div className="space-y-2 sm:space-y-3">
              {!showAddressForm ? (
                <>
                  <button onClick={() => setShowAddressForm(true)} className="w-full p-2.5 sm:p-3 border border-dashed border-stone-400 dark:border-slate-600 rounded-xl text-slate-600 dark:text-slate-400 hover:border-[#BFA181] hover:text-[#BFA181] text-sm">
                    + {t("addAddress")}
                  </button>
                  {addresses.length === 0 ? (
                    <div className="text-center py-6 sm:py-8 text-slate-500 dark:text-slate-500">
                      <p className="text-3xl sm:text-4xl mb-2">🏠</p>
                      <p className="text-sm">{t("noAddresses")}</p>
                    </div>
                  ) : (
                    addresses.map(addr => (
                      <div key={addr.id} className="bg-stone-100 dark:bg-slate-800/50 rounded-xl p-3 sm:p-4 border border-stone-300 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-2 gap-2">
                          <div className="font-medium text-slate-800 dark:text-white text-sm sm:text-base truncate">{addr.label}</div>
                          {addr.isDefault && <span className="text-[10px] sm:text-xs bg-[#BFA181]/20 text-[#BFA181] px-1.5 sm:px-2 py-0.5 sm:py-1 rounded flex-shrink-0">{t("default")}</span>}
                        </div>
                        <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 space-y-0.5">
                          <p>{addr.fullName}</p>
                          <p className="truncate">{addr.addressLine1}</p>
                          {addr.addressLine2 && <p className="truncate">{addr.addressLine2}</p>}
                          <p>{addr.district}, {addr.city} {addr.postalCode}</p>
                          <p>{addr.country}</p>
                          <p>{addr.phone}</p>
                        </div>
                      </div>
                    ))
                  )}
                </>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  <input type="text" placeholder={t("addressFormLabel")} value={addressForm.label} onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })} className="w-full bg-stone-100 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 rounded-lg px-3 sm:px-4 py-2 text-slate-800 dark:text-white text-sm" />
                  <input type="text" placeholder={t("addressFormFullName")} value={addressForm.fullName} onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })} className="w-full bg-stone-100 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 rounded-lg px-3 sm:px-4 py-2 text-slate-800 dark:text-white text-sm" />
                  <input type="tel" placeholder={t("addressFormPhone")} value={addressForm.phone} onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })} className="w-full bg-stone-100 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 rounded-lg px-3 sm:px-4 py-2 text-slate-800 dark:text-white text-sm" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input type="text" placeholder={t("addressFormCountry")} value={addressForm.country} onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })} className="bg-stone-100 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 rounded-lg px-3 sm:px-4 py-2 text-slate-800 dark:text-white text-sm" />
                    <input type="text" placeholder={t("addressFormCity")} value={addressForm.city} onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })} className="bg-stone-100 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 rounded-lg px-3 sm:px-4 py-2 text-slate-800 dark:text-white text-sm" />
                  </div>
                  <input type="text" placeholder={t("addressFormDistrict")} value={addressForm.district} onChange={(e) => setAddressForm({ ...addressForm, district: e.target.value })} className="w-full bg-stone-100 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 rounded-lg px-3 sm:px-4 py-2 text-slate-800 dark:text-white text-sm" />
                  <input type="text" placeholder={t("addressFormAddressLine1")} value={addressForm.addressLine1} onChange={(e) => setAddressForm({ ...addressForm, addressLine1: e.target.value })} className="w-full bg-stone-100 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 rounded-lg px-3 sm:px-4 py-2 text-slate-800 dark:text-white text-sm" />
                  <input type="text" placeholder={t("addressFormAddressLine2")} value={addressForm.addressLine2} onChange={(e) => setAddressForm({ ...addressForm, addressLine2: e.target.value })} className="w-full bg-stone-100 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 rounded-lg px-3 sm:px-4 py-2 text-slate-800 dark:text-white text-sm" />
                  <input type="text" placeholder={t("addressFormPostalCode")} value={addressForm.postalCode} onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })} className="w-full bg-stone-100 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 rounded-lg px-3 sm:px-4 py-2 text-slate-800 dark:text-white text-sm" />
                  <label className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                    <input type="checkbox" checked={addressForm.isDefault} onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })} className="rounded" />
                    {t("addressFormSetDefault")}
                  </label>
                  <div className="flex gap-2">
                    <button onClick={() => setShowAddressForm(false)} className="flex-1 py-2 bg-stone-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm">{t("cancel")}</button>
                    <button onClick={handleAddAddress} disabled={submitting || !addressForm.label || !addressForm.fullName || !addressForm.phone || !addressForm.city || !addressForm.addressLine1 || !addressForm.postalCode} className="flex-1 py-2 bg-[#BFA181] text-slate-800 dark:text-white rounded-lg disabled:opacity-50 text-sm">
                      {submitting ? "..." : t("addressFormSave")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PhysicalDelivery;
