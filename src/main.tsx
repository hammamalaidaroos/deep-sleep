import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocsFromServer,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type Timestamp,
} from 'firebase/firestore';
import {
  ALLOWED_ADMIN_EMAILS,
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  testConnection,
} from './firebase';

const catBedroomsImg = '/images/cat_bedrooms_1795356606600.jpg';
const catBedsImg = '/images/cat_beds_1795356608056.jpg';
const catMattressesImg = '/images/cat_mattresses_1795356607473.jpg';
const catNightstandsImg = '/images/cat_nightstands_1795356607135.jpg';
const catPillowsImg = '/images/cat_pillows_1795356607922.jpg';
const catVanitiesImg = '/images/cat_vanities_1795356607145.jpg';
const catWallDecorImg = '/images/cat_wall_decor_1795356606599.jpg';
const catWardrobesImg = '/images/cat_wardrobes_1795356607093.jpg';
const heroDeepSleepImg = '/images/hero_deep_sleep_1795356605655.jpg';

interface CategoryDef {
  id: string;
  ar: string;
  image: string;
}

interface ProductItem {
  id: string;
  category: string;
  nameAr: string;
  descAr: string;
  price: number;
  discountPercent: number;
  specsAr: string;
  image: string;
  createdBy?: string;
  createdAtMs?: number;
}

const STORE_PHONE = '+966559626031';

const LOCAL_IMAGE_ASSET_MAP: Record<string, string> = {
  '/src/assets/images/cat_bedrooms_1795356606600.jpg': catBedroomsImg,
  '/src/assets/images/cat_beds_1795356608056.jpg': catBedsImg,
  '/src/assets/images/cat_vanities_1795356607145.jpg': catVanitiesImg,
  '/src/assets/images/cat_wardrobes_1795356607093.jpg': catWardrobesImg,
  '/src/assets/images/cat_mattresses_1795356607473.jpg': catMattressesImg,
  '/src/assets/images/cat_wall_decor_1795356606599.jpg': catWallDecorImg,
  '/src/assets/images/cat_nightstands_1795356607135.jpg': catNightstandsImg,
  '/src/assets/images/cat_pillows_1795356607922.jpg': catPillowsImg,
  '/src/assets/images/hero_deep_sleep_1795356605655.jpg': heroDeepSleepImg,
};

const ASSET_ENTRIES: Array<{ canonical: string; prefix: string; url: string }> = [
  { canonical: catBedroomsImg, prefix: 'cat_bedrooms_', url: catBedroomsImg },
  { canonical: catBedsImg, prefix: 'cat_beds_', url: catBedsImg },
  { canonical: catVanitiesImg, prefix: 'cat_vanities_', url: catVanitiesImg },
  { canonical: catWardrobesImg, prefix: 'cat_wardrobes_', url: catWardrobesImg },
  { canonical: catMattressesImg, prefix: 'cat_mattresses_', url: catMattressesImg },
  { canonical: catWallDecorImg, prefix: 'cat_wall_decor_', url: catWallDecorImg },
  { canonical: catNightstandsImg, prefix: 'cat_nightstands_', url: catNightstandsImg },
  { canonical: catPillowsImg, prefix: 'cat_pillows_', url: catPillowsImg },
  { canonical: heroDeepSleepImg, prefix: 'hero_deep_sleep_', url: heroDeepSleepImg },
];

const CATEGORIES: CategoryDef[] = [
  { id: 'bedrooms', ar: 'غرف نوم', image: catBedroomsImg },
  { id: 'beds', ar: 'أسرة', image: catBedsImg },
  { id: 'vanities', ar: 'تسريحات', image: catVanitiesImg },
  { id: 'wardrobes', ar: 'خزائن ملابس', image: catWardrobesImg },
  { id: 'mattresses', ar: 'مراتب', image: catMattressesImg },
  { id: 'wall_decor', ar: 'جداريّات', image: catWallDecorImg },
  { id: 'nightstands', ar: 'كمدونات', image: catNightstandsImg },
  { id: 'pillows', ar: 'مخدات', image: catPillowsImg },
];

