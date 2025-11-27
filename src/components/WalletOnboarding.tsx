"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

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
  | "ready";

interface WalletOnboardingProps {
  lang?: "tr" | "en";
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

  const t = (key: keyof typeof translations.tr) => translations[lang][key];

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
        <div className="max-w-md w-full text-center">
          {/* Logo */}
          <div className="mb-8">
            <Image
              src="/auxite-wallet-logo.png"
              alt="Auxite"
              width={200}
              height={50}
              className="h-14 w-auto mx-auto"
            />
          </div>

          <h1 className="text-3xl font-bold text-white mb-3">{t("welcomeTitle")}</h1>
          <p className="text-slate-400 mb-10">{t("welcomeSubtitle")}</p>

          {/* Features */}
          <div className="flex justify-center gap-8 mb-10">
            <div className="text-center">
              <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="text-xs text-slate-400">Non-custodial</span>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <span className="text-xs text-slate-400">Your Keys</span>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <span className="text-xs text-slate-400">Secure</span>
            </div>
          </div>

          {/* Buttons */}
          <button
            onClick={handleCreateWallet}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl mb-3 flex items-center justify-center gap-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {t("createNewWallet")}
          </button>

          <button
            onClick={() => setStep("import")}
            className="w-full py-4 border border-emerald-500 text-emerald-500 hover:bg-emerald-500/10 font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {t("importWallet")}
          </button>

          {/* Security note */}
          <p className="text-xs text-slate-500 mt-6 flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t("keysOnDevice")}
          </p>
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
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl transition-colors"
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
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl transition-colors"
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
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
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
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl transition-colors mb-4"
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

  return null;
}