// lib/email.ts
// INSTITUTIONAL EMAIL SERVICE — Auxite Precious Metals AG
// Swiss Private Bank Style — Plain, Dense, Structured
// NO gradients, NO crypto vibes, NO marketing banners
// Think: Private bank statement, NOT fintech campaign

import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@auxite.io';
const VAULT_URL = 'https://vault.auxite.io';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  console.log(`📧 sendEmail called: to=${to}, subject="${subject.substring(0, 60)}...", from=${FROM_EMAIL}`);

  try {
    if (!resend) {
      console.error('📧 CRITICAL: RESEND_API_KEY not configured! Check Vercel env vars. Email NOT sent.');
      return { success: false, error: 'Email service not configured' };
    }

    const { data, error } = await resend.emails.send({
      from: `Auxite <${FROM_EMAIL}>`,
      to,
      subject,
      html,
    });

    if (error) {
      console.error(`📧 Resend API error for ${to}:`, error);
      throw new Error(error.message);
    }

    console.log(`📧 Email sent successfully to ${to}: id=${data?.id}`);
    return { success: true, id: data?.id };
  } catch (err: any) {
    console.error(`📧 Email service error for ${to}:`, err?.message || err);
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════
// INSTITUTIONAL EMAIL WRAPPER
// Swiss private bank style — minimal, dense, structured
// White background, black text, gold accent, serif typography
// ═══════════════════════════════════════════════════════════════

function institutionalEmailWrapper(content: string, deskName: string, language?: string): string {
  const dir = language === 'ar' ? 'rtl' : 'ltr';
  return `<!DOCTYPE html>
<html dir="${dir}" lang="${language || 'en'}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Georgia, 'Times New Roman', serif; background: #f5f5f5; margin: 0; padding: 20px; color: #1a1a1a; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; }
    .gold-line { height: 3px; background: #C5A55A; }
    .header {
      padding: 24px 30px 16px;
      border-bottom: 1px solid #e5e5e5;
    }
    .header h1 {
      font-size: 13px;
      letter-spacing: 5px;
      color: #1a1a1a;
      font-weight: 700;
      text-transform: uppercase;
      margin: 0 0 2px 0;
    }
    .header p {
      font-size: 11px;
      color: #888;
      margin: 0;
    }
    .body { padding: 28px 30px; }
    .body h2 {
      font-size: 16px;
      color: #1a1a1a;
      font-weight: 400;
      margin: 0 0 16px 0;
    }
    .body p {
      font-size: 13px;
      color: #444;
      line-height: 1.7;
      margin: 0 0 14px 0;
    }
    .greeting {
      font-size: 13px;
      color: #444;
      margin: 0 0 16px 0;
    }
    .detail-card {
      background: #fafafa;
      border-left: 3px solid #C5A55A;
      padding: 16px 18px;
      margin: 18px 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid #eee;
    }
    .detail-row:last-child { border-bottom: none; }
    .detail-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #888;
    }
    .detail-value {
      font-size: 12px;
      font-weight: 600;
      color: #1a1a1a;
      text-align: right;
    }
    .cta-button {
      display: inline-block;
      background: #1a1a1a;
      color: #fff;
      padding: 12px 24px;
      text-decoration: none;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin: 16px 0;
    }
    .notice {
      font-size: 11px;
      color: #888;
      font-style: italic;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid #eee;
    }
    .desk-sign {
      font-size: 12px;
      color: #666;
      font-style: italic;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #eee;
    }
    .master-footer-notice {
      font-size: 10px;
      color: #999;
      margin-top: 12px;
      font-style: italic;
    }
    .security-alert-box {
      background: #fef2f2;
      border-left: 3px solid #dc2626;
      padding: 16px 18px;
      margin: 18px 0;
    }
    .footer {
      padding: 16px 30px;
      border-top: 1px solid #e5e5e5;
      text-align: center;
    }
    .footer p {
      font-size: 9px;
      color: #aaa;
      margin: 4px 0;
    }
    .footer-gold { height: 2px; background: #C5A55A; }
  </style>
</head>
<body>
  <div class="container">
    <div class="gold-line"></div>
    <div class="header">
      <h1>Auxite</h1>
      <p>Custody &amp; Settlement Services</p>
    </div>
    <div class="body">
      ${content}

      <p class="desk-sign">${deskName}</p>
      <p class="master-footer-notice">This message serves as an operational confirmation and should be retained for your financial records.</p>
      ${language && language !== 'en' ? `<p class="master-footer-notice" style="margin-top: 8px;">This document is issued in the client's designated communication language. In case of conflict, the English version shall prevail.</p>` : ''}
    </div>
    <div class="footer">
      <p>Aurum Ledger Ltd &middot; Hong Kong</p>
      <p>This is an automated notification. Please do not reply.</p>
    </div>
    <div class="footer-gold"></div>
  </div>
</body>
</html>`;
}


// ═══════════════════════════════════════════════════════════════
// 1. TRADE EXECUTION CONFIRMATION
// Metal alim / satim sonrasi — VERY CRITICAL
// ═══════════════════════════════════════════════════════════════

export async function sendTradeExecutionEmail(
  to: string,
  data: {
    clientName?: string;
    transactionType: 'Buy' | 'Sell';
    metal: string;
    metalName: string;
    grams: string;
    executionPrice: string;
    grossConsideration: string;
    executionTime: string;
    referenceId: string;
    language?: string;
  }
) {
  const lang = data.language || 'en';
  const name = data.clientName || 'Client';

  const content: Record<string, Record<string, string>> = {
    en: {
      subject: `Trade Execution Confirmation — ${data.referenceId}`,
      greeting: `Dear ${name},`,
      intro: 'Your recent transaction has been successfully executed and recorded within the Auxite ledger.',
      txType: 'Transaction Type',
      metal: 'Metal',
      quantity: 'Quantity',
      execPrice: 'Execution Price',
      grossConsideration: 'Gross Consideration',
      execTime: 'Execution Time',
      refId: 'Reference ID',
      settlement: 'Settlement is currently in progress. Once completed, your updated balances will be reflected within your custody account.',
      executionOnly: 'Auxite operates an execution-only model and does not engage in proprietary trading against client flow.',
      unauthorized: 'If you did not authorize this transaction, please contact Auxite immediately.',
      viewLedger: 'View in Client Ledger',
      desk: 'Auxite Execution Desk',
    },
    tr: {
      subject: `Takas Onayı — ${data.referenceId}`,
      greeting: `Sayın ${name},`,
      intro: 'Son işleminiz başarıyla gerçekleştirilmiş ve Auxite defterine kaydedilmiştir.',
      txType: 'İşlem Türü',
      metal: 'Metal',
      quantity: 'Miktar',
      execPrice: 'Gerçekleştirme Fiyatı',
      grossConsideration: 'Brüt Tutar',
      execTime: 'Gerçekleştirme Zamanı',
      refId: 'Referans No',
      settlement: 'Takas işlemi şu anda devam etmektedir. Tamamlandığında, güncellenmiş bakiyeleriniz saklama hesabınıza yansıtılacaktır.',
      executionOnly: 'Auxite yalnızca emir gerçekleştirme modeliyle çalışır ve müşteri akışına karşı tescilli alım satım yapmaz.',
      unauthorized: 'Bu işlemi siz yetkilendirmediyseniz, lütfen derhal Auxite ile iletişime geçin.',
      viewLedger: 'Müşteri Defterinde Görüntüle',
      desk: 'Auxite Gerçekleştirme Masası',
    },
    de: {
      subject: `Handelsausführungsbestätigung — ${data.referenceId}`,
      greeting: `Sehr geehrte/r ${name},`,
      intro: 'Ihre letzte Transaktion wurde erfolgreich ausgeführt und im Auxite-Hauptbuch erfasst.',
      txType: 'Transaktionstyp',
      metal: 'Metall',
      quantity: 'Menge',
      execPrice: 'Ausführungspreis',
      grossConsideration: 'Bruttogegenleistung',
      execTime: 'Ausführungszeit',
      refId: 'Referenz-ID',
      settlement: 'Die Abwicklung ist derzeit in Bearbeitung. Nach Abschluss werden Ihre aktualisierten Salden in Ihrem Verwahrungskonto angezeigt.',
      executionOnly: 'Auxite arbeitet nach einem reinen Ausführungsmodell und betreibt keinen Eigenhandel gegen Kundenaufträge.',
      unauthorized: 'Falls Sie diese Transaktion nicht autorisiert haben, kontaktieren Sie bitte umgehend Auxite.',
      viewLedger: 'Im Kundenbuch anzeigen',
      desk: 'Auxite Ausführungsabteilung',
    },
    fr: {
      subject: `Confirmation d'exécution de transaction — ${data.referenceId}`,
      greeting: `Cher/Chère ${name},`,
      intro: 'Votre transaction récente a été exécutée avec succès et enregistrée dans le registre Auxite.',
      txType: 'Type de transaction',
      metal: 'Métal',
      quantity: 'Quantité',
      execPrice: 'Prix d\'exécution',
      grossConsideration: 'Contrepartie brute',
      execTime: 'Heure d\'exécution',
      refId: 'Référence',
      settlement: 'Le règlement est en cours. Une fois terminé, vos soldes mis à jour seront reflétés dans votre compte de garde.',
      executionOnly: 'Auxite fonctionne selon un modèle d\'exécution uniquement et ne pratique pas de trading propriétaire contre les flux clients.',
      unauthorized: 'Si vous n\'avez pas autorisé cette transaction, veuillez contacter Auxite immédiatement.',
      viewLedger: 'Voir dans le registre client',
      desk: 'Bureau d\'exécution Auxite',
    },
    ar: {
      subject: `تأكيد تنفيذ الصفقة — ${data.referenceId}`,
      greeting: `عزيزي ${name}،`,
      intro: 'تم تنفيذ معاملتك الأخيرة بنجاح وتسجيلها في دفتر Auxite.',
      txType: 'نوع المعاملة',
      metal: 'المعدن',
      quantity: 'الكمية',
      execPrice: 'سعر التنفيذ',
      grossConsideration: 'القيمة الإجمالية',
      execTime: 'وقت التنفيذ',
      refId: 'رقم المرجع',
      settlement: 'التسوية قيد التنفيذ حالياً. بمجرد الانتهاء، ستنعكس أرصدتك المحدثة في حساب الحفظ الخاص بك.',
      executionOnly: 'تعمل Auxite وفق نموذج التنفيذ فقط ولا تمارس التداول لحسابها الخاص ضد تدفقات العملاء.',
      unauthorized: 'إذا لم تقم بتفويض هذه المعاملة، يرجى الاتصال بـ Auxite فوراً.',
      viewLedger: 'عرض في دفتر العميل',
      desk: 'مكتب التنفيذ Auxite',
    },
    ru: {
      subject: `Подтверждение исполнения сделки — ${data.referenceId}`,
      greeting: `Уважаемый/ая ${name},`,
      intro: 'Ваша последняя транзакция была успешно исполнена и записана в реестр Auxite.',
      txType: 'Тип транзакции',
      metal: 'Металл',
      quantity: 'Количество',
      execPrice: 'Цена исполнения',
      grossConsideration: 'Валовое возмещение',
      execTime: 'Время исполнения',
      refId: 'Номер ссылки',
      settlement: 'Расчет в настоящее время выполняется. После завершения обновленные балансы отразятся в вашем счете хранения.',
      executionOnly: 'Auxite работает по модели исключительно исполнения и не занимается собственной торговлей против потока клиентов.',
      unauthorized: 'Если вы не авторизовали эту транзакцию, пожалуйста, немедленно свяжитесь с Auxite.',
      viewLedger: 'Посмотреть в клиентском реестре',
      desk: 'Отдел исполнения Auxite',
    },
  };
  const t = content[lang] || content.en;

  const emailContent = `
    <p class="greeting">${t.greeting}</p>
    <p>${t.intro}</p>

    <div class="detail-card">
      <div class="detail-row">
        <span class="detail-label">${t.txType}</span>
        <span class="detail-value">${data.transactionType}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.metal}</span>
        <span class="detail-value">${data.metalName} (${data.metal})</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.quantity}</span>
        <span class="detail-value">${data.grams}g</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.execPrice}</span>
        <span class="detail-value">${data.executionPrice}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.grossConsideration}</span>
        <span class="detail-value">${data.grossConsideration}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.execTime}</span>
        <span class="detail-value">${data.executionTime}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.refId}</span>
        <span class="detail-value">${data.referenceId}</span>
      </div>
    </div>

    <p>${t.settlement}</p>
    <p style="font-size: 12px; color: #666;">${t.executionOnly}</p>

    <a href="${VAULT_URL}/vault" class="cta-button">${t.viewLedger}</a>

    <div class="notice">${t.unauthorized}</div>
  `;

  return sendEmail({
    to,
    subject: t.subject,
    html: institutionalEmailWrapper(emailContent, t.desk, lang),
  });
}


