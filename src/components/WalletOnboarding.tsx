"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { QRLoginModal } from "@/components/auth/QRLoginModal";

// ============================================
// BIP39 WORD LIST (TAM 2048 KELİME)
// ============================================
const BIP39_WORDLIST = 'abandon,ability,able,about,above,absent,absorb,abstract,absurd,abuse,access,accident,account,accuse,achieve,acid,acoustic,acquire,across,act,action,actor,actress,actual,adapt,add,addict,address,adjust,admit,adult,advance,advice,aerobic,affair,afford,afraid,again,age,agent,agree,ahead,aim,air,airport,aisle,alarm,album,alcohol,alert,alien,all,alley,allow,almost,alone,alpha,already,also,alter,always,amateur,amazing,among,amount,amused,analyst,anchor,ancient,anger,angle,angry,animal,ankle,announce,annual,another,answer,antenna,antique,anxiety,any,apart,apology,appear,apple,approve,april,arch,arctic,area,arena,argue,arm,armed,armor,army,around,arrange,arrest,arrive,arrow,art,artefact,artist,artwork,ask,aspect,assault,asset,assist,assume,asthma,athlete,atom,attack,attend,attitude,attract,auction,audit,august,aunt,author,auto,autumn,average,avocado,avoid,awake,aware,away,awesome,awful,awkward,axis,baby,bachelor,bacon,badge,bag,balance,balcony,ball,bamboo,banana,banner,bar,barely,bargain,barrel,base,basic,basket,battle,beach,bean,beauty,because,become,beef,before,begin,behave,behind,believe,below,belt,bench,benefit,best,betray,better,between,beyond,bicycle,bid,bike,bind,biology,bird,birth,bitter,black,blade,blame,blanket,blast,bleak,bless,blind,blood,blossom,blouse,blue,blur,blush,board,boat,body,boil,bomb,bone,bonus,book,boost,border,boring,borrow,boss,bottom,bounce,box,boy,bracket,brain,brand,brass,brave,bread,breeze,brick,bridge,brief,bright,bring,brisk,broccoli,broken,bronze,broom,brother,brown,brush,bubble,buddy,budget,buffalo,build,bulb,bulk,bullet,bundle,bunker,burden,burger,burst,bus,business,busy,butter,buyer,buzz,cabbage,cabin,cable,cactus,cage,cake,call,calm,camera,camp,can,canal,cancel,candy,cannon,canoe,canvas,canyon,capable,capital,captain,car,carbon,card,cargo,carpet,carry,cart,case,cash,casino,castle,casual,cat,catalog,catch,category,cattle,caught,cause,caution,cave,ceiling,celery,cement,census,century,cereal,certain,chair,chalk,champion,change,chaos,chapter,charge,chase,chat,cheap,check,cheese,chef,cherry,chest,chicken,chief,child,chimney,choice,choose,chronic,chuckle,chunk,churn,cigar,cinnamon,circle,citizen,city,civil,claim,clap,clarify,claw,clay,clean,clerk,clever,click,client,cliff,climb,clinic,clip,clock,clog,close,cloth,cloud,clown,club,clump,cluster,clutch,coach,coast,coconut,code,coffee,coil,coin,collect,color,column,combine,come,comfort,comic,common,company,concert,conduct,confirm,congress,connect,consider,control,convince,cook,cool,copper,copy,coral,core,corn,correct,cost,cotton,couch,country,couple,course,cousin,cover,coyote,crack,cradle,craft,cram,crane,crash,crater,crawl,crazy,cream,credit,creek,crew,cricket,crime,crisp,critic,crop,cross,crouch,crowd,crucial,cruel,cruise,crumble,crunch,crush,cry,crystal,cube,culture,cup,cupboard,curious,current,curtain,curve,cushion,custom,cute,cycle,dad,damage,damp,dance,danger,daring,dash,daughter,dawn,day,deal,debate,debris,decade,december,decide,decline,decorate,decrease,deer,defense,define,defy,degree,delay,deliver,demand,demise,denial,dentist,deny,depart,depend,deposit,depth,deputy,derive,describe,desert,design,desk,despair,destroy,detail,detect,develop,device,devote,diagram,dial,diamond,diary,dice,diesel,diet,differ,digital,dignity,dilemma,dinner,dinosaur,direct,dirt,disagree,discover,disease,dish,dismiss,disorder,display,distance,divert,divide,divorce,dizzy,doctor,document,dog,doll,dolphin,domain,donate,donkey,donor,door,dose,double,dove,draft,dragon,drama,drastic,draw,dream,dress,drift,drill,drink,drip,drive,drop,drum,dry,duck,dumb,dune,during,dust,dutch,duty,dwarf,dynamic,eager,eagle,early,earn,earth,easily,east,easy,echo,ecology,economy,edge,edit,educate,effort,egg,eight,either,elbow,elder,electric,elegant,element,elephant,elevator,elite,else,embark,embody,embrace,emerge,emotion,employ,empower,empty,enable,enact,end,endless,endorse,enemy,energy,enforce,engage,engine,enhance,enjoy,enlist,enough,enrich,enroll,ensure,enter,entire,entry,envelope,episode,equal,equip,era,erase,erode,erosion,error,erupt,escape,essay,essence,estate,eternal,ethics,evidence,evil,evoke,evolve,exact,example,excess,exchange,excite,exclude,excuse,execute,exercise,exhaust,exhibit,exile,exist,exit,exotic,expand,expect,expire,explain,expose,express,extend,extra,eye,eyebrow,fabric,face,faculty,fade,faint,faith,fall,false,fame,family,famous,fan,fancy,fantasy,farm,fashion,fat,fatal,father,fatigue,fault,favorite,feature,february,federal,fee,feed,feel,female,fence,festival,fetch,fever,few,fiber,fiction,field,figure,file,film,filter,final,find,fine,finger,finish,fire,firm,first,fiscal,fish,fit,fitness,fix,flag,flame,flash,flat,flavor,flee,flight,flip,float,flock,floor,flower,fluid,flush,fly,foam,focus,fog,foil,fold,follow,food,foot,force,forest,forget,fork,fortune,forum,forward,fossil,foster,found,fox,fragile,frame,frequent,fresh,friend,fringe,frog,front,frost,frown,frozen,fruit,fuel,fun,funny,furnace,fury,future,gadget,gain,galaxy,gallery,game,gap,garage,garbage,garden,garlic,garment,gas,gasp,gate,gather,gauge,gaze,general,genius,genre,gentle,genuine,gesture,ghost,giant,gift,giggle,ginger,giraffe,girl,give,glad,glance,glare,glass,glide,glimpse,globe,gloom,glory,glove,glow,glue,goat,goddess,gold,good,goose,gorilla,gospel,gossip,govern,gown,grab,grace,grain,grant,grape,grass,gravity,great,green,grid,grief,grit,grocery,group,grow,grunt,guard,guess,guide,guilt,guitar,gun,gym,habit,hair,half,hammer,hamster,hand,happy,harbor,hard,harsh,harvest,hat,have,hawk,hazard,head,health,heart,heavy,hedgehog,height,hello,helmet,help,hen,hero,hidden,high,hill,hint,hip,hire,history,hobby,hockey,hold,hole,holiday,hollow,home,honey,hood,hope,horn,horror,horse,hospital,host,hotel,hour,hover,hub,huge,human,humble,humor,hundred,hungry,hunt,hurdle,hurry,hurt,husband,hybrid,ice,icon,idea,identify,idle,ignore,ill,illegal,illness,image,imitate,immense,immune,impact,impose,improve,impulse,inch,include,income,increase,index,indicate,indoor,industry,infant,inflict,inform,inhale,inherit,initial,inject,injury,inmate,inner,innocent,input,inquiry,insane,insect,inside,inspire,install,intact,interest,into,invest,invite,involve,iron,island,isolate,issue,item,ivory,jacket,jaguar,jar,jazz,jealous,jeans,jelly,jewel,job,join,joke,journey,joy,judge,juice,jump,jungle,junior,junk,just,kangaroo,keen,keep,ketchup,key,kick,kid,kidney,kind,kingdom,kiss,kit,kitchen,kite,kitten,kiwi,knee,knife,knock,know,lab,label,labor,ladder,lady,lake,lamp,language,laptop,large,later,latin,laugh,laundry,lava,law,lawn,lawsuit,layer,lazy,leader,leaf,learn,leave,lecture,left,leg,legal,legend,leisure,lemon,lend,length,lens,leopard,lesson,letter,level,liar,liberty,library,license,life,lift,light,like,limb,limit,link,lion,liquid,list,little,live,lizard,load,loan,lobster,local,lock,logic,lonely,long,loop,lottery,loud,lounge,love,loyal,lucky,luggage,lumber,lunar,lunch,luxury,lyrics,machine,mad,magic,magnet,maid,mail,main,major,make,mammal,man,manage,mandate,mango,mansion,manual,maple,marble,march,margin,marine,market,marriage,mask,mass,master,match,material,math,matrix,matter,maximum,maze,meadow,mean,measure,meat,mechanic,medal,media,melody,melt,member,memory,mention,menu,mercy,merge,merit,merry,mesh,message,metal,method,middle,midnight,milk,million,mimic,mind,minimum,minor,minute,miracle,mirror,misery,miss,mistake,mix,mixed,mixture,mobile,model,modify,mom,moment,monitor,monkey,monster,month,moon,moral,more,morning,mosquito,mother,motion,motor,mountain,mouse,move,movie,much,muffin,mule,multiply,muscle,museum,mushroom,music,must,mutual,myself,mystery,myth,naive,name,napkin,narrow,nasty,nation,nature,near,neck,need,negative,neglect,neither,nephew,nerve,nest,net,network,neutral,never,news,next,nice,night,noble,noise,nominee,noodle,normal,north,nose,notable,note,nothing,notice,novel,now,nuclear,number,nurse,nut,oak,obey,object,oblige,obscure,observe,obtain,obvious,occur,ocean,october,odor,off,offer,office,often,oil,okay,old,olive,olympic,omit,once,one,onion,online,only,open,opera,opinion,oppose,option,orange,orbit,orchard,order,ordinary,organ,orient,original,orphan,ostrich,other,outdoor,outer,output,outside,oval,oven,over,own,owner,oxygen,oyster,ozone,pact,paddle,page,pair,palace,palm,panda,panel,panic,panther,paper,parade,parent,park,parrot,party,pass,patch,path,patient,patrol,pattern,pause,pave,payment,peace,peanut,pear,peasant,pelican,pen,penalty,pencil,people,pepper,perfect,permit,person,pet,phone,photo,phrase,physical,piano,picnic,picture,piece,pig,pigeon,pill,pilot,pink,pioneer,pipe,pistol,pitch,pizza,place,planet,plastic,plate,play,please,pledge,pluck,plug,plunge,poem,poet,point,polar,pole,police,pond,pony,pool,popular,portion,position,possible,post,potato,pottery,poverty,powder,power,practice,praise,predict,prefer,prepare,present,pretty,prevent,price,pride,primary,print,priority,prison,private,prize,problem,process,produce,profit,program,project,promote,proof,property,prosper,protect,proud,provide,public,pudding,pull,pulp,pulse,pumpkin,punch,pupil,puppy,purchase,purity,purpose,purse,push,put,puzzle,pyramid,quality,quantum,quarter,question,quick,quit,quiz,quote,rabbit,raccoon,race,rack,radar,radio,rail,rain,raise,rally,ramp,ranch,random,range,rapid,rare,rate,rather,raven,raw,razor,ready,real,reason,rebel,rebuild,recall,receive,recipe,record,recycle,reduce,reflect,reform,refuse,region,regret,regular,reject,relax,release,relief,rely,remain,remember,remind,remove,render,renew,rent,reopen,repair,repeat,replace,report,require,rescue,resemble,resist,resource,response,result,retire,retreat,return,reunion,reveal,review,reward,rhythm,rib,ribbon,rice,rich,ride,ridge,rifle,right,rigid,ring,riot,ripple,risk,ritual,rival,river,road,roast,robot,robust,rocket,romance,roof,rookie,room,rose,rotate,rough,round,route,royal,rubber,rude,rug,rule,run,runway,rural,sad,saddle,sadness,safe,sail,salad,salmon,salon,salt,salute,same,sample,sand,satisfy,satoshi,sauce,sausage,save,say,scale,scan,scare,scatter,scene,scheme,school,science,scissors,scorpion,scout,scrap,screen,script,scrub,sea,search,season,seat,second,secret,section,security,seed,seek,segment,select,sell,seminar,senior,sense,sentence,series,service,session,settle,setup,seven,shadow,shaft,shallow,share,shed,shell,sheriff,shield,shift,shine,ship,shiver,shock,shoe,shoot,shop,short,shoulder,shove,shrimp,shrug,shuffle,shy,sibling,sick,side,siege,sight,sign,silent,silk,silly,silver,similar,simple,since,sing,siren,sister,situate,six,size,skate,sketch,ski,skill,skin,skirt,skull,slab,slam,sleep,slender,slice,slide,slight,slim,slogan,slot,slow,slush,small,smart,smile,smoke,smooth,snack,snake,snap,sniff,snow,soap,soccer,social,sock,soda,soft,solar,soldier,solid,solution,solve,someone,song,soon,sorry,sort,soul,sound,soup,source,south,space,spare,spatial,spawn,speak,special,speed,spell,spend,sphere,spice,spider,spike,spin,spirit,split,spoil,sponsor,spoon,sport,spot,spray,spread,spring,spy,square,squeeze,squirrel,stable,stadium,staff,stage,stairs,stamp,stand,start,state,stay,steak,steel,stem,step,stereo,stick,still,sting,stock,stomach,stone,stool,story,stove,strategy,street,strike,strong,struggle,student,stuff,stumble,style,subject,submit,subway,success,such,sudden,suffer,sugar,suggest,suit,summer,sun,sunny,sunset,super,supply,supreme,sure,surface,surge,surprise,surround,survey,suspect,sustain,swallow,swamp,swap,swarm,swear,sweet,swift,swim,swing,switch,sword,symbol,symptom,syrup,system,table,tackle,tag,tail,talent,talk,tank,tape,target,task,taste,tattoo,taxi,teach,team,tell,ten,tenant,tennis,tent,term,test,text,thank,that,theme,then,theory,there,they,thing,this,thought,three,thrive,throw,thumb,thunder,ticket,tide,tiger,tilt,timber,time,tiny,tip,tired,tissue,title,toast,tobacco,today,toddler,toe,together,toilet,token,tomato,tomorrow,tone,tongue,tonight,tool,tooth,top,topic,topple,torch,tornado,tortoise,toss,total,tourist,toward,tower,town,toy,track,trade,traffic,tragic,train,transfer,trap,trash,travel,tray,treat,tree,trend,trial,tribe,trick,trigger,trim,trip,trophy,trouble,truck,true,truly,trumpet,trust,truth,try,tube,tuition,tumble,tuna,tunnel,turkey,turn,turtle,twelve,twenty,twice,twin,twist,two,type,typical,ugly,umbrella,unable,unaware,uncle,uncover,under,undo,unfair,unfold,unhappy,uniform,unique,unit,universe,unknown,unlock,until,unusual,unveil,update,upgrade,uphold,upon,upper,upset,urban,urge,usage,use,used,useful,useless,usual,utility,vacant,vacuum,vague,valid,valley,valve,van,vanish,vapor,various,vast,vault,vehicle,velvet,vendor,venture,venue,verb,verify,version,very,vessel,veteran,viable,vibrant,vicious,victory,video,view,village,vintage,violin,virtual,virus,visa,visit,visual,vital,vivid,vocal,voice,void,volcano,volume,vote,voyage,wage,wagon,wait,walk,wall,walnut,want,warfare,warm,warrior,wash,wasp,waste,water,wave,way,wealth,weapon,wear,weasel,weather,web,wedding,weekend,weird,welcome,west,wet,whale,what,wheat,wheel,when,where,whip,whisper,wide,width,wife,wild,will,win,window,wine,wing,wink,winner,winter,wire,wisdom,wise,wish,witness,wolf,woman,wonder,wood,wool,word,work,world,worry,worth,wrap,wreck,wrestle,wrist,write,wrong,yard,year,yellow,you,young,youth,zebra,zero,zone,zoo'.split(',');

