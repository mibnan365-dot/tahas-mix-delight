import {
  ArrowRight, ArrowUpRight, Check, ChevronDown, ChevronRight, Clock3, Cookie, PackageCheck,
  Heart, Languages, Leaf, Menu, Minus,
  Plus, Search, ShieldCheck, ShoppingBag, Sparkles, Star,
  Truck, X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Category = { id: number; slug: string; name_en: string; name_bn: string; image: string; featured: number };
type Variant = { name: string; options: { name: string; price?: number | null; price_adjustment?: number; stock: number | null }[] };
type Product = { id: number; slug: string; name_en: string; name_bn: string; description_en: string; description_bn: string; category_id: number; category_name_en?: string; category_name_bn?: string; price: number; sale_price: number | null; image: string; images: string[]; variants: Variant[]; stock: number | null; made_to_order: number; active: number; featured: number; bestseller: number; demo: number; prep_time: string; ingredients: string; allergens: string; storage?: string; rating: number | null; review_count?: number };
type CartLine = { productId: number; options: Record<string, string>; quantity: number };
type Order = { order_number: string; status: string; payment_status: string; total: number; created_at: number };
type User = { id: number; email: string; name: string; role: string };
type DeliveryZone = { city: string; area: string; fee: number };
type AdminZone = DeliveryZone & { id: number; active: number };
type Coupon = { code: string; kind: "percent" | "amount"; value: number; min_subtotal: number; max_uses: number | null; used_count: number; expires_at: number | null; active: number; demo: number };
type StoreContent = Record<string, string>;
type Copy = Record<string, string>;

const en: Copy = {
  shop: "Shop all", cakes: "Cakes", chocolate: "Chocolate", treats: "Sweet treats", gifts: "Gifts & hampers", reviewTitle: "Notes from our customers", noReviews: "No customer reviews yet. Be the first to share a note after your order arrives.", writeReview: "Share a review", reviewText: "Your experience", submitReview: "Send for review", reviewPending: "Thank you. Your review will appear after the shop approves it.", reviewSignIn: "Sign in and leave a review after your order is delivered.",
  about: "Our story", contact: "Contact", search: "Search treats...", signIn: "Sign in", account: "My account",
  announcement: "Discover something delicious  ·  Made with love, delivered with care",
  eyebrow: "A LITTLE SOMETHING FOR EVERY OCCASION", heroTitle: "A world of delicious delights.", heroDesc: "From made-with-love cakes to thoughtful gift boxes, find a little something for every kind of moment.", shopNow: "Explore the collection", custom: "Design a custom cake", categoriesEyebrow: "FIND YOUR LITTLE DELIGHT", categoriesTitle: "Something for every craving.", categoriesDesc: "A good day, a celebration, or just because — there’s something for that.",
  allCategories: "All treats", featuredEyebrow: "THE GOOD STUFF", bestsellerTitle: "A few crowd favourites.", viewAll: "View everything", fresh: "MADE TO MAKE YOUR DAY", freshTitle: "Fresh from our kitchen.", giftTitle: "Little gifts, big feelings.", giftDesc: "The loveliest way to say “I thought of you.”", collection: "Find your perfect gift", ratingTitle: "Little moments, lovely words.", ratingDesc: "A few notes from the people who make what we do worthwhile.",
  whyTitle: "The good things come standard.", whyFresh: "Made with care", whyFreshDesc: "Small batches and thoughtful ingredients, always.", whyDelivery: "Delivered with love", whyDeliveryDesc: "Carefully packed and handled with the attention a treat deserves.", whySecure: "Safe & simple", whySecureDesc: "Straightforward ordering, clear prices, and helpful people.", instagram: "A little sweetness on your feed.", newsletter: "A lovely note from us, now and then.", newsletterDesc: "New treats, seasonal surprises & the occasional sweet deal.", email: "Your email address", subscribe: "Count me in", footerTagline: "Every bite, a little delight.", footerExplore: "DISCOVER", footerHelp: "HERE TO HELP", footerContact: "Say hello", freeDelivery: "Delivery fees shown at checkout.", curated: "Lovingly made in Bangladesh", madeToOrder: "Made to order", added: "Added to your bag", cart: "Your bag", emptyBag: "Your bag feels a little lonely.", emptyBagDesc: "Let’s find a little something worth celebrating.", continueShopping: "Keep exploring", subtotal: "Subtotal", delivery: "Delivery", total: "Total", checkout: "Continue to checkout", yourDetails: "Your delivery details", name: "Full name", phone: "Phone number", address: "Street address", city: "District / city", area: "Area / neighbourhood", emailLabel: "Email (optional)", note: "Anything else we should know?", payment: "How would you like to pay?", cod: "Cash on delivery", placeOrder: "Place your order", returnBag: "Back to your bag", secureCheckout: "Secure checkout · Prices verified on the server", orderPlaced: "A little delight is on its way!", orderNumber: "Your order number", paymentPending: "Payment due on delivery", track: "Track an order", trackDesc: "Enter your order number and the phone number used at checkout.", trackOrder: "Find my order", noResults: "Nothing quite like that yet.", trySearch: "Try a different search or explore our whole collection.", products: "little delights", sortFeatured: "A little bit of everything", sortPriceLow: "Price: low to high", sortPriceHigh: "Price: high to low", detail: "A closer look", addBag: "Add to bag", buyNow: "Order now", quantity: "Quantity", choose: "Choose", soldOut: "Out of stock", description: "The lovely details", ingredients: "Ingredients", allergens: "Allergen information", preparation: "Made with love in", reviews: "customer notes", demoLabel: "Sample product", accountTitle: "Your account", orderHistory: "Recent orders", signOut: "Sign out", loginPrompt: "Sign in or create an account to see your orders.", guestCheckout: "Guest checkout is always welcome.", emailPassword: "Email", password: "Password", login: "Sign in", signup: "Create an account", noAccount: "New here?", hasAccount: "Already have an account?", admin: "Store dashboard", adminIntro: "A quick look at what’s happening in your shop.", newProduct: "Add a product", newCategory: "Add a category", adminProducts: "Products", adminCategories: "Categories", adminOrders: "Orders", adminRequests: "Custom requests", save: "Save", cancel: "Cancel", productName: "Product name", productNameBn: "Bengali name", priceBDT: "Price in BDT", imageUrl: "Product image URL", category: "Category", stockQty: "Stock quantity", aboutTitle: "A little sweetness, made with love.", aboutDesc: "We believe the smallest treats can make the biggest moments. Taha’s Mix Delight brings a little thoughtfulness to your celebrations, your gifts, and your everydays.", customTitle: "Dream it. We’ll make it.", customDesc: "Tell us about the cake you’re imagining. We’ll be in touch with a thoughtful quote before anything is confirmed.", flavor: "Flavour", cakeSize: "Size", messageCake: "Message on the cake", inspiration: "Tell us your theme or inspiration", date: "When would you like it?", budget: "Budget in ৳", sendRequest: "Ask for a thoughtful quote", requestSent: "Your request is with us! We’ll be in touch soon.", customRequest: "Custom cake request", stock: "in stock", resetPassword: "Password reset isn’t configured yet. Contact the shop for help.", adminSetup: "Ask the owner to set up an admin account in the server environment.", trackingDetails: "Order details", accessDenied: "This area is for the shop owner.", messageSent: "Thank you! You’re on the list.", categoryAdded: "New category", bestseller: "Bestseller", onSale: "On offer", freshness: "Freshly made", bnUnavailable: "Some details aren’t translated yet. Please contact the shop for help.", adminStatus: "Update status", saveStatus: "Update", status_pending: "Pending", status_confirmed: "Confirmed", status_processing: "Processing", status_preparing: "Preparing", status_ready_for_delivery: "Ready for delivery", status_out_for_delivery: "On the way", status_delivered: "Delivered", status_cancelled: "Cancelled", status_submitted: "Quote requested", status_quoted: "Quote sent", status_accepted: "Accepted", status_rejected: "Declined", quote: "Send your quote (৳)", approve: "Send quote", contactWhatsApp: "Talk to us on WhatsApp", categoryHeading: "A little something for everyone.",
};
const bn: Copy = {
  shop: "সব পণ্য", cakes: "কেক", chocolate: "চকলেট", treats: "মিষ্টি ট্রিটস", gifts: "উপহার ও হ্যাম্পার", reviewTitle: "কাস্টমারদের রিভিউ", noReviews: "এখনো কোনো কাস্টমার রিভিউ নেই। অর্ডার পাওয়ার পরে প্রথম রিভিউটি লিখুন।", writeReview: "আপনার রিভিউ লিখুন", reviewText: "আপনার অভিজ্ঞতা", submitReview: "রিভিউ পাঠান", reviewPending: "ধন্যবাদ! অনুমোদনের পরে রিভিউটি প্রকাশিত হবে।", reviewSignIn: "অর্ডার পৌঁছানোর পরে লগ ইন করে রিভিউ লিখুন।",
  about: "আমাদের গল্প", contact: "যোগাযোগ", search: "পণ্য খুঁজুন...", signIn: "লগ ইন", account: "আমার অ্যাকাউন্ট",
  announcement: "নতুন কিছু মজার আবিষ্কার করুন  ·  যত্নে তৈরি, ভালোবাসায় পৌঁছে দিই",
  eyebrow: "প্রতিটি বিশেষ মুহূর্তের জন্য", heroTitle: "আনন্দের দুনিয়ায় একটুখানি মিষ্টি।", heroDesc: "ভালোবাসায় তৈরি কেক থেকে ভাবনাভরা উপহার — প্রতিটি মুহূর্তের জন্য ছোট্ট কিছু।", shopNow: "সব আয়োজন দেখুন", custom: "নিজের কেক ডিজাইন করুন", categoriesEyebrow: "আপনার পছন্দের আয়োজন খুঁজুন", categoriesTitle: "প্রতিটি ইচ্ছের জন্য কিছু না কিছু।", categoriesDesc: "বিশেষ দিন হোক, বা শুধুই নিজের জন্য — পছন্দের কিছু আছেই।",
  allCategories: "সব আয়োজন", featuredEyebrow: "সবার পছন্দের", bestsellerTitle: "কিছু সবার ভালোবাসার।", viewAll: "সব দেখুন", fresh: "আপনার দিনটি আনন্দময় করতে", freshTitle: "আমাদের রান্নাঘর থেকে টাটকা।", giftTitle: "ছোট্ট উপহার, অনেকখানি ভালোবাসা।", giftDesc: "“তোমার কথা ভেবেছি” বলার সুন্দর এক উপায়।", collection: "আপনার উপহার খুঁজুন", ratingTitle: "প্রিয় মুহূর্তের সুন্দর গল্প।", ratingDesc: "যাঁরা আমাদের অনুপ্রাণিত করেন, তাঁদের কিছু মিষ্টি কথা।",
  whyTitle: "ভালো জিনিসগুলো তো থাকছেই।", whyFresh: "যত্নে তৈরি", whyFreshDesc: "ছোট ব্যাচে, ভেবেচিন্তে বাছা উপকরণে।", whyDelivery: "ভালোবাসায় পৌঁছে দিই", whyDeliveryDesc: "প্রতিটি আয়োজন যত্নে গুছিয়ে পৌঁছে দিই।", whySecure: "নিরাপদ ও সহজ", whySecureDesc: "সহজ অর্ডার, স্পষ্ট দাম আর আন্তরিক সহায়তা।", instagram: "আপনার ফিডে একটু মিষ্টি।", newsletter: "মাঝে মাঝে আমাদের একটি সুন্দর চিঠি।", newsletterDesc: "নতুন আয়োজন, ঋতুর চমক আর মিষ্টি অফার।", email: "আপনার ইমেইল", subscribe: "যোগ দিন", footerTagline: "প্রতিটি কামড়ে একটু আনন্দ।", footerExplore: "আবিষ্কার করুন", footerHelp: "সহায়তা", footerContact: "কথা বলুন", freeDelivery: "ডেলিভারি চার্জ চেকআউটে দেখুন।", curated: "ভালোবাসায় তৈরি, বাংলাদেশে", madeToOrder: "অর্ডার অনুযায়ী তৈরি", added: "ব্যাগে যোগ করা হয়েছে", cart: "আপনার ব্যাগ", emptyBag: "আপনার ব্যাগটি একটু একা।", emptyBagDesc: "চলুন, উদ্‌যাপনের মতো কিছু খুঁজি।", continueShopping: "আরও ঘুরে দেখুন", subtotal: "সাবটোটাল", delivery: "ডেলিভারি", total: "মোট", checkout: "চেকআউট করুন", yourDetails: "ডেলিভারির তথ্য", name: "পুরো নাম", phone: "ফোন নম্বর", address: "সম্পূর্ণ ঠিকানা", city: "জেলা / শহর", area: "এলাকা", emailLabel: "ইমেইল (ঐচ্ছিক)", note: "বিশেষ কোনো নির্দেশনা?", payment: "কীভাবে পেমেন্ট করবেন?", cod: "ক্যাশ অন ডেলিভারি", placeOrder: "অর্ডার সম্পন্ন করুন", returnBag: "ব্যাগে ফিরে যান", secureCheckout: "নিরাপদ চেকআউট · সার্ভারে যাচাইকৃত দাম", orderPlaced: "আপনার আনন্দের আয়োজন রওনা হচ্ছে!", orderNumber: "আপনার অর্ডার নম্বর", paymentPending: "ডেলিভারির সময় পেমেন্ট দিন", track: "অর্ডার ট্র্যাক করুন", trackDesc: "অর্ডার নম্বর এবং অর্ডারের ফোন নম্বর লিখুন।", trackOrder: "অর্ডার খুঁজুন", noResults: "এমন কিছু এখনো নেই।", trySearch: "অন্য কিছু খুঁজুন, অথবা সব আয়োজন ঘুরে দেখুন।", products: "টি আয়োজন", sortFeatured: "সব আয়োজন", sortPriceLow: "দাম: কম থেকে বেশি", sortPriceHigh: "দাম: বেশি থেকে কম", detail: "বিস্তারিত দেখুন", addBag: "ব্যাগে যোগ করুন", buyNow: "অর্ডার করুন", quantity: "পরিমাণ", choose: "বেছে নিন", soldOut: "স্টকে নেই", description: "আরও কিছু সুন্দর তথ্য", ingredients: "উপকরণ", allergens: "অ্যালার্জির তথ্য", preparation: "ভালোবাসায় তৈরি", reviews: "টি কাস্টমার নোট", demoLabel: "নমুনা পণ্য", accountTitle: "আপনার অ্যাকাউন্ট", orderHistory: "সাম্প্রতিক অর্ডার", signOut: "লগ আউট", loginPrompt: "অর্ডার দেখতে লগ ইন বা অ্যাকাউন্ট তৈরি করুন।", guestCheckout: "অ্যাকাউন্ট ছাড়াও অর্ডার করতে পারবেন।", emailPassword: "ইমেইল", password: "পাসওয়ার্ড", login: "লগ ইন", signup: "অ্যাকাউন্ট তৈরি করুন", noAccount: "নতুন এসেছেন?", hasAccount: "আগে থেকেই অ্যাকাউন্ট আছে?", admin: "শপ ড্যাশবোর্ড", adminIntro: "আপনার শপের সাম্প্রতিক খবর।", newProduct: "নতুন পণ্য যোগ করুন", newCategory: "নতুন ক্যাটাগরি", adminProducts: "পণ্য", adminCategories: "ক্যাটাগরি", adminOrders: "অর্ডার", adminRequests: "কাস্টম অনুরোধ", save: "সংরক্ষণ", cancel: "বাতিল", productName: "পণ্যের নাম", productNameBn: "বাংলা নাম", priceBDT: "দাম (টাকা)", imageUrl: "পণ্যের ছবির URL", category: "ক্যাটাগরি", stockQty: "স্টকের পরিমাণ", aboutTitle: "ভালোবাসায় তৈরি একটুখানি মিষ্টি।", aboutDesc: "ছোট্ট আয়োজনেও বড় আনন্দ থাকে। Taha’s Mix Delight আপনার বিশেষ দিন, উপহার আর প্রতিদিনের মুহূর্তে নিয়ে আসে একটুখানি ভাবনা আর যত্ন।", customTitle: "আপনার কল্পনা, আমাদের তৈরি।", customDesc: "আপনার স্বপ্নের কেকটি কেমন, আমাদের জানান। অর্ডার নিশ্চিত করার আগে আমরা আপনাকে সুন্দর একটি কোট জানাব।", flavor: "ফ্লেভার", cakeSize: "সাইজ", messageCake: "কেকে কী লিখব?", inspiration: "থিম বা অনুপ্রেরণার কথা লিখুন", date: "কবে লাগবে?", budget: "বাজেট (৳)", sendRequest: "কোটেশনের অনুরোধ পাঠান", requestSent: "আপনার অনুরোধ পেয়েছি! শিগগিরই যোগাযোগ করব।", customRequest: "কাস্টম কেকের অনুরোধ", stock: "স্টকে আছে", bestseller: "সবার পছন্দ", onSale: "বিশেষ অফার", freshness: "টাটকা তৈরি", bnUnavailable: "কিছু তথ্য এখনো বাংলায় নেই। বিস্তারিত জানতে যোগাযোগ করুন।", adminStatus: "স্ট্যাটাস বদলান", saveStatus: "আপডেট",   status_pending: "অপেক্ষমাণ", status_confirmed: "নিশ্চিত", status_processing: "প্রস্তুতিতে", status_preparing: "তৈরি হচ্ছে", status_ready_for_delivery: "পাঠানোর জন্য তৈরি", status_out_for_delivery: "পথে আছে", status_delivered: "পৌঁছে গেছে", status_cancelled: "বাতিল", status_submitted: "কোট অনুরোধ", status_quoted: "কোট পাঠানো হয়েছে", status_accepted: "গ্রহণ করা হয়েছে", status_rejected: "প্রত্যাখ্যাত", quote: "আপনার কোট (৳)", approve: "কোট পাঠান", contactWhatsApp: "WhatsApp-এ কথা বলুন", categoryHeading: "সবার পছন্দের জন্য ছোট্ট কিছু।",
};

const api = async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(`/api${path}`, { ...init, credentials: "include", headers: { "Content-Type": "application/json", ...init.headers } });
  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: "কিছু সমস্যা হয়েছে। আবার চেষ্টা করুন।" }));
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
};
const fmt = (amount: number) => `৳${Math.round(amount).toLocaleString("en-BD")}`;
const photo = (id: string, width = 800) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=82`;
const statusLabel = (status: string, t: Copy) => t[`status_${status}`] || status.replaceAll("_", " ");

export default function App() {
  const [lang, setLang] = useState<"bn" | "en">(() => (localStorage.getItem("taha-language") as "bn" | "en") || "bn");
  const t = lang === "bn" ? bn : en;
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [storeContent, setStoreContent] = useState<StoreContent>({});
  const [cart, setCart] = useState<CartLine[]>(() => { try { return (JSON.parse(localStorage.getItem("taha-cart") || "[]") as CartLine[]).map((line) => ({ ...line, options: line.options || {} })); } catch { return []; } });
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [checkoutCity, setCheckoutCity] = useState("");
  const [checkoutArea, setCheckoutArea] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [route, setRoute] = useState("home");
  const [selected, setSelected] = useState<Product | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [detailQuantity, setDetailQuantity] = useState(1);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [sort, setSort] = useState("featured");
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [orderComplete, setOrderComplete] = useState<Order | null>(null);
  const [tracking, setTracking] = useState<Order | null>(null);
  const [adminTab, setAdminTab] = useState("overview");
  const [adminForm, setAdminForm] = useState<"product" | "category" | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [adminOrders, setAdminOrders] = useState<Record<string, unknown>[]>([]);
  const [adminRequests, setAdminRequests] = useState<Record<string, unknown>[]>([]);
  const [adminMetrics, setAdminMetrics] = useState<Record<string, number>>({});
  const [adminZones, setAdminZones] = useState<AdminZone[]>([]);
  const [adminCoupons, setAdminCoupons] = useState<Coupon[]>([]);
  const [orderFilter, setOrderFilter] = useState("");
  const [favorites, setFavorites] = useState<number[]>(() => { try { return JSON.parse(localStorage.getItem("taha-favorites") || "[]"); } catch { return []; } });
  const [customerReviews, setCustomerReviews] = useState<Record<number, Record<string, unknown>[]>>({});
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewBody, setReviewBody] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [catalog, categoriesResult, config, content, me] = await Promise.all([
        api<Product[]>("/products"), api<Category[]>("/categories"),
        api<{ delivery_zones: DeliveryZone[] }>("/config"),
        api<StoreContent>("/content"),
        api<{ user: User }>("/me").catch(() => null),
      ]);
      setProducts(catalog); setCategories(categoriesResult); setDeliveryZones(config.delivery_zones); setStoreContent(content); setUser(me?.user || null);
      if (me?.user) {
        const saved = await api<number[]>("/wishlist");
        setFavorites(saved);
      }
    } catch (error) { setNotice(error instanceof Error ? error.message : "Couldn’t load the shop."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { document.documentElement.dataset.theme = "store"; document.documentElement.lang = lang; localStorage.setItem("taha-language", lang); }, [lang]);
  useEffect(() => { localStorage.setItem("taha-cart", JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem("taha-favorites", JSON.stringify(favorites)); }, [favorites]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { setSelected(null); setCartOpen(false); setAuthOpen(false); setAdminForm(null); } };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => { if (notice) { const id = window.setTimeout(() => setNotice(""), 4000); return () => window.clearTimeout(id); } }, [notice]);

  const localize = (item: Product | Category, field: "name" | "description" = "name") => {
    const record = item as unknown as Record<string, string>;
    return lang === "bn" ? (record[`${field}_bn`] || record[`${field}_en`] || "") : (record[`${field}_en`] || record[`${field}_bn`] || "");
  };
  const contentText = (key: string, fallback: string) => storeContent[`${key}_${lang}`] || fallback;
  const available = useMemo(() => products.filter((item) => item.active === 1), [products]);
  const featured = available.filter((item) => item.featured || item.bestseller).slice(0, 8);
  const fresh = available.filter((item) => item.category_name_en?.toLowerCase().includes("cake")).slice(0, 4);
  const giftProducts = available.filter((item) => item.category_name_en?.toLowerCase().includes("gift")).slice(0, 4);
  const cartLines = useMemo(() => cart.map((line) => {
    const product = products.find((item) => item.id === line.productId);
    if (!product) return null;
    let price = product.sale_price ?? product.price;
    const choices = product.variants.map((variant) => variant.options.find((option) => option.name === line.options[variant.name])).filter(Boolean);
    for (const choice of choices) {
      if (choice?.price !== undefined && choice.price !== null) price = choice.price;
      price += Number(choice?.price_adjustment || 0);
    }
    return { ...line, product, price, optionsLabel: Object.values(line.options).join(" · ") };
  }).filter((line): line is NonNullable<typeof line> => Boolean(line)), [cart, products]);
  const itemCount = cart.reduce((total, line) => total + line.quantity, 0);
  const subtotal = cartLines.reduce((total, line) => total + line.price * line.quantity, 0);
  const deliveryFee = deliveryZones.find((zone) => zone.city.toLowerCase() === checkoutCity.toLowerCase() &&
    (zone.area === "*" || zone.area.toLowerCase() === checkoutArea.toLowerCase()))?.fee;
  const total = subtotal + (deliveryFee ?? 0);
  const listProducts = useMemo(() => {
    let result = [...available];
    if (route !== "shop" && route !== "home" && route !== "wishlist") result = result.filter((item) => String(item.category_id) === route || item.category_name_en?.toLowerCase().includes(route));
    if (route === "wishlist") result = result.filter((item) => favorites.includes(item.id));
    if (search.trim()) result = result.filter((item) => `${item.name_en} ${item.name_bn} ${item.category_name_en} ${item.description_en}`.toLowerCase().includes(search.toLowerCase()));
    if (sort === "price-low") result.sort((a, b) => (a.sale_price ?? a.price) - (b.sale_price ?? b.price));
    if (sort === "price-high") result.sort((a, b) => (b.sale_price ?? b.price) - (a.sale_price ?? a.price));
    if (sort === "featured") result.sort((a, b) => (b.bestseller + b.featured) - (a.bestseller + a.featured));
    return result;
  }, [available, route, search, sort, favorites]);

  const pageTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const navigate = (next: string) => { setRoute(next); setSearch(""); setSearchOpen(false); setMobileMenu(false); setSelected(null); setOrderComplete(null); pageTop(); };
  const initialOptions = (product: Product) => Object.fromEntries(product.variants.map((variant) => [variant.name, variant.options[0]?.name || ""]));
  const openProduct = (product: Product) => {
    setSelected(product); setSelectedOptions(initialOptions(product)); setDetailQuantity(1);
    void api<Record<string, unknown>[]>(`/products/${product.id}/reviews`)
      .then((reviews) => setCustomerReviews((all) => ({ ...all, [product.id]: reviews })))
      .catch((error: Error) => setNotice(error.message));
  };
  const addToCart = (product: Product, options: Record<string, string> = {}, quantity = 1) => {
    const choices = product.variants.map((variant) => variant.options.find((option) => option.name === options[variant.name])).filter(Boolean);
    const optionStock = choices.reduce<number | null>((lowest, option) => option?.stock == null ? lowest : Math.min(lowest ?? option.stock, option.stock), null);
    const stock = product.stock === null ? optionStock : optionStock === null ? product.stock : Math.min(product.stock, optionStock);
    const optionsKey = JSON.stringify(options);
    const existing = cart.find((line) => line.productId === product.id && JSON.stringify(line.options) === optionsKey);
    if (stock !== null && stock !== undefined && (existing?.quantity ?? 0) + quantity > stock) { setNotice(lang === "bn" ? "দুঃখিত, এই পরিমাণ পণ্য স্টকে নেই।" : "Sorry, there isn’t enough stock for that quantity."); return; }
    setCart((lines) => {
      const old = lines.find((line) => line.productId === product.id && JSON.stringify(line.options) === optionsKey);
      return old ? lines.map((line) => line === old ? { ...line, quantity: line.quantity + quantity } : line) : [...lines, { productId: product.id, options, quantity }];
    });
    setNotice(`${localize(product)} · ${t.added}`);
  };
  const updateQuantity = (productId: number, options: Record<string, string>, quantity: number) => {
    const optionsKey = JSON.stringify(options);
    if (quantity < 1) { setCart((lines) => lines.filter((line) => !(line.productId === productId && JSON.stringify(line.options) === optionsKey))); return; }
    setCart((lines) => lines.map((line) => line.productId === productId && JSON.stringify(line.options) === optionsKey ? { ...line, quantity } : line));
  };
  const toggleFavorite = (id: number) => {
    const removing = favorites.includes(id);
    setFavorites((ids) => removing ? ids.filter((item) => item !== id) : [...ids, id]);
    if (user) void api(`/wishlist/${id}`, { method: removing ? "DELETE" : "POST" }).catch((error: Error) => {
      setFavorites((ids) => removing ? [...ids, id] : ids.filter((item) => item !== id));
      setNotice(error.message);
    });
  };
  const submitAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true);
    const data = new FormData(event.currentTarget);
    try {
      const result = await api<{ user: User }>(`/auth/${authMode}`, { method: "POST", body: JSON.stringify({ name: data.get("name"), email: data.get("email"), password: data.get("password") }) });
      setUser(result.user); setAuthOpen(false); setNotice(lang === "bn" ? "স্বাগতম!" : "Welcome to the shop!");
      void load();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Please try again."); }
    finally { setBusy(false); }
  };
  const logout = async () => {
    try { await api("/auth/logout", { method: "POST" }); setUser(null); setRoute("home"); setNotice(lang === "bn" ? "আপনি লগ আউট করেছেন।" : "You’re signed out."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Couldn’t sign out."); }
  };
  const submitCheckout = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const result = await api<Order>("/orders", { method: "POST", body: JSON.stringify({
        customer: { name: form.get("name"), phone: form.get("phone"), address: form.get("address"), city: form.get("city"), area: form.get("area"), email: form.get("email") },
        note: form.get("note"), payment_method: form.get("payment_method"), coupon: form.get("coupon"),
        items: cart.map((line) => ({ product_id: line.productId, variant: line.options, quantity: line.quantity })),
      }) });
      setOrderComplete(result); setCart([]); setRoute("confirmation"); pageTop();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Couldn’t place your order."); }
    finally { setBusy(false); }
  };
  const submitTracking = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    try {
      setTracking(await api<Order>("/track", { method: "POST", body: JSON.stringify({ order_number: form.get("order_number"), phone: form.get("phone") }) }));
    } catch (error) { setTracking(null); setNotice(error instanceof Error ? error.message : "Order not found."); }
  };
  const submitReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    if (!user) { setAuthOpen(true); setNotice(t.reviewSignIn); return; }
    setReviewBusy(true);
    try {
      await api(`/products/${selected.id}/reviews`, { method: "POST", body: JSON.stringify({ rating: reviewRating, body: reviewBody }) });
      setReviewBody("");
      setNotice(t.reviewPending);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Couldn’t submit your review."); }
    finally { setReviewBusy(false); }
  };
  const subscribe = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await api("/newsletter", { method: "POST", body: JSON.stringify({ email: form.get("email") }) });
      formElement.reset(); setNotice(t.messageSent);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Couldn’t subscribe."); }
  };
  const openAdmin = async (tab = "overview") => {
    if (user?.role !== "admin") { setNotice(t.accessDenied); return; }
    setRoute("admin"); setAdminTab(tab); setMobileMenu(false); pageTop();
    try {
      const data = await api<{ metrics: Record<string, number>; orders: Record<string, unknown>[]; requests: Record<string, unknown>[] }>(`/admin/dashboard`);
      setAdminMetrics(data.metrics); setAdminOrders(data.orders); setAdminRequests(data.requests);
      if (tab === "products") {
        setProducts(await api<Product[]>("/admin/products"));
      } else if (tab === "settings") {
        const [settings, coupons] = await Promise.all([
          api<{ delivery_zones: AdminZone[]; content: StoreContent }>("/admin/settings"),
          api<Coupon[]>("/admin/coupons"),
        ]);
        setAdminZones(settings.delivery_zones); setAdminCoupons(coupons); setStoreContent(settings.content);
      }
    } catch (error) { setNotice(error instanceof Error ? error.message : "Couldn’t load dashboard."); }
  };
  const submitAdminProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); const data = new FormData(event.currentTarget);
    try {
      const image = String(data.get("image") || editingProduct?.image || photo("photo-1578985545062-69928b1d9587"));
      const payload = {
        name_en: data.get("name_en"), name_bn: data.get("name_bn"), description_en: data.get("description_en"),
        description_bn: data.get("description_bn"), price: Number(data.get("price")), category_id: Number(data.get("category_id")),
        stock: data.get("stock") === "" ? null : Number(data.get("stock")), image, images: [image],
        sale_price: data.get("sale_price") ? Number(data.get("sale_price")) : null,
        ingredients: data.get("ingredients"), allergens: data.get("allergens"),
        prep_time: data.get("prep_time"), storage: data.get("storage"),
        active: editingProduct?.active ?? 1, demo: editingProduct?.demo ?? 0, featured: data.get("featured") === "on" ? 1 : 0, bestseller: data.get("bestseller") === "on" ? 1 : 0,
        made_to_order: data.get("made_to_order") === "on" ? 1 : 0,
        variants: data.get("variants") ? JSON.parse(String(data.get("variants"))) : [],
      };
      if (editingProduct) {
        await api(`/admin/products/${editingProduct.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await api("/admin/products", { method: "POST", body: JSON.stringify(payload) });
      }
      setAdminForm(null); setEditingProduct(null); await load(); await openAdmin("products"); setNotice(lang === "bn" ? (editingProduct ? "পণ্য আপডেট হয়েছে!" : "পণ্য যোগ হয়েছে!") : (editingProduct ? "Product updated." : "Product added."));
    } catch (error) { setNotice(error instanceof Error ? error.message : "Couldn’t save product."); }
    finally { setBusy(false); }
  };
  const submitAdminCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); const data = new FormData(event.currentTarget);
    try {
      const payload = { name_en: data.get("name_en"), name_bn: data.get("name_bn"), image: data.get("image"), featured: data.get("featured") === "on" ? 1 : 0, active: 1 };
      if (editingCategory) {
        await api(`/admin/categories/${editingCategory.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await api("/admin/categories", { method: "POST", body: JSON.stringify(payload) });
      }
      setAdminForm(null); setEditingCategory(null); await load(); await openAdmin("categories"); setNotice(lang === "bn" ? (editingCategory ? "ক্যাটাগরি আপডেট হয়েছে!" : "ক্যাটাগরি যোগ হয়েছে!") : (editingCategory ? "Category updated." : "Category added."));
    } catch (error) { setNotice(error instanceof Error ? error.message : "Couldn’t save category."); }
    finally { setBusy(false); }
  };
  const saveStoreContent = async (form: FormData) => {
    setBusy(true);
    const keys = ["announcement", "hero_eyebrow", "hero_title", "hero_description", "categories_eyebrow", "categories_title", "categories_description", "featured_eyebrow", "featured_title", "gift_title", "gift_description", "about_title", "about_description", "about_story", "footer_tagline", "newsletter_title", "newsletter_description"];
    const content: StoreContent = { hero_image: String(form.get("hero_image") || "") };
    for (const key of keys) {
      content[`${key}_en`] = String(form.get(`${key}_en`) || "");
      content[`${key}_bn`] = String(form.get(`${key}_bn`) || "");
    }
    try {
      await api("/admin/content", { method: "PATCH", body: JSON.stringify(content) });
      setStoreContent(content);
      setNotice(lang === "bn" ? "স্টোরের কনটেন্ট আপডেট হয়েছে।" : "Storefront content updated.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Couldn’t update storefront content."); }
    finally { setBusy(false); }
  };
  const updateOrder = async (orderNumber: string, status: string) => {
    try { await api(`/admin/orders/${encodeURIComponent(orderNumber)}`, { method: "PATCH", body: JSON.stringify({ status }) }); await openAdmin("orders"); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Couldn’t update order."); }
  };
  const toggleProduct = async (product: Product) => {
    try {
      await api(`/admin/products/${product.id}`, { method: "PATCH", body: JSON.stringify({ active: product.active ? 0 : 1 }) });
      await openAdmin("products");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Couldn’t update product."); }
  };
  const sendQuote = async (id: number, quote: number) => {
    try { await api(`/admin/custom-requests/${id}`, { method: "PATCH", body: JSON.stringify({ status: "quoted", quote }) }); await openAdmin("requests"); setNotice(lang === "bn" ? "কোট সংরক্ষিত হয়েছে। কাস্টমারের সঙ্গে যোগাযোগ করে নিশ্চিত করুন।" : "Quote saved. Contact the customer to confirm it."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Couldn’t send your quote."); }
  };
  const saveDeliveryZone = async (form: FormData) => {
    setBusy(true);
    try {
      await api("/admin/delivery-zones", { method: "POST", body: JSON.stringify({ city: form.get("city"), area: form.get("area") || "*", fee: Number(form.get("fee")) }) });
      await openAdmin("settings"); setNotice("Delivery zone saved.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Couldn’t save delivery zone."); }
    finally { setBusy(false); }
  };
  const saveCoupon = async (form: FormData) => {
    setBusy(true);
    try {
      await api("/admin/coupons", { method: "POST", body: JSON.stringify({ code: form.get("code"), kind: form.get("kind"), value: Number(form.get("value")), min_subtotal: Number(form.get("min_subtotal") || 0), max_uses: form.get("max_uses") || null }) });
      await openAdmin("settings"); setNotice("Coupon created.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Couldn’t create coupon."); }
    finally { setBusy(false); }
  };
  const toggleCoupon = async (code: string, active: number) => {
    try {
      await api(`/admin/coupons/${encodeURIComponent(code)}`, { method: "PATCH", body: JSON.stringify({ active }) });
      await openAdmin("settings");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Couldn’t update coupon."); }
  };
  const toggleDeliveryZone = async (id: number, active: number) => {
    try {
      await api(`/admin/delivery-zones/${id}`, { method: "PATCH", body: JSON.stringify({ active }) });
      await openAdmin("settings"); await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Couldn’t update delivery zone."); }
  };

  const productCard = (product: Product, index = 0) => (
    <article className="product-card" key={product.id} style={{ animationDelay: `${Math.min(index * 45, 350)}ms` }}>
      <div className="product-image" onClick={() => openProduct(product)}>
        <img src={product.image || photo("photo-1578985545062-69928b1d9587")} alt={localize(product)} loading="lazy" />
        {product.bestseller === 1 && <span className="product-badge">{t.bestseller}</span>}
        {product.sale_price && <span className="sale-badge">{t.onSale}</span>}
        {product.demo === 1 && <span className="demo-badge">{t.demoLabel}</span>}
        <button className={`favorite-button ${favorites.includes(product.id) ? "is-favorite" : ""}`} onClick={(event) => { event.stopPropagation(); toggleFavorite(product.id); }} aria-label="Add to wishlist"><Heart size={17} fill={favorites.includes(product.id) ? "currentColor" : "none"} /></button>
        <button className="quick-add" onClick={(event) => { event.stopPropagation(); if (product.variants.length) openProduct(product); else addToCart(product); }}><Plus size={16} /> {t.addBag}</button>
      </div>
      <button className="product-info" onClick={() => openProduct(product)}>
        <span className="product-category">{lang === "bn" ? product.category_name_bn || product.category_name_en : product.category_name_en}</span>
        <span className="product-name">{localize(product)}</span>
        <span className="product-bottom"><span>{product.sale_price ? <><span className="sale-price">{fmt(product.sale_price)}</span> <span className="old-price">{fmt(product.price)}</span></> : fmt(product.price)}</span>{product.rating && product.rating > 0 ? <span className="rating"><Star size={12} fill="currentColor" /> {product.rating.toFixed(1)} <span>({product.review_count || 0})</span></span> : <span className="new-product-tag">{lang === "bn" ? "নতুন" : "New"}</span>}</span>
      </button>
    </article>
  );

  const categoryCard = (category: Category) => (
    <button className="category-card" key={category.id} onClick={() => navigate(String(category.id))}>
      <img src={category.image || photo("photo-1606313564200-e75d5e30476c")} alt="" loading="lazy" />
      <span className="category-overlay"><span>{localize(category)}</span><ArrowUpRight size={18} /></span>
    </button>
  );

  const statusCard = (order: Order) => (
    <article className="tracking-result"><div className="tracking-top"><strong>{order.order_number}</strong><span className={`status-pill status-${order.status}`}>{statusLabel(order.status, t)}</span></div><div className="tracking-bottom"><span>{t.total}: {fmt(order.total)}</span><span>{statusLabel(order.payment_status, t)}</span></div></article>
  );

  const adminNavigation = <><div className="admin-tabs">{[["overview", "Overview"], ["products", t.adminProducts], ["categories", t.adminCategories], ["orders", t.adminOrders], ["requests", t.adminRequests], ["settings", lang === "bn" ? "সেটিংস" : "Settings"]].map(([key, name]) => <button key={key} className={adminTab === key ? "admin-tab active" : "admin-tab"} onClick={() => void openAdmin(key)}>{name}</button>)}</div>{adminTab === "settings" && <AdminSettings key={JSON.stringify(storeContent)} zones={adminZones} coupons={adminCoupons} content={storeContent} busy={busy} onSaveZone={saveDeliveryZone} onSaveCoupon={saveCoupon} onSaveContent={saveStoreContent} onToggleZone={toggleDeliveryZone} onToggleCoupon={toggleCoupon} lang={lang} />}</>;

  return (
    <div className="store-shell" onClick={(e) => { if ((e.target as HTMLElement).classList.contains("overlay-scrim")) { setSelected(null); setCartOpen(false); setAuthOpen(false); } }}>
      <div className="announcement"><span className="announcement-star">✳</span>{contentText("announcement", t.announcement)}<span className="announcement-star">✳</span></div>
      <header className="store-header">
        <div className="header-inner">
          <button className="store-icon mobile-menu-button" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle navigation">{mobileMenu ? <X size={21} /> : <Menu size={21} />}</button>
          <a className="store-brand" href="#" onClick={(e) => { e.preventDefault(); navigate("home"); }}><span className="brand-emblem"><Cookie size={20} /><Sparkles className="emblem-sparkle" size={11} /></span><span className="brand-words"><strong>Taha’s <span>Mix Delight</span></strong><small>EVERY BITE, A LITTLE DELIGHT.</small></span></a>
          <nav className={`main-nav ${mobileMenu ? "nav-open" : ""}`} aria-label="Main navigation">
            {[[t.shop, "shop"], [t.cakes, "cakes"], [t.chocolate, "chocolate"], [t.treats, "treats"], [t.gifts, "gifts"], [t.about, "about"], [t.contact, "contact"]].map(([name, key]) => <button key={key} className={route === key ? "nav-current" : ""} onClick={() => { if (key === "contact") navigate("contact"); else navigate(key); }}>{name}</button>)}
            <button className="mobile-account-link" onClick={() => { if (user?.role === "admin") void openAdmin(); else navigate("account"); }}>{user?.role === "admin" ? t.admin : t.account}</button>
          </nav>
          <div className="header-actions">
            <button className="store-icon lang-toggle" onClick={() => setLang(lang === "bn" ? "en" : "bn")} aria-label="Switch language"><Languages size={17} /><span>{lang === "bn" ? "EN" : "বাং"}</span></button>
            <button className="store-icon search-toggle" aria-label={t.search} onClick={() => { setSearchOpen(!searchOpen); setRoute("shop"); window.setTimeout(() => document.querySelector<HTMLInputElement>(".header-search-input")?.focus(), 50); }}><Search size={19} /></button>
            <button className="store-icon account-button" aria-label={t.account} onClick={() => user ? navigate("account") : setAuthOpen(true)}>{user ? <span className="account-initial">{user.name?.slice(0, 1) || user.email.slice(0, 1)}</span> : <span className="account-outline">♙</span>}</button>
            <button className="store-icon wishlist-button" aria-label="Wishlist" onClick={() => navigate("wishlist")}><Heart size={19} />{favorites.length > 0 && <span className="icon-count">{favorites.length}</span>}</button>
            <button className="store-icon bag-button" aria-label={t.cart} onClick={() => setCartOpen(true)}><ShoppingBag size={19} /><span className="icon-count">{itemCount}</span></button>
          </div>
        </div>
        {searchOpen && <form className="search-bar" onSubmit={(e) => { e.preventDefault(); navigate("shop"); }}><Search size={17} /><input className="header-search-input" autoFocus value={search} onChange={(e) => { setSearch(e.target.value); setRoute("shop"); }} placeholder={t.search} /><button type="button" aria-label="Close search" onClick={() => { setSearchOpen(false); setSearch(""); }}><X size={16} /></button></form>}
      </header>

      {route === "home" && <>
        <main>
          <section className="hero">
            <div className="hero-image"><img src={storeContent.hero_image || photo("photo-1578985545062-69928b1d9587", 1800)} alt="A lovingly made chocolate celebration cake" /></div>
            <div className="hero-shade" />
            <div className="hero-content"><span className="hero-eyebrow"><span /> {contentText("hero_eyebrow", t.eyebrow)}</span><h1>{contentText("hero_title", t.heroTitle)}</h1><p>{contentText("hero_description", t.heroDesc)}</p><div className="hero-actions"><button className="button button-cream" onClick={() => navigate("shop")}>{t.shopNow}<ArrowRight size={16} /></button><button className="button button-glass" onClick={() => navigate("custom")}>{t.custom}<ArrowUpRight size={15} /></button></div><div className="hero-foot"><span><Sparkles size={13} /> {t.curated}</span><span><Truck size={14} /> {t.freeDelivery}</span></div></div>
            <div className="hero-caption"><span>GOOD THINGS, MADE WITH LOVE.</span><span>01 / 04</span></div>
          </section>

          <section className="category-section section-wrap"><div className="section-heading"><div><span className="section-eyebrow">{contentText("categories_eyebrow", t.categoriesEyebrow)}</span><h2>{contentText("categories_title", t.categoriesTitle)}</h2><p>{contentText("categories_description", t.categoriesDesc)}</p></div><button className="text-link" onClick={() => navigate("shop")}>{t.allCategories}<ArrowRight size={16} /></button></div>
            {loading ? <div className="category-skeletons">{[1, 2, 3, 4].map((item) => <span key={item} className="skeleton category-skeleton" />)}</div> : <div className="category-grid">{categories.filter((item) => item.featured).slice(0, 4).map(categoryCard)}</div>}
          </section>

          <section className="featured-section section-wrap"><div className="section-heading section-heading-tight"><div><span className="section-eyebrow">{contentText("featured_eyebrow", t.featuredEyebrow)}</span><h2>{contentText("featured_title", t.bestsellerTitle)}</h2></div><button className="text-link" onClick={() => navigate("shop")}>{t.viewAll}<ArrowRight size={16} /></button></div>
            {loading ? <div className="product-grid">{[1, 2, 3, 4].map((item) => <span key={item} className="skeleton product-skeleton" />)}</div> : <div className="product-grid">{featured.slice(0, 4).map(productCard)}</div>}
          </section>

          {fresh.length > 0 && <section className="fresh-section"><div className="fresh-inner"><div className="fresh-image"><img src={fresh[0]?.image || photo("photo-1578985545062-69928b1d9587")} alt={fresh[0] ? localize(fresh[0]) : t.freshTitle} loading="lazy" /><span className="image-note"><Sparkles size={14} /> FRESH FROM OUR KITCHEN</span></div><div className="fresh-copy"><span className="section-eyebrow">{t.fresh}</span><h2>{t.freshTitle}</h2><p>{fresh[0] ? localize(fresh[0], "description") : t.heroDesc}</p><div className="fresh-feature"><span><Leaf size={16} /></span><div><strong>{t.whyFresh}</strong><p>{t.whyFreshDesc}</p></div></div><div className="fresh-feature"><span><Clock3 size={16} /></span><div><strong>{t.madeToOrder}</strong><p>{t.whyDeliveryDesc}</p></div></div><button className="button button-dark" onClick={() => navigate("cakes")}>{t.cakes}<ArrowRight size={16} /></button></div></div></section>}

          {giftProducts.length > 0 && <section className="gift-section"><div className="gift-content"><span className="section-eyebrow">{t.gifts.toUpperCase()}</span><h2>{contentText("gift_title", t.giftTitle)}</h2><p>{contentText("gift_description", t.giftDesc)}</p><button className="button button-cream" onClick={() => navigate("gifts")}>{t.collection}<ArrowRight size={16} /></button></div><div className="gift-images">{giftProducts.slice(0, 2).map((item) => <button key={item.id} onClick={() => openProduct(item)}><img src={item.image} alt={localize(item)} loading="lazy" /><span>{localize(item)}</span></button>)}</div><div className="gift-deco gift-deco-one">✳</div><div className="gift-deco gift-deco-two">✳</div></section>}

          <section className="testimonial-section section-wrap"><div className="testimonial-heading"><span className="section-eyebrow">{lang === "bn" ? "কাস্টমারদের গল্প" : "A NOTE FOR THE OWNER"}</span><h2>{lang === "bn" ? "আপনাদের সত্যিকারের গল্প এখানে ভাগ করে নিন।" : "A space for real customer stories."}</h2><p>{lang === "bn" ? "অর্ডার সম্পন্ন হওয়ার পরে প্রকৃত রিভিউ যোগ করুন।" : "Add genuine, permission-based customer reviews here when your first orders arrive."}</p></div></section>

          <section className="promise-section"><div className="promise-heading"><span className="section-eyebrow">{t.curated.toUpperCase()}</span><h2>{t.whyTitle}</h2></div><div className="promise-grid"><article><span><Leaf size={19} /></span><h3>{t.whyFresh}</h3><p>{t.whyFreshDesc}</p></article><article><span><Truck size={19} /></span><h3>{t.whyDelivery}</h3><p>{t.whyDeliveryDesc}</p></article><article><span><ShieldCheck size={19} /></span><h3>{t.whySecure}</h3><p>{t.whySecureDesc}</p></article></div></section>

          <section className="newsletter"><span className="newsletter-spark">✳</span><div><span className="section-eyebrow">{t.instagram}</span><h2>{contentText("newsletter_title", t.newsletter)}</h2><p>{contentText("newsletter_description", t.newsletterDesc)}</p><form onSubmit={(event) => void subscribe(event)}><input name="email" type="email" required maxLength={254} placeholder={t.email} aria-label={t.email} /><button>{t.subscribe}<ArrowRight size={15} /></button></form></div><div className="newsletter-deco">✳</div></section>
        </main>
      </>}

      {route === "shop" || route === "wishlist" || categories.some((item) => String(item.id) === route) || ["cakes", "chocolate", "treats", "gifts"].includes(route) ? <main className="catalog-page"><div className="catalog-intro"><div className="breadcrumbs"><button onClick={() => navigate("home")}>{lang === "bn" ? "হোম" : "Home"}</button><ChevronRight size={13} /><span>{route === "wishlist" ? (lang === "bn" ? "পছন্দের তালিকা" : "Wishlist") : route === "shop" ? t.shop : categories.find((item) => String(item.id) === route) ? localize(categories.find((item) => String(item.id) === route)!) : t[route as keyof Copy] || t.shop}</span></div><span className="section-eyebrow">{t.categoryHeading}</span><h1>{route === "wishlist" ? (lang === "bn" ? "আপনার পছন্দের আয়োজন।" : "A few things you love.") : route === "shop" ? (lang === "bn" ? "একটুখানি আনন্দ খুঁজুন।" : "Find your little delight.") : categories.find((item) => String(item.id) === route) ? localize(categories.find((item) => String(item.id) === route)!) : (t[route as keyof Copy] || t.shop)}</h1><p>{lang === "bn" ? "যত্নে বেছে নেওয়া ছোট্ট আয়োজন, আপনার প্রতিটি সুন্দর মুহূর্তের জন্য।" : "Thoughtfully made little delights for life’s lovely moments."}</p><span className="catalog-count">{listProducts.length} {t.products}</span></div>
        <div className="catalog-toolbar"><div className="catalog-categories"><button className={route === "shop" ? "category-chip active" : "category-chip"} onClick={() => navigate("shop")}>{t.allCategories}</button>{categories.map((category) => <button key={category.id} className={route === String(category.id) ? "category-chip active" : "category-chip"} onClick={() => navigate(String(category.id))}>{localize(category)}</button>)}</div><label className="sort-select"><span>{lang === "bn" ? "সাজান" : "Sort"}:</span><select value={sort} onChange={(e) => setSort(e.target.value)}><option value="featured">{t.sortFeatured}</option><option value="price-low">{t.sortPriceLow}</option><option value="price-high">{t.sortPriceHigh}</option></select><ChevronDown size={14} /></label></div>
        {loading ? <div className="product-grid catalog-products">{[1, 2, 3, 4, 5, 6, 7, 8].map((item) => <span key={item} className="skeleton product-skeleton" />)}</div> : listProducts.length ? <div className="product-grid catalog-products">{listProducts.map(productCard)}</div> : <div className="empty-state"><span className="empty-icon"><Cookie size={23} /></span><h2>{t.noResults}</h2><p>{t.trySearch}</p><button className="button button-dark" onClick={() => navigate("shop")}>{t.allCategories}<ArrowRight size={15} /></button></div>}</main> : null}

      {route === "custom" && <main className="form-page custom-page"><div className="form-hero"><div className="custom-illustration"><span>✳</span><Cookie size={62} /><span>✳</span></div><span className="section-eyebrow">{lang === "bn" ? "একান্ত আপনার জন্য" : "MADE JUST FOR YOU"}</span><h1>{t.customTitle}</h1><p>{t.customDesc}</p></div><form className="wide-form" onSubmit={async (event) => { event.preventDefault(); setBusy(true); const f = new FormData(event.currentTarget); try { await api("/custom-requests", { method: "POST", body: JSON.stringify({ name: f.get("name"), phone: f.get("phone"), email: f.get("email"), options: { flavor: f.get("flavor"), size: f.get("size"), message: f.get("message"), inspiration: f.get("inspiration"), date: f.get("date"), budget: f.get("budget") } }) }); navigate("home"); setNotice(t.requestSent); } catch (error) { setNotice(error instanceof Error ? error.message : "Please try again."); } finally { setBusy(false); } }}><div className="form-row"><label>{t.name}<input name="name" required minLength={2} /></label><label>{t.phone}<input name="phone" inputMode="tel" pattern="(?:\\+?88)?01[3-9][0-9]{8}" placeholder="01XXXXXXXXX" required /></label></div><div className="form-row"><label>{t.flavor}<select name="flavor"><option>Chocolate</option><option>Vanilla</option><option>Red velvet</option><option>Strawberry</option></select></label><label>{t.cakeSize}<select name="size"><option>1 pound</option><option>2 pounds</option><option>3 pounds</option><option>Custom</option></select></label></div><div className="form-row"><label>{t.messageCake}<input name="message" maxLength={80} /></label><label>{t.date}<input name="date" type="date" min={new Date().toISOString().slice(0, 10)} /></label></div><label>{t.inspiration}<textarea name="inspiration" rows={4} required /></label><label>{t.budget}<input name="budget" type="number" min="0" step="50" /></label><button className="button button-dark form-submit" disabled={busy}>{busy ? "…" : t.sendRequest}<ArrowRight size={16} /></button><small className="form-help">{lang === "bn" ? "আপনার ডিজাইন এবং ডেলিভারি যাচাইয়ের পরে কোটেশন জানানো হবে।" : "We’ll confirm availability and price before your custom order is accepted."}</small></form></main>}

      {route === "checkout" && <main className="checkout-page"><div className="checkout-main"><div className="checkout-heading"><div className="breadcrumbs"><button onClick={() => setCartOpen(true)}>{t.cart}</button><ChevronRight size={13} /><span>{t.checkout}</span></div><h1>{t.yourDetails}</h1><p>{t.secureCheckout}</p></div><form id="checkout-form" className="checkout-form" onSubmit={(e) => void submitCheckout(e)}><div className="checkout-row"><label>{t.name}<input name="name" autoComplete="name" required minLength={2} /></label><label>{t.phone}<input name="phone" type="tel" inputMode="tel" pattern="(?:\\+?88)?01[3-9][0-9]{8}" placeholder="01XXXXXXXXX" autoComplete="tel" required /></label></div><label>{t.address}<input name="address" autoComplete="street-address" required /></label><div className="checkout-row"><label>{t.city}<select name="city" value={checkoutCity} onChange={(e) => setCheckoutCity(e.target.value)} required><option value="">{lang === "bn" ? "জেলা নির্বাচন করুন" : "Choose a district"}</option>{Array.from(new Set(deliveryZones.map((zone) => zone.city))).map((city) => <option key={city} value={city}>{city}</option>)}</select></label><label>{t.area}<input name="area" value={checkoutArea} onChange={(e) => setCheckoutArea(e.target.value)} required /></label></div><label>{t.emailLabel}<input name="email" type="email" autoComplete="email" /></label><label>{t.note}<textarea name="note" rows={3} maxLength={500} /></label><label className="coupon-field">{lang === "bn" ? "কুপন কোড (ঐচ্ছিক)" : "Coupon code (optional)"}<input name="coupon" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder={lang === "bn" ? "কুপন কোড লিখুন" : "Enter a coupon code"} /></label><fieldset className="payment-choice"><legend>{t.payment}</legend><label><input type="radio" name="payment_method" value="cod" defaultChecked /><span><strong>{t.cod}</strong><small>{lang === "bn" ? "পণ্য বুঝে পেয়ে পেমেন্ট করুন" : "Pay when you receive your order"}</small></span></label></fieldset><p className="privacy-help"><ShieldCheck size={15} /> {lang === "bn" ? "আপনার তথ্য শুধু অর্ডার পৌঁছে দিতে ব্যবহার করা হবে।" : "Your details are only used to deliver your order."}</p></form></div>
        <aside className="checkout-summary"><h2>{lang === "bn" ? "আপনার ব্যাগ" : "Your little bag"}</h2>{cartLines.map((line) => <div className="summary-line" key={`${line.productId}-${JSON.stringify(line.options)}`}><img src={line.product.image} alt="" /><div><strong>{localize(line.product)}</strong><small>{line.optionsLabel && `${line.optionsLabel} · `}{t.quantity}: {line.quantity}</small></div><span>{fmt(line.price * line.quantity)}</span></div>)}<div className="summary-total"><span>{t.subtotal}</span><strong>{fmt(subtotal)}</strong></div><div className="summary-total"><span>{t.delivery}</span><span>{deliveryFee === undefined ? (lang === "bn" ? "এলাকা নির্বাচন করুন" : "Select a delivery area") : fmt(deliveryFee)}</span></div><div className="summary-total grand-total"><span>{t.total}</span><strong>{fmt(total)}</strong></div><button form="checkout-form" className="button button-dark checkout-submit" disabled={busy || !cartLines.length || deliveryFee === undefined}>{busy ? (lang === "bn" ? "অপেক্ষা করুন..." : "Placing your order…") : t.placeOrder}<ArrowRight size={16} /></button><p className="cod-note"><ShieldCheck size={14} />{lang === "bn" ? "চেকআউটের সময় সার্ভারে সব দাম এবং স্টক পুনরায় যাচাই হয়।" : "Prices and stock are revalidated securely when you place your order."}</p></aside></main>}

      {route === "confirmation" && orderComplete && <main className="confirmation-page"><div className="confirmation-icon"><Check size={30} /></div><span className="section-eyebrow">{lang === "bn" ? "ধন্যবাদ!" : "THANK YOU SO MUCH"}</span><h1>{t.orderPlaced}</h1><p>{lang === "bn" ? "আপনার অর্ডার আমরা হাতে পেয়েছি এবং শিগগিরই নিশ্চিত করব।" : "We have your order and will be in touch shortly to confirm delivery details."}</p><div className="order-number-card"><span>{t.orderNumber}</span><strong>{orderComplete.order_number}</strong><small>{t.paymentPending}</small></div>{statusCard(orderComplete)}<button className="button button-dark" onClick={() => navigate("shop")}>{t.continueShopping}<ArrowRight size={15} /></button></main>}

      {route === "track" && <main className="track-page"><div className="track-heading"><PackageCheck size={30} /><span className="section-eyebrow">{lang === "bn" ? "পথের খবর" : "A LITTLE UPDATE"}</span><h1>{t.track}</h1><p>{t.trackDesc}</p></div><form className="track-form" onSubmit={(e) => void submitTracking(e)}><label>{t.orderNumber}<input name="order_number" required /></label><label>{t.phone}<input name="phone" type="tel" inputMode="tel" pattern="(?:\\+?88)?01[3-9][0-9]{8}" required /></label><button className="button button-dark">{t.trackOrder}<ArrowRight size={15} /></button></form>{tracking && statusCard(tracking)}</main>}

      {route === "about" && <main className="about-page"><div className="about-photo"><img src={photo("photo-1551024506-0bccd828d307", 1400)} alt="Beautiful handmade sweets" /></div><div className="about-copy"><span className="section-eyebrow">{lang === "bn" ? "আমাদের গল্প" : "A NOTE FROM US"}</span><h1>{contentText("about_title", t.aboutTitle)}</h1><p>{contentText("about_description", t.aboutDesc)}</p><p>{contentText("about_story", lang === "bn" ? "প্রতিটি আয়োজনের পেছনে আছে সময়, যত্ন এবং ছোট্ট মুহূর্তকে বিশেষ করে তোলার ভালোবাসা।" : "Behind every little delight are thoughtful hands, a little time, and lots of love for making small moments feel special.")}</p><button className="button button-dark" onClick={() => navigate("shop")}>{t.shopNow}<ArrowRight size={16} /></button></div></main>}

      {route === "contact" && <main className="track-page contact-page"><div className="track-heading"><span className="section-eyebrow">{lang === "bn" ? "আমরা শুনছি" : "WE’RE HERE FOR YOU"}</span><h1>{lang === "bn" ? "কিছু জানতে চান?" : "Can we help with something?"}</h1><p>{lang === "bn" ? "আপনার কথা শুনতে আমাদের ভালো লাগে।" : "We’d love to hear from you, answer a question, or help you find just the right little delight."}</p></div><a className="button button-dark whatsapp-link" href="https://wa.me/8801700000000" target="_blank" rel="noreferrer">{t.contactWhatsApp}<ArrowUpRight size={16} /></a><p className="whatsapp-help">{lang === "bn" ? "WhatsApp নম্বরটি ব্যবসার নম্বরে আপডেট করতে admin settings কনফিগার করুন।" : "Contact details are owner-configurable before launch."}</p></main>}

      {route === "account" && <main className="account-page"><div className="account-heading"><span className="section-eyebrow">{t.accountTitle}</span><h1>{user?.name || user?.email}</h1><button className="text-link" onClick={() => void logout()}>{t.signOut}<ArrowRight size={15} /></button></div>{user?.role === "admin" && <div className="admin-entry"><div><strong>{t.admin}</strong><p>{t.adminIntro}</p></div><button className="button button-dark" onClick={() => void openAdmin()}>{t.admin}<ArrowRight size={15} /></button></div>}<section className="account-orders"><h2>{t.orderHistory}</h2>{user ? <OrderHistory user={user} lang={lang} t={t} /> : <p>{t.loginPrompt}</p>}{!user && <button className="button button-dark" onClick={() => setAuthOpen(true)}>{t.signIn}</button>}</section>{!user && <p className="guest-checkout-note">{t.guestCheckout}</p>}</main>}

      {route === "admin" && <main className="admin-page"><div className="admin-heading"><div><span className="section-eyebrow">{t.admin}</span><h1>{t.adminIntro}</h1></div><button className="button button-dark admin-new" onClick={() => { setEditingProduct(null); setEditingCategory(null); setAdminForm("product"); }}><Plus size={15} />{t.newProduct}</button></div>{adminNavigation}
        {adminTab === "overview" && <><div className="metrics-grid">{[[lang === "bn" ? "মোট অর্ডার" : "Total orders", adminMetrics.orders || 0], [lang === "bn" ? "আজকের অর্ডার" : "Today’s orders", adminMetrics.today_orders || 0], [lang === "bn" ? "অপেক্ষমাণ" : "Pending", adminMetrics.pending || 0], [lang === "bn" ? "মোট বিক্রি" : "Sales", fmt(adminMetrics.sales || 0)]].map(([label, value]) => <div className="metric-card" key={String(label)}><span>{label}</span><strong>{value}</strong></div>)}</div><div className="admin-panel"><div className="admin-panel-heading"><h2>{t.adminOrders}</h2><button className="text-link" onClick={() => void openAdmin("orders")}>{t.viewAll}<ArrowRight size={15} /></button></div><AdminOrderList orders={adminOrders.slice(0, 5)} onUpdate={updateOrder} t={t} /></div></>}
        {adminTab === "products" && <div className="admin-panel"><div className="admin-panel-heading"><h2>{t.adminProducts}</h2><button className="button button-outline" onClick={() => { setEditingProduct(null); setEditingCategory(null); setAdminForm("product"); }}><Plus size={14} />{t.newProduct}</button></div><div className="admin-product-list">{products.map((item) => <div className="admin-product-row" key={item.id}><img src={item.image} alt="" /><div><strong>{localize(item)}</strong><span>{fmt(item.price)} · {lang === "bn" ? item.category_name_bn || item.category_name_en : item.category_name_en}{item.demo ? ` · ${t.demoLabel}` : ""}</span></div><span className={item.active ? "active-tag" : "inactive-tag"}>{item.active ? "Active" : "Hidden"}</span><button className="button button-outline" onClick={() => { setEditingProduct(item); setEditingCategory(null); setAdminForm("product"); }}>{lang === "bn" ? "সম্পাদনা" : "Edit"}</button><button className="button button-outline" onClick={() => void toggleProduct(item)}>{item.active ? (lang === "bn" ? "লুকান" : "Hide") : (lang === "bn" ? "দেখান" : "Show")}</button></div>)}</div></div>}
        {adminTab === "categories" && <div className="admin-panel"><div className="admin-panel-heading"><h2>{t.adminCategories}</h2><button className="button button-outline" onClick={() => { setEditingProduct(null); setEditingCategory(null); setAdminForm("category"); }}><Plus size={14} />{t.newCategory}</button></div>{categories.map((item) => <div className="admin-category-row" key={item.id}><img src={item.image} alt="" /><span>{localize(item)}</span><small>{products.filter((product) => product.category_id === item.id).length} {t.products}</small><button className="button button-outline" onClick={() => { setEditingProduct(null); setEditingCategory(item); setAdminForm("category"); }}>{lang === "bn" ? "সম্পাদনা" : "Edit"}</button></div>)}</div>}
        {adminTab === "orders" && <div className="admin-panel"><div className="admin-panel-heading"><h2>{t.adminOrders}</h2><input className="admin-filter" value={orderFilter} onChange={(e) => setOrderFilter(e.target.value)} placeholder={`${lang === "bn" ? "খুঁজুন" : "Search"}...`} /></div><AdminOrderList orders={adminOrders.filter((item) => `${item.order_number} ${item.customer_name} ${item.phone}`.toLowerCase().includes(orderFilter.toLowerCase()))} onUpdate={updateOrder} t={t} /></div>}
        {adminTab === "requests" && <div className="admin-panel"><div className="admin-panel-heading"><h2>{t.adminRequests}</h2></div>{adminRequests.length ? adminRequests.map((request) => <div className="request-row" key={String(request.id)}><div><strong>{String(request.name)} · {String(request.phone)}</strong><p>{JSON.stringify(request.options)}</p><span className="status-pill">{String(request.status) === "quoted" ? (lang === "bn" ? "কোট সংরক্ষিত · কাস্টমারের সঙ্গে যোগাযোগ করুন" : "Quote saved · contact customer") : statusLabel(String(request.status), t)}</span></div><label>{t.quote}<span className="quote-control"><input type="number" min="1" step="50" defaultValue={String(request.quote || "")} id={`quote-${request.id}`} /><button className="button button-dark" onClick={() => void sendQuote(Number(request.id), Number((document.querySelector(`#quote-${request.id}`) as HTMLInputElement)?.value))}>{t.save}</button></span></label></div>) : <p className="admin-empty">{lang === "bn" ? "এখনো কোনো কাস্টম অনুরোধ নেই।" : "No custom requests yet."}</p>}</div>}
      </main>}

      {route !== "home" && route !== "shop" && route !== "wishlist" && route !== "custom" && route !== "checkout" && route !== "confirmation" && route !== "track" && route !== "about" && route !== "contact" && route !== "account" && route !== "admin" && !categories.some((item) => String(item.id) === route) && <main className="empty-state"><h2>{t.noResults}</h2><button className="button button-dark" onClick={() => navigate("home")}>{t.shopNow}</button></main>}

      <footer className="store-footer"><div className="footer-main"><div className="footer-brand"><a className="store-brand" href="#" onClick={(e) => { e.preventDefault(); navigate("home"); }}><span className="brand-emblem"><Cookie size={20} /><Sparkles className="emblem-sparkle" size={11} /></span><span className="brand-words"><strong>Taha’s <span>Mix Delight</span></strong><small>EVERY BITE, A LITTLE DELIGHT.</small></span></a><p>{contentText("footer_tagline", t.footerTagline)}</p><span className="footer-location"><ShieldCheck size={14} /> {t.curated}</span></div><div className="footer-links"><strong>{t.footerExplore}</strong><button onClick={() => navigate("shop")}>{t.shop}</button><button onClick={() => navigate("cakes")}>{t.cakes}</button><button onClick={() => navigate("gifts")}>{t.gifts}</button><button onClick={() => navigate("custom")}>{t.custom}</button></div><div className="footer-links"><strong>{t.footerHelp}</strong><button onClick={() => navigate("track")}>{t.track}</button><button onClick={() => navigate("account")}>{t.account}</button><button onClick={() => navigate("contact")}>{t.contact}</button><button onClick={() => navigate("about")}>{t.about}</button></div><div className="footer-contact"><strong>{t.footerContact}</strong><p>We’d love to hear from you.</p><button onClick={() => navigate("contact")}>Get in touch<ArrowRight size={14} /></button>{user?.role === "admin" && <button onClick={() => void openAdmin()}>Store administration</button>}</div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Taha’s Mix Delight. Made with love.</span><span className="footer-payments">CASH ON DELIVERY <span>·</span> BANGLADESH <span>·</span> BDT</span><button onClick={() => setLang(lang === "bn" ? "en" : "bn")}>{lang === "bn" ? "English" : "বাংলা"} <Languages size={13} /></button></div></footer>

      {cartOpen && <div className="overlay-scrim overlay-scrim-right"><aside className="cart-drawer" role="dialog" aria-modal="true" aria-label={t.cart}><div className="drawer-heading"><div><span className="section-eyebrow">{lang === "bn" ? "আপনার নির্বাচন" : "YOUR LITTLE COLLECTION"}</span><h2>{t.cart} <span>({itemCount})</span></h2></div><button className="store-icon" aria-label="Close cart" onClick={() => setCartOpen(false)}><X size={20} /></button></div>{cartLines.length ? <><div className="cart-items">{cartLines.map((line) => <article className="cart-line" key={`${line.productId}-${JSON.stringify(line.options)}`}><img src={line.product.image} alt={localize(line.product)} /><div className="cart-line-info"><strong>{localize(line.product)}</strong>{line.optionsLabel && <span>{line.optionsLabel}</span>}<span className="cart-line-price">{fmt(line.price * line.quantity)}</span><div className="quantity-control"><button onClick={() => updateQuantity(line.productId, line.options, line.quantity - 1)} aria-label="Remove one"><Minus size={13} /></button><span>{line.quantity}</span><button onClick={() => updateQuantity(line.productId, line.options, line.quantity + 1)} aria-label="Add one"><Plus size={13} /></button></div></div><button className="remove-line" onClick={() => updateQuantity(line.productId, line.options, 0)} aria-label="Remove item"><X size={15} /></button></article>)}</div><div className="drawer-bottom"><div className="subtotal-row"><span>{t.subtotal}</span><strong>{fmt(subtotal)}</strong></div><p>{lang === "bn" ? "ডেলিভারি চার্জ আপনার এলাকার ওপর নির্ভর করবে।" : "Delivery is calculated based on your delivery area."}</p><button className="button button-dark drawer-checkout" onClick={() => { setCartOpen(false); navigate("checkout"); }}>{t.checkout}<ArrowRight size={16} /></button><button className="drawer-continue" onClick={() => { setCartOpen(false); navigate("shop"); }}>{t.continueShopping}</button></div></> : <div className="empty-cart"><span className="empty-icon"><ShoppingBag size={23} /></span><h3>{t.emptyBag}</h3><p>{t.emptyBagDesc}</p><button className="button button-dark" onClick={() => { setCartOpen(false); navigate("shop"); }}>{t.continueShopping}<ArrowRight size={15} /></button></div>}</aside></div>}

      {selected && <div className="overlay-scrim product-scrim" role="presentation"><article className="product-modal" role="dialog" aria-modal="true" aria-label={localize(selected)}><button className="modal-close store-icon" onClick={() => setSelected(null)} aria-label="Close"><X size={19} /></button><div className="detail-image"><img src={selected.image || photo("photo-1578985545062-69928b1d9587")} alt={localize(selected)} /></div><div className="detail-info"><span className="section-eyebrow">{lang === "bn" ? selected.category_name_bn || selected.category_name_en : selected.category_name_en}</span><h2>{localize(selected)}</h2><div className="detail-price">{selected.sale_price ? <><strong>{fmt(selected.sale_price)}</strong><del>{fmt(selected.price)}</del></> : <strong>{fmt(selected.price)}</strong>}{selected.rating && selected.rating > 0 ? <span className="rating"><Star size={13} fill="currentColor" /> {selected.rating.toFixed(1)} · {selected.review_count || 0} {t.reviews}</span> : <span className="no-rating">{lang === "bn" ? "এখনো রিভিউ নেই" : "No reviews yet"}</span>}</div><p className="detail-description">{localize(selected, "description") || t.bnUnavailable}</p>{selected.variants.length > 0 && <div className="variant-options">{selected.variants.map((variant) => <fieldset key={variant.name}><legend>{variant.name}</legend><div>{variant.options.map((option) => <button type="button" className={`variant-chip ${selectedOptions[variant.name] === option.name ? "selected" : ""}`} key={option.name} onClick={() => setSelectedOptions((current) => ({ ...current, [variant.name]: option.name }))}>{option.name}{option.price != null && <small>{fmt(option.price)}</small>}{option.price_adjustment ? <small>+{fmt(option.price_adjustment)}</small> : null}</button>)}</div></fieldset>)}</div>}{selected.ingredients && <p className="product-extra"><strong>{t.ingredients}:</strong> {selected.ingredients}</p>}{selected.allergens && <p className="product-extra"><strong>{t.allergens}:</strong> {selected.allergens}</p>}{selected.storage && <p className="product-extra"><strong>{lang === "bn" ? "সংরক্ষণ" : "Storage"}:</strong> {selected.storage}</p>}<p className="product-extra prep-note"><Clock3 size={14} /> {selected.prep_time || t.freshness}</p><div className="stock-note"><span className="stock-dot" /> {selected.stock === null ? t.madeToOrder : selected.stock > 0 ? `${selected.stock} ${t.stock}` : t.soldOut}</div><div className="detail-buy-row"><div className="quantity-control"><button type="button" onClick={() => setDetailQuantity(Math.max(1, detailQuantity - 1))} aria-label="Decrease quantity"><Minus size={13} /></button><span>{detailQuantity}</span><button type="button" onClick={() => setDetailQuantity(detailQuantity + 1)} aria-label="Increase quantity"><Plus size={13} /></button></div><button className="button button-dark detail-add" disabled={selected.stock !== null && selected.stock < 1} onClick={() => { addToCart(selected, selectedOptions, detailQuantity); setDetailQuantity(1); }}>{t.addBag}<ShoppingBag size={16} /></button></div><button className="detail-wishlist" onClick={() => toggleFavorite(selected.id)}><Heart size={15} fill={favorites.includes(selected.id) ? "currentColor" : "none"} />{lang === "bn" ? "পছন্দের তালিকায় যোগ করুন" : "Save to your wishlist"}</button><section className="review-section"><h3>{t.reviewTitle}</h3>{customerReviews[selected.id]?.length ? customerReviews[selected.id].map((review) => <article className="customer-review" key={String(review.id)}><div className="stars">{"★".repeat(Number(review.rating))}</div><p>{String(review.body)}</p><small>{String(review.name)} · {new Date(Number(review.created_at) * 1000).toLocaleDateString(lang === "bn" ? "bn-BD" : "en-BD")}</small></article>) : <p className="no-reviews">{t.noReviews}</p>}{user && <form className="review-form" onSubmit={(event) => void submitReview(event)}><strong>{t.writeReview}</strong><div className="review-stars" role="group" aria-label="Rating">{[1, 2, 3, 4, 5].map((rating) => <button type="button" key={rating} className={rating <= reviewRating ? "chosen" : ""} onClick={() => setReviewRating(rating)} aria-label={`${rating} stars`}>★</button>)}</div><label className="sr-only" htmlFor="review-body">{t.reviewText}</label><textarea id="review-body" value={reviewBody} onChange={(event) => setReviewBody(event.target.value)} minLength={8} maxLength={2000} rows={3} placeholder={t.reviewText} required /><button className="button button-outline" disabled={reviewBusy}>{reviewBusy ? "…" : t.submitReview}</button></form>}</section><span className="detail-safe"><ShieldCheck size={13} /> {t.secureCheckout}</span></div></article></div>}

      {route === "checkout" && !cartLines.length && !orderComplete && <div className="empty-state empty-checkout"><span className="empty-icon"><ShoppingBag size={22} /></span><h2>{t.emptyBag}</h2><button className="button button-dark" onClick={() => navigate("shop")}>{t.continueShopping}</button></div>}

      {authOpen && <div className="overlay-scrim auth-scrim"><section className="auth-dialog" role="dialog" aria-modal="true"><button className="modal-close store-icon" onClick={() => setAuthOpen(false)} aria-label="Close"><X size={19} /></button><span className="brand-emblem auth-emblem"><Cookie size={21} /></span><span className="section-eyebrow">{t.accountTitle}</span><h2>{authMode === "signup" ? t.signup : t.signIn}</h2><p>{t.guestCheckout}</p><form onSubmit={(event) => void submitAuth(event)}>{authMode === "signup" && <label>{t.name}<input name="name" autoComplete="name" minLength={2} required /></label>}<label>{t.emailPassword}<input name="email" type="email" autoComplete="email" required /></label><label>{t.password}<input name="password" type="password" autoComplete={authMode === "signup" ? "new-password" : "current-password"} minLength={8} required /></label><button className="button button-dark auth-submit" disabled={busy}>{busy ? "…" : authMode === "signup" ? t.signup : t.login}<ArrowRight size={15} /></button></form><div className="auth-switch">{authMode === "login" ? t.noAccount : t.hasAccount}<button onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}>{authMode === "login" ? t.signup : t.login}</button></div><p className="guest-note">{t.guestCheckout}</p></section></div>}

      {adminForm && <div className="overlay-scrim form-scrim">
        <section className="admin-dialog" role="dialog" aria-modal="true">
          <button className="modal-close store-icon" onClick={() => { setAdminForm(null); setEditingProduct(null); setEditingCategory(null); }} aria-label="Close"><X size={19} /></button>
          <span className="section-eyebrow">{t.admin}</span>
          <h2>{adminForm === "product" ? (editingProduct ? (lang === "bn" ? "পণ্য সম্পাদনা" : "Edit product") : t.newProduct) : editingCategory ? (lang === "bn" ? "ক্যাটাগরি সম্পাদনা" : "Edit category") : t.newCategory}</h2>
          <form className="admin-form" onSubmit={(event) => void (adminForm === "product" ? submitAdminProduct(event) : submitAdminCategory(event))}>
            <label>{t.productName}<input name="name_en" required maxLength={160} defaultValue={editingProduct?.name_en || editingCategory?.name_en || ""} /></label>
            <label>{t.productNameBn}<input name="name_bn" maxLength={160} defaultValue={editingProduct?.name_bn || editingCategory?.name_bn || ""} /></label>
            {adminForm === "product" ? <>
              <label>{t.imageUrl}<input name="image" type="url" required placeholder="https://…" defaultValue={editingProduct?.image || photo("photo-1578985545062-69928b1d9587")} /></label>
              <label>{t.category}<select name="category_id" required defaultValue={String(editingProduct?.category_id || categories[0]?.id || "")}>{categories.map((category) => <option key={category.id} value={category.id}>{localize(category)}</option>)}</select></label>
              <label>{t.priceBDT}<input name="price" type="number" min="1" max="100000000" step="1" required defaultValue={editingProduct?.price ?? ""} /></label>
              <label>{lang === "bn" ? "ছাড়ের মূল্য (ঐচ্ছিক)" : "Sale price (optional)"}<input name="sale_price" type="number" min="1" step="1" defaultValue={editingProduct?.sale_price ?? ""} /></label>
              <label>{t.stockQty}<input name="stock" type="number" min="0" defaultValue={editingProduct?.stock ?? ""} /></label>
              <label>{t.description}<textarea name="description_en" rows={3} defaultValue={editingProduct?.description_en || ""} /></label>
              <label>{lang === "bn" ? "বাংলা বিবরণ" : "Bengali description"}<textarea name="description_bn" rows={3} defaultValue={editingProduct?.description_bn || ""} /></label>
              <label>{lang === "bn" ? "উপকরণ" : "Ingredients"}<textarea name="ingredients" rows={2} defaultValue={editingProduct?.ingredients || ""} /></label>
              <label>{lang === "bn" ? "অ্যালার্জেন" : "Allergens"}<textarea name="allergens" rows={2} defaultValue={editingProduct?.allergens || ""} /></label>
              <label>{lang === "bn" ? "প্রস্তুতির সময়" : "Preparation time"}<input name="prep_time" maxLength={200} defaultValue={editingProduct?.prep_time || ""} /></label>
              <label>{lang === "bn" ? "সংরক্ষণের তথ্য" : "Storage information"}<input name="storage" maxLength={600} defaultValue={editingProduct?.storage || ""} /></label>
              <label>{lang === "bn" ? "ভ্যারিয়েন্ট বিকল্প (JSON)" : "Product variants (JSON)"}<textarea name="variants" rows={4} placeholder={'[{"name":"Size","options":[{"name":"1 pound","price":850,"stock":5}]}]'} defaultValue={editingProduct ? JSON.stringify(editingProduct.variants, null, 2) : ""} /></label>
              <label className="checkbox-label"><input type="checkbox" name="featured" defaultChecked={Boolean(editingProduct?.featured)} /> {t.featuredEyebrow}</label>
              <label className="checkbox-label"><input type="checkbox" name="bestseller" defaultChecked={Boolean(editingProduct?.bestseller)} /> {t.bestseller}</label>
              <label className="checkbox-label"><input type="checkbox" name="made_to_order" defaultChecked={Boolean(editingProduct?.made_to_order)} /> {t.madeToOrder}</label>
            </> : <>
              <label>{lang === "bn" ? "ক্যাটাগরি ছবি" : "Category image URL"}<input name="image" type="url" required defaultValue={editingCategory?.image || photo("photo-1606313564200-e75d5e30476c")} /></label>
              <label className="checkbox-label"><input type="checkbox" name="featured" defaultChecked={editingCategory ? Boolean(editingCategory.featured) : true} /> {t.featuredEyebrow}</label>
            </>}
            <div className="admin-form-actions">
              <button type="button" className="button button-outline" onClick={() => { setAdminForm(null); setEditingProduct(null); setEditingCategory(null); }}>{t.cancel}</button>
              <button className="button button-dark" disabled={busy}>{busy ? "…" : t.save}<Check size={15} /></button>
            </div>
          </form>
        </section>
      </div>}

      {notice && <div className="store-toast" role="status"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss"><X size={15} /></button></div>}
      {route === "home" && <button className="whatsapp-fab" title={t.contactWhatsApp} aria-label={t.contactWhatsApp} onClick={() => navigate("contact")}>✆</button>}
    </div>
  );

}