// ═══════════════════════════════════════════════════════════════
// 2. METAL ALLOCATION CONFIRMATION (CERTIFICATE EMAIL)
// Bilingual: client language notice + English legal text always present
// ═══════════════════════════════════════════════════════════════

const certNoticeTranslations: Record<string, string> = {
  tr: 'Bu sertifika kriptografik olarak hashlenerek Base blockchain\'ine sabitlenmiştir. Bu belge elektronik olarak düzenlenmiş ve Auxite saklama defterine kaydedilmiştir.',
  de: 'Dieses Zertifikat wurde kryptografisch gehasht und auf der Base-Blockchain verankert. Dieses Dokument wurde elektronisch erstellt und im Verwahrungsbuch von Auxite erfasst.',
  fr: 'Ce certificat a été hashé cryptographiquement et ancré sur la blockchain Base. Ce document est émis électroniquement et enregistré dans le registre de conservation d\'Auxite.',
  ar: 'تم تشفير هذه الشهادة وتثبيتها على سلسلة Base. صدرت هذه الوثيقة إلكترونياً وسُجلت في سجل الحفظ لدى Auxite.',
  ru: 'Данный сертификат криптографически хеширован и закреплён на блокчейне Base. Данный документ выпущен в электронном виде и зафиксирован в реестре хранения Auxite.',
};

