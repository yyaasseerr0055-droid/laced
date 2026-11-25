import { cookies } from "next/headers";

export type Lang = "ar" | "en";

export const STATUSES = [
  "new",
  "assigned",
  "out_for_delivery",
  "delivered",
  "postponed",
  "returned",
  "failed",
  "unavailable",
] as const;
export type Status = (typeof STATUSES)[number];

const en = {
  appName: "Laced Delivery Manager",
  signInTitle: "Admin sign-in",
  email: "Email",
  password: "Password",
  signInButton: "Sign in",
  signOut: "Sign out",
  wrongLogin: "Wrong email or password.",
  notAdmin: "This account is not the admin account.",
  switchLanguage: "عربي",
  dashboard: "Dashboard",
  ordersByStatus: "Orders by status",
  totalOrders: "Total orders",
  unreadAlerts: "Unread alerts",
  noOrdersYet: "No orders yet",
  noOrdersHint: "Orders will appear here once you add them.",
  dbOk: "Database connected",
  dbError: "Could not reach the database",
  dbErrorHint: "Check the site settings (the Supabase secret key).",
  status_new: "New",
  status_assigned: "Assigned",
  status_out_for_delivery: "Out for delivery",
  status_delivered: "Delivered",
  status_postponed: "Postponed",
  status_returned: "Returned",
  status_failed: "Failed",
  status_unavailable: "Unavailable",
} as const;

const ar: Record<keyof typeof en, string> = {
  appName: "Laced · إدارة التوصيل",
  signInTitle: "تسجيل دخول المدير",
  email: "البريد الإلكتروني",
  password: "كلمة المرور",
  signInButton: "دخول",
  signOut: "تسجيل الخروج",
  wrongLogin: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
  notAdmin: "هذا الحساب ليس حساب المدير.",
  switchLanguage: "English",
  dashboard: "لوحة التحكم",
  ordersByStatus: "الطلبات حسب الحالة",
  totalOrders: "إجمالي الطلبات",
  unreadAlerts: "تنبيهات غير مقروءة",
  noOrdersYet: "لا توجد طلبات بعد",
  noOrdersHint: "ستظهر الطلبات هنا بعد إضافتها.",
  dbOk: "قاعدة البيانات متصلة",
  dbError: "تعذر الاتصال بقاعدة البيانات",
  dbErrorHint: "راجع إعدادات الموقع (المفتاح السري لـ Supabase).",
  status_new: "جديد",
  status_assigned: "تم التعيين",
  status_out_for_delivery: "خرج للتوصيل",
  status_delivered: "تم التسليم",
  status_postponed: "مؤجل",
  status_returned: "مرتجع",
  status_failed: "فشل",
  status_unavailable: "غير متوفر",
};

export type Key = keyof typeof en;
const dict = { en, ar } as const;

export async function getLang(): Promise<Lang> {
  const value = (await cookies()).get("lang")?.value;
  return value === "en" ? "en" : "ar";
}

export async function getT() {
  const lang = await getLang();
  return {
    lang,
    dir: lang === "ar" ? ("rtl" as const) : ("ltr" as const),
    t: (key: Key): string => dict[lang][key],
  };
}