const INITIAL_PRODUCTS: ProductItem[] = [
  {
    id: 'ds-101',
    category: 'bedrooms',
    nameAr: 'طقم غرفة نوم فيرونا الكلاسيكي',
    descAr:
      'طقم متكامل من خشب الجوز الطبيعي يشمل سريراً مزدوجاً، كمدونتين جانبيتين، ومقعد نهاية السرير بتنجيد كتاني.',
    price: 14800,
    discountPercent: 15,
    specsAr: 'خشب جوز طبيعي · مقاس كينج 200×200 سم · ضمان 5 سنوات',
    image: catBedroomsImg,
  },
  {
    id: 'ds-102',
    category: 'bedrooms',
    nameAr: 'غرفة نوم سولاريس السنديان',
    descAr:
      'تصميم معماري هادئ من السنديان الأوروبي الفاتح مع تشطيبات مطفية تمنح الغرفة اتساعاً وإضاءة دافئة.',
    price: 16500,
    discountPercent: 0,
    specsAr: 'خشب سنديان أوروبي · 5 قطع متكاملة · تشطيب مقاوم للرطوبة',
    image: heroDeepSleepImg,
  },
  {
    id: 'ds-201',
    category: 'beds',
    nameAr: 'سرير بيلو المنجد بقماش البوكليه',
    descAr:
      'لوح رأسي مبطن بأزرار يدوية مغلف بقماش البوكليه الكريمي الفاخر على قاعدة متينة من خشب السنديان.',
    price: 6900,
    discountPercent: 12,
    specsAr: 'قماش بوكليه فاخر · مقاس 180×200 سم · قواعد سنديان',
    image: catBedsImg,
  },
  {
    id: 'ds-202',
    category: 'beds',
    nameAr: 'سرير أوريون الخشبي المنخفض',
    descAr:
      'إطار سرير عائم بتصميم ياباني-إسكندنافي متوازن يبرز عروق الخشب الطبيعي دون زوائد معدنية.',
    price: 5400,
    discountPercent: 0,
    specsAr: 'سنديان صلب · مقاس 200×200 سم · شرائح تهوية مرنة',
    image: heroDeepSleepImg,
  },
  {
    id: 'ds-301',
    category: 'vanities',
    nameAr: 'تسريحة لومير بسطح الترافرتين',
    descAr:
      'طاولة تسريحة أنيقة بسطح رخام الترافرتين الطبيعي مع مرآة مقوسة بإطار نحاسي مطفي وكرسي دائري مبطن.',
    price: 4350,
    discountPercent: 10,
    specsAr: 'رخام ترافرتين + سنديان · العرض 120 سم · شاملة المرآة والكرسي',
    image: catVanitiesImg,
  },
  {
    id: 'ds-302',
    category: 'vanities',
    nameAr: 'تسريحة أتيليه بدرج مخملي',
    descAr:
      'تسريحة كلاسيكية مقسمة داخلياً لحفظ المجوهرات والإكسسوارات مع مسار إغلاق هادئ (Soft-Close).',
    price: 3800,
    discountPercent: 0,
    specsAr: 'خشب طبيعي · عرض 110 سم · مبطنة بالمخمل من الداخل',
    image: catVanitiesImg,
  },
  {
    id: 'ds-401',
    category: 'wardrobes',
    nameAr: 'خزانة أريا بأبواب خشب مخددة وزجاج برونزي',
    descAr:
      'خزانة ملابس فاخرة تجمع بين ألواح السنديان المخددة وأبواب زجاجية برونزية مزودة بإضاءة LED داخلية دافئة.',
    price: 11200,
    discountPercent: 15,
    specsAr: 'عرض 280 سم · ارتفاع 240 سم · إضاءة استشعار تلقائية',
    image: catWardrobesImg,
  },
  {
    id: 'ds-402',
    category: 'wardrobes',
    nameAr: 'خزانة نوبل 4 أبواب بتقسيم ذكي',
    descAr:
      'تصميم داخلي مرن يوفر وحدات تعليق مزدوجة وأدراج تنظيم عميقة بمفصلات ألمانية عالية التحمل.',
    price: 8950,
    discountPercent: 0,
    specsAr: 'عرض 220 سم · 4 أبواب · مفصلات إغلاق هادئ',
    image: catWardrobesImg,
  },
  {
    id: 'ds-501',
    category: 'mattresses',
    nameAr: 'مرتبة لونا الهجينة الطبية الفاخرة',
    descAr:
      'طبقة يورو-توب من القطن العضوي المبطن مع 7 مناطق دعم للنوابض المنفصلة وحواف ذهبية مطرزة.',
    price: 4600,
    discountPercent: 20,
    specsAr: 'ارتفاع 32 سم · صلابة متوسطة-مريحة · ضمان استبدال 10 سنوات',
    image: catMattressesImg,
  },
  {
    id: 'ds-502',
    category: 'mattresses',
    nameAr: 'مرتبة ديب كلاود ميموري فوم',
    descAr:
      'رغوة ذاكرة مسامية بتقنية تبريد طبيعية تتكيف مع انحناءات الجسم وتعزل الحركة بشكل كامل بين الشريكين.',
    price: 3900,
    discountPercent: 0,
    specsAr: 'ارتفاع 28 سم · عزل حركة 100% · غطاء قطني قابل للنزع',
    image: catMattressesImg,
  },
  {
    id: 'ds-601',
    category: 'wall_decor',
    nameAr: 'تكسيات جدارية سنديان وحجر ترافرتين',
    descAr:
      'نظام جداريات معمارية يدمج ألواح الترافرتين الدافئة مع شرائح الخشب المخددة وإضاءة خلفية غير مباشرة.',
    price: 3200,
    discountPercent: 10,
    specsAr: 'سعر المتر المربع يشمل التركيب · عزل صوتي إضافي · إضاءة دافئة',
    image: catWallDecorImg,
  },
  {
    id: 'ds-602',
    category: 'wall_decor',
    nameAr: 'لوحة جدارية بارزة بإطار جوز طبيعي',
    descAr:
      'عمل فني يدوي بتضاريس جبسية رملية هادئة مؤطرة بخشب الجوز الطبيعي لإضفاء عمق راقٍ فوق السرير.',
    price: 1450,
    discountPercent: 0,
    specsAr: 'مقاس 90×120 سم · إطار جوز طبيعي · جاهزة للتعليق',
    image: catBedroomsImg,
  },
  {
    id: 'ds-701',
    category: 'nightstands',
    nameAr: 'كمدونة ترافرتين وخشب السنديان',
    descAr:
      'طاولة جانبية للسرير بسطح رخام ترافرتين مصقول ودرج سحب سلس من خشب السنديان الطبيعي.',
    price: 1850,
    discountPercent: 15,
    specsAr: '55×45×52 سم · سطح حجر طبيعي مقاوم للبقع · درج مخفي',
    image: catNightstandsImg,
  },
  {
    id: 'ds-702',
    category: 'nightstands',
    nameAr: 'كمدونة كلاسيكية برف مفتوح',
    descAr:
      'كمدونة عملية بدرج علوي للخصوصية ورف سفلي مفتوح للكتب مع تناسب مثالي لارتفاعات الأسرة الفندقية.',
    price: 1520,
    discountPercent: 0,
    specsAr: '50×42×54 سم · خشب جوز أمريكي · زوايا مشطوفة ناعمة',
    image: catBedroomsImg,
  },
  {
    id: 'ds-801',
    category: 'pillows',
    nameAr: 'طقم مخدات فندقية ريش الإوز الطبيعي',
    descAr:
      'مخدتان فاخرتان محشوتان بريش الإوز الأبيض المعقم داخل غلاف قطن مصري 600 غرزة بحواف ذهبية مزدوجة.',
    price: 680,
    discountPercent: 18,
    specsAr: 'مقاس قياسي 50×75 سم · قطن مصري 100% · طقم من قطعتين',
    image: catPillowsImg,
  },
  {
    id: 'ds-802',
    category: 'pillows',
    nameAr: 'مخدة طبية داعمة للرقبة والكتف',
    descAr:
      'تصميم متوازن يريح فقرات الرقبة أثناء النوم الجانبي والظهري مع نسيج خيزران لطيف على البشرة.',
    price: 420,
    discountPercent: 0,
    specsAr: 'مقاس 50×70 سم · غطاء قابل للغسيل · مضادة للحساسية',
    image: catPillowsImg,
  },
];