export async function sendCertificateEmail(
  to: string,
  certificateHtml: string,
  data: {
    certificateNumber: string;
    metal: string;
    metalName: string;
    grams: string;
    purity?: string;
    vaultLocation?: string;
    holderName?: string;
    language?: string;
  }
) {
  const lang = data.language || 'en';
  const name = data.holderName || 'Client';

  const content: Record<string, Record<string, string>> = {
    en: {
      subject: `Certificate of Metal Allocation — ${data.certificateNumber}`,
      greeting: `Dear ${name},`,
      intro: 'This is to confirm that the metals associated with your recent transaction have been fully allocated and are now held within independent custody structures for your benefit.',
      metal: 'Metal',
      quantity: 'Quantity',
      purity: 'Purity',
      vault: 'Vault Location',
      allocationType: 'Allocation Type',
      fullyAllocated: 'Fully Allocated',
      encumbrance: 'Encumbrance Status',
      none: 'None',
      certId: 'Certificate ID',
      balanceSheet: 'Title to the metals is held for your benefit and is not recorded on the balance sheet of Auxite.',
      certAvailable: 'Your allocation certificate is now available within your document vault.',
      viewCert: 'View Certificate',
      desk: 'Auxite Custody Operations',
    },
    tr: {
      subject: `Metal Tahsis Onayı — ${data.certificateNumber}`,
      greeting: `Sayın ${name},`,
      intro: 'Son işleminize bağlı metaller tam olarak tahsis edilmiş ve menfaatiniz için bağımsız saklama yapıları dahilinde tutulmaktadır.',
      metal: 'Metal',
      quantity: 'Miktar',
      purity: 'Saflık',
      vault: 'Kasa Lokasyonu',
      allocationType: 'Tahsis Türü',
      fullyAllocated: 'Tam Tahsisli',
      encumbrance: 'Teminat Durumu',
      none: 'Yok',
      certId: 'Sertifika No',
      balanceSheet: 'Metallerin mülkiyeti sizin menfaatinize tutulmakta olup Auxite bilançosunda kayıtlı değildir.',
      certAvailable: 'Tahsis sertifikanız artık belge kasanızda mevcuttur.',
      viewCert: 'Sertifikayı Görüntüle',
      desk: 'Auxite Saklama Operasyonları',
    },
    de: {
      subject: `Zertifikat der Metallzuteilung — ${data.certificateNumber}`,
      greeting: `Sehr geehrte/r ${name},`,
      intro: 'Hiermit bestätigen wir, dass die mit Ihrer letzten Transaktion verbundenen Metalle vollständig zugeteilt wurden und nun in unabhängigen Verwahrungsstrukturen zu Ihren Gunsten gehalten werden.',
      metal: 'Metall',
      quantity: 'Menge',
      purity: 'Reinheit',
      vault: 'Tresorstandort',
      allocationType: 'Zuteilungstyp',
      fullyAllocated: 'Vollständig zugeteilt',
      encumbrance: 'Belastungsstatus',
      none: 'Keine',
      certId: 'Zertifikat-ID',
      balanceSheet: 'Das Eigentum an den Metallen wird zu Ihren Gunsten gehalten und ist nicht in der Bilanz von Auxite erfasst.',
      certAvailable: 'Ihr Zuteilungszertifikat ist jetzt in Ihrem Dokumententresor verfügbar.',
      viewCert: 'Zertifikat anzeigen',
      desk: 'Auxite Verwahrungsabteilung',
    },
    fr: {
      subject: `Certificat d'allocation de métal — ${data.certificateNumber}`,
      greeting: `Cher/Chère ${name},`,
      intro: 'Nous confirmons que les métaux associés à votre transaction récente ont été entièrement alloués et sont désormais détenus dans des structures de garde indépendantes à votre bénéfice.',
      metal: 'Métal',
      quantity: 'Quantité',
      purity: 'Pureté',
      vault: 'Emplacement du coffre',
      allocationType: 'Type d\'allocation',
      fullyAllocated: 'Entièrement alloué',
      encumbrance: 'Statut de charge',
      none: 'Aucune',
      certId: 'ID du certificat',
      balanceSheet: 'Le titre de propriété des métaux est détenu à votre bénéfice et n\'est pas inscrit au bilan d\'Auxite.',
      certAvailable: 'Votre certificat d\'allocation est maintenant disponible dans votre coffre de documents.',
      viewCert: 'Voir le certificat',
      desk: 'Opérations de garde Auxite',
    },
    ar: {
      subject: `شهادة تخصيص المعدن — ${data.certificateNumber}`,
      greeting: `عزيزي ${name}،`,
      intro: 'نؤكد أن المعادن المرتبطة بمعاملتك الأخيرة قد تم تخصيصها بالكامل وهي الآن محتفظ بها ضمن هياكل حفظ مستقلة لصالحك.',
      metal: 'المعدن',
      quantity: 'الكمية',
      purity: 'النقاوة',
      vault: 'موقع الخزنة',
      allocationType: 'نوع التخصيص',
      fullyAllocated: 'مخصص بالكامل',
      encumbrance: 'حالة الرهن',
      none: 'لا يوجد',
      certId: 'رقم الشهادة',
      balanceSheet: 'ملكية المعادن محتفظ بها لصالحك وليست مسجلة في الميزانية العمومية لـ Auxite.',
      certAvailable: 'شهادة التخصيص الخاصة بك متاحة الآن في خزنة المستندات الخاصة بك.',
      viewCert: 'عرض الشهادة',
      desk: 'عمليات الحفظ Auxite',
    },
    ru: {
      subject: `Сертификат размещения металла — ${data.certificateNumber}`,
      greeting: `Уважаемый/ая ${name},`,
      intro: 'Настоящим подтверждаем, что металлы, связанные с вашей последней транзакцией, были полностью размещены и теперь хранятся в независимых структурах хранения в вашу пользу.',
      metal: 'Металл',
      quantity: 'Количество',
      purity: 'Чистота',
      vault: 'Расположение хранилища',
      allocationType: 'Тип размещения',
      fullyAllocated: 'Полностью размещено',
      encumbrance: 'Статус обременения',
      none: 'Отсутствует',
      certId: 'ID сертификата',
      balanceSheet: 'Право собственности на металлы удерживается в вашу пользу и не отражено в балансе Auxite.',
      certAvailable: 'Ваш сертификат размещения теперь доступен в вашем хранилище документов.',
      viewCert: 'Посмотреть сертификат',
      desk: 'Отдел хранения Auxite',
    },
  };
  const t = content[lang] || content.en;

  const emailContent = `
    <p class="greeting">${t.greeting}</p>
    <p>${t.intro}</p>

    <div class="detail-card">
      <div class="detail-row">
        <span class="detail-label">${t.metal}</span>
        <span class="detail-value">${data.metalName} (${data.metal})</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.quantity}</span>
        <span class="detail-value">${data.grams}g</span>
      </div>
      ${data.purity ? `
      <div class="detail-row">
        <span class="detail-label">${t.purity}</span>
        <span class="detail-value">${data.purity}</span>
      </div>
      ` : ''}
      ${data.vaultLocation ? `
      <div class="detail-row">
        <span class="detail-label">${t.vault}</span>
        <span class="detail-value">${data.vaultLocation}</span>
      </div>
      ` : ''}
      <div class="detail-row">
        <span class="detail-label">${t.allocationType}</span>
        <span class="detail-value">${t.fullyAllocated}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.encumbrance}</span>
        <span class="detail-value">${t.none}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.certId}</span>
        <span class="detail-value">${data.certificateNumber}</span>
      </div>
    </div>

    <p style="font-weight: 600; color: #1a1a1a;">${t.balanceSheet}</p>
    <p>${t.certAvailable}</p>

    <a href="${VAULT_URL}/api/certificates/pdf?certNumber=${data.certificateNumber}&metal=${data.metal}&format=html" class="cta-button">${t.viewCert}</a>

    <div class="notice">
      ${lang !== 'en' ? `${certNoticeTranslations[lang] || ''}<br><br>` : ''}This certificate has been cryptographically hashed and anchored on the Base blockchain.
      This document is electronically issued and recorded within Auxite's custody ledger.
    </div>
  `;

  return sendEmail({ to, subject: t.subject, html: institutionalEmailWrapper(emailContent, t.desk, lang) });
}