function AdminSettings({ zones, coupons, content, busy, onSaveZone, onSaveCoupon, onSaveContent, onToggleZone, onToggleCoupon, lang }: {
  zones: AdminZone[];
  coupons: Coupon[];
  content: StoreContent;
  busy: boolean;
  onSaveZone: (form: FormData) => Promise<void>;
  onSaveCoupon: (form: FormData) => Promise<void>;
  onSaveContent: (form: FormData) => Promise<void>;
  onToggleZone: (id: number, active: number) => Promise<void>;
  onToggleCoupon: (code: string, active: number) => Promise<void>;
  lang: "bn" | "en";
}) {
  const bnLang = lang === "bn";
  const contentFields = [
    { key: "announcement", label: "Announcement", multiline: false },
    { key: "hero_eyebrow", label: "Hero eyebrow", multiline: false },
    { key: "hero_title", label: "Hero title", multiline: false },
    { key: "hero_description", label: "Hero description", multiline: true },
    { key: "categories_eyebrow", label: "Category section eyebrow", multiline: false },
    { key: "categories_title", label: "Category section title", multiline: false },
    { key: "categories_description", label: "Category section description", multiline: true },
    { key: "featured_eyebrow", label: "Featured section eyebrow", multiline: false },
    { key: "featured_title", label: "Featured section title", multiline: false },
    { key: "gift_title", label: "Gift section title", multiline: false },
    { key: "gift_description", label: "Gift section description", multiline: true },
    { key: "about_title", label: "About title", multiline: false },
    { key: "about_description", label: "About description", multiline: true },
    { key: "about_story", label: "About story", multiline: true },
    { key: "footer_tagline", label: "Footer tagline", multiline: false },
    { key: "newsletter_title", label: "Newsletter title", multiline: false },
    { key: "newsletter_description", label: "Newsletter description", multiline: true },
  ];
  return <div className="admin-settings-grid">
    <section className="admin-panel">
      <div className="admin-panel-heading"><h2>{bnLang ? "ডেলিভারি এলাকা" : "Delivery zones"}</h2></div>
      <form className="admin-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void onSaveZone(form); event.currentTarget.reset(); }}>
        <label>{bnLang ? "জেলা / শহর" : "District / city"}<input name="city" required maxLength={100} /></label>
        <label>{bnLang ? "এলাকা (সবার জন্য * দিন)" : "Area (use * for all areas)"}<input name="area" placeholder="*" /></label>
        <label>{bnLang ? "ডেলিভারি ফি (৳)" : "Delivery fee (BDT)"}<input name="fee" type="number" min="0" step="1" required /></label>
        <button className="button button-dark" disabled={busy}>{bnLang ? "এলাকা যোগ করুন" : "Add delivery zone"}<Plus size={14} /></button>
      </form>
      <div className="admin-product-list">{zones.map((zone) => <div className="admin-product-row" key={zone.id}>
        <div><strong>{zone.city} · {zone.area}</strong><span>{fmt(zone.fee)}</span></div>
        <button className="button button-outline" onClick={() => void onToggleZone(zone.id, zone.active ? 0 : 1)}>{zone.active ? (bnLang ? "বন্ধ করুন" : "Disable") : (bnLang ? "চালু করুন" : "Enable")}</button>
      </div>)}</div>
    </section>
    <section className="admin-panel">
      <div className="admin-panel-heading"><h2>{bnLang ? "কুপন" : "Coupons"}</h2></div>
      <form className="admin-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void onSaveCoupon(form); event.currentTarget.reset(); }}>
        <label>{bnLang ? "কুপন কোড" : "Coupon code"}<input name="code" required minLength={3} maxLength={40} pattern="[A-Za-z0-9_-]+" /></label>
        <div className="form-row">
          <label>{bnLang ? "ছাড়ের ধরন" : "Discount type"}<select name="kind"><option value="percent">{bnLang ? "শতাংশ" : "Percent"}</option><option value="amount">{bnLang ? "নির্দিষ্ট টাকা" : "Fixed amount"}</option></select></label>
          <label>{bnLang ? "ছাড়ের পরিমাণ" : "Discount value"}<input name="value" type="number" min="1" step="1" required /></label>
        </div>
        <div className="form-row">
          <label>{bnLang ? "ন্যূনতম অর্ডার (৳)" : "Minimum subtotal (BDT)"}<input name="min_subtotal" type="number" min="0" step="1" defaultValue="0" /></label>
          <label>{bnLang ? "ব্যবহারসীমা" : "Use limit"}<input name="max_uses" type="number" min="1" step="1" placeholder={bnLang ? "সীমাহীন" : "Unlimited"} /></label>
        </div>
        <button className="button button-dark" disabled={busy}>{bnLang ? "কুপন তৈরি করুন" : "Create coupon"}<Plus size={14} /></button>
      </form>
      <div className="admin-product-list">{coupons.map((coupon) => <div className="admin-product-row" key={coupon.code}>
        <div><strong>{coupon.code}{coupon.demo ? ` · ${bnLang ? "নমুনা" : "Sample"}` : ""}</strong><span>{coupon.kind === "percent" ? `${coupon.value}%` : fmt(coupon.value)} · {coupon.used_count}{coupon.max_uses ? `/${coupon.max_uses}` : ""} {bnLang ? "ব্যবহার" : "uses"}</span></div>
        <button className="button button-outline" onClick={() => void onToggleCoupon(coupon.code, coupon.active ? 0 : 1)}>{coupon.active ? (bnLang ? "বন্ধ করুন" : "Disable") : (bnLang ? "চালু করুন" : "Enable")}</button>
      </div>)}</div>
    </section>
    <section className="admin-panel admin-content-panel">
      <div className="admin-panel-heading"><h2>{bnLang ? "স্টোরফ্রন্টের কনটেন্ট" : "Storefront content"}</h2></div>
      <form className="admin-form" onSubmit={(event) => { event.preventDefault(); void onSaveContent(new FormData(event.currentTarget)); }}>
        <label>{bnLang ? "হিরো ছবির HTTPS URL" : "Hero image HTTPS URL"}<input name="hero_image" type="url" required maxLength={1200} defaultValue={content.hero_image} /></label>
        <div className="store-content-fields">{contentFields.map(({ key, label, multiline }) => <fieldset className="store-content-field" key={key}>
          <legend>{label}</legend>
          <label>English{multiline ? <textarea name={`${key}_en`} required maxLength={2000} rows={3} defaultValue={content[`${key}_en`]} /> : <input name={`${key}_en`} required maxLength={2000} defaultValue={content[`${key}_en`]} />}</label>
          <label>বাংলা{multiline ? <textarea name={`${key}_bn`} required maxLength={2000} rows={3} defaultValue={content[`${key}_bn`]} /> : <input name={`${key}_bn`} required maxLength={2000} defaultValue={content[`${key}_bn`]} />}</label>
        </fieldset>)}</div>
        <button className="button button-dark" disabled={busy}>{busy ? "…" : (bnLang ? "কনটেন্ট সংরক্ষণ" : "Save storefront content")}<Check size={14} /></button>
      </form>
    </section>
  </div>;
}