// Application State
let activeCategory = 'all';
let searchQuery = '';
let products: ProductItem[] = [...INITIAL_PRODUCTS];
let firestoreHasData = false;
let firestoreServerSynced = false;
let firestoreInitialSeedDone = false;
let seedInProgressPromise: Promise<void> | null = null;
let pendingUploadedImage = '';
let pendingDeleteId: string | null = null;
let currentUser: User | null = null;
let isCurrentUserAdmin = false;
let isAuthReady = false;
let toastTimer: number | undefined;

// DOM Elements
const mobileMenuBtn = document.getElementById('mobileMenuBtn') as HTMLButtonElement;
const mobileNavDrawer = document.getElementById('mobileNavDrawer') as HTMLDivElement;
const categoriesGrid = document.getElementById('categoriesGrid') as HTMLDivElement;
const showAllCategoriesBtn = document.getElementById('showAllCategoriesBtn') as HTMLButtonElement;
const productsGrid = document.getElementById('productsGrid') as HTMLDivElement;
const activeCategoryHeading = document.getElementById('activeCategoryHeading') as HTMLElement;
const productsCountLabel = document.getElementById('productsCountLabel') as HTMLElement;
const searchInput = document.getElementById('searchInput') as HTMLInputElement;

// Product Modal DOM
const productModal = document.getElementById('productModal') as HTMLDivElement;
const closeProductModalBtn = document.getElementById('closeProductModalBtn') as HTMLButtonElement;
const modalProductImg = document.getElementById('modalProductImg') as HTMLImageElement;
const modalProductCategory = document.getElementById('modalProductCategory') as HTMLDivElement;
const modalProductTitle = document.getElementById('modalProductTitle') as HTMLHeadingElement;
const modalProductPrice = document.getElementById('modalProductPrice') as HTMLSpanElement;
const modalProductOldPrice = document.getElementById('modalProductOldPrice') as HTMLSpanElement;
const modalDiscountNote = document.getElementById('modalDiscountNote') as HTMLSpanElement;
const modalProductDesc = document.getElementById('modalProductDesc') as HTMLParagraphElement;
const modalProductSpecs = document.getElementById('modalProductSpecs') as HTMLDivElement;
const modalWhatsappBtn = document.getElementById('modalWhatsappBtn') as HTMLAnchorElement;
const modalPhoneBtn = document.getElementById('modalPhoneBtn') as HTMLAnchorElement;

// Admin Modal DOM
const openAdminBtn = document.getElementById('openAdminBtn') as HTMLButtonElement;
const adminModal = document.getElementById('adminModal') as HTMLDivElement;
const closeAdminModalBtn = document.getElementById('closeAdminModalBtn') as HTMLButtonElement;
const adminAuthGate = document.getElementById('adminAuthGate') as HTMLDivElement;
const adminUnauthorizedGate = document.getElementById('adminUnauthorizedGate') as HTMLDivElement;
const adminDashboardView = document.getElementById('adminDashboardView') as HTMLDivElement;
const googleSignInBtn = document.getElementById('googleSignInBtn') as HTMLButtonElement;
const adminAuthError = document.getElementById('adminAuthError') as HTMLDivElement;
const adminDashboardError = document.getElementById('adminDashboardError') as HTMLDivElement;
const unauthorizedEmailText = document.getElementById('unauthorizedEmailText') as HTMLElement;
const switchAccountBtn = document.getElementById('switchAccountBtn') as HTMLButtonElement;
const adminUserEmailBadge = document.getElementById('adminUserEmailBadge') as HTMLElement;
const adminSignOutBtn = document.getElementById('adminSignOutBtn') as HTMLButtonElement;
const resetDemoDataBtn = document.getElementById('resetDemoDataBtn') as HTMLButtonElement;
const adminProductForm = document.getElementById('adminProductForm') as HTMLFormElement;
const adminFormHeading = document.getElementById('adminFormHeading') as HTMLHeadingElement;
const editingProductIdInput = document.getElementById('editingProductId') as HTMLInputElement;
const prodNameInput = document.getElementById('prodNameInput') as HTMLInputElement;
const prodCategoryInput = document.getElementById('prodCategoryInput') as HTMLSelectElement;
const prodPriceInput = document.getElementById('prodPriceInput') as HTMLInputElement;
const prodDiscountInput = document.getElementById('prodDiscountInput') as HTMLInputElement;
const prodDescInput = document.getElementById('prodDescInput') as HTMLTextAreaElement;
const prodImageFile = document.getElementById('prodImageFile') as HTMLInputElement;
const prodImageUrlInput = document.getElementById('prodImageUrlInput') as HTMLInputElement;
const uploadPreviewBox = document.getElementById('uploadPreviewBox') as HTMLDivElement;
const uploadPreviewImg = document.getElementById('uploadPreviewImg') as HTMLImageElement;
const adminSubmitBtn = document.getElementById('adminSubmitBtn') as HTMLButtonElement;
const adminCancelEditBtn = document.getElementById('adminCancelEditBtn') as HTMLButtonElement;
const adminProductsTableBody = document.getElementById('adminProductsTableBody') as HTMLTableSectionElement;
const statTotalProducts = document.getElementById('statTotalProducts') as HTMLElement;
const statDiscountedCount = document.getElementById('statDiscountedCount') as HTMLElement;
const toastBanner = document.getElementById('toastBanner') as HTMLDivElement;

function showToast(message: string): void {
  toastBanner.textContent = message;
  toastBanner.classList.add('visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toastBanner.classList.remove('visible');
  }, 3500);
}

function setAdminBannerError(target: 'auth' | 'dashboard', message: string | null): void {
  const el = target === 'auth' ? adminAuthError : adminDashboardError;
  if (!el) return;
  if (!message) {
    el.style.display = 'none';
    el.textContent = '';
  } else {
    el.style.display = 'block';
    el.textContent = message;
  }
}

function getCategoryObj(catId: string): CategoryDef {
  return CATEGORIES.find((c) => c.id === catId) || CATEGORIES[0];
}

function resolveImageUrl(rawUrl: string, fallbackCategory = 'bedrooms'): string {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return getCategoryObj(fallbackCategory).image;
  if (LOCAL_IMAGE_ASSET_MAP[trimmed]) return LOCAL_IMAGE_ASSET_MAP[trimmed];
  if (!trimmed.startsWith('data:') && !trimmed.startsWith('http')) {
    const matched = ASSET_ENTRIES.find((entry) => trimmed.includes(entry.prefix));
    if (matched) return matched.url;
  }
  return trimmed;
}