// ═══════════════════════════════════════════════════════════════
// 3. YIELD ENROLLMENT CONFIRMATION (STRUCTURED YIELD PARTICIPATION)
// Bilingual: client language notice + English legal text always present
// ═══════════════════════════════════════════════════════════════

const yieldNoticeTranslations: Record<string, string> = {
  tr: 'Yapılandırılmış getiri programlarına tahsis edilen metaller karşı taraf ve uzlaşma riskine tabi olabilir. Auxite sıkı karşı taraf seçimi ve risk kontrolü uygular. Bu belge elektronik olarak düzenlenmiş ve Auxite saklama defterine kaydedilmiştir.',
  de: 'Metalle, die strukturierten Ertragsprogrammen zugewiesen sind, können Gegenpartei- und Abwicklungsrisiken unterliegen. Auxite wendet strenge Gegenparteiauswahl und Risikokontrollen an. Dieses Dokument wurde elektronisch erstellt und im Verwahrungsbuch von Auxite erfasst.',
  fr: 'Les métaux engagés dans des programmes de rendement structuré peuvent être soumis à un risque de contrepartie et de règlement. Auxite maintient une sélection stricte des contreparties et des contrôles de risques. Ce document est émis électroniquement et enregistré dans le registre de conservation d\'Auxite.',
  ar: 'قد تخضع المعادن الملتزم بها في برامج العائد المهيكل لمخاطر الطرف المقابل والتسوية. تحافظ Auxite على اختيار صارم للأطراف المقابلة وضوابط المخاطر. صدرت هذه الوثيقة إلكترونياً وسُجلت في سجل الحفظ لدى Auxite.',
  ru: 'Металлы, выделенные в программы структурированной доходности, могут быть подвержены контрагентному и расчётному риску. Auxite применяет строгий отбор контрагентов и контроль рисков. Данный документ выпущен в электронном виде и зафиксирован в реестре хранения Auxite.',
};

