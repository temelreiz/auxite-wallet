"use client";

import { useState, useEffect } from "react";

/**
 * KYC Verification Component
 * Kimlik doğrulama adımları ve durum
 */

interface KYCData {
  level: "none" | "basic" | "verified" | "enhanced";
  status: "not_started" | "pending" | "under_review" | "approved" | "rejected" | "expired";
  personalInfo?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  limits: {
    dailyWithdraw: number;
    monthlyWithdraw: number;
    singleTransaction: number;
  };
}

interface Props {
  walletAddress: string;
  lang: "tr" | "en";
  onClose?: () => void;
}

const t = {
  tr: {
    title: "Kimlik Doğrulama (KYC)",
    subtitle: "Hesabınızı doğrulayarak limitlrinizi artırın",
    currentLevel: "Mevcut Seviye",
    limits: "İşlem Limitleri",
    dailyLimit: "Günlük Çekim",
    monthlyLimit: "Aylık Çekim",
    singleLimit: "Tek İşlem",
    levels: {
      none: "Doğrulanmamış",
      basic: "Temel",
      verified: "Doğrulanmış",
      enhanced: "Tam Doğrulama",
    },
    status: {
      not_started: "Başlanmadı",
      pending: "İnceleme Bekliyor",
      under_review: "İnceleniyor",
      approved: "Onaylandı",
      rejected: "Reddedildi",
      expired: "Süresi Doldu",
    },
    steps: {
      basic: "Temel Bilgiler",
      personal: "Kişisel Bilgiler",
      document: "Kimlik Belgesi",
      selfie: "Selfie Doğrulama",
    },
    form: {
      email: "Email",
      phone: "Telefon",
      firstName: "Ad",
      lastName: "Soyad",
      dateOfBirth: "Doğum Tarihi",
      nationality: "Uyruk",
      documentType: "Belge Tipi",
      passport: "Pasaport",
      national_id: "Kimlik Kartı",
      drivers_license: "Ehliyet",
    },
    buttons: {
      start: "Doğrulamayı Başlat",
      continue: "Devam Et",
      submit: "Gönder",
      back: "Geri",
      uploadFront: "Ön Yüz Yükle",
      uploadBack: "Arka Yüz Yükle",
      uploadSelfie: "Selfie Yükle",
    },
    messages: {
      pendingReview: "Başvurunuz inceleniyor. Bu işlem 1-3 iş günü sürebilir.",
      approved: "Hesabınız doğrulandı! Artık yüksek limitlerle işlem yapabilirsiniz.",
      rejected: "Başvurunuz reddedildi. Lütfen tekrar deneyin.",
    },
  },
  en: {
    title: "Identity Verification (KYC)",
    subtitle: "Verify your account to increase your limits",
    currentLevel: "Current Level",
    limits: "Transaction Limits",
    dailyLimit: "Daily Withdrawal",
    monthlyLimit: "Monthly Withdrawal",
    singleLimit: "Single Transaction",
    levels: {
      none: "Unverified",
      basic: "Basic",
      verified: "Verified",
      enhanced: "Enhanced",
    },
    status: {
      not_started: "Not Started",
      pending: "Pending Review",
      under_review: "Under Review",
      approved: "Approved",
      rejected: "Rejected",
      expired: "Expired",
    },
    steps: {
      basic: "Basic Info",
      personal: "Personal Info",
      document: "ID Document",
      selfie: "Selfie Verification",
    },
    form: {
      email: "Email",
      phone: "Phone",
      firstName: "First Name",
      lastName: "Last Name",
      dateOfBirth: "Date of Birth",
      nationality: "Nationality",
      documentType: "Document Type",
      passport: "Passport",
      national_id: "National ID",
      drivers_license: "Driver's License",
    },
    buttons: {
      start: "Start Verification",
      continue: "Continue",
      submit: "Submit",
      back: "Back",
      uploadFront: "Upload Front",
      uploadBack: "Upload Back",
      uploadSelfie: "Upload Selfie",
    },
    messages: {
      pendingReview: "Your application is under review. This may take 1-3 business days.",
      approved: "Your account is verified! You can now transact with higher limits.",
      rejected: "Your application was rejected. Please try again.",
    },
  },
};