function toCanonicalImagePath(rawUrl: string): string {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('http')) {
    return trimmed;
  }
  const matched = ASSET_ENTRIES.find((entry) => trimmed.includes(entry.prefix));
  return matched ? matched.canonical : trimmed;
}

function formatPrice(amount: number): string {
  const formatted = Number(amount).toLocaleString('en-US');
  return `${formatted} ر.س`;
}

function computeDiscountedPrice(price: number, discountPercent: number): number {
  const pct = Number(discountPercent) || 0;
  if (pct <= 0) return price;
  return Math.round(price * (1 - pct / 100));
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeImageString(raw: string, fallback: string): string {
  const cleaned = raw.trim();
  if (!cleaned) return fallback;
  if (cleaned.length > 850000) return fallback;
  return cleaned;
}

async function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('فشل قراءة ملف الصورة'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('ملف الصورة غير صالح'));
      img.onload = () => {
        const widths = [960, 720, 540];
        const qualities = [0.8, 0.65, 0.5, 0.38];
        for (const maxW of widths) {
          const scale = img.width > maxW ? maxW / img.width : 1;
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(String(reader.result));
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          for (const q of qualities) {
            const dataUrl = canvas.toDataURL('image/jpeg', q);
            if (dataUrl.length <= 750000) {
              resolve(dataUrl);
              return;
            }
          }
        }
        reject(new Error('حجم الصورة كبير جداً بعد الضغط'));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

async function checkAdminStatus(user: User | null): Promise<boolean> {
  if (!user || !user.email || !user.emailVerified) return false;
  if (ALLOWED_ADMIN_EMAILS.includes(user.email.toLowerCase())) return true;
  try {
    const adminSnap = await getDoc(doc(db, 'admins', user.uid));
    return adminSnap.exists();
  } catch {
    return false;
  }
}

function updateAdminModalView(): void {
  setAdminBannerError('auth', null);
  setAdminBannerError('dashboard', null);

  if (!isAuthReady || !currentUser) {
    adminAuthGate.style.display = 'flex';
    adminUnauthorizedGate.style.display = 'none';
    adminDashboardView.style.display = 'none';
    return;
  }

  if (!isCurrentUserAdmin) {
    adminAuthGate.style.display = 'none';
    adminUnauthorizedGate.style.display = 'flex';
    adminDashboardView.style.display = 'none';
    unauthorizedEmailText.textContent = currentUser.email || 'حساب غير معروف';
    return;
  }

  adminAuthGate.style.display = 'none';
  adminUnauthorizedGate.style.display = 'none';
  adminDashboardView.style.display = 'block';
  adminUserEmailBadge.textContent = currentUser.email || '';
  populateAdminCategories();
  renderAdminTable();
}

function isOfflineOrNetworkError(error: unknown): boolean {
  const code = (error as { code?: string })?.code || '';
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    code === 'unavailable' ||
    msg.includes('client is offline') ||
    msg.includes('failed to get document from server') ||
    msg.includes('network')
  );
}

async function seedDefaultProductsToFirestore(
  user: User,
  forceRestore: boolean,
  showSuccessToast: boolean
): Promise<void> {
  if (seedInProgressPromise) {
    return seedInProgressPromise;
  }

  seedInProgressPromise = (async () => {
    try {
      let existingSnap;
      try {
        // Always read from server so an empty offline cache never triggers an illegal overwrite batch.
        existingSnap = await getDocsFromServer(collection(db, 'products'));
      } catch (readError) {
        if (isOfflineOrNetworkError(readError)) {
          if (forceRestore || showSuccessToast) {
            const offlineMsg = 'تعذر الاتصال بقاعدة البيانات حالياً. يرجى التحقق من اتصال الإنترنت ثم المحاولة مجدداً.';
            setAdminBannerError('dashboard', offlineMsg);
            showToast(offlineMsg);
          }
          return;
        }
        const msg = 'تعذر قراءة المنتجات من قاعدة البيانات. يرجى التحقق من الصلاحيات.';
        setAdminBannerError('dashboard', msg);
        showToast(msg);
        handleFirestoreError(readError, OperationType.LIST, 'products');
      }

      const existingIds = new Set<string>();
      existingSnap.forEach((docSnap) => {
        existingIds.add(docSnap.id);
      });

      if (!forceRestore && !existingSnap.empty) {
        firestoreHasData = true;
        firestoreInitialSeedDone = true;
        return;
      }

      const batch = writeBatch(db);
      let opsCount = 0;

      INITIAL_PRODUCTS.forEach((item) => {
        const ref = doc(db, 'products', item.id);
        if (!existingIds.has(item.id)) {
          batch.set(ref, {
            category: item.category,
            nameAr: item.nameAr.slice(0, 140),
            descAr: item.descAr.slice(0, 1200),
            price: Number(item.price),
            discountPercent: Number(item.discountPercent) || 0,
            specsAr: item.specsAr.slice(0, 300),
            image: toCanonicalImagePath(item.image),
            createdBy: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          opsCount += 1;
        } else if (forceRestore) {
          // Preserve immutable createdBy and createdAt when restoring existing default products
          batch.update(ref, {
            category: item.category,
            nameAr: item.nameAr.slice(0, 140),
            descAr: item.descAr.slice(0, 1200),
            price: Number(item.price),
            discountPercent: Number(item.discountPercent) || 0,
            specsAr: item.specsAr.slice(0, 300),
            image: toCanonicalImagePath(item.image),
            updatedAt: serverTimestamp(),
          });
          opsCount += 1;
        }
      });

      if (opsCount > 0) {
        try {
          await batch.commit();
        } catch (writeError) {
          if (isOfflineOrNetworkError(writeError)) {
            const offlineMsg = 'تعذر حفظ التغييرات لأن الاتصال بقاعدة البيانات منقطع حالياً.';
            setAdminBannerError('dashboard', offlineMsg);
            showToast(offlineMsg);
            return;
          }
          const msg = 'تعذر حفظ أو استعادة البيانات الافتراضية في قاعدة البيانات. تأكد من صلاحيات الحساب.';
          setAdminBannerError('dashboard', msg);
          showToast(msg);
          handleFirestoreError(writeError, OperationType.WRITE, 'products');
        }
      }

      firestoreInitialSeedDone = true;
      firestoreHasData = true;
      setAdminBannerError('dashboard', null);
      if (showSuccessToast) {
        showToast('تمت مزامنة واستعادة كتالوج Deep Sleep الافتراضي في السحابة');
      }
    } finally {
      seedInProgressPromise = null;
    }
  })();

  return seedInProgressPromise;
}

function subscribeToProducts(): void {
  const productsRef = collection(db, 'products');
  onSnapshot(
    productsRef,
    (snapshot) => {
      const fromServer = !snapshot.metadata.fromCache;
      if (fromServer) {
        firestoreServerSynced = true;
      }

      if (snapshot.empty) {
        firestoreHasData = false;
        products = [...INITIAL_PRODUCTS];
        if (fromServer && !firestoreInitialSeedDone && isCurrentUserAdmin && currentUser) {
          void seedDefaultProductsToFirestore(currentUser, false, false).catch(() => {});
        }
      } else {
        firestoreHasData = true;
        firestoreInitialSeedDone = true;
        const loaded: ProductItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const createdTs = data.createdAt as Timestamp | undefined;
          const catId = String(data.category || 'bedrooms');
          loaded.push({
            id: docSnap.id,
            category: catId,
            nameAr: String(data.nameAr || ''),
            descAr: String(data.descAr || ''),
            price: Number(data.price) || 0,
            discountPercent: Number(data.discountPercent) || 0,
            specsAr: String(data.specsAr || ''),
            image: resolveImageUrl(String(data.image || ''), catId),
            createdBy: data.createdBy ? String(data.createdBy) : undefined,
            createdAtMs: createdTs && typeof createdTs.toMillis === 'function' ? createdTs.toMillis() : 0,
          });
        });
        loaded.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
        products = loaded;
      }
      renderProducts();
      updateDynamicSeoMetadata();
      if (isCurrentUserAdmin) {
        renderAdminTable();
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    }
  );
}

// Render Category Circles
function renderCategories(): void {
  categoriesGrid.innerHTML = CATEGORIES.map((cat) => {
    const label = cat.ar;
    const isActive = activeCategory === cat.id;
    return `
      <button
        type="button"
        class="category-circle-btn ${isActive ? 'active' : ''}"
        data-category-id="${cat.id}"
        role="tab"
        aria-selected="${isActive}"
      >
        <span class="category-avatar">
          <img
            src="${escapeHtml(cat.image)}"
            alt="${escapeHtml(label)}"
            onerror="this.style.display='none'; if (this.nextElementSibling) this.nextElementSibling.style.display='flex';"
          />
          <span class="category-avatar-fallback" style="display: none" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
              <path d="M2 18v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5M2 15h20M4 11V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
            </svg>
          </span>
        </span>
        <span class="category-name">${escapeHtml(label)}</span>
      </button>
    `;
  }).join('');

  showAllCategoriesBtn.classList.toggle('active', activeCategory === 'all');

  categoriesGrid.querySelectorAll('.category-circle-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const catId = btn.getAttribute('data-category-id') || 'all';
      activeCategory = activeCategory === catId ? 'all' : catId;
      renderCategories();
      renderProducts();
      document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

// Render Products Grid
function renderProducts(): void {
  const query = searchQuery.trim().toLowerCase();

  const filtered = products.filter((item) => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    if (!matchesCategory) return false;
    if (!query) return true;
    const textPool = [item.nameAr || '', item.descAr || ''].join(' ').toLowerCase();
    return textPool.includes(query);
  });

  if (activeCategory === 'all') {
    activeCategoryHeading.textContent = 'جميع المنتجات';
  } else {
    const cat = getCategoryObj(activeCategory);
    activeCategoryHeading.textContent = cat.ar;
  }

  productsCountLabel.textContent = `${filtered.length} منتج`;

  if (filtered.length === 0) {
    productsGrid.innerHTML = `
      <div class="empty-state">
        <h3 style="margin: 0 0 8px;">لا توجد منتجات مطابقة</h3>
        <p style="margin: 0; color: var(--text-muted);">جرّب اختيار قسم آخر أو مسح عبارة البحث.</p>
      </div>
    `;
    return;
  }

  productsGrid.innerHTML = filtered
    .map((product) => {
      const cat = getCategoryObj(product.category);
      const catLabel = cat.ar;
      const name = product.nameAr;
      const desc = product.descAr;
      const hasDiscount = Number(product.discountPercent) > 0;
      const finalPrice = computeDiscountedPrice(product.price, product.discountPercent);
      const discountText = `خصم ${product.discountPercent}%`;
      const imgUrl = resolveImageUrl(product.image, product.category);

      return `
        <article class="product-card" data-product-id="${escapeHtml(product.id)}">
          <div class="product-media">
            <img
              src="${escapeHtml(imgUrl)}"
              alt="${escapeHtml(name)}"
              loading="lazy"
              referrerpolicy="no-referrer"
              onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
            />
            <div class="image-fallback" style="display: none">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
                <path d="M2 18v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5M2 15h20M4 11V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
              </svg>
              <span>${escapeHtml(name)}</span>
            </div>
            ${hasDiscount ? `<span class="discount-tag">${escapeHtml(discountText)}</span>` : ''}
            <button
              type="button"
              class="eye-quick-btn"
              data-open-product="${escapeHtml(product.id)}"
              aria-label="عرض تفاصيل المنتج"
              title="عرض تفاصيل المنتج"
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </div>

          <div class="product-body">
            <div class="product-category-text">${escapeHtml(catLabel)}</div>
            <h3 class="product-title">${escapeHtml(name)}</h3>
            <p class="product-desc">${escapeHtml(desc)}</p>

            <div class="product-footer">
              <div class="price-group">
                <span class="price-current">${escapeHtml(formatPrice(finalPrice))}</span>
                ${
                  hasDiscount
                    ? `<span class="price-old">${escapeHtml(formatPrice(product.price))}</span>`
                    : ''
                }
              </div>

              <button
                type="button"
                class="details-link-btn"
                data-open-product="${escapeHtml(product.id)}"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <span>التفاصيل</span>
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join('');

  productsGrid.querySelectorAll('[data-open-product]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-open-product');
      if (id) openProductModal(id);
    });
  });
}

function openProductModal(productId: string): void {
  const product = products.find((p) => p.id === productId);
  if (!product) return;

  const cat = getCategoryObj(product.category);
  const name = product.nameAr;
  const finalPrice = computeDiscountedPrice(product.price, product.discountPercent);
  const hasDiscount = Number(product.discountPercent) > 0;

  modalProductImg.src = resolveImageUrl(product.image, product.category);
  modalProductImg.alt = name;
  modalProductCategory.textContent = cat.ar;
  modalProductTitle.textContent = name;
  modalProductPrice.textContent = formatPrice(finalPrice);

  if (hasDiscount) {
    modalProductOldPrice.textContent = formatPrice(product.price);
    modalProductOldPrice.style.display = 'inline';
    modalDiscountNote.textContent = `وفر ${product.discountPercent}%`;
    modalDiscountNote.style.display = 'inline';
  } else {
    modalProductOldPrice.style.display = 'none';
    modalDiscountNote.style.display = 'none';
  }

  modalProductDesc.textContent = product.descAr;
  modalProductSpecs.innerHTML = product.specsAr
    ? product.specsAr
        .split('·')
        .map((s) => `<span>${escapeHtml(s.trim())}</span>`)
        .join('<span aria-hidden="true">·</span>')
    : '';

  const inquiryText = `مرحباً Deep Sleep، أرغب بالاستفسار عن المنتج: ${name} (${formatPrice(finalPrice)})`;

  modalWhatsappBtn.href = `https://wa.me/${STORE_PHONE.replace('+', '')}?text=${encodeURIComponent(
    inquiryText
  )}`;
  modalPhoneBtn.href = `tel:${STORE_PHONE}`;

  productModal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeProductModal(): void {
  productModal.classList.remove('open');
  document.body.style.overflow = '';
}

// Admin Panel Logic
function populateAdminCategories(): void {
  const previousValue = prodCategoryInput.value;
  prodCategoryInput.innerHTML = CATEGORIES.map(
    (c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.ar)}</option>`
  ).join('');
  if (previousValue && CATEGORIES.some((c) => c.id === previousValue)) {
    prodCategoryInput.value = previousValue;
  }
}

function renderAdminTable(): void {
  statTotalProducts.textContent = String(products.length);
  statDiscountedCount.textContent = String(
    products.filter((p) => Number(p.discountPercent) > 0).length
  );

  adminProductsTableBody.innerHTML = products
    .map((p) => {
      const cat = getCategoryObj(p.category);
      const finalPrice = computeDiscountedPrice(p.price, p.discountPercent);
      const isConfirming = pendingDeleteId === p.id;
      const imgUrl = resolveImageUrl(p.image, p.category);
      return `
        <tr>
          <td>
            <img
              class="table-thumb"
              src="${escapeHtml(imgUrl)}"
              alt="${escapeHtml(p.nameAr)}"
              onerror="this.style.visibility='hidden';"
            />
          </td>
          <td><strong>${escapeHtml(p.nameAr)}</strong></td>
          <td>${escapeHtml(cat.ar)}</td>
          <td class="table-price">${Number(finalPrice).toLocaleString('en-US')} ر.س</td>
          <td style="font-variant-numeric: tabular-nums;">
            ${Number(p.discountPercent) > 0 ? `${p.discountPercent}%` : '—'}
          </td>
          <td>
            <div class="table-actions">
              <button
                type="button"
                class="table-btn"
                data-admin-edit="${escapeHtml(p.id)}"
              >
                تعديل
              </button>
              ${
                isConfirming
                  ? `<button type="button" class="table-btn danger" data-admin-confirm-del="${escapeHtml(p.id)}">تأكيد الحذف</button>
                     <button type="button" class="table-btn" data-admin-cancel-del>إلغاء</button>`
                  : `<button type="button" class="table-btn danger" data-admin-del="${escapeHtml(p.id)}">حذف</button>`
              }
            </div>
          </td>
        </tr>
      `;
    })
    .join('');

  adminProductsTableBody.querySelectorAll('[data-admin-edit]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-admin-edit');
      if (id) startEditProduct(id);
    });
  });

  adminProductsTableBody.querySelectorAll('[data-admin-del]').forEach((btn) => {
    btn.addEventListener('click', () => {
      pendingDeleteId = btn.getAttribute('data-admin-del');
      renderAdminTable();
    });
  });

  adminProductsTableBody.querySelectorAll('[data-admin-cancel-del]').forEach((btn) => {
    btn.addEventListener('click', () => {
      pendingDeleteId = null;
      renderAdminTable();
    });
  });

  adminProductsTableBody.querySelectorAll('[data-admin-confirm-del]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-admin-confirm-del');
      pendingDeleteId = null;
      if (!id || !isCurrentUserAdmin || !currentUser) return;

      try {
        setAdminBannerError('dashboard', null);
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          const offlineMsg = 'لا يوجد اتصال بالإنترنت حالياً. يرجى الاتصال ثم إعادة المحاولة.';
          setAdminBannerError('dashboard', offlineMsg);
          showToast(offlineMsg);
          return;
        }
        await deleteDoc(doc(db, 'products', id));
        showToast('تم حذف المنتج من قاعدة البيانات');
      } catch (error) {
        if (isOfflineOrNetworkError(error)) {
          const offlineMsg = 'تعذر حذف المنتج بسبب انقطاع الاتصال بقاعدة البيانات.';
          setAdminBannerError('dashboard', offlineMsg);
          showToast(offlineMsg);
          return;
        }
        const msg = 'تعذر حذف المنتج. تحقق من صلاحيات الحساب.';
        setAdminBannerError('dashboard', msg);
        showToast(msg);
        try {
          handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
        } catch {
          // Structured error already logged inside handleFirestoreError
        }
      }
    });
  });
}