export async function sendStakingAgreementEmail(
  to: string,
  agreementHtml: string,
  data: {
    agreementNo: string;
    stakeId: string;
    metal: string;
    metalName: string;
    amount: string;
    termLabel: string;
    apy: string;
    startDate: string;
    endDate: string;
    holderName?: string;
    language?: string;
  }
) {
  const lang = data.language || 'en';
  const name = data.holderName || 'Client';

  const metalLabel = data.metalName ? `${data.metalName} (${data.metal})` : data.metal;

  const content: Record<string, Record<string, string>> = {
    en: {
      subject: `Structured Yield Participation Notice — ${metalLabel}`,
      greeting: `Dear ${name},`,
      intro: 'This notice confirms your participation in an Auxite precious metals structured yield program.',
      metal: 'Metal',
      quantity: 'Committed Quantity',
      leaseRate: 'Yield Rate',
      effectiveDate: 'Effective Date',
      maturityDate: 'Maturity Date',
      tenor: 'Yield Tenor',
      returnSettlement: 'Return Settlement',
      atMaturity: 'At Maturity',
      encumbered: 'During the yield tenor, the referenced metals will be considered encumbered and may not be transferred or redeemed until maturity.',
      noteIssued: 'A formal Participation Note has been issued and is accessible within your document vault.',
      viewNote: 'View Participation Note',
      desk: 'Auxite Treasury & Structured Yield',
    },
    tr: {
      subject: `Yapılandırılmış Getiri Katılım Bildirimi — ${metalLabel}`,
      greeting: `Sayın ${name},`,
      intro: 'Bu bildirim, Auxite değerli metal yapılandırılmış getiri programına katılımınızı teyit eder.',
      metal: 'Metal',
      quantity: 'Taahhüt Edilen Miktar',
      leaseRate: 'Getiri Oranı',
      effectiveDate: 'Yürürlük Tarihi',
      maturityDate: 'Vade Tarihi',
      tenor: 'Getiri Vadesi',
      returnSettlement: 'Getiri Uzlaşması',
      atMaturity: 'Vade Sonunda',
      encumbered: 'Getiri süresi boyunca, referans verilen metaller teminatlı kabul edilecek ve vadeye kadar transfer edilemez veya itfa edilemeyecektir.',
      noteIssued: 'Resmi bir Katılım Notu düzenlenmiş olup belge kasanızda erişilebilir durumdadır.',
      viewNote: 'Katılım Notunu Görüntüle',
      desk: 'Auxite Hazine ve Yapılandırılmış Getiri',
    },
    de: {
      subject: `Mitteilung zur strukturierten Ertragspartizipation — ${metalLabel}`,
      greeting: `Sehr geehrte/r ${name},`,
      intro: 'Diese Mitteilung bestätigt Ihre Teilnahme an einem strukturierten Ertragsprogramm für Edelmetalle von Auxite.',
      metal: 'Metall',
      quantity: 'Zugesagte Menge',
      leaseRate: 'Ertragsrate',
      effectiveDate: 'Wirksamkeitsdatum',
      maturityDate: 'Fälligkeitsdatum',
      tenor: 'Ertragslaufzeit',
      returnSettlement: 'Ertragsabwicklung',
      atMaturity: 'Bei Fälligkeit',
      encumbered: 'Während der Ertragslaufzeit gelten die referenzierten Metalle als belastet und können bis zur Fälligkeit nicht übertragen oder eingelöst werden.',
      noteIssued: 'Eine formelle Partizipationsnote wurde ausgestellt und ist in Ihrem Dokumententresor zugänglich.',
      viewNote: 'Partizipationsnote anzeigen',
      desk: 'Auxite Treasury & Strukturierter Ertrag',
    },
    fr: {
      subject: `Avis de participation au rendement structuré — ${metalLabel}`,
      greeting: `Cher/Chère ${name},`,
      intro: 'Cet avis confirme votre participation à un programme de rendement structuré de métaux précieux Auxite.',
      metal: 'Métal',
      quantity: 'Quantité engagée',
      leaseRate: 'Taux de rendement',
      effectiveDate: 'Date d\'effet',
      maturityDate: 'Date d\'échéance',
      tenor: 'Durée du rendement',
      returnSettlement: 'Règlement du rendement',
      atMaturity: 'À l\'échéance',
      encumbered: 'Pendant la durée du rendement, les métaux référencés seront considérés comme grevés et ne pourront être transférés ou rachetés avant l\'échéance.',
      noteIssued: 'Une Note de Participation formelle a été émise et est accessible dans votre coffre de documents.',
      viewNote: 'Voir la Note de Participation',
      desk: 'Auxite Trésorerie & Rendement Structuré',
    },
    ar: {
      subject: `إشعار المشاركة في العائد المهيكل — ${metalLabel}`,
      greeting: `عزيزي ${name}،`,
      intro: 'يؤكد هذا الإشعار مشاركتك في برنامج العائد المهيكل للمعادن الثمينة من Auxite.',
      metal: 'المعدن',
      quantity: 'الكمية الملتزم بها',
      leaseRate: 'معدل العائد',
      effectiveDate: 'تاريخ السريان',
      maturityDate: 'تاريخ الاستحقاق',
      tenor: 'مدة العائد',
      returnSettlement: 'تسوية العائد',
      atMaturity: 'عند الاستحقاق',
      encumbered: 'خلال مدة العائد، ستعتبر المعادن المشار إليها مرهونة ولا يمكن تحويلها أو استردادها حتى الاستحقاق.',
      noteIssued: 'تم إصدار مذكرة مشاركة رسمية وهي متاحة في خزنة المستندات الخاصة بك.',
      viewNote: 'عرض مذكرة المشاركة',
      desk: 'خزينة Auxite والعائد المهيكل',
    },
    ru: {
      subject: `Уведомление об участии в структурированной доходности — ${metalLabel}`,
      greeting: `Уважаемый/ая ${name},`,
      intro: 'Настоящее уведомление подтверждает ваше участие в программе структурированной доходности по драгоценным металлам Auxite.',
      metal: 'Металл',
      quantity: 'Выделенное количество',
      leaseRate: 'Ставка доходности',
      effectiveDate: 'Дата вступления в силу',
      maturityDate: 'Дата погашения',
      tenor: 'Срок доходности',
      returnSettlement: 'Расчет доходности',
      atMaturity: 'При погашении',
      encumbered: 'В течение срока доходности указанные металлы будут считаться обремененными и не могут быть переведены или погашены до наступления срока.',
      noteIssued: 'Формальная Записка об Участии выпущена и доступна в вашем хранилище документов.',
      viewNote: 'Посмотреть Записку об Участии',
      desk: 'Казначейство Auxite и Структурированная Доходность',
    },
  };
  const t = content[lang] || content.en;

  const emailContent = `
    <p class="greeting">${t.greeting}</p>
    <p>${t.intro}</p>

    <div class="detail-card">
      <div class="detail-row">
        <span class="detail-label">${t.metal}</span>
        <span class="detail-value">${data.metalName} (${data.metal})</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.quantity}</span>
        <span class="detail-value">${data.amount}g</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.leaseRate}</span>
        <span class="detail-value">${data.apy}%</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.effectiveDate}</span>
        <span class="detail-value">${data.startDate}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.maturityDate}</span>
        <span class="detail-value">${data.endDate}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.tenor}</span>
        <span class="detail-value">${data.termLabel}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.returnSettlement}</span>
        <span class="detail-value">${t.atMaturity}</span>
      </div>
    </div>

    <p>${t.encumbered}</p>
    <p>${t.noteIssued}</p>

    <a href="${VAULT_URL}/api/staking/agreement?stakeId=${data.stakeId}" class="cta-button">${t.viewNote}</a>

    <div class="notice">
      ${lang !== 'en' ? `${yieldNoticeTranslations[lang] || ''}<br><br>` : ''}Metals committed to structured yield programs may be subject to counterparty and settlement risk.
      Auxite maintains strict counterparty selection and risk controls. This document is
      electronically issued and recorded within Auxite's custody ledger.
    </div>
  `;

  return sendEmail({ to, subject: t.subject, html: institutionalEmailWrapper(emailContent, t.desk, lang) });
}