// ============================================
// ÇEVİRİLER
// ============================================
const translations = {
  tr: {
    welcomeTitle: "Auxite Wallet'a Hoş Geldiniz",
    welcomeSubtitle: "Fiziksel metal destekli tokenlarınızı güvenle saklayın",
    createNewWallet: "Yeni Cüzdan Oluştur",
    importWallet: "Mevcut Cüzdanı İçe Aktar",
    seedPhraseTitle: "Kurtarma İfadeniz",
    seedPhraseWarning: "⚠️ Bu 12 kelimeyi güvenli bir yere yazın! Kimseyle paylaşmayın!",
    iWroteItDown: "Yazdım, Devam Et",
    verifyTitle: "Kurtarma İfadesini Doğrula",
    selectWord: "Kelime #",
    verifyError: "Yanlış kelime seçildi",
    setPinTitle: "Şifre Oluştur",
    setPinSubtitle: "En az 6 karakterli güvenlik şifrenizi belirleyin",
    confirmPinTitle: "Şifreyi Onayla",
    pinMismatch: "Şifreler eşleşmiyor",
    enterPinTitle: "Şifre Girin",
    wrongPin: "Yanlış şifre",
    forgotPin: "Şifremi Unuttum",
    securityTip: "Güvenlik İpucu",
    neverShare: "Kurtarma ifadenizi asla paylaşmayın",
    noScreenshot: "Ekran görüntüsü almayın",
    writeOnPaper: "Kağıda yazıp güvenli yerde saklayın",
    keysOnDevice: "Anahtarlarınız yalnızca tarayıcınızda saklanır",
    scanQR: "QR Kod ile Tara",
    orEnterManually: "veya manuel girin",
    import: "İçe Aktar",
    reveal: "Kelimeleri Göster",
    hide: "Gizle",
    copy: "Kopyala",
    copied: "Kopyalandı!",
    continue: "Devam",
    back: "Geri",
    cancel: "İptal",
    invalidSeed: "Geçersiz kurtarma ifadesi",
    enterSeedPlaceholder: "Kurtarma ifadesini girin...",
    password: "Şifre",
    confirmPassword: "Şifreyi Onayla",
    passwordHint: "En az 6 karakter",
    unlock: "Kilidi Aç",
    logout: "Çıkış Yap",
    qrLogin: "Mobil ile QR Giriş",
    qrLoginDesc: "Mobil uygulamadan QR okutarak giriş yapın",
    // Email Login
    emailLogin: "E-posta ile Giriş",
    emailLoginDesc: "E-posta ve şifre ile giriş yapın",
    email: "E-posta",
    loginButton: "Giriş Yap",
    registerButton: "Kayıt Ol",
    noAccount: "Hesabınız yok mu?",
    hasAccount: "Zaten hesabınız var mı?",
    registerTitle: "Hesap Oluştur",
    loginTitle: "Giriş Yap",
    name: "Ad Soyad",
    phone: "Telefon",
    passwordRequirements: "En az 8 karakter, 1 büyük harf, 1 küçük harf, 1 rakam",
    invalidEmail: "Geçersiz e-posta adresi",
    invalidPassword: "Şifre en az 8 karakter, 1 büyük harf, 1 küçük harf ve 1 rakam içermelidir",
    loginError: "Giriş başarısız. Lütfen bilgilerinizi kontrol edin.",
    registerError: "Kayıt başarısız. Lütfen tekrar deneyin.",
    registerSuccess: "Kayıt başarılı! E-postanızı doğrulayın.",
    verifyEmail: "E-posta Doğrulama",
    verifyEmailDesc: "E-posta adresinize gönderilen 6 haneli kodu girin",
    verificationCode: "Doğrulama Kodu",
    verifyButton: "Doğrula",
    resendCode: "Kodu Tekrar Gönder",
    codeSent: "Kod gönderildi!",
    invalidCode: "Geçersiz kod",
    or: "veya",
    // Section titles
    walletSection: "Cüzdan",
    accountSection: "Hesap",
    walletSectionDesc: "Kendi anahtarlarınızı yönetin",
    accountSectionDesc: "E-posta veya Google ile giriş yapın",
    // Google Login
    googleLogin: "Google ile Giriş",
    googleLoginError: "Google girişi başarısız",
  },
  en: {
    welcomeTitle: "Welcome to Auxite Wallet",
    welcomeSubtitle: "Securely store your physical metal-backed tokens",
    createNewWallet: "Create New Wallet",
    importWallet: "Import Existing Wallet",
    seedPhraseTitle: "Your Recovery Phrase",
    seedPhraseWarning: "⚠️ Write down these 12 words in a safe place! Never share them!",
    iWroteItDown: "I Wrote It Down, Continue",
    verifyTitle: "Verify Recovery Phrase",
    selectWord: "Word #",
    verifyError: "Wrong word selected",
    setPinTitle: "Create Password",
    setPinSubtitle: "Set your security password (min 6 characters)",
    confirmPinTitle: "Confirm Password",
    pinMismatch: "Passwords do not match",
    enterPinTitle: "Enter Password",
    wrongPin: "Wrong password",
    forgotPin: "Forgot Password",
    securityTip: "Security Tip",
    neverShare: "Never share your recovery phrase",
    noScreenshot: "Do not take screenshots",
    writeOnPaper: "Write on paper and store safely",
    keysOnDevice: "Your keys are stored only in your browser",
    scanQR: "Scan QR Code",
    orEnterManually: "or enter manually",
    import: "Import",
    reveal: "Reveal Words",
    hide: "Hide",
    copy: "Copy",
    copied: "Copied!",
    continue: "Continue",
    back: "Back",
    cancel: "Cancel",
    invalidSeed: "Invalid recovery phrase",
    enterSeedPlaceholder: "Enter recovery phrase...",
    password: "Password",
    confirmPassword: "Confirm Password",
    passwordHint: "Minimum 6 characters",
    unlock: "Unlock",
    logout: "Log Out",
    qrLogin: "QR Login with Mobile",
    qrLoginDesc: "Scan QR code from mobile app to login",
    // Email Login
    emailLogin: "Login with Email",
    emailLoginDesc: "Sign in with your email and password",
    email: "Email",
    loginButton: "Sign In",
    registerButton: "Sign Up",
    noAccount: "Don't have an account?",
    hasAccount: "Already have an account?",
    registerTitle: "Create Account",
    loginTitle: "Sign In",
    name: "Full Name",
    phone: "Phone",
    passwordRequirements: "Min 8 chars, 1 uppercase, 1 lowercase, 1 number",
    invalidEmail: "Invalid email address",
    invalidPassword: "Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number",
    loginError: "Login failed. Please check your credentials.",
    registerError: "Registration failed. Please try again.",
    registerSuccess: "Registration successful! Please verify your email.",
    verifyEmail: "Email Verification",
    verifyEmailDesc: "Enter the 6-digit code sent to your email",
    verificationCode: "Verification Code",
    verifyButton: "Verify",
    resendCode: "Resend Code",
    codeSent: "Code sent!",
    invalidCode: "Invalid code",
    or: "or",
    // Section titles
    walletSection: "Wallet",
    accountSection: "Account",
    walletSectionDesc: "Manage your own keys",
    accountSectionDesc: "Sign in with email or Google",
    // Google Login
    googleLogin: "Continue with Google",
    googleLoginError: "Google sign-in failed",
  },
  de: {
    welcomeTitle: "Willkommen bei Auxite Wallet",
    welcomeSubtitle: "Speichern Sie Ihre physisch gedeckten Metal-Token sicher",
    createNewWallet: "Neue Wallet erstellen",
    importWallet: "Bestehende Wallet importieren",
    seedPhraseTitle: "Ihre Wiederherstellungsphrase",
    seedPhraseWarning: "⚠️ Schreiben Sie diese 12 Wörter an einem sicheren Ort auf! Teilen Sie sie niemals!",
    iWroteItDown: "Ich habe es aufgeschrieben, Weiter",
    verifyTitle: "Wiederherstellungsphrase überprüfen",
    selectWord: "Wort #",
    verifyError: "Falsches Wort ausgewählt",
    setPinTitle: "Passwort erstellen",
    setPinSubtitle: "Legen Sie Ihr Sicherheitspasswort fest (min. 6 Zeichen)",
    confirmPinTitle: "Passwort bestätigen",
    pinMismatch: "Passwörter stimmen nicht überein",
    enterPinTitle: "Passwort eingeben",
    wrongPin: "Falsches Passwort",
    forgotPin: "Passwort vergessen",
    securityTip: "Sicherheitstipp",
    neverShare: "Teilen Sie Ihre Wiederherstellungsphrase niemals",
    noScreenshot: "Machen Sie keine Screenshots",
    writeOnPaper: "Auf Papier schreiben und sicher aufbewahren",
    keysOnDevice: "Ihre Schlüssel werden nur in Ihrem Browser gespeichert",
    scanQR: "QR-Code scannen",
    orEnterManually: "oder manuell eingeben",
    import: "Importieren",
    reveal: "Wörter anzeigen",
    hide: "Verbergen",
    copy: "Kopieren",
    copied: "Kopiert!",
    continue: "Weiter",
    back: "Zurück",
    cancel: "Abbrechen",
    invalidSeed: "Ungültige Wiederherstellungsphrase",
    enterSeedPlaceholder: "Wiederherstellungsphrase eingeben...",
    password: "Passwort",
    confirmPassword: "Passwort bestätigen",
    passwordHint: "Mindestens 6 Zeichen",
    unlock: "Entsperren",
    logout: "Abmelden",
    qrLogin: "QR-Anmeldung mit Handy",
    qrLoginDesc: "QR-Code mit der Mobile-App scannen",
    // Email Login
    emailLogin: "Mit E-Mail anmelden",
    emailLoginDesc: "Mit E-Mail und Passwort anmelden",
    email: "E-Mail",
    loginButton: "Anmelden",
    registerButton: "Registrieren",
    noAccount: "Noch kein Konto?",
    hasAccount: "Bereits ein Konto?",
    registerTitle: "Konto erstellen",
    loginTitle: "Anmelden",
    name: "Vollständiger Name",
    phone: "Telefon",
    passwordRequirements: "Min. 8 Zeichen, 1 Großbuchstabe, 1 Kleinbuchstabe, 1 Zahl",
    invalidEmail: "Ungültige E-Mail-Adresse",
    invalidPassword: "Passwort muss mindestens 8 Zeichen mit 1 Großbuchstaben, 1 Kleinbuchstaben und 1 Zahl enthalten",
    loginError: "Anmeldung fehlgeschlagen. Bitte überprüfen Sie Ihre Angaben.",
    registerError: "Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.",
    registerSuccess: "Registrierung erfolgreich! Bitte bestätigen Sie Ihre E-Mail.",
    verifyEmail: "E-Mail-Bestätigung",
    verifyEmailDesc: "Geben Sie den 6-stelligen Code ein, der an Ihre E-Mail gesendet wurde",
    verificationCode: "Bestätigungscode",
    verifyButton: "Bestätigen",
    resendCode: "Code erneut senden",
    codeSent: "Code gesendet!",
    invalidCode: "Ungültiger Code",
    or: "oder",
    // Section titles
    walletSection: "Wallet",
    accountSection: "Konto",
    walletSectionDesc: "Verwalten Sie Ihre eigenen Schlüssel",
    accountSectionDesc: "Mit E-Mail oder Google anmelden",
    // Google Login
    googleLogin: "Mit Google fortfahren",
    googleLoginError: "Google-Anmeldung fehlgeschlagen",
  },
  fr: {
    welcomeTitle: "Bienvenue sur Auxite Wallet",
    welcomeSubtitle: "Stockez en toute sécurité vos tokens adossés aux métaux physiques",
    createNewWallet: "Créer un nouveau portefeuille",
    importWallet: "Importer un portefeuille existant",
    seedPhraseTitle: "Votre phrase de récupération",
    seedPhraseWarning: "⚠️ Écrivez ces 12 mots dans un endroit sûr! Ne les partagez jamais!",
    iWroteItDown: "Je l'ai noté, Continuer",
    verifyTitle: "Vérifier la phrase de récupération",
    selectWord: "Mot #",
    verifyError: "Mauvais mot sélectionné",
    setPinTitle: "Créer un mot de passe",
    setPinSubtitle: "Définissez votre mot de passe de sécurité (min 6 caractères)",
    confirmPinTitle: "Confirmer le mot de passe",
    pinMismatch: "Les mots de passe ne correspondent pas",
    enterPinTitle: "Entrer le mot de passe",
    wrongPin: "Mot de passe incorrect",
    forgotPin: "Mot de passe oublié",
    securityTip: "Conseil de sécurité",
    neverShare: "Ne partagez jamais votre phrase de récupération",
    noScreenshot: "Ne prenez pas de captures d'écran",
    writeOnPaper: "Écrivez sur papier et conservez en lieu sûr",
    keysOnDevice: "Vos clés sont stockées uniquement dans votre navigateur",
    scanQR: "Scanner le code QR",
    orEnterManually: "ou entrez manuellement",
    import: "Importer",
    reveal: "Révéler les mots",
    hide: "Masquer",
    copy: "Copier",
    copied: "Copié!",
    continue: "Continuer",
    back: "Retour",
    cancel: "Annuler",
    invalidSeed: "Phrase de récupération invalide",
    enterSeedPlaceholder: "Entrez la phrase de récupération...",
    password: "Mot de passe",
    confirmPassword: "Confirmer le mot de passe",
    passwordHint: "Minimum 6 caractères",
    unlock: "Déverrouiller",
    logout: "Déconnexion",
    qrLogin: "Connexion QR Mobile",
    qrLoginDesc: "Scannez le code QR depuis l'application mobile",
    // Email Login
    emailLogin: "Connexion par e-mail",
    emailLoginDesc: "Connectez-vous avec votre e-mail et mot de passe",
    email: "E-mail",
    loginButton: "Se connecter",
    registerButton: "S'inscrire",
    noAccount: "Pas de compte?",
    hasAccount: "Déjà un compte?",
    registerTitle: "Créer un compte",
    loginTitle: "Se connecter",
    name: "Nom complet",
    phone: "Téléphone",
    passwordRequirements: "Min 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre",
    invalidEmail: "Adresse e-mail invalide",
    invalidPassword: "Le mot de passe doit contenir au moins 8 caractères avec 1 majuscule, 1 minuscule et 1 chiffre",
    loginError: "Échec de la connexion. Veuillez vérifier vos identifiants.",
    registerError: "Échec de l'inscription. Veuillez réessayer.",
    registerSuccess: "Inscription réussie! Veuillez vérifier votre e-mail.",
    verifyEmail: "Vérification de l'e-mail",
    verifyEmailDesc: "Entrez le code à 6 chiffres envoyé à votre e-mail",
    verificationCode: "Code de vérification",
    verifyButton: "Vérifier",
    resendCode: "Renvoyer le code",
    codeSent: "Code envoyé!",
    invalidCode: "Code invalide",
    or: "ou",
    // Section titles
    walletSection: "Portefeuille",
    accountSection: "Compte",
    walletSectionDesc: "Gérez vos propres clés",
    accountSectionDesc: "Connectez-vous avec email ou Google",
    // Google Login
    googleLogin: "Continuer avec Google",
    googleLoginError: "Échec de la connexion Google",
  },
  ar: {
    welcomeTitle: "مرحباً بك في محفظة Auxite",
    welcomeSubtitle: "قم بتخزين رموز المعادن المدعومة فعلياً بأمان",
    createNewWallet: "إنشاء محفظة جديدة",
    importWallet: "استيراد محفظة موجودة",
    seedPhraseTitle: "عبارة الاسترداد الخاصة بك",
    seedPhraseWarning: "⚠️ اكتب هذه الكلمات الـ 12 في مكان آمن! لا تشاركها أبداً!",
    iWroteItDown: "كتبتها، استمر",
    verifyTitle: "تحقق من عبارة الاسترداد",
    selectWord: "الكلمة #",
    verifyError: "تم اختيار كلمة خاطئة",
    setPinTitle: "إنشاء كلمة مرور",
    setPinSubtitle: "حدد كلمة مرور الأمان (6 أحرف على الأقل)",
    confirmPinTitle: "تأكيد كلمة المرور",
    pinMismatch: "كلمات المرور غير متطابقة",
    enterPinTitle: "أدخل كلمة المرور",
    wrongPin: "كلمة مرور خاطئة",
    forgotPin: "نسيت كلمة المرور",
    securityTip: "نصيحة أمنية",
    neverShare: "لا تشارك عبارة الاسترداد أبداً",
    noScreenshot: "لا تأخذ لقطات شاشة",
    writeOnPaper: "اكتب على الورق واحفظ بأمان",
    keysOnDevice: "يتم تخزين مفاتيحك فقط في متصفحك",
    scanQR: "مسح رمز QR",
    orEnterManually: "أو أدخل يدوياً",
    import: "استيراد",
    reveal: "إظهار الكلمات",
    hide: "إخفاء",
    copy: "نسخ",
    copied: "تم النسخ!",
    continue: "استمر",
    back: "رجوع",
    cancel: "إلغاء",
    invalidSeed: "عبارة استرداد غير صالحة",
    enterSeedPlaceholder: "أدخل عبارة الاسترداد...",
    password: "كلمة المرور",
    confirmPassword: "تأكيد كلمة المرور",
    passwordHint: "6 أحرف على الأقل",
    unlock: "فتح القفل",
    logout: "تسجيل الخروج",
    qrLogin: "تسجيل الدخول بـ QR",
    qrLoginDesc: "امسح رمز QR من تطبيق الهاتف",
    // Email Login
    emailLogin: "تسجيل الدخول بالبريد الإلكتروني",
    emailLoginDesc: "سجل الدخول باستخدام بريدك الإلكتروني وكلمة المرور",
    email: "البريد الإلكتروني",
    loginButton: "تسجيل الدخول",
    registerButton: "إنشاء حساب",
    noAccount: "ليس لديك حساب؟",
    hasAccount: "لديك حساب بالفعل؟",
    registerTitle: "إنشاء حساب",
    loginTitle: "تسجيل الدخول",
    name: "الاسم الكامل",
    phone: "الهاتف",
    passwordRequirements: "8 أحرف على الأقل، 1 حرف كبير، 1 حرف صغير، 1 رقم",
    invalidEmail: "عنوان بريد إلكتروني غير صالح",
    invalidPassword: "يجب أن تحتوي كلمة المرور على 8 أحرف على الأقل مع 1 حرف كبير و 1 حرف صغير و 1 رقم",
    loginError: "فشل تسجيل الدخول. يرجى التحقق من بياناتك.",
    registerError: "فشل التسجيل. يرجى المحاولة مرة أخرى.",
    registerSuccess: "تم التسجيل بنجاح! يرجى التحقق من بريدك الإلكتروني.",
    verifyEmail: "التحقق من البريد الإلكتروني",
    verifyEmailDesc: "أدخل الرمز المكون من 6 أرقام المرسل إلى بريدك الإلكتروني",
    verificationCode: "رمز التحقق",
    verifyButton: "تحقق",
    resendCode: "إعادة إرسال الرمز",
    codeSent: "تم إرسال الرمز!",
    invalidCode: "رمز غير صالح",
    or: "أو",
    // Section titles
    walletSection: "المحفظة",
    accountSection: "الحساب",
    walletSectionDesc: "أدر مفاتيحك الخاصة",
    accountSectionDesc: "سجل الدخول بالبريد الإلكتروني أو Google",
    // Google Login
    googleLogin: "المتابعة مع Google",
    googleLoginError: "فشل تسجيل الدخول بـ Google",
  },
  ru: {
    welcomeTitle: "Добро пожаловать в Auxite Wallet",
    welcomeSubtitle: "Безопасно храните токены, обеспеченные физическими металлами",
    createNewWallet: "Создать новый кошелек",
    importWallet: "Импортировать существующий кошелек",
    seedPhraseTitle: "Ваша фраза восстановления",
    seedPhraseWarning: "⚠️ Запишите эти 12 слов в безопасном месте! Никогда не делитесь ими!",
    iWroteItDown: "Я записал, Продолжить",
    verifyTitle: "Подтвердите фразу восстановления",
    selectWord: "Слово #",
    verifyError: "Выбрано неверное слово",
    setPinTitle: "Создать пароль",
    setPinSubtitle: "Установите пароль безопасности (мин. 6 символов)",
    confirmPinTitle: "Подтвердить пароль",
    pinMismatch: "Пароли не совпадают",
    enterPinTitle: "Введите пароль",
    wrongPin: "Неверный пароль",
    forgotPin: "Забыли пароль",
    securityTip: "Совет по безопасности",
    neverShare: "Никогда не делитесь фразой восстановления",
    noScreenshot: "Не делайте скриншотов",
    writeOnPaper: "Запишите на бумаге и храните в безопасности",
    keysOnDevice: "Ваши ключи хранятся только в вашем браузере",
    scanQR: "Сканировать QR-код",
    orEnterManually: "или введите вручную",
    import: "Импортировать",
    reveal: "Показать слова",
    hide: "Скрыть",
    copy: "Копировать",
    copied: "Скопировано!",
    continue: "Продолжить",
    back: "Назад",
    cancel: "Отмена",
    invalidSeed: "Недействительная фраза восстановления",
    enterSeedPlaceholder: "Введите фразу восстановления...",
    password: "Пароль",
    confirmPassword: "Подтвердить пароль",
    passwordHint: "Минимум 6 символов",
    unlock: "Разблокировать",
    logout: "Выйти",
    qrLogin: "QR Вход с мобильного",
    qrLoginDesc: "Отсканируйте QR-код в мобильном приложении",
    // Email Login
    emailLogin: "Вход по электронной почте",
    emailLoginDesc: "Войдите с помощью электронной почты и пароля",
    email: "Электронная почта",
    loginButton: "Войти",
    registerButton: "Регистрация",
    noAccount: "Нет аккаунта?",
    hasAccount: "Уже есть аккаунт?",
    registerTitle: "Создать аккаунт",
    loginTitle: "Войти",
    name: "Полное имя",
    phone: "Телефон",
    passwordRequirements: "Мин. 8 символов, 1 заглавная, 1 строчная, 1 цифра",
    invalidEmail: "Неверный адрес электронной почты",
    invalidPassword: "Пароль должен содержать не менее 8 символов с 1 заглавной, 1 строчной буквой и 1 цифрой",
    loginError: "Ошибка входа. Проверьте свои данные.",
    registerError: "Ошибка регистрации. Попробуйте снова.",
    registerSuccess: "Регистрация успешна! Подтвердите свою почту.",
    verifyEmail: "Подтверждение почты",
    verifyEmailDesc: "Введите 6-значный код, отправленный на вашу почту",
    verificationCode: "Код подтверждения",
    verifyButton: "Подтвердить",
    resendCode: "Отправить код снова",
    codeSent: "Код отправлен!",
    invalidCode: "Неверный код",
    or: "или",
    // Section titles
    walletSection: "Кошелек",
    accountSection: "Аккаунт",
    walletSectionDesc: "Управляйте своими ключами",
    accountSectionDesc: "Войдите через email или Google",
    // Google Login
    googleLogin: "Продолжить с Google",
    googleLoginError: "Ошибка входа через Google",
  },
};