const STEPS = ["basic", "personal", "document", "selfie"] as const;
type Step = typeof STEPS[number];

export function KYCVerification({ walletAddress, lang, onClose }: Props) {
  const labels = t[lang];
  const [kyc, setKyc] = useState<KYCData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>("basic");
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    nationality: "",
    documentType: "passport",
    frontImage: null as File | null,
    backImage: null as File | null,
    selfieImage: null as File | null,
  });

  useEffect(() => {
    fetchKYC();
  }, [walletAddress]);

  const fetchKYC = async () => {
    try {
      const res = await fetch("/api/kyc", {
        headers: { "x-wallet-address": walletAddress },
      });
      const data = await res.json();
      setKyc(data.kyc);

      // Form'u mevcut verilerle doldur
      if (data.kyc?.personalInfo) {
        setFormData((prev) => ({
          ...prev,
          email: data.kyc.personalInfo.email || "",
          phone: data.kyc.personalInfo.phone || "",
          firstName: data.kyc.personalInfo.firstName || "",
          lastName: data.kyc.personalInfo.lastName || "",
        }));
      }
    } catch (error) {
      console.error("Fetch KYC error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitStep = async () => {
    setSubmitting(true);
    try {
      let stepData: Record<string, unknown> = {};

      switch (currentStep) {
        case "basic":
          stepData = { email: formData.email, phone: formData.phone };
          break;
        case "personal":
          stepData = {
            firstName: formData.firstName,
            lastName: formData.lastName,
            dateOfBirth: formData.dateOfBirth,
            nationality: formData.nationality,
          };
          break;
        case "document":
          // TODO: Upload images to storage and get IDs
          stepData = {
            type: formData.documentType,
            frontImageId: "uploaded_front_id",
            backImageId: formData.backImage ? "uploaded_back_id" : undefined,
          };
          break;
        case "selfie":
          stepData = { selfieImageId: "uploaded_selfie_id" };
          // Son adım - başvuruyu gönder
          await fetch("/api/kyc", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-wallet-address": walletAddress,
            },
            body: JSON.stringify({ step: "submit", data: {} }),
          });
          break;
      }

      const res = await fetch("/api/kyc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({ step: currentStep, data: stepData }),
      });

      if (res.ok) {
        const stepIndex = STEPS.indexOf(currentStep);
        if (stepIndex < STEPS.length - 1) {
          setCurrentStep(STEPS[stepIndex + 1]);
        } else {
          setShowForm(false);
          fetchKYC();
        }
      }
    } catch (error) {
      console.error("Submit step error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "enhanced": return "text-purple-400 bg-purple-500/10 border-purple-500/30";
      case "verified": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
      case "basic": return "text-blue-400 bg-blue-500/10 border-blue-500/30";
      default: return "text-slate-400 bg-slate-500/10 border-slate-500/30";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "text-emerald-400";
      case "rejected": return "text-red-400";
      case "pending":
      case "under_review": return "text-amber-400";
      default: return "text-slate-400";
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-20 bg-slate-800 rounded-xl" />
        <div className="h-40 bg-slate-800 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-white">{labels.title}</h3>
        <p className="text-sm text-slate-400">{labels.subtitle}</p>
      </div>

      {/* Current Level */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-slate-400">{labels.currentLevel}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-3 py-1 rounded-full border ${getLevelColor(kyc?.level || "none")}`}>
                {labels.levels[kyc?.level || "none"]}
              </span>
              <span className={getStatusColor(kyc?.status || "not_started")}>
                {labels.status[kyc?.status || "not_started"]}
              </span>
            </div>
          </div>
          <div className="text-4xl">
            {kyc?.level === "enhanced" && "👑"}
            {kyc?.level === "verified" && "✓"}
            {kyc?.level === "basic" && "👤"}
            {kyc?.level === "none" && "❓"}
          </div>
        </div>

        {/* Status Messages */}
        {kyc?.status === "pending" && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-sm">
            ⏳ {labels.messages.pendingReview}
          </div>
        )}
        {kyc?.status === "approved" && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm">
            ✓ {labels.messages.approved}
          </div>
        )}
        {kyc?.status === "rejected" && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            ✕ {labels.messages.rejected}
          </div>
        )}
      </div>

      {/* Limits */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <h4 className="font-medium text-white mb-3">{labels.limits}</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-400">
              ${kyc?.limits.dailyWithdraw.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500">{labels.dailyLimit}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-400">
              ${kyc?.limits.monthlyWithdraw.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500">{labels.monthlyLimit}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-400">
              ${kyc?.limits.singleTransaction.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500">{labels.singleLimit}</p>
          </div>
        </div>
      </div>

      {/* Start Verification Button */}
      {(kyc?.status === "not_started" || kyc?.status === "rejected") && !showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors"
        >
          {labels.buttons.start}
        </button>
      )}

      {/* Verification Form */}
      {showForm && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
          {/* Progress Steps */}
          <div className="flex border-b border-slate-700">
            {STEPS.map((step, i) => (
              <div
                key={step}
                className={`flex-1 py-3 text-center text-sm transition-colors ${
                  currentStep === step
                    ? "bg-emerald-500/10 text-emerald-400 border-b-2 border-emerald-500"
                    : STEPS.indexOf(currentStep) > i
                    ? "text-emerald-400"
                    : "text-slate-500"
                }`}
              >
                {labels.steps[step]}
              </div>
            ))}
          </div>

          {/* Form Content */}
          <div className="p-6">
            {currentStep === "basic" && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">{labels.form.email}</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">{labels.form.phone}</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white"
                  />
                </div>
              </div>
            )}

            {currentStep === "personal" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">{labels.form.firstName}</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">{labels.form.lastName}</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">{labels.form.dateOfBirth}</label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">{labels.form.nationality}</label>
                  <select
                    value={formData.nationality}
                    onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white"
                  >
                    <option value="">Seçiniz</option>
                    <option value="TR">Türkiye</option>
                    <option value="US">United States</option>
                    <option value="GB">United Kingdom</option>
                    <option value="DE">Germany</option>
                    {/* Add more countries */}
                  </select>
                </div>
              </div>
            )}

            {currentStep === "document" && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">{labels.form.documentType}</label>
                  <select
                    value={formData.documentType}
                    onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white"
                  >
                    <option value="passport">{labels.form.passport}</option>
                    <option value="national_id">{labels.form.national_id}</option>
                    <option value="drivers_license">{labels.form.drivers_license}</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center hover:border-slate-600 cursor-pointer">
                    <div className="text-3xl mb-2">📄</div>
                    <p className="text-sm text-slate-400">{labels.buttons.uploadFront}</p>
                  </div>
                  <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center hover:border-slate-600 cursor-pointer">
                    <div className="text-3xl mb-2">📄</div>
                    <p className="text-sm text-slate-400">{labels.buttons.uploadBack}</p>
                  </div>
                </div>
              </div>
            )}

            {currentStep === "selfie" && (
              <div className="text-center">
                <div className="border-2 border-dashed border-slate-700 rounded-xl p-12 hover:border-slate-600 cursor-pointer">
                  <div className="text-5xl mb-4">🤳</div>
                  <p className="text-slate-400">{labels.buttons.uploadSelfie}</p>
                  <p className="text-xs text-slate-500 mt-2">
                    {lang === "tr" 
                      ? "Kimlik belgenizi yüzünüzün yanında tutarak selfie çekin"
                      : "Take a selfie holding your ID document next to your face"}
                  </p>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3 mt-6">
              {STEPS.indexOf(currentStep) > 0 && (
                <button
                  onClick={() => setCurrentStep(STEPS[STEPS.indexOf(currentStep) - 1])}
                  className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl"
                >
                  {labels.buttons.back}
                </button>
              )}
              <button
                onClick={handleSubmitStep}
                disabled={submitting}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl disabled:opacity-50"
              >
                {submitting 
                  ? "..." 
                  : currentStep === "selfie" 
                    ? labels.buttons.submit 
                    : labels.buttons.continue}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