// ═══════════════════════════════════════════════════════════════
// 4. YIELD DISTRIBUTION NOTICE
// Periodic yield credit — institutions love predictable income
// ═══════════════════════════════════════════════════════════════

export async function sendYieldDistributionEmail(
  to: string,
  data: {
    clientName?: string;
    metal: string;
    metalName: string;
    yieldRate: string;
    amountCredited: string;
    creditedAt: string;
    referenceId: string;
    language?: string;
  }
) {
  const lang = data.language || 'en';
  const name = data.clientName || 'Client';

  const content: Record<string, Record<string, string>> = {
    en: {
      subject: `Structured Yield Distribution Notice — ${data.referenceId}`,
      greeting: `Dear ${name},`,
      intro: 'Your scheduled yield distribution has been processed in accordance with your structured yield participation.',
      metal: 'Metal',
      leaseRate: 'Yield Rate',
      amountCredited: 'Amount Credited',
      settlementDate: 'Settlement Date',
      refId: 'Reference ID',
      reflected: 'The credited metals are now reflected within your allocated holdings.',
      viewLedger: 'View in Client Ledger',
      desk: 'Auxite Treasury & Structured Yield',
    },
    tr: {
      subject: `Yapılandırılmış Getiri Dağıtım Bildirimi — ${data.referenceId}`,
      greeting: `Sayın ${name},`,
      intro: 'Planlanmış getiri dağıtımınız, yapılandırılmış getiri katılımınız doğrultusunda işlenmiştir.',
      metal: 'Metal',
      leaseRate: 'Getiri Oranı',
      amountCredited: 'Yatırılan Miktar',
      settlementDate: 'Uzlaşma Tarihi',
      refId: 'Referans No',
      reflected: 'Yatırılan metaller artık tahsisli varlıklarınıza yansıtılmıştır.',
      viewLedger: 'Müşteri Defterinde Görüntüle',
      desk: 'Auxite Hazine ve Yapılandırılmış Getiri',
    },
    de: {
      subject: `Mitteilung zur strukturierten Ertragsverteilung — ${data.referenceId}`,
      greeting: `Sehr geehrte/r ${name},`,
      intro: 'Ihre planmäßige Ertragsverteilung wurde gemäß Ihrer strukturierten Ertragspartizipation verarbeitet.',
      metal: 'Metall',
      leaseRate: 'Ertragsrate',
      amountCredited: 'Gutgeschriebener Betrag',
      settlementDate: 'Abwicklungsdatum',
      refId: 'Referenz-ID',
      reflected: 'Die gutgeschriebenen Metalle sind jetzt in Ihren zugeteilten Beständen berücksichtigt.',
      viewLedger: 'Im Kundenbuch anzeigen',
      desk: 'Auxite Treasury & Strukturierter Ertrag',
    },
    fr: {
      subject: `Avis de distribution de rendement structuré — ${data.referenceId}`,
      greeting: `Cher/Chère ${name},`,
      intro: 'Votre distribution de rendement programmée a été traitée conformément à votre participation au rendement structuré.',
      metal: 'Métal',
      leaseRate: 'Taux de rendement',
      amountCredited: 'Montant crédité',
      settlementDate: 'Date de règlement',
      refId: 'Référence',
      reflected: 'Les métaux crédités sont maintenant reflétés dans vos avoirs alloués.',
      viewLedger: 'Voir dans le registre client',
      desk: 'Auxite Trésorerie & Rendement Structuré',
    },
    ar: {
      subject: `إشعار توزيع العائد المهيكل — ${data.referenceId}`,
      greeting: `عزيزي ${name}،`,
      intro: 'تمت معالجة توزيع العائد المجدول الخاص بك وفقاً لمشاركتك في العائد المهيكل.',
      metal: 'المعدن',
      leaseRate: 'معدل العائد',
      amountCredited: 'المبلغ المُضاف',
      settlementDate: 'تاريخ التسوية',
      refId: 'رقم المرجع',
      reflected: 'المعادن المُضافة تنعكس الآن في ممتلكاتك المخصصة.',
      viewLedger: 'عرض في دفتر العميل',
      desk: 'خزينة Auxite والعائد المهيكل',
    },
    ru: {
      subject: `Уведомление о распределении структурированной доходности — ${data.referenceId}`,
      greeting: `Уважаемый/ая ${name},`,
      intro: 'Ваше запланированное распределение доходности было обработано в соответствии с вашим участием в структурированной доходности.',
      metal: 'Металл',
      leaseRate: 'Ставка доходности',
      amountCredited: 'Зачисленная сумма',
      settlementDate: 'Дата расчета',
      refId: 'Номер ссылки',
      reflected: 'Зачисленные металлы теперь отражены в ваших размещенных активах.',
      viewLedger: 'Посмотреть в клиентском реестре',
      desk: 'Казначейство Auxite и Структурированная Доходность',
    },
  };
  const t = content[lang] || content.en;

  const emailContent = `
    <p class="greeting">${t.greeting}</p>
    <p>${t.intro}</p>

    <div class="detail-card">
      <div class="detail-row">
        <span class="detail-label">${t.metal}</span>
        <span class="detail-value">${data.metalName} (${data.metal})</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.leaseRate}</span>
        <span class="detail-value">${data.yieldRate}%</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.amountCredited}</span>
        <span class="detail-value">${data.amountCredited}g</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.settlementDate}</span>
        <span class="detail-value">${data.creditedAt}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.refId}</span>
        <span class="detail-value">${data.referenceId}</span>
      </div>
    </div>

    <p>${t.reflected}</p>

    <a href="${VAULT_URL}/vault" class="cta-button">${t.viewLedger}</a>
  `;

  return sendEmail({ to, subject: t.subject, html: institutionalEmailWrapper(emailContent, t.desk, lang) });
}