function resetAdminForm(): void {
  editingProductIdInput.value = '';
  adminFormHeading.textContent = 'إضافة منتج جديد';
  adminSubmitBtn.textContent = 'حفظ المنتج';
  adminCancelEditBtn.style.display = 'none';
  adminProductForm.reset();
  pendingUploadedImage = '';
  uploadPreviewBox.classList.remove('has-image');
  uploadPreviewImg.src = '';
}

function startEditProduct(id: string): void {
  const prod = products.find((p) => p.id === id);
  if (!prod) return;
  editingProductIdInput.value = prod.id;
  adminFormHeading.textContent = 'تعديل بيانات المنتج';
  adminSubmitBtn.textContent = 'تحديث المنتج';
  adminCancelEditBtn.style.display = 'inline-flex';

  prodNameInput.value = prod.nameAr || '';
  prodCategoryInput.value = prod.category || CATEGORIES[0].id;
  prodPriceInput.value = String(prod.price || '');
  prodDiscountInput.value = prod.discountPercent ? String(prod.discountPercent) : '';
  prodDescInput.value = prod.descAr || '';
  const resolved = resolveImageUrl(prod.image || '', prod.category);
  prodImageUrlInput.value = resolved && !resolved.startsWith('data:') ? resolved : '';
  pendingUploadedImage = resolved;

  if (pendingUploadedImage) {
    uploadPreviewImg.src = pendingUploadedImage;
    uploadPreviewBox.classList.add('has-image');
  }
}