// ============================================
// STORAGE KEYS
// ============================================
const STORAGE_KEYS = {
  HAS_WALLET: "auxite_has_wallet",
  ENCRYPTED_SEED: "auxite_encrypted_seed",
  PASSWORD_HASH: "auxite_password_hash",
  WALLET_ADDRESS: "auxite_wallet_address",
};

// ============================================
// CRYPTO UTILS
// ============================================
function generateSeedPhrase(): string[] {
  const words: string[] = [];
  const usedIndices = new Set<number>();
  while (words.length < 12) {
    const randomIndex = Math.floor(Math.random() * BIP39_WORDLIST.length);
    if (!usedIndices.has(randomIndex)) {
      usedIndices.add(randomIndex);
      words.push(BIP39_WORDLIST[randomIndex]);
    }
  }
  return words;
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "AUXITE_SALT_2024");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function deriveAddressFromSeed(seedPhrase: string[]): Promise<string> {
  const seedString = seedPhrase.join(" ");
  const encoder = new TextEncoder();
  const data = encoder.encode(seedString);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return "0x" + hash.substring(0, 40);
}

function encryptSeed(seedPhrase: string[], password: string): string {
  // Basit base64 - gerçek uygulamada AES kullanın
  return btoa(seedPhrase.join(","));
}

