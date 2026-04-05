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
  const logoUrl = `${VAULT_URL}/auxite-logo-new.png`;
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
    .header p {
      font-size: 11px;
      color: #888;
      margin: 6px 0 0 0;
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
      padding: 4px 0;
      margin: 18px 0;
    }
    .detail-card table {
      width: 100%;
      border-collapse: collapse;
    }
    .detail-card td {
      padding: 8px 18px;
      border-bottom: 1px solid #eee;
      vertical-align: middle;
    }
    .detail-card tr:last-child td {
      border-bottom: none;
    }
    .detail-label {
      font-size: 10px;
      letter-spacing: 1px;
      color: #888;
      width: 45%;
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
      color: #fff !important;
      padding: 12px 24px;
      text-decoration: none;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 1px;
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
      padding: 4px 0;
      margin: 18px 0;
    }
    .security-alert-box table {
      width: 100%;
      border-collapse: collapse;
    }
    .security-alert-box td {
      padding: 8px 18px;
      border-bottom: 1px solid #fecaca;
      vertical-align: middle;
    }
    .security-alert-box tr:last-child td {
      border-bottom: none;
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
      <img src="${logoUrl}" alt="Auxite" width="120" height="36" style="display: block; width: 120px; height: auto;" />
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

    <div class="detail-card"><table>
      <tr>
        <td class="detail-label">${t.txType}</td>
        <td class="detail-value">${data.transactionType}</td>
      </tr>
      <tr>
        <td class="detail-label">${t.metal}</td>
        <td class="detail-value">${data.metalName} (${data.metal})</td>
      </tr>
      <tr>
        <td class="detail-label">${t.quantity}</td>
        <td class="detail-value">${data.grams}g</td>
      </tr>
      <tr>
        <td class="detail-label">${t.execPrice}</td>
        <td class="detail-value">${data.executionPrice}</td>
      </tr>
      <tr>
        <td class="detail-label">${t.grossConsideration}</td>
        <td class="detail-value">${data.grossConsideration}</td>
      </tr>
      <tr>
        <td class="detail-label">${t.execTime}</td>
        <td class="detail-value">${data.executionTime}</td>
      </tr>
      <tr>
        <td class="detail-label">${t.refId}</td>
        <td class="detail-value">${data.referenceId}</td>
      </tr>
    </table></div>

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

    <div class="detail-card"><table>
      <tr>
        <td class="detail-label">${t.metal}</td>
        <td class="detail-value">${data.metalName} (${data.metal})</td>
      </tr>
      <tr>
        <td class="detail-label">${t.quantity}</td>
        <td class="detail-value">${data.grams}g</td>
      </tr>
      ${data.purity ? `
      <tr>
        <td class="detail-label">${t.purity}</td>
        <td class="detail-value">${data.purity}</td>
      </tr>
      ` : ''}
      ${data.vaultLocation ? `
      <tr>
        <td class="detail-label">${t.vault}</td>
        <td class="detail-value">${data.vaultLocation}</td>
      </tr>
      ` : ''}
      <tr>
        <td class="detail-label">${t.allocationType}</td>
        <td class="detail-value">${t.fullyAllocated}</td>
      </tr>
      <tr>
        <td class="detail-label">${t.encumbrance}</td>
        <td class="detail-value">${t.none}</td>
      </tr>
      <tr>
        <td class="detail-label">${t.certId}</td>
        <td class="detail-value">${data.certificateNumber}</td>
      </tr>
    </table></div>

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

    <div class="detail-card"><table>
      <tr>
        <td class="detail-label">${t.metal}</td>
        <td class="detail-value">${data.metalName} (${data.metal})</td>
      </tr>
      <tr>
        <td class="detail-label">${t.quantity}</td>
        <td class="detail-value">${data.amount}g</td>
      </tr>
      <tr>
        <td class="detail-label">${t.leaseRate}</td>
        <td class="detail-value">${data.apy}%</td>
      </tr>
      <tr>
        <td class="detail-label">${t.effectiveDate}</td>
        <td class="detail-value">${data.startDate}</td>
      </tr>
      <tr>
        <td class="detail-label">${t.maturityDate}</td>
        <td class="detail-value">${data.endDate}</td>
      </tr>
      <tr>
        <td class="detail-label">${t.tenor}</td>
        <td class="detail-value">${data.termLabel}</td>
      </tr>
      <tr>
        <td class="detail-label">${t.returnSettlement}</td>
        <td class="detail-value">${t.atMaturity}</td>
      </tr>
    </table></div>

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

    <div class="detail-card"><table>
      <tr>
        <td class="detail-label">${t.metal}</td>
        <td class="detail-value">${data.metalName} (${data.metal})</td>
      </tr>
      <tr>
        <td class="detail-label">${t.leaseRate}</td>
        <td class="detail-value">${data.yieldRate}%</td>
      </tr>
      <tr>
        <td class="detail-label">${t.amountCredited}</td>
        <td class="detail-value">${data.amountCredited}g</td>
      </tr>
      <tr>
        <td class="detail-label">${t.settlementDate}</td>
        <td class="detail-value">${data.creditedAt}</td>
      </tr>
      <tr>
        <td class="detail-label">${t.refId}</td>
        <td class="detail-value">${data.referenceId}</td>
      </tr>
    </table></div>

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

    <div class="detail-card"><table>
      <tr>
        <td class="detail-label">${t.metal}</td>
        <td class="detail-value">${data.metalName} (${data.metal})</td>
      </tr>
      <tr>
        <td class="detail-label">${t.quantity}</td>
        <td class="detail-value">${data.grams}g</td>
      </tr>
      <tr>
        <td class="detail-label">${t.vault}</td>
        <td class="detail-value">${data.vaultLocation}</td>
      </tr>
      <tr>
        <td class="detail-label">${t.deliveryMethod}</td>
        <td class="detail-value">${data.deliveryMethod}</td>
      </tr>
      <tr>
        <td class="detail-label">${t.status}</td>
        <td class="detail-value">${t.preparingRelease}</td>
      </tr>
    </table></div>

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

    <div class="security-alert-box"><table>
      <tr>
        <td class="detail-label">${t.event}</td>
        <td class="detail-value">${data.event}</td>
      </tr>
      ${data.asset ? `
      <tr>
        <td class="detail-label">${t.asset}</td>
        <td class="detail-value">${data.asset}</td>
      </tr>
      ` : ''}
      ${data.address ? `
      <tr>
        <td class="detail-label">${t.address}</td>
        <td class="detail-value" style="font-size: 10px;">${data.address}</td>
      </tr>
      ` : ''}
      ${data.network ? `
      <tr>
        <td class="detail-label">${t.network}</td>
        <td class="detail-value">${data.network}</td>
      </tr>
      ` : ''}
      <tr>
        <td class="detail-label">${t.addedAt}</td>
        <td class="detail-value">${data.timestamp}</td>
      </tr>
      ${data.ipAddress ? `
      <tr>
        <td class="detail-label">${t.ipAddress}</td>
        <td class="detail-value">${data.ipAddress}</td>
      </tr>
      ` : ''}
    </table></div>

    <p style="font-weight: 600; color: #dc2626;">${t.unauthorized}</p>
    <p style="font-size: 12px; color: #666;">${t.delay}</p>
  `;

  return sendEmail({ to, subject: t.subject, html: institutionalEmailWrapper(emailContent, t.desk, lang) });
}

// ═══════════════════════════════════════════════════════════════
// KYC VERIFICATION RESULT EMAIL
// ═══════════════════════════════════════════════════════════════

export async function sendKYCApprovalEmail(
  to: string,
  data: {
    clientName?: string;
    level: string;
    verifiedAt: string;
    language?: string;
  }
) {
  const lang = data.language || 'en';
  const name = data.clientName || 'Client';

  const content: Record<string, Record<string, string>> = {
    en: {
      subject: 'Identity Verification Approved — Account Upgraded',
      greeting: `Dear ${name},`,
      intro: 'Your identity verification has been successfully completed. Your account has been upgraded with enhanced transaction limits.',
      statusLabel: 'Verification Status',
      statusValue: 'Approved',
      levelLabel: 'Account Level',
      verifiedAtLabel: 'Verified At',
      limitsTitle: 'Your new transaction limits are now active. You may view your updated limits within your account settings.',
      cta: 'View Account',
      desk: 'Auxite Compliance Desk',
    },
    tr: {
      subject: 'Kimlik Dogrulama Onaylandi — Hesap Yukseltildi',
      greeting: `Sayin ${name},`,
      intro: 'Kimlik dogrulamaniz basariyla tamamlanmistir. Hesabiniz artirilmis islem limitleriyle yukseltilmistir.',
      statusLabel: 'Dogrulama Durumu',
      statusValue: 'Onaylandi',
      levelLabel: 'Hesap Seviyesi',
      verifiedAtLabel: 'Dogrulama Tarihi',
      limitsTitle: 'Yeni islem limitleriniz artik aktiftir. Guncellenmis limitlerinizi hesap ayarlarinizdan goruntuleyebilirsiniz.',
      cta: 'Hesabi Goruntule',
      desk: 'Auxite Uyum Masasi',
    },
    de: {
      subject: 'Identitaetsverifizierung genehmigt — Konto aufgewertet',
      greeting: `Sehr geehrte/r ${name},`,
      intro: 'Ihre Identitaetsverifizierung wurde erfolgreich abgeschlossen. Ihr Konto wurde mit erweiterten Transaktionslimits aufgewertet.',
      statusLabel: 'Verifizierungsstatus',
      statusValue: 'Genehmigt',
      levelLabel: 'Kontostufe',
      verifiedAtLabel: 'Verifiziert am',
      limitsTitle: 'Ihre neuen Transaktionslimits sind jetzt aktiv. Sie koennen Ihre aktualisierten Limits in Ihren Kontoeinstellungen einsehen.',
      cta: 'Konto anzeigen',
      desk: 'Auxite Compliance-Abteilung',
    },
    fr: {
      subject: "Verification d'identite approuvee — Compte mis a niveau",
      greeting: `Cher/Chere ${name},`,
      intro: "Votre verification d'identite a ete completee avec succes. Votre compte a ete mis a niveau avec des limites de transaction ameliorees.",
      statusLabel: 'Statut de verification',
      statusValue: 'Approuve',
      levelLabel: 'Niveau du compte',
      verifiedAtLabel: 'Verifie le',
      limitsTitle: 'Vos nouvelles limites de transaction sont maintenant actives. Vous pouvez consulter vos limites mises a jour dans les parametres de votre compte.',
      cta: 'Voir le compte',
      desk: 'Bureau de conformite Auxite',
    },
    ar: {
      subject: 'تمت الموافقة على التحقق من الهوية — تمت ترقية الحساب',
      greeting: `عزيزي ${name}،`,
      intro: 'تم إكمال التحقق من هويتك بنجاح. تمت ترقية حسابك بحدود معاملات محسنة.',
      statusLabel: 'حالة التحقق',
      statusValue: 'تمت الموافقة',
      levelLabel: 'مستوى الحساب',
      verifiedAtLabel: 'تاريخ التحقق',
      limitsTitle: 'حدود معاملاتك الجديدة نشطة الآن. يمكنك عرض حدودك المحدثة في إعدادات حسابك.',
      cta: 'عرض الحساب',
      desk: 'مكتب الامتثال Auxite',
    },
    ru: {
      subject: 'Верификация личности одобрена — Аккаунт обновлен',
      greeting: `Уважаемый/ая ${name},`,
      intro: 'Верификация вашей личности успешно завершена. Ваш аккаунт обновлен с увеличенными лимитами транзакций.',
      statusLabel: 'Статус верификации',
      statusValue: 'Одобрено',
      levelLabel: 'Уровень аккаунта',
      verifiedAtLabel: 'Дата верификации',
      limitsTitle: 'Ваши новые лимиты транзакций теперь активны. Вы можете просмотреть обновленные лимиты в настройках аккаунта.',
      cta: 'Просмотр аккаунта',
      desk: 'Отдел комплаенса Auxite',
    },
  };
  const t = content[lang] || content.en;

  const levelDisplay: Record<string, string> = {
    verified: 'Verified', enhanced: 'Enhanced', basic: 'Basic',
  };

  const emailContent = `
    <p class="greeting">${t.greeting}</p>
    <p>${t.intro}</p>

    <div class="detail-card"><table>
      <tr>
        <td class="detail-label">${t.statusLabel}</td>
        <td class="detail-value" style="color: #16a34a;">&#10003; ${t.statusValue}</td>
      </tr>
      <tr>
        <td class="detail-label">${t.levelLabel}</td>
        <td class="detail-value">${levelDisplay[data.level] || data.level}</td>
      </tr>
      <tr>
        <td class="detail-label">${t.verifiedAtLabel}</td>
        <td class="detail-value">${data.verifiedAt}</td>
      </tr>
    </table></div>

    <p>${t.limitsTitle}</p>

    <a href="https://vault.auxite.io/profile" class="cta-button">${t.cta}</a>
  `;

  return sendEmail({ to, subject: t.subject, html: institutionalEmailWrapper(emailContent, t.desk, lang) });
}

export async function sendKYCRejectionEmail(
  to: string,
  data: {
    clientName?: string;
    reason?: string;
    language?: string;
  }
) {
  const lang = data.language || 'en';
  const name = data.clientName || 'Client';

  const content: Record<string, Record<string, string>> = {
    en: {
      subject: 'Identity Verification Update — Action Required',
      greeting: `Dear ${name},`,
      intro: 'Unfortunately, your identity verification could not be completed at this time. Please review the details below and resubmit your documents.',
      statusLabel: 'Verification Status',
      statusValue: 'Not Approved',
      reasonLabel: 'Reason',
      action: 'You may resubmit your verification at any time through your account settings. Ensure all documents are clear, valid, and match your personal information.',
      cta: 'Retry Verification',
      desk: 'Auxite Compliance Desk',
    },
    tr: {
      subject: 'Kimlik Dogrulama Guncellemesi — Islem Gerekiyor',
      greeting: `Sayin ${name},`,
      intro: 'Maalesef kimlik dogrulamaniz su anda tamamlanamamistir. Lutfen asagidaki detaylari inceleyip belgelerinizi yeniden gonderin.',
      statusLabel: 'Dogrulama Durumu',
      statusValue: 'Onaylanmadi',
      reasonLabel: 'Sebep',
      action: 'Dogrulamanizi hesap ayarlarinizdan istediginiz zaman yeniden gonderebilirsiniz. Tum belgelerin net, gecerli ve kisisel bilgilerinizle eslestiklerinden emin olun.',
      cta: 'Dogrulamayi Yeniden Dene',
      desk: 'Auxite Uyum Masasi',
    },
    de: {
      subject: 'Identitaetsverifizierung — Aktion erforderlich',
      greeting: `Sehr geehrte/r ${name},`,
      intro: 'Leider konnte Ihre Identitaetsverifizierung derzeit nicht abgeschlossen werden. Bitte ueberpruefen Sie die Details und reichen Sie Ihre Dokumente erneut ein.',
      statusLabel: 'Verifizierungsstatus',
      statusValue: 'Nicht genehmigt',
      reasonLabel: 'Grund',
      action: 'Sie koennen Ihre Verifizierung jederzeit ueber Ihre Kontoeinstellungen erneut einreichen.',
      cta: 'Verifizierung wiederholen',
      desk: 'Auxite Compliance-Abteilung',
    },
    fr: {
      subject: "Verification d'identite — Action requise",
      greeting: `Cher/Chere ${name},`,
      intro: "Malheureusement, votre verification d'identite n'a pas pu etre completee. Veuillez consulter les details ci-dessous et soumettre a nouveau vos documents.",
      statusLabel: 'Statut de verification',
      statusValue: 'Non approuve',
      reasonLabel: 'Raison',
      action: 'Vous pouvez soumettre a nouveau votre verification a tout moment via les parametres de votre compte.',
      cta: 'Reessayer la verification',
      desk: 'Bureau de conformite Auxite',
    },
    ar: {
      subject: 'تحديث التحقق من الهوية — إجراء مطلوب',
      greeting: `عزيزي ${name}،`,
      intro: 'للأسف، لم يتم إكمال التحقق من هويتك في هذا الوقت. يرجى مراجعة التفاصيل أدناه وإعادة تقديم مستنداتك.',
      statusLabel: 'حالة التحقق',
      statusValue: 'غير موافق عليه',
      reasonLabel: 'السبب',
      action: 'يمكنك إعادة تقديم التحقق في أي وقت من خلال إعدادات حسابك.',
      cta: 'إعادة محاولة التحقق',
      desk: 'مكتب الامتثال Auxite',
    },
    ru: {
      subject: 'Обновление верификации — Требуется действие',
      greeting: `Уважаемый/ая ${name},`,
      intro: 'К сожалению, верификация вашей личности не может быть завершена. Пожалуйста, ознакомьтесь с деталями ниже и повторно отправьте документы.',
      statusLabel: 'Статус верификации',
      statusValue: 'Не одобрено',
      reasonLabel: 'Причина',
      action: 'Вы можете повторно отправить верификацию в любое время через настройки аккаунта.',
      cta: 'Повторить верификацию',
      desk: 'Отдел комплаенса Auxite',
    },
  };
  const t = content[lang] || content.en;

  const emailContent = `
    <p class="greeting">${t.greeting}</p>
    <p>${t.intro}</p>

    <div class="detail-card"><table>
      <tr>
        <td class="detail-label">${t.statusLabel}</td>
        <td class="detail-value" style="color: #dc2626;">&#10007; ${t.statusValue}</td>
      </tr>
      ${data.reason ? `
      <tr>
        <td class="detail-label">${t.reasonLabel}</td>
        <td class="detail-value">${data.reason}</td>
      </tr>
      ` : ''}
    </table></div>

    <p>${t.action}</p>

    <a href="https://vault.auxite.io/profile" class="cta-button">${t.cta}</a>
  `;

  return sendEmail({ to, subject: t.subject, html: institutionalEmailWrapper(emailContent, t.desk, lang) });
}

// ─── EARLY ACCESS BONUS NOTIFICATION ─────────────────────────────────────────
export async function sendEarlyAccessBonusEmail(
  to: string,
  data: {
    clientName?: string;
    bonusAmount: string;
    bonusAsset: string;
    unlockThreshold: string;
    expiryDays: string;
    language?: string;
  }
) {
  const lang = data.language || 'en';
  const name = data.clientName || 'Client';

  const content: Record<string, Record<string, string>> = {
    en: {
      subject: 'Early Access Bonus — Terms & Conditions',
      greeting: `Dear ${name},`,
      intro: `Thank you for joining the Auxite Early Access programme. As part of this initiative, a promotional allocation of ${data.bonusAmount} ${data.bonusAsset} has been credited to your custody account.`,
      detailsTitle: 'Bonus Allocation Details',
      amountLabel: 'Credited Amount',
      amountValue: `${data.bonusAmount} ${data.bonusAsset}`,
      statusLabel: 'Status',
      statusValue: 'Restricted — Platform Use Only',
      conditionsTitle: 'Terms of Use',
      cond1: `This allocation is designated exclusively for platform-internal operations. You may convert ${data.bonusAsset} into other precious metal tokens (AUXG, AUXS, AUXPT, AUXPD) within the Auxite platform.`,
      cond2: 'This promotional allocation is non-transferable. It cannot be withdrawn, sent to an external wallet, or transferred to another Auxite account.',
      cond3: `The allocation will be fully unlocked and become unrestricted once your account reaches a cumulative investment threshold of ${data.unlockThreshold} ${data.bonusAsset} or equivalent in precious metal tokens.`,
      cond4: `This promotional allocation is valid for ${data.expiryDays} days from the date of issuance. Unused balances will expire after this period.`,
      closing: 'Auxite reserves the right to modify or discontinue this programme at its discretion. Should you have any questions regarding these terms, please do not hesitate to contact our client services team.',
      cta: 'Access Your Account',
      desk: 'Auxite Client Services',
    },
    tr: {
      subject: 'Erken Erişim Bonusu — Şartlar ve Koşullar',
      greeting: `Sayın ${name},`,
      intro: `Auxite Erken Erişim programına katıldığınız için teşekkür ederiz. Bu girişim kapsamında saklama hesabınıza ${data.bonusAmount} ${data.bonusAsset} tutarında promosyon tahsisi yapılmıştır.`,
      detailsTitle: 'Bonus Tahsis Detayları',
      amountLabel: 'Tahsis Edilen Tutar',
      amountValue: `${data.bonusAmount} ${data.bonusAsset}`,
      statusLabel: 'Durum',
      statusValue: 'Kısıtlı — Yalnızca Platform İçi Kullanım',
      conditionsTitle: 'Kullanım Şartları',
      cond1: `Bu tahsis yalnızca platform içi işlemler için ayrılmıştır. ${data.bonusAsset} tokeni, Auxite platformu dahilinde diğer kıymetli metal tokenlerine (AUXG, AUXS, AUXPT, AUXPD) dönüştürülebilir.`,
      cond2: 'Bu promosyon tahsisi devredilemez niteliktedir. Çekilemez, harici bir cüzdana gönderilemez veya başka bir Auxite hesabına aktarılamaz.',
      cond3: `Hesabınızda kümülatif yatırım tutarı ${data.unlockThreshold} ${data.bonusAsset} veya muadili kıymetli metal tokenine ulaştığında, tahsis tamamen serbest bırakılacak ve kısıtlamalar kaldırılacaktır.`,
      cond4: `Bu promosyon tahsisi, verildiği tarihten itibaren ${data.expiryDays} gün süreyle geçerlidir. Bu süre sonunda kullanılmayan bakiyeler sona erecektir.`,
      closing: 'Auxite, bu programı kendi takdirine bağlı olarak değiştirme veya sonlandırma hakkını saklı tutar. Bu şartlarla ilgili herhangi bir sorunuz olması halinde müşteri hizmetleri ekibimizle iletişime geçmekten çekinmeyin.',
      cta: 'Hesabınıza Erişin',
      desk: 'Auxite Müşteri Hizmetleri',
    },
    de: {
      subject: 'Early-Access-Bonus — Allgemeine Geschäftsbedingungen',
      greeting: `Sehr geehrte/r ${name},`,
      intro: `Vielen Dank für Ihre Teilnahme am Auxite Early-Access-Programm. Im Rahmen dieser Initiative wurde Ihrem Verwahrungskonto eine Werbeprämie von ${data.bonusAmount} ${data.bonusAsset} gutgeschrieben.`,
      detailsTitle: 'Bonus-Zuteilungsdetails',
      amountLabel: 'Gutgeschriebener Betrag',
      amountValue: `${data.bonusAmount} ${data.bonusAsset}`,
      statusLabel: 'Status',
      statusValue: 'Eingeschränkt — Nur Plattforminterne Nutzung',
      conditionsTitle: 'Nutzungsbedingungen',
      cond1: `Diese Zuteilung ist ausschließlich für plattforminterne Operationen bestimmt. Sie können ${data.bonusAsset} innerhalb der Auxite-Plattform in andere Edelmetall-Token (AUXG, AUXS, AUXPT, AUXPD) umtauschen.`,
      cond2: 'Diese Werbeprämie ist nicht übertragbar. Sie kann nicht abgehoben, an eine externe Wallet gesendet oder auf ein anderes Auxite-Konto übertragen werden.',
      cond3: `Die Zuteilung wird vollständig freigeschaltet, sobald Ihr Konto eine kumulative Investitionsschwelle von ${data.unlockThreshold} ${data.bonusAsset} oder gleichwertige Edelmetall-Token erreicht.`,
      cond4: `Diese Werbeprämie ist ab dem Ausstellungsdatum ${data.expiryDays} Tage gültig. Nicht genutzte Guthaben verfallen nach diesem Zeitraum.`,
      closing: 'Auxite behält sich das Recht vor, dieses Programm nach eigenem Ermessen zu ändern oder einzustellen. Bei Fragen zu diesen Bedingungen wenden Sie sich bitte an unser Kundenservice-Team.',
      cta: 'Auf Ihr Konto zugreifen',
      desk: 'Auxite Kundenservice',
    },
    fr: {
      subject: 'Bonus Early Access — Termes et Conditions',
      greeting: `Cher/Chère ${name},`,
      intro: `Merci d'avoir rejoint le programme Early Access d'Auxite. Dans le cadre de cette initiative, une allocation promotionnelle de ${data.bonusAmount} ${data.bonusAsset} a été créditée sur votre compte de garde.`,
      detailsTitle: 'Détails de l\'allocation bonus',
      amountLabel: 'Montant crédité',
      amountValue: `${data.bonusAmount} ${data.bonusAsset}`,
      statusLabel: 'Statut',
      statusValue: 'Restreint — Usage Interne à la Plateforme',
      conditionsTitle: 'Conditions d\'utilisation',
      cond1: `Cette allocation est exclusivement réservée aux opérations internes de la plateforme. Vous pouvez convertir ${data.bonusAsset} en d'autres jetons de métaux précieux (AUXG, AUXS, AUXPT, AUXPD) au sein de la plateforme Auxite.`,
      cond2: 'Cette allocation promotionnelle est non transférable. Elle ne peut être retirée, envoyée à un portefeuille externe ou transférée vers un autre compte Auxite.',
      cond3: `L'allocation sera entièrement débloquée lorsque votre compte atteindra un seuil d'investissement cumulé de ${data.unlockThreshold} ${data.bonusAsset} ou l'équivalent en jetons de métaux précieux.`,
      cond4: `Cette allocation promotionnelle est valable ${data.expiryDays} jours à compter de la date d'émission. Les soldes non utilisés expireront après cette période.`,
      closing: 'Auxite se réserve le droit de modifier ou d\'interrompre ce programme à sa discrétion. Pour toute question concernant ces conditions, n\'hésitez pas à contacter notre équipe de services clients.',
      cta: 'Accéder à votre compte',
      desk: 'Service Clients Auxite',
    },
    ar: {
      subject: 'مكافأة الوصول المبكر — الشروط والأحكام',
      greeting: `عزيزي ${name}،`,
      intro: `شكراً لانضمامك إلى برنامج الوصول المبكر من Auxite. كجزء من هذه المبادرة، تم إيداع مخصص ترويجي بقيمة ${data.bonusAmount} ${data.bonusAsset} في حساب الحفظ الخاص بك.`,
      detailsTitle: 'تفاصيل المكافأة',
      amountLabel: 'المبلغ المضاف',
      amountValue: `${data.bonusAmount} ${data.bonusAsset}`,
      statusLabel: 'الحالة',
      statusValue: 'مقيّد — للاستخدام داخل المنصة فقط',
      conditionsTitle: 'شروط الاستخدام',
      cond1: `هذا المخصص مخصص حصرياً للعمليات الداخلية للمنصة. يمكنك تحويل ${data.bonusAsset} إلى رموز معادن ثمينة أخرى (AUXG، AUXS، AUXPT، AUXPD) داخل منصة Auxite.`,
      cond2: 'هذا المخصص الترويجي غير قابل للتحويل. لا يمكن سحبه أو إرساله إلى محفظة خارجية أو تحويله إلى حساب Auxite آخر.',
      cond3: `سيتم فتح المخصص بالكامل ورفع القيود عنه عندما يصل حسابك إلى حد استثمار تراكمي قدره ${data.unlockThreshold} ${data.bonusAsset} أو ما يعادله من رموز المعادن الثمينة.`,
      cond4: `هذا المخصص الترويجي صالح لمدة ${data.expiryDays} يوماً من تاريخ الإصدار. ستنتهي صلاحية الأرصدة غير المستخدمة بعد هذه الفترة.`,
      closing: 'تحتفظ Auxite بالحق في تعديل أو إيقاف هذا البرنامج وفقاً لتقديرها. إذا كانت لديك أي أسئلة بخصوص هذه الشروط، فلا تتردد في الاتصال بفريق خدمات العملاء.',
      cta: 'الوصول إلى حسابك',
      desk: 'خدمات العملاء Auxite',
    },
    ru: {
      subject: 'Бонус раннего доступа — Условия и положения',
      greeting: `Уважаемый/ая ${name},`,
      intro: `Благодарим вас за участие в программе раннего доступа Auxite. В рамках данной инициативы на ваш счёт хранения зачислено промо-начисление в размере ${data.bonusAmount} ${data.bonusAsset}.`,
      detailsTitle: 'Детали бонусного начисления',
      amountLabel: 'Зачисленная сумма',
      amountValue: `${data.bonusAmount} ${data.bonusAsset}`,
      statusLabel: 'Статус',
      statusValue: 'Ограничено — Только для использования на платформе',
      conditionsTitle: 'Условия использования',
      cond1: `Данное начисление предназначено исключительно для внутриплатформенных операций. Вы можете конвертировать ${data.bonusAsset} в другие токены драгоценных металлов (AUXG, AUXS, AUXPT, AUXPD) в рамках платформы Auxite.`,
      cond2: 'Данное промо-начисление не подлежит передаче. Оно не может быть выведено, отправлено на внешний кошелёк или переведено на другой счёт Auxite.',
      cond3: `Начисление будет полностью разблокировано после достижения вашим счётом совокупного инвестиционного порога в ${data.unlockThreshold} ${data.bonusAsset} или эквивалента в токенах драгоценных металлов.`,
      cond4: `Данное промо-начисление действительно в течение ${data.expiryDays} дней с даты выпуска. Неиспользованные остатки будут аннулированы по истечении этого срока.`,
      closing: 'Auxite оставляет за собой право изменять или прекращать данную программу по своему усмотрению. При возникновении вопросов относительно данных условий обращайтесь в нашу службу клиентской поддержки.',
      cta: 'Войти в аккаунт',
      desk: 'Клиентская служба Auxite',
    },
  };

  const t = content[lang] || content.en;

  const emailContent = `
    <p class="greeting">${t.greeting}</p>
    <p>${t.intro}</p>

    <h2>${t.detailsTitle}</h2>
    <div class="detail-card"><table>
      <tr>
        <td class="detail-label">${t.amountLabel}</td>
        <td class="detail-value">${t.amountValue}</td>
      </tr>
      <tr>
        <td class="detail-label">${t.statusLabel}</td>
        <td class="detail-value">${t.statusValue}</td>
      </tr>
    </table></div>

    <h2>${t.conditionsTitle}</h2>
    <p>${t.cond1}</p>
    <p>${t.cond2}</p>
    <p>${t.cond3}</p>
    <p>${t.cond4}</p>

    <p class="notice">${t.closing}</p>

    <a href="https://vault.auxite.io/dashboard" class="cta-button">${t.cta}</a>
  `;

  return sendEmail({ to, subject: t.subject, html: institutionalEmailWrapper(emailContent, t.desk, lang) });
}