function OrderHistory({ user, lang, t }: { user: User; lang: "bn" | "en"; t: Copy }) {
  const [orders, setOrders] = useState<Order[]>([]);
  useEffect(() => {
    void api<Order[]>("/orders/mine").then(setOrders).catch((error: Error) => console.error("Couldn’t load order history:", error));
  }, [user.id]);
  return orders.length ? <div className="order-history">{orders.map((order) => <div className="order-history-row" key={order.order_number}><span><strong>{order.order_number}</strong><small>{new Date(order.created_at * 1000).toLocaleDateString(lang === "bn" ? "bn-BD" : "en-BD")}</small></span><span className={`status-pill status-${order.status}`}>{statusLabel(order.status, t)}</span><strong>{fmt(order.total)}</strong></div>)}</div> : <p>{lang === "bn" ? "এখনো কোনো অর্ডার নেই।" : "Your orders will appear here after your first order."}</p>;
}

function AdminOrderList({ orders, onUpdate, t }: { orders: Record<string, unknown>[]; onUpdate: (id: string, status: string) => void; t: Copy }) {
  const statuses = ["pending", "confirmed", "processing", "preparing", "ready_for_delivery", "out_for_delivery", "delivered", "cancelled"];
  return orders.length ? <div className="admin-order-list">{orders.map((order) => <article className="admin-order-row" key={String(order.order_number)}><div className="order-customer"><strong>{String(order.order_number)}</strong><span>{String(order.customer_name)} · {String(order.phone)}</span><small>{String(order.items_count)} {t.products} · {fmt(Number(order.total))}</small></div><div className="order-status-control"><span className={`status-pill status-${String(order.status)}`}>{statusLabel(String(order.status), t)}</span><select aria-label={`${t.adminStatus} ${String(order.order_number)}`} value={String(order.status)} onChange={(e) => onUpdate(String(order.order_number), e.target.value)}>{statuses.map((status) => <option value={status} key={status}>{statusLabel(status, t)}</option>)}</select></div></article>)}</div> : <p className="admin-empty">{t.noResults}</p>;
}