function decryptSeed(encryptedSeed: string, password: string): string[] | null {
  try {
    return atob(encryptedSeed).split(",");
  } catch {
    return null;
  }
}

// ============================================
// TYPES
// ============================================
type WalletStep =
  | "checking"
  | "onboarding"
  | "create"
  | "verify"
  | "password"
  | "confirm-password"
  | "import"
  | "unlock"
  | "ready"
  | "email-login"
  | "email-register"
  | "email-verify";

interface WalletOnboardingProps {
  lang?: "tr" | "en" | "de" | "fr" | "ar" | "ru";
  onWalletReady: (address: string) => void;
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function WalletOnboarding({
  lang = "tr",
  onWalletReady,
}: WalletOnboardingProps) {
  const [step, setStep] = useState<WalletStep>("checking");
  const [seedPhrase, setSeedPhrase] = useState<string[]>([]);
  const [seedRevealed, setSeedRevealed] = useState(false);
  const [verifyStep, setVerifyStep] = useState(0);
  const [verifyIndices, setVerifyIndices] = useState<number[]>([]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [importSeedInput, setImportSeedInput] = useState("");
  const [storedPasswordHash, setStoredPasswordHash] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  // Email login states
  const [emailInput, setEmailInput] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailConfirmPassword, setEmailConfirmPassword] = useState("");
  const [emailName, setEmailName] = useState("");
  const [emailPhone, setEmailPhone] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const t = (key: string) => (translations[lang] as Record<string, string>)[key] || key;

  // Check if wallet exists
  useEffect(() => {
    checkWalletExists();
  }, []);

  const checkWalletExists = () => {
    const hasWallet = localStorage.getItem(STORAGE_KEYS.HAS_WALLET);
    const passwordHash = localStorage.getItem(STORAGE_KEYS.PASSWORD_HASH);
    const address = localStorage.getItem(STORAGE_KEYS.WALLET_ADDRESS);

    if (hasWallet === "true" && passwordHash) {
      setStoredPasswordHash(passwordHash);
      setWalletAddress(address);
      setStep("unlock");
    } else {
      setStep("onboarding");
    }
  };

  // Create wallet
  const handleCreateWallet = () => {
    const newSeed = generateSeedPhrase();
    setSeedPhrase(newSeed);
    setSeedRevealed(false);
    setStep("create");
  };

  // Generate verify indices
  const generateVerifyIndices = (): number[] => {
    const indices: number[] = [];
    while (indices.length < 3) {
      const idx = Math.floor(Math.random() * 12);
      if (!indices.includes(idx)) {
        indices.push(idx);
      }
    }
    return indices.sort((a, b) => a - b);
  };

  // Continue after seed display
  const handleSeedContinue = () => {
    setVerifyIndices(generateVerifyIndices());
    setVerifyStep(0);
    setStep("verify");
  };

  // Verify word
  const handleVerifyWord = (selectedWord: string, correctWord: string): boolean => {
    if (selectedWord === correctWord) {
      if (verifyStep < 2) {
        setVerifyStep(verifyStep + 1);
      } else {
        setPassword("");
        setConfirmPassword("");
        setStep("password");
      }
      return true;
    }
    return false;
  };

  // Set password
  const handleSetPassword = () => {
    if (password.length < 6) {
      setPasswordError(t("passwordHint"));
      return;
    }
    setPasswordError("");
    setStep("confirm-password");
  };

  // Confirm password and save
  const handleConfirmPassword = async () => {
    if (password !== confirmPassword) {
      setPasswordError(t("pinMismatch"));
      return;
    }

    const passwordHash = await hashPassword(password);
    const encryptedSeed = encryptSeed(seedPhrase, password);
    const address = await deriveAddressFromSeed(seedPhrase);

    localStorage.setItem(STORAGE_KEYS.HAS_WALLET, "true");
    localStorage.setItem(STORAGE_KEYS.PASSWORD_HASH, passwordHash);
    localStorage.setItem(STORAGE_KEYS.ENCRYPTED_SEED, encryptedSeed);
    localStorage.setItem(STORAGE_KEYS.WALLET_ADDRESS, address);

    setWalletAddress(address);
    onWalletReady(address);
  };

  // Import wallet
  const handleImportSubmit = () => {
    const words = importSeedInput.trim().toLowerCase().split(/\s+/);

    if (words.length !== 12 && words.length !== 24) {
      alert(t("invalidSeed"));
      return;
    }

    const validWords = words.every((word) => BIP39_WORDLIST.includes(word));
    if (!validWords) {
      alert(t("invalidSeed"));
      return;
    }

    setSeedPhrase(words);
    setPassword("");
    setConfirmPassword("");
    setStep("password");
  };

  // Unlock
  const handleUnlock = async () => {
    const enteredHash = await hashPassword(unlockPassword);
    if (enteredHash === storedPasswordHash) {
      if (walletAddress) {
        onWalletReady(walletAddress);
      }
    } else {
      setUnlockError(t("wrongPin"));
      setUnlockPassword("");
    }
  };

  // Forgot password
  const handleForgotPassword = () => {
    if (confirm(lang === "tr" 
      ? "Cüzdanınızı sıfırlamak istediğinize emin misiniz? Seed phrase ile tekrar içe aktarmanız gerekecek." 
      : "Are you sure you want to reset? You will need to re-import with your seed phrase.")) {
      localStorage.removeItem(STORAGE_KEYS.HAS_WALLET);
      localStorage.removeItem(STORAGE_KEYS.PASSWORD_HASH);
      localStorage.removeItem(STORAGE_KEYS.ENCRYPTED_SEED);
      localStorage.removeItem(STORAGE_KEYS.WALLET_ADDRESS);
      setStep("import");
    }
  };

  // Copy seed
  const handleCopySeed = () => {
    navigator.clipboard.writeText(seedPhrase.join(" "));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Get options for verify
  const getVerifyOptions = (correctWord: string): string[] => {
    const options = [correctWord];
    while (options.length < 4) {
      const randomWord = BIP39_WORDLIST[Math.floor(Math.random() * BIP39_WORDLIST.length)];
      if (!options.includes(randomWord)) {
        options.push(randomWord);
      }
    }
    return options.sort(() => Math.random() - 0.5);
  };

  // ============================================
  // EMAIL LOGIN FUNCTIONS
  // ============================================
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

  const handleEmailLogin = async () => {
    setEmailError("");

    if (!EMAIL_REGEX.test(emailInput)) {
      setEmailError(t("invalidEmail"));
      return;
    }

    setIsEmailLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput, password: emailPassword }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setEmailError(data.error || t("loginError"));
        return;
      }

      // Store auth token
      localStorage.setItem("auxite_auth_token", data.token);
      setAuthToken(data.token);

      // Check if email needs verification
      if (data.requiresEmailVerification) {
        setPendingEmail(emailInput);
        setStep("email-verify");
        return;
      }

      // Check if wallet needs setup
      if (data.requiresWalletSetup || !data.user.walletAddress) {
        // User logged in but has no wallet - go to wallet creation
        localStorage.setItem("auxite_auth_email", emailInput);
        localStorage.setItem("auxite_auth_user_id", data.user.id);
        setStep("onboarding");
        return;
      }

      // User has wallet - complete login
      const walletAddr = data.user.walletAddress;
      localStorage.setItem("auxite_wallet_mode", "custodial");
      localStorage.setItem("auxite_wallet_address", walletAddr);
      localStorage.setItem("auxite_has_wallet", "true");
      localStorage.setItem("auxite_auth_email", emailInput);
      sessionStorage.setItem("auxite_session_unlocked", "true");

      window.dispatchEvent(new Event("walletChanged"));
      onWalletReady(walletAddr);

    } catch (err) {
      console.error("Login error:", err);
      setEmailError(t("loginError"));
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleEmailRegister = async () => {
    setEmailError("");

    if (!EMAIL_REGEX.test(emailInput)) {
      setEmailError(t("invalidEmail"));
      return;
    }

    if (!PASSWORD_REGEX.test(emailPassword)) {
      setEmailError(t("invalidPassword"));
      return;
    }

    if (emailPassword !== emailConfirmPassword) {
      setEmailError(t("pinMismatch"));
      return;
    }

    setIsEmailLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailInput,
          password: emailPassword,
          name: emailName,
          phone: emailPhone,
          language: lang,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setEmailError(data.error || t("registerError"));
        return;
      }

      // Store auth token
      localStorage.setItem("auxite_auth_token", data.token);
      setAuthToken(data.token);
      setPendingEmail(emailInput);
      setStep("email-verify");

    } catch (err) {
      console.error("Register error:", err);
      setEmailError(t("registerError"));
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setEmailError("");
    setIsEmailLoading(true);

    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: pendingEmail,
          code: verificationCode,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setEmailError(data.error || t("invalidCode"));
        return;
      }