// ═══════════════════════════════════════════════════════════════
// CAMPAIGN WELCOME EMAIL — Liquidity Credits Programme
// Sent after successful registration
// ═══════════════════════════════════════════════════════════════

export async function sendCampaignWelcomeEmail(
  to: string,
  data: {
    clientName?: string;
    language?: string;
  }
) {
  const lang = data.language || 'en';
  const name = data.clientName || 'Client';

  const content: Record<string, Record<string, string>> = {
    en: {
      subject: 'Welcome to Auxite — Liquidity Credits Programme',
      greeting: `Dear ${name},`,
      intro: 'Thank you for registering with Auxite. You are now enrolled in our Liquidity Credits Programme, designed to reward early participants of the platform.',
      programTitle: 'PROGRAMME DETAILS',
      welcomeBonus: 'Welcome Bonus',
      welcomeBonusVal: '5 AUXG (Silver Credits)',
      welcomeBonusCond: 'Credited upon KYC verification + first deposit of $100 or more',
      depositBonus: 'Deposit Bonus',
      depositBonusVal: '2% in metal credits on each qualifying deposit',
      referralBonus: 'Referral Bonus',
      referralBonusVal: "0.5% of referred user's first deposit",
      conditionsTitle: 'UNLOCK CONDITIONS',
      cond1: 'Liquidity Credits are non-transferable until unlock conditions are met.',
      cond2: 'Credits unlock after 30 calendar days from issuance, OR upon reaching 5x the credited amount in verified trading volume.',
      cond3: 'Once unlocked, credits convert to fully transferable metal holdings in your custody account.',
      nextSteps: 'NEXT STEPS',
      step1: '1. Complete your identity verification (KYC)',
      step2: '2. Make your first deposit ($100 minimum)',
      step3: '3. Receive your 5 AUXG Welcome Bonus automatically',
      closing: 'This programme is limited to the first 50 qualifying participants. Terms are subject to modification at the discretion of Auxite.',
      cta: 'Access Your Vault',
      desk: 'Auxite Client Onboarding',
    },
    tr: {
      subject: 'Auxite\'e Hoş Geldiniz — Likidite Kredileri Programı',
      greeting: `Sayın ${name},`,
      intro: 'Auxite\'e kaydolduğunuz için teşekkür ederiz. Artık platformun erken katılımcılarını ödüllendirmek için tasarlanmış Likidite Kredileri Programımıza kayıtlısınız.',
      programTitle: 'PROGRAM DETAYLARI',
      welcomeBonus: 'Hoş Geldin Bonusu',
      welcomeBonusVal: '5 AUXG (Gümüş Kredisi)',
      welcomeBonusCond: 'KYC doğrulaması + 100$ veya üzeri ilk yatırım sonrası hesabınıza tanımlanır',
      depositBonus: 'Yatırım Bonusu',
      depositBonusVal: 'Her nitelikli yatırımda %2 metal kredisi',
      referralBonus: 'Referans Bonusu',
      referralBonusVal: 'Referans edilen kullanıcının ilk yatırımının %0,5\'i',
      conditionsTitle: 'KİLİT AÇMA KOŞULLARI',
      cond1: 'Likidite Kredileri, kilit açma koşulları karşılanana kadar transfer edilemez.',
      cond2: 'Krediler, verilme tarihinden 30 takvim günü sonra VEYA kredi tutarının 5 katı doğrulanmış işlem hacmine ulaşıldığında açılır.',
      cond3: 'Açıldığında, krediler saklama hesabınızdaki tam transfer edilebilir metal varlıklarına dönüşür.',
      nextSteps: 'SONRAKİ ADIMLAR',
      step1: '1. Kimlik doğrulamanızı (KYC) tamamlayın',
      step2: '2. İlk yatırımınızı yapın (minimum 100$)',
      step3: '3. 5 AUXG Hoş Geldin Bonusunuzu otomatik olarak alın',
      closing: 'Bu program ilk 50 nitelikli katılımcıyla sınırlıdır. Koşullar Auxite\'in takdirine bağlı olarak değiştirilebilir.',
      cta: 'Kasanıza Erişin',
      desk: 'Auxite Müşteri Kabul Masası',
    },
    de: {
      subject: 'Willkommen bei Auxite — Liquiditätskredite-Programm',
      greeting: `Sehr geehrte/r ${name},`,
      intro: 'Vielen Dank für Ihre Registrierung bei Auxite. Sie sind jetzt in unser Liquiditätskredite-Programm aufgenommen, das frühe Teilnehmer der Plattform belohnt.',
      programTitle: 'PROGRAMMDETAILS',
      welcomeBonus: 'Willkommensbonus',
      welcomeBonusVal: '5 AUXG (Silberkredite)',
      welcomeBonusCond: 'Gutschrift nach KYC-Verifizierung + erste Einzahlung von 100$ oder mehr',
      depositBonus: 'Einzahlungsbonus',
      depositBonusVal: '2% Metallkredite bei jeder qualifizierenden Einzahlung',
      referralBonus: 'Empfehlungsbonus',
      referralBonusVal: '0,5% der ersten Einzahlung des empfohlenen Benutzers',
      conditionsTitle: 'FREISCHALTBEDINGUNGEN',
      cond1: 'Liquiditätskredite sind bis zur Erfüllung der Freischaltbedingungen nicht übertragbar.',
      cond2: 'Kredite werden nach 30 Kalendertagen ab Ausstellung ODER bei Erreichen des 5-fachen des gutgeschriebenen Betrags im verifizierten Handelsvolumen freigeschaltet.',
      cond3: 'Nach der Freischaltung werden die Kredite in vollständig übertragbare Metallbestände in Ihrem Verwahrungskonto umgewandelt.',
      nextSteps: 'NÄCHSTE SCHRITTE',
      step1: '1. Identitätsverifizierung (KYC) abschließen',
      step2: '2. Erste Einzahlung tätigen (Minimum 100$)',
      step3: '3. 5 AUXG Willkommensbonus automatisch erhalten',
      closing: 'Dieses Programm ist auf die ersten 50 qualifizierenden Teilnehmer begrenzt.',
      cta: 'Auf Ihr Depot zugreifen',
      desk: 'Auxite Kunden-Onboarding',
    },
    fr: {
      subject: 'Bienvenue chez Auxite — Programme de Crédits de Liquidité',
      greeting: `Cher/Chère ${name},`,
      intro: 'Merci de vous être inscrit(e) chez Auxite. Vous êtes désormais inscrit(e) à notre Programme de Crédits de Liquidité, conçu pour récompenser les premiers participants de la plateforme.',
      programTitle: 'DÉTAILS DU PROGRAMME',
      welcomeBonus: 'Bonus de bienvenue',
      welcomeBonusVal: '5 AUXG (Crédits Argent)',
      welcomeBonusCond: 'Crédité après vérification KYC + premier dépôt de 100$ ou plus',
      depositBonus: 'Bonus de dépôt',
      depositBonusVal: '2% en crédits métal sur chaque dépôt qualifiant',
      referralBonus: 'Bonus de parrainage',
      referralBonusVal: "0,5% du premier dépôt de l'utilisateur parrainé",
      conditionsTitle: 'CONDITIONS DE DÉBLOCAGE',
      cond1: 'Les Crédits de Liquidité ne sont pas transférables tant que les conditions de déblocage ne sont pas remplies.',
      cond2: "Les crédits sont débloqués après 30 jours calendaires, OU lorsque le volume de trading vérifié atteint 5x le montant crédité.",
      cond3: 'Une fois débloqués, les crédits sont convertis en avoirs métalliques entièrement transférables.',
      nextSteps: 'PROCHAINES ÉTAPES',
      step1: "1. Complétez votre vérification d'identité (KYC)",
      step2: '2. Effectuez votre premier dépôt (minimum 100$)',
      step3: '3. Recevez automatiquement votre Bonus de 5 AUXG',
      closing: 'Ce programme est limité aux 50 premiers participants qualifiants.',
      cta: 'Accéder à votre coffre',
      desk: 'Auxite Accueil Client',
    },
    ar: {
      subject: 'مرحباً بك في Auxite — برنامج ائتمانات السيولة',
      greeting: `عزيزي/عزيزتي ${name}،`,
      intro: 'شكراً لتسجيلك في Auxite. أنت الآن مسجل في برنامج ائتمانات السيولة الخاص بنا، المصمم لمكافأة المشاركين الأوائل في المنصة.',
      programTitle: 'تفاصيل البرنامج',
      welcomeBonus: 'مكافأة الترحيب',
      welcomeBonusVal: '5 AUXG (ائتمانات فضية)',
      welcomeBonusCond: 'تُضاف بعد التحقق من الهوية + أول إيداع بقيمة 100$ أو أكثر',
      depositBonus: 'مكافأة الإيداع',
      depositBonusVal: '2% ائتمانات معدنية على كل إيداع مؤهل',
      referralBonus: 'مكافأة الإحالة',
      referralBonusVal: '0.5% من أول إيداع للمستخدم المُحال',
      conditionsTitle: 'شروط الفتح',
      cond1: 'ائتمانات السيولة غير قابلة للتحويل حتى يتم استيفاء شروط الفتح.',
      cond2: 'يتم فتح الائتمانات بعد 30 يوماً تقويمياً من الإصدار، أو عند الوصول إلى 5 أضعاف المبلغ المُضاف في حجم التداول.',
      cond3: 'بمجرد الفتح، تتحول الائتمانات إلى حيازات معدنية قابلة للتحويل بالكامل.',
      nextSteps: 'الخطوات التالية',
      step1: '1. أكمل التحقق من هويتك (KYC)',
      step2: '2. قم بإيداعك الأول (الحد الأدنى 100$)',
      step3: '3. احصل على مكافأة الترحيب 5 AUXG تلقائياً',
      closing: 'هذا البرنامج محدود لأول 50 مشاركاً مؤهلاً.',
      cta: 'الوصول إلى خزنتك',
      desk: 'مكتب استقبال العملاء في Auxite',
    },
    ru: {
      subject: 'Добро пожаловать в Auxite — Программа ликвидных кредитов',
      greeting: `Уважаемый/ая ${name},`,
      intro: 'Благодарим вас за регистрацию в Auxite. Теперь вы зарегистрированы в нашей Программе ликвидных кредитов, предназначенной для поощрения ранних участников платформы.',
      programTitle: 'ДЕТАЛИ ПРОГРАММЫ',
      welcomeBonus: 'Приветственный бонус',
      welcomeBonusVal: '5 AUXG (серебряные кредиты)',
      welcomeBonusCond: 'Зачисляется после верификации KYC + первый депозит от 100$',
      depositBonus: 'Бонус за депозит',
      depositBonusVal: '2% в металлических кредитах на каждый квалифицирующий депозит',
      referralBonus: 'Реферальный бонус',
      referralBonusVal: '0,5% от первого депозита приглашённого пользователя',
      conditionsTitle: 'УСЛОВИЯ РАЗБЛОКИРОВКИ',
      cond1: 'Ликвидные кредиты не подлежат передаче до выполнения условий разблокировки.',
      cond2: 'Кредиты разблокируются через 30 календарных дней ИЛИ при достижении 5-кратного объёма проверенных торгов.',
      cond3: 'После разблокировки кредиты конвертируются в полностью передаваемые металлические активы.',
      nextSteps: 'СЛЕДУЮЩИЕ ШАГИ',
      step1: '1. Завершите верификацию личности (KYC)',
      step2: '2. Сделайте первый депозит (минимум 100$)',
      step3: '3. Автоматически получите приветственный бонус 5 AUXG',
      closing: 'Эта программа ограничена первыми 50 квалифицирующими участниками.',
      cta: 'Доступ к хранилищу',
      desk: 'Auxite Клиентский приём',
    },
  };

  const t = content[lang] || content.en;

  const emailContent = `
    <p class="greeting">${t.greeting}</p>
    <p>${t.intro}</p>

    <h2>${t.programTitle}</h2>

    <div class="detail-card">
      <table>
        <tr>
          <td class="detail-label">${t.welcomeBonus}</td>
          <td class="detail-value">${t.welcomeBonusVal}</td>
        </tr>
        <tr>
          <td colspan="2" style="padding: 4px 18px 8px; font-size: 11px; color: #888; border-bottom: 1px solid #eee;">${t.welcomeBonusCond}</td>
        </tr>
        <tr>
          <td class="detail-label">${t.depositBonus}</td>
          <td class="detail-value">${t.depositBonusVal}</td>
        </tr>
        <tr>
          <td class="detail-label">${t.referralBonus}</td>
          <td class="detail-value">${t.referralBonusVal}</td>
        </tr>
      </table>
    </div>

    <h2>${t.conditionsTitle}</h2>
    <p>${t.cond1}</p>
    <p>${t.cond2}</p>
    <p>${t.cond3}</p>

    <h2>${t.nextSteps}</h2>
    <p>${t.step1}</p>
    <p>${t.step2}</p>
    <p>${t.step3}</p>

    <p class="notice">${t.closing}</p>

    <a href="https://vault.auxite.io/dashboard" class="cta-button">${t.cta}</a>
  `;

  return sendEmail({ to, subject: t.subject, html: institutionalEmailWrapper(emailContent, t.desk, lang) });
}