function openAdminModal(): void {
  updateAdminModalView();
  adminModal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeAdminModal(): void {
  adminModal.classList.remove('open');
  pendingDeleteId = null;
  document.body.style.overflow = '';
}

function mapAuthErrorToArabic(err: unknown): string {
  const code = (err as { code?: string })?.code || '';
  if (code === 'auth/popup-blocked') {
    return 'المتصفح حظر نافذة تسجيل الدخول المنبثقة. يرجى السماح بالنوافذ المنبثقة ثم المحاولة مجدداً.';
  }
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return 'تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية.';
  }
  if (code === 'auth/unauthorized-domain') {
    return 'نطاق الموقع غير مضاف حالياً ضمن النطاقات المصرح بها في إعدادات Firebase Auth.';
  }
  if (code === 'auth/network-request-failed') {
    return 'تعذر الاتصال بخدمة تسجيل الدخول من Google. تأكد من استقرار الإنترنت، وأوقف أي مانع إعلانات أو VPN مؤقتاً، أو افتح رابط المتجر في تبويب مستقل ثم أعد المحاولة.';
  }
  return 'تعذر تسجيل الدخول بحساب Google. يرجى المحاولة مرة أخرى.';
}

// Auth Event Handlers
googleSignInBtn.addEventListener('click', async () => {
  setAdminBannerError('auth', null);
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    const offlineMsg = 'يبدو أن جهازك غير متصل بالإنترنت حالياً. يرجى الاتصال بالإنترنت ثم إعادة المحاولة.';
    setAdminBannerError('auth', offlineMsg);
    showToast(offlineMsg);
    return;
  }

  googleSignInBtn.disabled = true;
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    const code = (error as { code?: string })?.code || '';
    if (
      code === 'auth/popup-blocked' ||
      code === 'auth/popup-closed-by-user' ||
      code === 'auth/cancelled-popup-request' ||
      code === 'auth/network-request-failed'
    ) {
      console.warn('Google Sign-In notice:', code);
    } else {
      console.error('Google Sign-In failed:', error);
    }
    const msg = mapAuthErrorToArabic(error);
    setAdminBannerError('auth', msg);
    showToast(msg);
  } finally {
    googleSignInBtn.disabled = false;
  }
});