// ═══════════════════════════════════════════════════════════════
// 5. PHYSICAL REDEMPTION INITIATED
// Very institutional — delivery request processing
// ═══════════════════════════════════════════════════════════════

export async function sendRedemptionInitiatedEmail(
  to: string,
  data: {
    clientName?: string;
    metal: string;
    metalName: string;
    grams: string;
    vaultLocation: string;
    deliveryMethod: string;
    referenceId: string;
    language?: string;
  }
) {
  const lang = data.language || 'en';
  const name = data.clientName || 'Client';

  const content: Record<string, Record<string, string>> = {
    en: {
      subject: `Physical Redemption Initiated — ${data.referenceId}`,
      greeting: `Dear ${name},`,
      intro: 'Your request for physical redemption has been received and is currently being processed.',
      metal: 'Metal',
      quantity: 'Quantity',
      vault: 'Vault',
      deliveryMethod: 'Delivery Method',
      status: 'Status',
      preparingRelease: 'Preparing for Release',
      tracking: 'Once dispatched, tracking details will be provided.',
      encumbered: 'Please note that the referenced metals are now encumbered pending completion of delivery.',
      viewLedger: 'View in Client Ledger',
      desk: 'Auxite Custody Operations',
    },
    tr: {
      subject: `Fiziksel İtfa Başlatıldı — ${data.referenceId}`,
      greeting: `Sayın ${name},`,
      intro: 'Fiziksel itfa talebiniz alınmış ve şu anda işleme alınmaktadır.',
      metal: 'Metal',
      quantity: 'Miktar',
      vault: 'Kasa',
      deliveryMethod: 'Teslimat Yöntemi',
      status: 'Durum',
      preparingRelease: 'Serbest Bırakma Hazırlanıyor',
      tracking: 'Sevk edildiğinde, takip bilgileri sağlanacaktır.',
      encumbered: 'Referans verilen metaller teslimat tamamlanana kadar teminatlı kabul edilmektedir.',
      viewLedger: 'Müşteri Defterinde Görüntüle',
      desk: 'Auxite Saklama Operasyonları',
    },
    de: {
      subject: `Physische Einlösung eingeleitet — ${data.referenceId}`,
      greeting: `Sehr geehrte/r ${name},`,
      intro: 'Ihr Antrag auf physische Einlösung wurde empfangen und wird derzeit bearbeitet.',
      metal: 'Metall',
      quantity: 'Menge',
      vault: 'Tresor',
      deliveryMethod: 'Liefermethode',
      status: 'Status',
      preparingRelease: 'Freigabe wird vorbereitet',
      tracking: 'Nach dem Versand werden Ihnen Tracking-Details zur Verfügung gestellt.',
      encumbered: 'Bitte beachten Sie, dass die referenzierten Metalle bis zum Abschluss der Lieferung als belastet gelten.',
      viewLedger: 'Im Kundenbuch anzeigen',
      desk: 'Auxite Verwahrungsabteilung',
    },
    fr: {
      subject: `Rachat physique initié — ${data.referenceId}`,
      greeting: `Cher/Chère ${name},`,
      intro: 'Votre demande de rachat physique a été reçue et est actuellement en cours de traitement.',
      metal: 'Métal',
      quantity: 'Quantité',
      vault: 'Coffre',
      deliveryMethod: 'Méthode de livraison',
      status: 'Statut',
      preparingRelease: 'Préparation de la libération',
      tracking: 'Une fois expédié, les détails de suivi vous seront fournis.',
      encumbered: 'Veuillez noter que les métaux référencés sont désormais grevés en attendant la fin de la livraison.',
      viewLedger: 'Voir dans le registre client',
      desk: 'Opérations de garde Auxite',
    },
    ar: {
      subject: `تم بدء الاسترداد المادي — ${data.referenceId}`,
      greeting: `عزيزي ${name}،`,
      intro: 'تم استلام طلبك للاسترداد المادي وهو قيد المعالجة حالياً.',
      metal: 'المعدن',
      quantity: 'الكمية',
      vault: 'الخزنة',
      deliveryMethod: 'طريقة التسليم',
      status: 'الحالة',
      preparingRelease: 'جارٍ التحضير للإفراج',
      tracking: 'بمجرد الشحن، سيتم توفير تفاصيل التتبع.',
      encumbered: 'يرجى ملاحظة أن المعادن المشار إليها تعتبر الآن مرهونة حتى اكتمال التسليم.',
      viewLedger: 'عرض في دفتر العميل',
      desk: 'عمليات الحفظ Auxite',
    },
    ru: {
      subject: `Физическое погашение инициировано — ${data.referenceId}`,
      greeting: `Уважаемый/ая ${name},`,
      intro: 'Ваш запрос на физическое погашение получен и в настоящее время обрабатывается.',
      metal: 'Металл',
      quantity: 'Количество',
      vault: 'Хранилище',
      deliveryMethod: 'Способ доставки',
      status: 'Статус',
      preparingRelease: 'Подготовка к выпуску',
      tracking: 'После отправки будут предоставлены данные для отслеживания.',
      encumbered: 'Обратите внимание, что указанные металлы теперь обременены до завершения доставки.',
      viewLedger: 'Посмотреть в клиентском реестре',
      desk: 'Отдел хранения Auxite',
    },
  };
  const t = content[lang] || content.en;

  const emailContent = `
    <p class="greeting">${t.greeting}</p>
    <p>${t.intro}</p>

    <div class="detail-card">
      <div class="detail-row">
        <span class="detail-label">${t.metal}</span>
        <span class="detail-value">${data.metalName} (${data.metal})</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.quantity}</span>
        <span class="detail-value">${data.grams}g</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.vault}</span>
        <span class="detail-value">${data.vaultLocation}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.deliveryMethod}</span>
        <span class="detail-value">${data.deliveryMethod}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t.status}</span>
        <span class="detail-value">${t.preparingRelease}</span>
      </div>
    </div>

    <p>${t.tracking}</p>
    <p style="font-size: 12px; color: #666;">${t.encumbered}</p>

    <a href="${VAULT_URL}/vault" class="cta-button">${t.viewLedger}</a>
  `;

  return sendEmail({ to, subject: t.subject, html: institutionalEmailWrapper(emailContent, t.desk, lang) });
}


// ═══════════════════════════════════════════════════════════════
// 6. SECURITY ALERT — NON-NEGOTIABLE
// Whitelist addition, suspicious activity, etc.
// ═══════════════════════════════════════════════════════════════