      // Email verified - now setup wallet
      localStorage.setItem("auxite_auth_email", pendingEmail);
      localStorage.setItem("auxite_auth_user_id", data.user?.id || "");

      // Go back to onboarding to create wallet
      setStep("onboarding");

    } catch (err) {
      console.error("Verify error:", err);
      setEmailError(t("invalidCode"));
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;

    try {
      await fetch("/api/auth/resend-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail }),
      });

      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (err) {
      console.error("Resend error:", err);
    }
  };

  // ============================================
  // GOOGLE LOGIN
  // ============================================
  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      // Redirect to Google OAuth
      window.location.href = "/api/auth/google/redirect";
    } catch (err) {
      console.error("Google login error:", err);
      setEmailError(t("googleLoginError"));
      setIsGoogleLoading(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  // Checking
  if (step === "checking") {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-emerald-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div className="animate-spin w-8 h-8 border-2 border-slate-600 border-t-emerald-500 rounded-full mx-auto"></div>
        </div>
      </div>
    );
  }

  // Onboarding
  if (step === "onboarding") {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          {/* Logo */}
          <div className="mb-8 text-center">
            <Image
              src="/auxite-wallet-logo.png"
              alt="Auxite"
              width={200}
              height={50}
              className="h-14 w-auto mx-auto"
            />
          </div>

          <h1 className="text-3xl font-bold text-white mb-3 text-center">{t("welcomeTitle")}</h1>
          <p className="text-slate-400 mb-8 text-center">{t("welcomeSubtitle")}</p>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* ACCOUNT SECTION - Email & Google Login */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-white font-semibold">{t("accountSection")}</h2>
                <p className="text-xs text-slate-400">{t("accountSectionDesc")}</p>
              </div>
            </div>

            {/* Google Login */}
            <button
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading}
              className="w-full py-3.5 bg-white hover:bg-gray-100 text-gray-800 font-medium rounded-xl flex items-center justify-center gap-3 transition-colors mb-3"
            >
              {isGoogleLoading ? (
                <div className="animate-spin w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {t("googleLogin")}
                </>
              )}
            </button>

            {/* Email Login/Signup */}
            <button
              onClick={() => setStep("email-login")}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {t("emailLogin")}
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-slate-700"></div>
            <span className="text-slate-500 text-sm">{t("or")}</span>
            <div className="flex-1 h-px bg-slate-700"></div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* WALLET SECTION - Create, Import, QR */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-white font-semibold">{t("walletSection")}</h2>
                <p className="text-xs text-slate-400">{t("walletSectionDesc")}</p>
              </div>
            </div>

            {/* Create New Wallet */}
            <button
              onClick={handleCreateWallet}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-xl mb-3 flex items-center justify-center gap-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {t("createNewWallet")}
            </button>

            {/* Import Wallet */}
            <button
              onClick={() => setStep("import")}
              className="w-full py-3.5 border border-emerald-500 text-emerald-500 hover:bg-emerald-500/10 font-medium rounded-xl flex items-center justify-center gap-2 transition-colors mb-3"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {t("importWallet")}
            </button>

            {/* QR Login Option */}
            <button
              onClick={() => setShowQRModal(true)}
              className="w-full py-3.5 border border-slate-600 text-slate-300 hover:bg-slate-800 font-medium rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              {t("qrLogin")}
            </button>
          </div>

          {/* Security note */}
          <p className="text-xs text-slate-500 mt-6 flex items-center justify-center gap-2 text-center">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            {t("keysOnDevice")}
          </p>

          {/* QR Login Modal */}
          <QRLoginModal
            isOpen={showQRModal}
            onClose={() => setShowQRModal(false)}
            onSuccess={(walletAddress, authToken) => {
              console.log("QR Login success:", walletAddress);
              // Save to localStorage - all required keys
              localStorage.setItem("auxite_wallet_mode", "local");
              localStorage.setItem("auxite_wallet_address", walletAddress);
              localStorage.setItem("auxite_has_wallet", "true");
              sessionStorage.setItem("auxite_session_unlocked", "true");
              // Notify other components
              window.dispatchEvent(new Event("walletChanged"));
              // Close modal and trigger wallet ready
              setShowQRModal(false);
              onWalletReady(walletAddress);
            }}
            lang={lang}
          />
        </div>
      </div>
    );
  }

  // Seed Display
  if (step === "create") {
    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <div className="max-w-lg mx-auto">
          {/* Back */}
          <button onClick={() => setStep("onboarding")} className="text-slate-400 hover:text-white mb-6 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t("back")}
          </button>

          {/* Logo */}
          <div className="mb-6 text-center">
            <Image
              src="/auxite-wallet-logo.png"
              alt="Auxite"
              width={160}
              height={40}
              className="h-10 w-auto mx-auto"
            />
          </div>

          <h1 className="text-2xl font-bold text-white mb-2 text-center">{t("seedPhraseTitle")}</h1>

          {/* Warning */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
            <p className="text-amber-400 text-sm">{t("seedPhraseWarning")}</p>
          </div>

          {/* Seed Grid */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {seedPhrase.map((word, index) => (
              <div key={index} className="bg-slate-800 rounded-lg p-3 flex items-center gap-2 border border-slate-700">
                <span className="text-slate-500 text-xs w-5">{index + 1}</span>
                <span className={`font-medium ${seedRevealed ? "text-white" : "text-slate-600"}`}>
                  {seedRevealed ? word : "••••••"}
                </span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setSeedRevealed(!seedRevealed)}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {seedRevealed ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                )}
              </svg>
              {seedRevealed ? t("hide") : t("reveal")}
            </button>
            <button
              onClick={handleCopySeed}
              disabled={!seedRevealed}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {copied ? t("copied") : t("copy")}
            </button>
          </div>

          {/* Tips */}
          <div className="bg-slate-800 rounded-xl p-4 mb-6">
            <h3 className="text-white font-medium mb-3">{t("securityTip")}</h3>
            <div className="space-y-2">
              <p className="text-sm text-slate-400 flex items-center gap-2">
                <span className="text-red-400">✕</span> {t("neverShare")}
              </p>
              <p className="text-sm text-slate-400 flex items-center gap-2">
                <span className="text-red-400">✕</span> {t("noScreenshot")}
              </p>
              <p className="text-sm text-slate-400 flex items-center gap-2">
                <span className="text-emerald-400">✓</span> {t("writeOnPaper")}
              </p>
            </div>
          </div>

          {/* Continue */}
          <button
            onClick={handleSeedContinue}
            disabled={!seedRevealed}
            className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl transition-colors"
          >
            {t("iWroteItDown")}
          </button>
        </div>
      </div>
    );
  }

  // Verify
  if (step === "verify") {
    const currentIndex = verifyIndices[verifyStep];
    const correctWord = seedPhrase[currentIndex];
    const options = getVerifyOptions(correctWord);

    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <div className="max-w-lg mx-auto">
          {/* Back */}
          <button onClick={() => setStep("create")} className="text-slate-400 hover:text-white mb-6 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t("back")}
          </button>

          {/* Logo */}
          <div className="mb-6 text-center">
            <Image
              src="/auxite-wallet-logo.png"
              alt="Auxite"
              width={160}
              height={40}
              className="h-10 w-auto mx-auto"
            />
          </div>

          <h1 className="text-2xl font-bold text-white mb-2 text-center">{t("verifyTitle")}</h1>

          {/* Progress */}
          <div className="flex gap-2 mb-8">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`flex-1 h-1 rounded-full ${i <= verifyStep ? "bg-emerald-500" : "bg-slate-700"}`} />
            ))}
          </div>

          {/* Prompt */}
          <div className="bg-slate-800 rounded-xl p-6 text-center mb-8">
            <p className="text-slate-400 mb-2">{t("selectWord")}</p>
            <p className="text-3xl font-bold text-white">{currentIndex + 1}</p>
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-3">
            {options.map((word, index) => (
              <button
                key={index}
                onClick={() => {
                  if (!handleVerifyWord(word, correctWord)) {
                    alert(t("verifyError"));
                  }
                }}
                className="py-4 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl border border-slate-700 hover:border-emerald-500 transition-all"
              >
                {word}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Password
  if (step === "password" || step === "confirm-password") {
    const isConfirm = step === "confirm-password";

    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <div className="max-w-lg mx-auto">
          {/* Back */}
          <button
            onClick={() => setStep(isConfirm ? "password" : "verify")}
            className="text-slate-400 hover:text-white mb-6 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t("back")}
          </button>

          {/* Icon */}
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-white text-center mb-2">
            {isConfirm ? t("confirmPinTitle") : t("setPinTitle")}
          </h1>
          <p className="text-slate-400 text-center mb-8">{t("setPinSubtitle")}</p>

          {/* Input */}
          <input
            type="password"
            value={isConfirm ? confirmPassword : password}
            onChange={(e) => {
              if (isConfirm) {
                setConfirmPassword(e.target.value);
              } else {
                setPassword(e.target.value);
              }
              setPasswordError("");
            }}
            placeholder={isConfirm ? t("confirmPassword") : t("password")}
            className="w-full py-4 px-4 bg-slate-800 border border-slate-700 rounded-xl text-white text-center text-lg focus:outline-none focus:border-emerald-500 mb-4"
            autoFocus
          />

          {/* Error */}
          {passwordError && (
            <p className="text-red-400 text-sm text-center mb-4">{passwordError}</p>
          )}

          {/* Continue */}
          <button
            onClick={isConfirm ? handleConfirmPassword : handleSetPassword}
            disabled={isConfirm ? confirmPassword.length < 6 : password.length < 6}
            className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl transition-colors"
          >
            {t("continue")}
          </button>
        </div>
      </div>
    );
  }

  // Import
  if (step === "import") {
    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <div className="max-w-lg mx-auto">
          {/* Back */}
          <button onClick={() => setStep("onboarding")} className="text-slate-400 hover:text-white mb-6 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t("back")}
          </button>

          <h1 className="text-2xl font-bold text-white mb-2">{t("importWallet")}</h1>
          <p className="text-slate-400 mb-6">
            {lang === "tr" ? "12 veya 24 kelimelik kurtarma ifadenizi girin" : "Enter your 12 or 24 word recovery phrase"}
          </p>

          {/* Input */}
          <textarea
            value={importSeedInput}
            onChange={(e) => setImportSeedInput(e.target.value)}
            placeholder={t("enterSeedPlaceholder")}
            rows={4}
            className="w-full py-4 px-4 bg-slate-800 border border-slate-700 rounded-xl text-white resize-none focus:outline-none focus:border-emerald-500 mb-4"
            autoFocus
          />

          {/* Hint */}
          <p className="text-xs text-slate-500 mb-4 text-center">
            {lang === "tr" 
              ? "Kelimeleri boşluk ile ayırarak girin" 
              : "Enter words separated by spaces"}
          </p>

          {/* Import */}
          <button
            onClick={handleImportSubmit}
            disabled={!importSeedInput.trim()}
            className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {t("import")}
          </button>
        </div>
      </div>
    );
  }

  // Unlock
  if (step === "unlock") {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          {/* Icon */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">{t("enterPinTitle")}</h1>
          <p className="text-slate-400 mb-8">
            {lang === "tr" ? "Cüzdanınıza erişmek için şifre girin" : "Enter password to access your wallet"}
          </p>

          {/* Input */}
          <input
            type="password"
            value={unlockPassword}
            onChange={(e) => {
              setUnlockPassword(e.target.value);
              setUnlockError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
            placeholder={t("password")}
            className="w-full py-4 px-4 bg-slate-800 border border-slate-700 rounded-xl text-white text-center text-lg focus:outline-none focus:border-emerald-500 mb-4"
            autoFocus
          />

          {/* Error */}
          {unlockError && (
            <p className="text-red-400 text-sm mb-4">{unlockError}</p>
          )}

          {/* Unlock */}
          <button
            onClick={handleUnlock}
            disabled={unlockPassword.length < 6}
            className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl transition-colors mb-4"
          >
            {t("unlock")}
          </button>

          {/* Forgot */}
          <button
            onClick={handleForgotPassword}
            className="text-emerald-500 hover:text-emerald-400 text-sm"
          >
            {t("forgotPin")}
          </button>
        </div>
      </div>
    );
  }

  // Email Login
  if (step === "email-login") {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          {/* Back */}
          <button
            onClick={() => {
              setEmailError("");
              setEmailInput("");
              setEmailPassword("");
              setStep("onboarding");
            }}
            className="text-slate-400 hover:text-white mb-6 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t("back")}
          </button>

          {/* Icon */}
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-amber-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-white text-center mb-2">{t("loginTitle")}</h1>
          <p className="text-slate-400 text-center mb-8">{t("emailLoginDesc")}</p>

          {/* Email Input */}
          <div className="mb-4">
            <label className="block text-slate-400 text-sm mb-2">{t("email")}</label>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => {
                setEmailInput(e.target.value);
                setEmailError("");
              }}
              placeholder="name@example.com"
              className="w-full py-4 px-4 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
              autoFocus
            />
          </div>

          {/* Password Input */}
          <div className="mb-4">
            <label className="block text-slate-400 text-sm mb-2">{t("password")}</label>
            <input
              type="password"
              value={emailPassword}
              onChange={(e) => {
                setEmailPassword(e.target.value);
                setEmailError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleEmailLogin()}
              placeholder="••••••••"
              className="w-full py-4 px-4 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Error */}
          {emailError && (
            <p className="text-red-400 text-sm text-center mb-4">{emailError}</p>
          )}

          {/* Login Button */}
          <button
            onClick={handleEmailLogin}
            disabled={!emailInput || !emailPassword || isEmailLoading}
            className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl transition-colors mb-4 flex items-center justify-center gap-2"
          >
            {isEmailLoading ? (
              <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                {t("loginButton")}
              </>
            )}
          </button>

          {/* Register Link */}
          <p className="text-center text-slate-400">
            {t("noAccount")}{" "}
            <button
              onClick={() => {
                setEmailError("");
                setStep("email-register");
              }}
              className="text-amber-500 hover:text-amber-400 font-medium"
            >
              {t("registerButton")}
            </button>
          </p>
        </div>
      </div>
    );
  }

  // Email Register
  if (step === "email-register") {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          {/* Back */}
          <button
            onClick={() => {
              setEmailError("");
              setStep("email-login");
            }}
            className="text-slate-400 hover:text-white mb-6 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t("back")}
          </button>

          {/* Icon */}
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-amber-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-white text-center mb-2">{t("registerTitle")}</h1>
          <p className="text-slate-400 text-center mb-8">{t("emailLoginDesc")}</p>

          {/* Name Input */}
          <div className="mb-4">
            <label className="block text-slate-400 text-sm mb-2">{t("name")}</label>
            <input
              type="text"
              value={emailName}
              onChange={(e) => setEmailName(e.target.value)}
              placeholder="John Doe"
              className="w-full py-3 px-4 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
              autoFocus
            />
          </div>

          {/* Email Input */}
          <div className="mb-4">
            <label className="block text-slate-400 text-sm mb-2">{t("email")} *</label>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => {
                setEmailInput(e.target.value);
                setEmailError("");
              }}
              placeholder="name@example.com"
              className="w-full py-3 px-4 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Phone Input */}
          <div className="mb-4">
            <label className="block text-slate-400 text-sm mb-2">{t("phone")}</label>
            <input
              type="tel"
              value={emailPhone}
              onChange={(e) => setEmailPhone(e.target.value)}
              placeholder="+90 555 123 4567"
              className="w-full py-3 px-4 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Password Input */}
          <div className="mb-4">
            <label className="block text-slate-400 text-sm mb-2">{t("password")} *</label>
            <input
              type="password"
              value={emailPassword}
              onChange={(e) => {
                setEmailPassword(e.target.value);
                setEmailError("");
              }}
              placeholder="••••••••"
              className="w-full py-3 px-4 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
            />
            <p className="text-xs text-slate-500 mt-1">{t("passwordRequirements")}</p>
          </div>

          {/* Confirm Password Input */}
          <div className="mb-4">
            <label className="block text-slate-400 text-sm mb-2">{t("confirmPassword")} *</label>
            <input
              type="password"
              value={emailConfirmPassword}
              onChange={(e) => {
                setEmailConfirmPassword(e.target.value);
                setEmailError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleEmailRegister()}
              placeholder="••••••••"
              className="w-full py-3 px-4 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Error */}
          {emailError && (
            <p className="text-red-400 text-sm text-center mb-4">{emailError}</p>
          )}

          {/* Register Button */}
          <button
            onClick={handleEmailRegister}
            disabled={!emailInput || !emailPassword || !emailConfirmPassword || isEmailLoading}
            className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl transition-colors mb-4 flex items-center justify-center gap-2"
          >
            {isEmailLoading ? (
              <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                {t("registerButton")}
              </>
            )}
          </button>

          {/* Login Link */}
          <p className="text-center text-slate-400">
            {t("hasAccount")}{" "}
            <button
              onClick={() => {
                setEmailError("");
                setStep("email-login");
              }}
              className="text-amber-500 hover:text-amber-400 font-medium"
            >
              {t("loginButton")}
            </button>
          </p>
        </div>
      </div>
    );
  }

  // Email Verify
  if (step === "email-verify") {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          {/* Icon */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-500/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">{t("verifyEmail")}</h1>
          <p className="text-slate-400 mb-2">{t("verifyEmailDesc")}</p>
          <p className="text-amber-500 font-medium mb-8">{pendingEmail}</p>

          {/* Code Input */}
          <input
            type="text"
            value={verificationCode}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "").slice(0, 6);
              setVerificationCode(val);
              setEmailError("");
            }}
            placeholder="000000"
            maxLength={6}
            className="w-full py-4 px-4 bg-slate-800 border border-slate-700 rounded-xl text-white text-center text-2xl tracking-widest font-mono focus:outline-none focus:border-amber-500 mb-4"
            autoFocus
          />

          {/* Error */}
          {emailError && (
            <p className="text-red-400 text-sm mb-4">{emailError}</p>
          )}

          {/* Verify Button */}
          <button
            onClick={handleVerifyCode}
            disabled={verificationCode.length !== 6 || isEmailLoading}
            className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl transition-colors mb-4 flex items-center justify-center gap-2"
          >
            {isEmailLoading ? (
              <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {t("verifyButton")}
              </>
            )}
          </button>

          {/* Resend Code */}
          <button
            onClick={handleResendCode}
            disabled={resendCooldown > 0}
            className="text-amber-500 hover:text-amber-400 text-sm disabled:text-slate-500"
          >
            {resendCooldown > 0 ? `${t("resendCode")} (${resendCooldown}s)` : t("resendCode")}
          </button>
        </div>
      </div>
    );
  }

  return null;
}