switchAccountBtn.addEventListener('click', async () => {
  await signOut(auth);
});

adminSignOutBtn.addEventListener('click', async () => {
  await signOut(auth);
  resetAdminForm();
  showToast('تم تسجيل الخروج من لوحة التحكم');
});

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  isCurrentUserAdmin = await checkAdminStatus(user);
  isAuthReady = true;

  if (
    firestoreServerSynced &&
    !firestoreHasData &&
    !firestoreInitialSeedDone &&
    isCurrentUserAdmin &&
    user
  ) {
    void seedDefaultProductsToFirestore(user, false, false).catch(() => {});
  }

  if (adminModal.classList.contains('open')) {
    updateAdminModalView();
  }
});

// Storefront UI Event Bindings
mobileMenuBtn.addEventListener('click', () => {
  const isOpen = mobileNavDrawer.classList.toggle('open');
  mobileMenuBtn.setAttribute('aria-expanded', String(isOpen));
});

mobileNavDrawer.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    mobileNavDrawer.classList.remove('open');
    mobileMenuBtn.setAttribute('aria-expanded', 'false');
  });
});

showAllCategoriesBtn.addEventListener('click', () => {
  activeCategory = 'all';
  renderCategories();
  renderProducts();
});

searchInput.addEventListener('input', (e) => {
  searchQuery = (e.target as HTMLInputElement).value;
  renderProducts();
});

document.querySelectorAll('[data-quick-cat]').forEach((link) => {
  link.addEventListener('click', () => {
    activeCategory = link.getAttribute('data-quick-cat') || 'all';
    renderCategories();
    renderProducts();
  });
});

closeProductModalBtn.addEventListener('click', closeProductModal);
productModal.addEventListener('click', (e) => {
  if (e.target === productModal) closeProductModal();
});

openAdminBtn.addEventListener('click', openAdminModal);
closeAdminModalBtn.addEventListener('click', closeAdminModal);
adminModal.addEventListener('click', (e) => {
  if (e.target === adminModal) closeAdminModal();
});

adminCancelEditBtn.addEventListener('click', resetAdminForm);

prodImageFile.addEventListener('change', async (e) => {
  const input = e.target as HTMLInputElement;
  const file = input.files && input.files[0];
  if (!file) return;
  try {
    pendingUploadedImage = await compressImageFile(file);
    uploadPreviewImg.src = pendingUploadedImage;
    uploadPreviewBox.classList.add('has-image');
  } catch {
    showToast('تعذر معالجة الصورة المختارة أو حجمها كبير جداً');
  }
});

prodImageUrlInput.addEventListener('input', (e) => {
  const val = (e.target as HTMLInputElement).value.trim();
  if (val) {
    pendingUploadedImage = val;
    uploadPreviewImg.src = val;
    uploadPreviewBox.classList.add('has-image');
  } else if (!prodImageFile.files?.length) {
    pendingUploadedImage = '';
    uploadPreviewBox.classList.remove('has-image');
    uploadPreviewImg.src = '';
  }
});

adminProductForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  setAdminBannerError('dashboard', null);
  if (!isCurrentUserAdmin || !currentUser) {
    showToast('يجب تسجيل الدخول بحساب مدير معتمد');
    return;
  }

  const nameVal = prodNameInput.value.trim().slice(0, 140);
  const descVal = prodDescInput.value.trim().slice(0, 1200);
  const priceVal = Number(prodPriceInput.value);
  const discountVal = Math.min(90, Math.max(0, Number(prodDiscountInput.value) || 0));

  if (!nameVal || !descVal) {
    showToast('يرجى إدخال اسم المنتج والوصف بشكل صحيح');
    return;
  }
  if (!Number.isFinite(priceVal) || priceVal < 1 || priceVal > 10000000) {
    showToast('يرجى إدخال سعر صحيح بين 1 و 10,000,000 ر.س');
    return;
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    const offlineMsg = 'لا يوجد اتصال بالإنترنت حالياً. يرجى الاتصال ثم إعادة المحاولة.';
    setAdminBannerError('dashboard', offlineMsg);
    showToast(offlineMsg);
    return;
  }

  adminSubmitBtn.disabled = true;
  const editingId = editingProductIdInput.value;
  const categoryId = prodCategoryInput.value;
  const fallbackCategoryImg = getCategoryObj(categoryId).image;
  const chosenImage = toCanonicalImagePath(
    sanitizeImageString(pendingUploadedImage || prodImageUrlInput.value, fallbackCategoryImg)
  );

  try {
    if (editingId) {
      await updateDoc(doc(db, 'products', editingId), {
        category: categoryId,
        nameAr: nameVal,
        descAr: descVal,
        price: priceVal,
        discountPercent: discountVal,
        image: chosenImage,
        updatedAt: serverTimestamp(),
      });
      showToast('تم تحديث المنتج في قاعدة البيانات بنجاح');
    } else {
      const newId = `ds-${Date.now()}`;
      await setDoc(doc(db, 'products', newId), {
        category: categoryId,
        nameAr: nameVal,
        descAr: descVal,
        price: priceVal,
        discountPercent: discountVal,
        specsAr: 'تشطيب فاخر حسب الطلب · ضمان Deep Sleep',
        image: chosenImage,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      showToast('تمت إضافة المنتج الجديد إلى قاعدة البيانات السحابية');
    }
    resetAdminForm();
  } catch (error) {
    if (isOfflineOrNetworkError(error)) {
      const offlineMsg = 'تعذر حفظ المنتج لأن الاتصال بقاعدة البيانات منقطع حالياً.';
      setAdminBannerError('dashboard', offlineMsg);
      showToast(offlineMsg);
    } else {
      const msg = 'حدث خطأ أثناء الحفظ. يرجى التحقق من الصلاحيات أو البيانات المدخلة.';
      setAdminBannerError('dashboard', msg);
      showToast(msg);
      try {
        handleFirestoreError(
          error,
          editingId ? OperationType.UPDATE : OperationType.CREATE,
          editingId ? `products/${editingId}` : 'products'
        );
      } catch {
        // Structured error already logged inside handleFirestoreError
      }
    }
  } finally {
    adminSubmitBtn.disabled = false;
  }
});

resetDemoDataBtn.addEventListener('click', async () => {
  if (!isCurrentUserAdmin || !currentUser) return;
  setAdminBannerError('dashboard', null);
  resetDemoDataBtn.disabled = true;
  try {
    await seedDefaultProductsToFirestore(currentUser, true, true);
    resetAdminForm();
  } catch {
    // Error toast and banner already displayed by seedDefaultProductsToFirestore
  } finally {
    resetDemoDataBtn.disabled = false;
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (productModal.classList.contains('open')) closeProductModal();
    if (adminModal.classList.contains('open')) closeAdminModal();
  }
});

function updateDynamicSeoMetadata(): void {
  const origin = window.location.origin;
  const canonicalUrl = `${origin}${window.location.pathname}`;
  const heroAbsoluteUrl = `${origin}${heroDeepSleepImg}`;

  const canonicalEl = document.getElementById('canonicalLink') as HTMLLinkElement | null;
  if (canonicalEl) canonicalEl.href = canonicalUrl;

  const ogUrlEl = document.getElementById('ogUrlMeta') as HTMLMetaElement | null;
  if (ogUrlEl) ogUrlEl.content = canonicalUrl;

  const ogImgEl = document.getElementById('ogImageMeta') as HTMLMetaElement | null;
  if (ogImgEl) ogImgEl.content = heroAbsoluteUrl;

  const twImgEl = document.getElementById('twitterImageMeta') as HTMLMetaElement | null;
  if (twImgEl) twImgEl.content = heroAbsoluteUrl;

  const storeSchemaEl = document.getElementById('storeSchemaJsonLd');
  if (storeSchemaEl && storeSchemaEl.textContent) {
    try {
      const storeJson = JSON.parse(storeSchemaEl.textContent) as Record<string, unknown>;
      storeJson.url = canonicalUrl;
      storeJson.image = heroAbsoluteUrl;
      storeSchemaEl.textContent = JSON.stringify(storeJson);
    } catch {
      // Ignore malformed JSON-LD
    }
  }

  const catalogSchemaId = 'catalogSchemaJsonLd';
  let catalogScript = document.getElementById(catalogSchemaId) as HTMLScriptElement | null;
  if (!catalogScript) {
    catalogScript = document.createElement('script');
    catalogScript.id = catalogSchemaId;
    catalogScript.type = 'application/ld+json';
    document.head.appendChild(catalogScript);
  }

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'منتجات متجر Deep Sleep للأثاث المنزلي',
    numberOfItems: products.length,
    itemListElement: products.slice(0, 30).map((item, idx) => {
      const resolvedImg = resolveImageUrl(item.image, item.category);
      const absoluteImg = resolvedImg.startsWith('http')
        ? resolvedImg
        : resolvedImg.startsWith('/')
          ? `${origin}${resolvedImg}`
          : heroAbsoluteUrl;
      const finalPrice = computeDiscountedPrice(item.price, item.discountPercent);
      return {
        '@type': 'ListItem',
        position: idx + 1,
        item: {
          '@type': 'Product',
          name: item.nameAr,
          description: item.descAr,
          category: getCategoryObj(item.category).ar,
          image: absoluteImg,
          brand: { '@type': 'Brand', name: 'Deep Sleep' },
          offers: {
            '@type': 'Offer',
            priceCurrency: 'SAR',
            price: String(finalPrice),
            availability: 'https://schema.org/InStock',
            url: canonicalUrl,
          },
        },
      };
    }),
  };
  catalogScript.textContent = JSON.stringify(itemList);
}

// Boot Sequence
void testConnection();
renderCategories();
renderProducts();
updateDynamicSeoMetadata();
subscribeToProducts();