export async function sendSecurityAlertEmail(
  to: string,
  data: {
    clientName?: string;
    event: string;
    asset?: string;
    address?: string;
    network?: string;
    timestamp: string;
    ipAddress?: string;
    language?: string;
  }
) {
  const lang = data.language || 'en';
  const name = data.clientName || 'Client';

  const content: Record<string, Record<string, string>> = {
    en: {
      subject: 'Security Notification — Account Activity Detected',
      greeting: `Dear ${name},`,
      intro: 'A new withdrawal destination has been added to your account.',
      event: 'Event',
      asset: 'Asset',
      address: 'Address',
      network: 'Network',
      addedAt: 'Added At',
      ipAddress: 'IP Address',
      unauthorized: 'If you did not authorize this change, please contact Auxite immediately.',
      delay: 'For security reasons, withdrawals to newly added addresses may be subject to a temporary delay.',
      desk: 'Auxite Security Team',
    },
    tr: {
      subject: 'Güvenlik Bildirimi — Hesap Etkinliği Tespit Edildi',
      greeting: `Sayın ${name},`,
      intro: 'Hesabınıza yeni bir çekim hedefi eklenmiştir.',
      event: 'Olay',
      asset: 'Varlık',
      address: 'Adres',
      network: 'Ağ',
      addedAt: 'Eklenme Zamanı',
      ipAddress: 'IP Adresi',
      unauthorized: 'Bu değişikliği siz yetkilendirmediyseniz, lütfen derhal Auxite ile iletişime geçin.',
      delay: 'Güvenlik nedenlerinden dolayı, yeni eklenen adreslere yapılacak çekimler geçici bir gecikmeye tabi olabilir.',
      desk: 'Auxite Güvenlik Ekibi',
    },
    de: {
      subject: 'Sicherheitsbenachrichtigung — Kontoaktivität erkannt',
      greeting: `Sehr geehrte/r ${name},`,
      intro: 'Ein neues Auszahlungsziel wurde Ihrem Konto hinzugefügt.',
      event: 'Ereignis',
      asset: 'Vermögenswert',
      address: 'Adresse',
      network: 'Netzwerk',
      addedAt: 'Hinzugefügt am',
      ipAddress: 'IP-Adresse',
      unauthorized: 'Falls Sie diese Änderung nicht autorisiert haben, kontaktieren Sie bitte umgehend Auxite.',
      delay: 'Aus Sicherheitsgründen können Auszahlungen an neu hinzugefügte Adressen einer vorübergehenden Verzögerung unterliegen.',
      desk: 'Auxite Sicherheitsteam',
    },
    fr: {
      subject: 'Notification de sécurité — Activité de compte détectée',
      greeting: `Cher/Chère ${name},`,
      intro: 'Une nouvelle destination de retrait a été ajoutée à votre compte.',
      event: 'Événement',
      asset: 'Actif',
      address: 'Adresse',
      network: 'Réseau',
      addedAt: 'Ajouté le',
      ipAddress: 'Adresse IP',
      unauthorized: 'Si vous n\'avez pas autorisé ce changement, veuillez contacter Auxite immédiatement.',
      delay: 'Pour des raisons de sécurité, les retraits vers des adresses nouvellement ajoutées peuvent être soumis à un délai temporaire.',
      desk: 'Équipe de sécurité Auxite',
    },
    ar: {
      subject: 'إشعار أمني — تم اكتشاف نشاط في الحساب',
      greeting: `عزيزي ${name}،`,
      intro: 'تمت إضافة وجهة سحب جديدة إلى حسابك.',
      event: 'الحدث',
      asset: 'الأصل',
      address: 'العنوان',
      network: 'الشبكة',
      addedAt: 'تاريخ الإضافة',
      ipAddress: 'عنوان IP',
      unauthorized: 'إذا لم تقم بتفويض هذا التغيير، يرجى الاتصال بـ Auxite فوراً.',
      delay: 'لأسباب أمنية، قد تخضع عمليات السحب إلى العناوين المضافة حديثاً لتأخير مؤقت.',
      desk: 'فريق أمان Auxite',
    },
    ru: {
      subject: 'Уведомление безопасности — Обнаружена активность аккаунта',
      greeting: `Уважаемый/ая ${name},`,
      intro: 'Новый адрес для вывода средств был добавлен в ваш аккаунт.',
      event: 'Событие',
      asset: 'Актив',
      address: 'Адрес',
      network: 'Сеть',
      addedAt: 'Добавлено',
      ipAddress: 'IP-адрес',
      unauthorized: 'Если вы не авторизовали это изменение, пожалуйста, немедленно свяжитесь с Auxite.',
      delay: 'По соображениям безопасности выводы на недавно добавленные адреса могут подвергаться временной задержке.',
      desk: 'Команда безопасности Auxite',
    },
  };
  const t = content[lang] || content.en;

  const emailContent = `
    <p class="greeting">${t.greeting}</p>
    <p>${t.intro}</p>

    <div class="security-alert-box">
      <div class="detail-row">
        <span class="detail-label">${t.event}</span>
        <span class="detail-value">${data.event}</span>
      </div>
      ${data.asset ? `
      <div class="detail-row">
        <span class="detail-label">${t.asset}</span>
        <span class="detail-value">${data.asset}</span>
      </div>
      ` : ''}
      ${data.address ? `
      <div class="detail-row">
        <span class="detail-label">${t.address}</span>
        <span class="detail-value" style="font-size: 10px;">${data.address}</span>
      </div>
      ` : ''}
      ${data.network ? `
      <div class="detail-row">
        <span class="detail-label">${t.network}</span>
        <span class="detail-value">${data.network}</span>
      </div>
      ` : ''}
      <div class="detail-row">
        <span class="detail-label">${t.addedAt}</span>
        <span class="detail-value">${data.timestamp}</span>
      </div>
      ${data.ipAddress ? `
      <div class="detail-row">
        <span class="detail-label">${t.ipAddress}</span>
        <span class="detail-value">${data.ipAddress}</span>
      </div>
      ` : ''}
    </div>

    <p style="font-weight: 600; color: #dc2626;">${t.unauthorized}</p>
    <p style="font-size: 12px; color: #666;">${t.delay}</p>
  `;

  return sendEmail({ to, subject: t.subject, html: institutionalEmailWrapper(emailContent, t.desk, lang) });
}
