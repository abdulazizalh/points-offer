// DEMO DATA. Every establishment below is fictional and flagged `isDemo: true`.
// The UI shows a "Demo data" label wherever this data appears.
import type {
  Area,
  Branch,
  Business,
  Category,
  DB,
  Employee,
  OperatingHours,
  QueueType,
  Report,
  Review,
  Service,
  User,
} from "./types";
import { hashString, mulberry32 } from "./utils";

export const DB_VERSION = 3;

const L = (en: string, ar: string) => ({ en, ar });

export const AREAS: Area[] = [
  { id: "kc", name: L("Kuwait City", "مدينة الكويت"), governorate: L("Capital", "العاصمة"), lat: 29.3759, lng: 47.9774 },
  { id: "salmiya", name: L("Salmiya", "السالمية"), governorate: L("Hawalli", "حولي"), lat: 29.3339, lng: 48.0761 },
  { id: "hawalli", name: L("Hawalli", "حولي"), governorate: L("Hawalli", "حولي"), lat: 29.3328, lng: 48.0286 },
  { id: "jabriya", name: L("Jabriya", "الجابرية"), governorate: L("Hawalli", "حولي"), lat: 29.3186, lng: 48.02 },
  { id: "mishref", name: L("Mishref", "مشرف"), governorate: L("Hawalli", "حولي"), lat: 29.275, lng: 48.06 },
  { id: "shuwaikh", name: L("Shuwaikh", "الشويخ"), governorate: L("Capital", "العاصمة"), lat: 29.35, lng: 47.94 },
  { id: "rai", name: L("Al Rai", "الري"), governorate: L("Farwaniya", "الفروانية"), lat: 29.3, lng: 47.93 },
  { id: "fintas", name: L("Fintas", "الفنطاس"), governorate: L("Al Ahmadi", "الأحمدي"), lat: 29.1739, lng: 48.1211 },
  { id: "jahra", name: L("Jahra", "الجهراء"), governorate: L("Jahra", "الجهراء"), lat: 29.3375, lng: 47.6581 },
  { id: "ahmadi", name: L("Ahmadi", "الأحمدي"), governorate: L("Al Ahmadi", "الأحمدي"), lat: 29.0769, lng: 48.0839 },
];

export const CATEGORIES: Category[] = [
  { id: "cat_food", slug: "restaurants", name: L("Restaurants & Cafes", "مطاعم ومقاهي"), icon: "coffee", defaultQueueType: "standard", active: true, sort: 1 },
  { id: "cat_salon", slug: "salons", name: L("Salons & Barbershops", "صالونات وحلاقة"), icon: "scissors", defaultQueueType: "standard", active: true, sort: 2 },
  { id: "cat_clinic", slug: "clinics", name: L("Clinics", "عيادات"), icon: "stethoscope", defaultQueueType: "healthcare", active: true, sort: 3 },
  { id: "cat_hospital", slug: "hospitals", name: L("Hospitals & Medical Centers", "مستشفيات ومراكز طبية"), icon: "hospital", defaultQueueType: "healthcare", active: true, sort: 4 },
  { id: "cat_car", slug: "car", name: L("Car Repair & Car Wash", "صيانة وغسيل السيارات"), icon: "car", defaultQueueType: "standard", active: true, sort: 5 },
  { id: "cat_fun", slug: "entertainment", name: L("Entertainment Venues", "أماكن الترفيه"), icon: "ticket", defaultQueueType: "timed_entry", active: true, sort: 6 },
  { id: "cat_events", slug: "events", name: L("Events & Activities", "فعاليات وأنشطة"), icon: "calendar", defaultQueueType: "timed_entry", active: true, sort: 7 },
  { id: "cat_gov", slug: "government", name: L("Government Service Centers", "مراكز الخدمات الحكومية"), icon: "landmark", defaultQueueType: "standard", active: true, sort: 8 },
  { id: "cat_market", slug: "markets", name: L("Central Markets & Supermarkets", "الجمعيات والأسواق"), icon: "basket", defaultQueueType: "walk_in", active: true, sort: 9 },
  { id: "cat_bank", slug: "banks", name: L("Banks", "البنوك"), icon: "bank", defaultQueueType: "standard", active: true, sort: 10 },
  { id: "cat_retail", slug: "retail", name: L("Retail Stores", "متاجر التجزئة"), icon: "bag", defaultQueueType: "standard", active: true, sort: 11 },
  { id: "cat_museum", slug: "museums", name: L("Museums", "المتاحف"), icon: "museum", defaultQueueType: "timed_entry", active: true, sort: 12 },
];

function hours(open: string, close: string, closedDays: number[] = [], fridayOpen?: string): OperatingHours[] {
  return [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    day,
    open: day === 5 && fridayOpen ? fridayOpen : open,
    close,
    closed: closedDays.includes(day),
  }));
}

type Spec = {
  id: string;
  cat: string;
  name: [string, string];
  desc: [string, string];
  hue: number;
  initials: string;
  queueType: QueueType;
  branches: Array<{ id: string; area: string; name: [string, string]; addr: [string, string]; dLat: number; dLng: number; counters: number; hours: OperatingHours[]; remote?: boolean; slotMinutes?: number; slotCapacity?: number }>;
  services: Array<{ id: string; name: [string, string]; desc: [string, string]; dur: number; prefix: string; queueType?: QueueType; remote?: boolean }>;
  staff: Array<[string, string, string]>; // name, title en, title ar
};

const SPECS: Spec[] = [
  {
    id: "biz_oasis", cat: "cat_salon", name: ["Oasis Grooming Lounge", "صالون الواحة"], hue: 212, initials: "OG",
    desc: ["Modern barbershop for classic cuts, beard styling and grooming.", "صالون حلاقة عصري للقصات الكلاسيكية وتهذيب اللحية والعناية."],
    queueType: "standard",
    branches: [
      { id: "br_oasis_salmiya", area: "salmiya", name: ["Salmiya", "السالمية"], addr: ["Salem Al Mubarak St, Block 10", "شارع سالم المبارك، قطعة 10"], dLat: 0.004, dLng: -0.003, counters: 3, hours: hours("09:00", "23:00", [], "14:00") },
      { id: "br_oasis_jabriya", area: "jabriya", name: ["Jabriya", "الجابرية"], addr: ["Block 1A, Street 103", "قطعة 1أ، شارع 103"], dLat: -0.002, dLng: 0.004, counters: 2, hours: hours("10:00", "22:00", [], "15:00") },
    ],
    services: [
      { id: "srv_oasis_cut", name: ["Haircut", "قص الشعر"], desc: ["Wash, cut and style by a senior barber.", "غسيل وقص وتصفيف بواسطة حلاق محترف."], dur: 20, prefix: "A" },
      { id: "srv_oasis_beard", name: ["Beard Trim", "تهذيب اللحية"], desc: ["Shape, line-up and hot towel.", "تحديد وتهذيب مع منشفة ساخنة."], dur: 15, prefix: "B" },
      { id: "srv_oasis_full", name: ["Full Service", "الخدمة الكاملة"], desc: ["Haircut, beard and facial cleanse.", "قص الشعر واللحية وتنظيف البشرة."], dur: 35, prefix: "C" },
    ],
    staff: [["Hassan Ali", "Senior Barber", "حلاق أول"], ["Omar Saleh", "Barber", "حلاق"], ["Yousef Nabil", "Barber", "حلاق"], ["Karim Adel", "Barber", "حلاق"]],
  },
  {
    id: "biz_qahwa", cat: "cat_food", name: ["Qahwa House", "بيت القهوة"], hue: 28, initials: "QH",
    desc: ["Specialty coffee and breakfast. Join the table waitlist remotely.", "قهوة مختصة وفطور. انضم لقائمة انتظار الطاولات عن بُعد."],
    queueType: "standard",
    branches: [{ id: "br_qahwa_salmiya", area: "salmiya", name: ["Marina Walk", "ممشى المارينا"], addr: ["Arabian Gulf St, Marina Walk", "شارع الخليج العربي، ممشى المارينا"], dLat: 0.007, dLng: 0.004, counters: 4, hours: hours("07:00", "01:00") }],
    services: [
      { id: "srv_qahwa_t2", name: ["Table for 1–2", "طاولة لشخص أو شخصين"], desc: ["Indoor or terrace seating.", "جلسات داخلية أو خارجية."], dur: 12, prefix: "T" },
      { id: "srv_qahwa_t4", name: ["Table for 3–6", "طاولة من 3 إلى 6"], desc: ["Family and group seating.", "جلسات عائلية وللمجموعات."], dur: 18, prefix: "G" },
    ],
    staff: [["Noura Fahad", "Host", "مضيفة"], ["Ali Reza", "Host", "مضيف"]],
  },
  {
    id: "biz_saffron", cat: "cat_food", name: ["Saffron Table", "مائدة الزعفران"], hue: 40, initials: "ST",
    desc: ["Gulf and Levantine cuisine in the heart of the city.", "مأكولات خليجية وشامية في قلب المدينة."],
    queueType: "standard",
    branches: [{ id: "br_saffron_kc", area: "kc", name: ["Sharq", "شرق"], addr: ["Jaber Al Mubarak St, Sharq", "شارع جابر المبارك، شرق"], dLat: 0.002, dLng: 0.006, counters: 5, hours: hours("12:00", "00:00") }],
    services: [{ id: "srv_saffron_table", name: ["Dine-in Table", "طاولة داخل المطعم"], desc: ["Seating for any party size.", "جلوس لأي عدد."], dur: 15, prefix: "T" }],
    staff: [["Mariam Jassim", "Host", "مضيفة"]],
  },
  {
    id: "biz_lulu", cat: "cat_salon", name: ["Lulu Beauty Studio", "استوديو لؤلؤة للتجميل"], hue: 330, initials: "LB",
    desc: ["Hair, nails and beauty treatments for women.", "خدمات الشعر والأظافر والتجميل للسيدات."],
    queueType: "standard",
    branches: [{ id: "br_lulu_mishref", area: "mishref", name: ["Mishref", "مشرف"], addr: ["Block 3, Co-op area", "قطعة 3، منطقة الجمعية"], dLat: 0.003, dLng: -0.002, counters: 3, hours: hours("10:00", "21:00", [5]) }],
    services: [
      { id: "srv_lulu_blow", name: ["Blow-dry", "استشوار"], desc: ["Wash and blow-dry.", "غسيل واستشوار."], dur: 30, prefix: "H" },
      { id: "srv_lulu_nails", name: ["Manicure", "مناكير"], desc: ["Classic manicure.", "مناكير كلاسيكي."], dur: 25, prefix: "N" },
    ],
    staff: [["Dana Khaled", "Stylist", "مصففة"], ["Sara Mohammed", "Nail Technician", "أخصائية أظافر"]],
  },
  {
    id: "biz_shifa", cat: "cat_clinic", name: ["Dar Al Shifa Family Clinic", "عيادة دار الشفاء للعائلة"], hue: 168, initials: "DS",
    desc: ["Family medicine and paediatrics. Medical priority is decided by clinical staff.", "طب الأسرة والأطفال. تحدد الأولوية الطبية من قبل الطاقم الطبي."],
    queueType: "healthcare",
    branches: [{ id: "br_shifa_hawalli", area: "hawalli", name: ["Hawalli", "حولي"], addr: ["Tunis St, Block 4", "شارع تونس، قطعة 4"], dLat: 0.002, dLng: 0.001, counters: 3, hours: hours("08:00", "21:00", [5]), slotMinutes: 20, slotCapacity: 3 }],
    services: [
      { id: "srv_shifa_walkin", name: ["General Consultation (Waiting Queue)", "استشارة عامة (قائمة انتظار)"], desc: ["Same-day visit. Staff may prioritise urgent cases.", "زيارة في نفس اليوم. قد يقدم الطاقم الحالات العاجلة."], dur: 15, prefix: "M", queueType: "healthcare" },
      { id: "srv_shifa_appt", name: ["Booked Appointment", "موعد محجوز"], desc: ["Choose a time slot with a family physician.", "اختر موعداً مع طبيب الأسرة."], dur: 20, prefix: "P", queueType: "appointment" },
    ],
    staff: [["Dr. Ahmad Al-Sabah", "Family Physician", "طبيب أسرة"], ["Dr. Reem Al-Ali", "Paediatrician", "طبيبة أطفال"], ["Fatma Hussain", "Triage Nurse", "ممرضة فرز"]],
  },
  {
    id: "biz_smile", cat: "cat_clinic", name: ["Smile Dental Center", "مركز الابتسامة لطب الأسنان"], hue: 196, initials: "SD",
    desc: ["General dentistry, cleaning and check-ups.", "طب أسنان عام وتنظيف وفحوصات."],
    queueType: "appointment",
    branches: [{ id: "br_smile_jabriya", area: "jabriya", name: ["Jabriya", "الجابرية"], addr: ["Medical area, Block 2", "المنطقة الطبية، قطعة 2"], dLat: 0.005, dLng: -0.004, counters: 2, hours: hours("09:00", "20:00", [5]), slotMinutes: 30, slotCapacity: 2 }],
    services: [
      { id: "srv_smile_check", name: ["Check-up & Cleaning", "فحص وتنظيف"], desc: ["Routine exam with scaling.", "فحص دوري مع تنظيف الجير."], dur: 30, prefix: "D", queueType: "appointment" },
    ],
    staff: [["Dr. Laila Mansour", "Dentist", "طبيبة أسنان"], ["Dr. Bader Al-Enezi", "Dentist", "طبيب أسنان"]],
  },
  {
    id: "biz_gmc", cat: "cat_hospital", name: ["Gulf Medical Center", "المركز الطبي الخليجي"], hue: 0, initials: "GM",
    desc: ["Outpatient clinics, labs and radiology. Triage is performed on-site.", "عيادات خارجية ومختبرات وأشعة. يتم الفرز في الموقع."],
    queueType: "healthcare",
    branches: [{ id: "br_gmc_shuwaikh", area: "shuwaikh", name: ["Shuwaikh", "الشويخ"], addr: ["Medical District, Gate 2", "المنطقة الطبية، بوابة 2"], dLat: -0.003, dLng: 0.002, counters: 4, hours: hours("07:00", "22:00") }],
    services: [
      { id: "srv_gmc_lab", name: ["Laboratory Tests", "التحاليل المخبرية"], desc: ["Blood and routine lab work.", "تحاليل الدم والفحوص الروتينية."], dur: 8, prefix: "L", queueType: "healthcare" },
      { id: "srv_gmc_xray", name: ["Radiology", "الأشعة"], desc: ["X-ray and ultrasound.", "أشعة سينية وموجات صوتية."], dur: 15, prefix: "R", queueType: "healthcare" },
      { id: "srv_gmc_opd", name: ["Outpatient Clinic", "العيادة الخارجية"], desc: ["General outpatient consultation.", "استشارة عيادة خارجية عامة."], dur: 18, prefix: "O", queueType: "healthcare" },
    ],
    staff: [["Dr. Khalid Al-Mutairi", "Consultant", "استشاري"], ["Hanan Saad", "Lab Technician", "فنية مختبر"], ["Mona Adel", "Radiographer", "أخصائية أشعة"], ["Fahad Nasser", "Charge Nurse", "ممرض مسؤول"]],
  },
  {
    id: "biz_sparkle", cat: "cat_car", name: ["Sparkle Car Spa", "سبارك لغسيل السيارات"], hue: 200, initials: "SC",
    desc: ["Hand wash, interior detailing and polishing.", "غسيل يدوي وتنظيف داخلي وتلميع."],
    queueType: "standard",
    branches: [{ id: "br_sparkle_fintas", area: "fintas", name: ["Fintas", "الفنطاس"], addr: ["Coastal Road, Block 1", "الطريق الساحلي، قطعة 1"], dLat: 0.002, dLng: -0.003, counters: 3, hours: hours("08:00", "22:00") }],
    services: [
      { id: "srv_sparkle_ext", name: ["Exterior Wash", "غسيل خارجي"], desc: ["Foam wash and dry.", "غسيل بالرغوة وتجفيف."], dur: 20, prefix: "W" },
      { id: "srv_sparkle_full", name: ["Full Detailing", "تنظيف شامل"], desc: ["Exterior, interior and polish.", "خارجي وداخلي وتلميع."], dur: 60, prefix: "F" },
    ],
    staff: [["Raju Kumar", "Detailer", "فني تنظيف"], ["Jamal Hamad", "Detailer", "فني تنظيف"]],
  },
  {
    id: "biz_autocare", cat: "cat_car", name: ["AutoCare Service Hub", "مركز أوتوكير للصيانة"], hue: 220, initials: "AC",
    desc: ["Quick service: oil change, tyres and diagnostics.", "خدمة سريعة: تغيير زيت وإطارات وفحص."],
    queueType: "standard",
    branches: [{ id: "br_autocare_rai", area: "rai", name: ["Al Rai", "الري"], addr: ["Industrial area, St 20", "المنطقة الصناعية، شارع 20"], dLat: 0.001, dLng: 0.003, counters: 4, hours: hours("07:30", "20:00", [5]) }],
    services: [
      { id: "srv_auto_oil", name: ["Oil Change", "تغيير الزيت"], desc: ["Oil and filter replacement.", "تغيير الزيت والفلتر."], dur: 25, prefix: "O" },
      { id: "srv_auto_diag", name: ["Diagnostics", "فحص كمبيوتر"], desc: ["Full computer diagnostics.", "فحص كمبيوتر شامل."], dur: 40, prefix: "D" },
    ],
    staff: [["Mahmoud Ezz", "Technician", "فني"], ["Salem Rashed", "Service Advisor", "مستشار خدمة"]],
  },
  {
    id: "biz_skyline", cat: "cat_fun", name: ["Skyline Bowling", "سكاي لاين بولينج"], hue: 262, initials: "SB",
    desc: ["Bowling lanes and arcade. Timed entry with limited capacity.", "صالات بولينج وألعاب. دخول بمواعيد وسعة محدودة."],
    queueType: "timed_entry",
    branches: [{ id: "br_skyline_salmiya", area: "salmiya", name: ["Salmiya", "السالمية"], addr: ["Baghdad St, Block 12", "شارع بغداد، قطعة 12"], dLat: -0.004, dLng: 0.006, counters: 2, hours: hours("14:00", "00:00"), slotMinutes: 60, slotCapacity: 24 }],
    services: [{ id: "srv_skyline_lane", name: ["Lane Session (1 hour)", "جلسة بولينج (ساعة)"], desc: ["Up to 6 players per lane.", "حتى 6 لاعبين لكل مسار."], dur: 60, prefix: "S", queueType: "timed_entry" }],
    staff: [["Abdullah Faisal", "Floor Manager", "مدير الصالة"]],
  },
  {
    id: "biz_makers", cat: "cat_events", name: ["Gulf Makers Fair", "معرض صنّاع الخليج"], hue: 12, initials: "GF",
    desc: ["Local makers, crafts and food. Entry by time slot.", "صناع محليون وحرف وأطعمة. الدخول حسب الفترة."],
    queueType: "timed_entry",
    branches: [{ id: "br_makers_kc", area: "kc", name: ["Exhibition Hall", "قاعة المعارض"], addr: ["Waterfront, Hall B", "الواجهة البحرية، قاعة ب"], dLat: -0.004, dLng: -0.006, counters: 2, hours: hours("16:00", "23:00"), slotMinutes: 30, slotCapacity: 80 }],
    services: [{ id: "srv_makers_entry", name: ["General Entry", "دخول عام"], desc: ["Entry for one visitor.", "دخول لزائر واحد."], dur: 90, prefix: "E", queueType: "timed_entry" }],
    staff: [["Hessa Al-Rashid", "Entry Supervisor", "مشرفة الدخول"]],
  },
  {
    id: "biz_civil", cat: "cat_gov", name: ["Civil Services Center (Demo)", "مركز الخدمات المدنية (تجريبي)"], hue: 150, initials: "CS",
    desc: ["Demonstration of a government service hall. Not an official government service.", "نموذج تجريبي لقاعة خدمات حكومية. ليست خدمة حكومية رسمية."],
    queueType: "standard",
    branches: [{ id: "br_civil_hawalli", area: "hawalli", name: ["Hawalli Hall", "قاعة حولي"], addr: ["Government complex, Hall 3", "المجمع الحكومي، قاعة 3"], dLat: -0.003, dLng: -0.004, counters: 6, hours: hours("07:30", "14:00", [5, 6]) }],
    services: [
      { id: "srv_civil_id", name: ["ID Card Services", "خدمات البطاقة"], desc: ["Renewal and replacement requests.", "طلبات التجديد وبدل الفاقد."], dur: 10, prefix: "I" },
      { id: "srv_civil_docs", name: ["Document Attestation", "تصديق المستندات"], desc: ["Attestation of documents.", "تصديق المستندات."], dur: 8, prefix: "C" },
    ],
    staff: [["Counter Officer 1", "Officer", "موظف"], ["Counter Officer 2", "Officer", "موظف"], ["Counter Officer 3", "Officer", "موظف"]],
  },
  {
    id: "biz_fields", cat: "cat_market", name: ["Fresh Fields Co-op", "جمعية الحقول الطازجة"], hue: 120, initials: "FF",
    desc: ["Co-op market with butchery, fish and bakery counters.", "جمعية تعاونية مع أقسام اللحوم والأسماك والمخبز."],
    queueType: "walk_in",
    branches: [{ id: "br_fields_jahra", area: "jahra", name: ["Jahra", "الجهراء"], addr: ["Block 5, Co-op", "قطعة 5، الجمعية"], dLat: 0.003, dLng: 0.002, counters: 3, hours: hours("07:00", "23:00"), remote: false }],
    services: [
      { id: "srv_fields_butcher", name: ["Butchery Counter", "قسم الملحمة"], desc: ["Fresh cuts prepared to order.", "قطع طازجة حسب الطلب."], dur: 6, prefix: "K", queueType: "walk_in", remote: false },
      { id: "srv_fields_fish", name: ["Fish Counter", "قسم الأسماك"], desc: ["Cleaning and cutting.", "تنظيف وتقطيع."], dur: 8, prefix: "F", queueType: "walk_in", remote: false },
    ],
    staff: [["Butchery Team", "Counter", "قسم"], ["Fish Team", "Counter", "قسم"]],
  },
  {
    id: "biz_horizon", cat: "cat_bank", name: ["Gulf Horizon Bank", "بنك الأفق الخليجي"], hue: 225, initials: "GH",
    desc: ["Branch banking: accounts, cards and customer service.", "خدمات فرعية: الحسابات والبطاقات وخدمة العملاء."],
    queueType: "standard",
    branches: [
      { id: "br_horizon_kc", area: "kc", name: ["Main Branch", "الفرع الرئيسي"], addr: ["Fahad Al Salem St", "شارع فهد السالم"], dLat: -0.002, dLng: 0.001, counters: 5, hours: hours("08:00", "15:00", [5, 6]) },
      { id: "br_horizon_ahmadi", area: "ahmadi", name: ["Ahmadi", "الأحمدي"], addr: ["Block 1, Main St", "قطعة 1، الشارع الرئيسي"], dLat: 0.002, dLng: -0.002, counters: 3, hours: hours("08:00", "15:00", [5, 6]) },
    ],
    services: [
      { id: "srv_horizon_teller", name: ["Teller", "الصراف"], desc: ["Deposits and withdrawals.", "الإيداع والسحب."], dur: 6, prefix: "T" },
      { id: "srv_horizon_cs", name: ["Customer Service", "خدمة العملاء"], desc: ["Accounts, cards and requests.", "الحسابات والبطاقات والطلبات."], dur: 15, prefix: "S" },
    ],
    staff: [["Teller 1", "Teller", "صراف"], ["Teller 2", "Teller", "صراف"], ["Relationship Officer", "Customer Service", "خدمة العملاء"]],
  },
  {
    id: "biz_techpoint", cat: "cat_retail", name: ["TechPoint Store", "متجر تك بوينت"], hue: 250, initials: "TP",
    desc: ["Electronics retail with device setup and repair desk.", "متجر إلكترونيات مع مكتب إعداد وصيانة الأجهزة."],
    queueType: "standard",
    branches: [{ id: "br_techpoint_rai", area: "rai", name: ["Al Rai", "الري"], addr: ["Ghazali St, Block 2", "شارع الغزالي، قطعة 2"], dLat: -0.002, dLng: -0.003, counters: 3, hours: hours("10:00", "22:00") }],
    services: [
      { id: "srv_tech_repair", name: ["Repair Desk", "مكتب الصيانة"], desc: ["Diagnosis and repair drop-off.", "فحص واستلام أجهزة للصيانة."], dur: 15, prefix: "R" },
      { id: "srv_tech_pickup", name: ["Order Pickup", "استلام الطلبات"], desc: ["Collect online orders.", "استلام الطلبات الإلكترونية."], dur: 4, prefix: "P" },
    ],
    staff: [["Ziad Hamdan", "Technician", "فني"], ["Aisha Yaqoub", "Sales Advisor", "مستشارة مبيعات"]],
  },
  {
    id: "biz_heritage", cat: "cat_museum", name: ["Heritage House Museum", "متحف بيت التراث"], hue: 32, initials: "HH",
    desc: ["Kuwaiti maritime and pearling heritage. Timed entry protects the galleries.", "التراث البحري واللؤلؤ في الكويت. الدخول بمواعيد لحماية القاعات."],
    queueType: "timed_entry",
    branches: [{ id: "br_heritage_kc", area: "kc", name: ["Old City", "المدينة القديمة"], addr: ["Gulf St, Old Souq district", "شارع الخليج، منطقة السوق القديم"], dLat: 0.005, dLng: -0.002, counters: 2, hours: hours("09:00", "19:00", [1], "15:00"), slotMinutes: 30, slotCapacity: 40 }],
    services: [{ id: "srv_heritage_entry", name: ["Gallery Entry", "دخول القاعات"], desc: ["Self-guided entry.", "دخول بجولة ذاتية."], dur: 60, prefix: "V", queueType: "timed_entry" }],
    staff: [["Visitor Desk", "Front Desk", "الاستقبال"]],
  },
];

const FIRST = ["Abdullah", "Fatma", "Mohammed", "Noura", "Ali", "Maryam", "Khaled", "Hessa", "Yousef", "Dalal", "Ahmad", "Shaikha", "Bader", "Reem", "Salem", "Lulwa"];
const LAST = ["Al-Ajmi", "Al-Mutairi", "Al-Enezi", "Al-Shammari", "Al-Kandari", "Al-Rashidi", "Al-Hajri", "Al-Azmi"];
const REVIEW_TEXT: Array<[string, string]> = [
  ["Waited at home and arrived right on time. Great experience.", "انتظرت في البيت ووصلت في الوقت المناسب. تجربة ممتازة."],
  ["Estimate was accurate within a few minutes.", "التقدير كان دقيقاً بفارق دقائق قليلة."],
  ["Friendly staff, quick service.", "طاقم ودود وخدمة سريعة."],
  ["A bit busy at peak time but the notifications helped.", "زحمة قليلاً وقت الذروة لكن الإشعارات ساعدت."],
  ["Clean place and organised queue.", "مكان نظيف وطابور منظم."],
];

export function createSeed(now = Date.now()): DB {
  const rand = mulberry32(20261114);
  const users: User[] = [];
  const businesses: Business[] = [];
  const branches: Branch[] = [];
  const services: Service[] = [];
  const employees: Employee[] = [];
  const reviews: Review[] = [];

  const basePrefs = { inApp: true as const, push: false, sms: false, whatsapp: false, approachingAt: 3 };

  // Platform admins (demo accounts — role-based access)
  users.push(
    { id: "u_admin", name: "Platform Admin", phone: "+96550000001", email: "admin@masar.demo", locale: "en", role: "admin", adminRole: "super_admin", avatarHue: 215, status: "active", createdAt: now - 200 * 864e5, savedLocations: [], prefs: basePrefs },
    { id: "u_mod", name: "Content Moderator", phone: "+96550000002", locale: "en", role: "admin", adminRole: "moderator", avatarHue: 190, status: "active", createdAt: now - 120 * 864e5, savedLocations: [], prefs: basePrefs },
    { id: "u_support", name: "Support Agent", phone: "+96550000003", locale: "ar", role: "admin", adminRole: "support", avatarHue: 160, status: "active", createdAt: now - 90 * 864e5, savedLocations: [], prefs: basePrefs },
  );

  // Demo customers (for reviews, admin lists and other people in the queue)
  for (let i = 0; i < 14; i++) {
    const name = `${FIRST[i % FIRST.length]} ${LAST[i % LAST.length]}`;
    users.push({
      id: `u_c${i}`, name, phone: `+9656${String(1000000 + i * 7919).slice(-7)}`, locale: i % 3 ? "ar" : "en", role: "customer",
      avatarHue: Math.floor(rand() * 360), status: i === 9 ? "suspended" : "active", createdAt: now - Math.floor(rand() * 150) * 864e5,
      savedLocations: [], prefs: basePrefs,
    });
  }

  for (const spec of SPECS) {
    const ownerId = `u_owner_${spec.id.slice(4)}`;
    users.push({
      id: ownerId, name: spec.id === "biz_oasis" ? "Faisal Al-Sabah (Demo Owner)" : `${spec.name[0]} Owner`, phone: `+9659${String(hashString(spec.id)).slice(-7)}`,
      email: `owner@${spec.id.slice(4)}.demo`, locale: "ar", role: "business_owner", businessId: spec.id, avatarHue: spec.hue, status: "active",
      createdAt: now - 180 * 864e5, savedLocations: [], prefs: basePrefs,
    });
    businesses.push({
      id: spec.id, name: L(spec.name[0], spec.name[1]), description: L(spec.desc[0], spec.desc[1]), categoryId: spec.cat, ownerId,
      hue: spec.hue, initials: spec.initials, phone: `+965 2${String(hashString(spec.id + "p")).slice(-7)}`,
      email: `hello@${spec.id.slice(4)}.demo`, crNumber: `CR-${String(hashString(spec.id + "cr")).slice(-6)}`, verification: "verified",
      isDemo: true, createdAt: now - 170 * 864e5,
    });
    const branchIds = spec.branches.map((b) => b.id);
    for (const b of spec.branches) {
      const area = AREAS.find((a) => a.id === b.area)!;
      branches.push({
        id: b.id, businessId: spec.id, name: L(b.name[0], b.name[1]), areaId: b.area, address: L(b.addr[0], b.addr[1]),
        lat: area.lat + b.dLat, lng: area.lng + b.dLng, phone: `+965 2${String(hashString(b.id)).slice(-7)}`, hours: b.hours, active: true,
        queueType: spec.queueType, remoteBooking: b.remote ?? true, allowPostpone: spec.queueType !== "timed_entry", postponePositions: 3,
        maxQueue: 60, checkinSecret: `demo-secret-${b.id}`, slotMinutes: b.slotMinutes, slotCapacity: b.slotCapacity,
      });
      spec.staff.forEach(([name, ten, tar], i) => {
        employees.push({
          id: `emp_${b.id}_${i}`, businessId: spec.id, branchId: b.id, name, title: L(ten, tar),
          serviceIds: spec.services.map((s) => s.id), counter: String(i + 1), active: i < b.counters,
          clinical: spec.queueType === "healthcare" && (name.startsWith("Dr.") || /Nurse/.test(ten)),
          servedToday: Math.floor(rand() * 18), avgServiceMin: Math.round(spec.services[0].dur * (0.85 + rand() * 0.35)), rating: Math.round((4 + rand()) * 10) / 10,
        });
      });
      // Seed verified reviews
      const n = 5 + Math.floor(rand() * 9);
      for (let i = 0; i < n; i++) {
        const author = users[3 + Math.floor(rand() * 14)];
        const r = rand() < 0.75 ? 5 : rand() < 0.7 ? 4 : 3;
        const txt = REVIEW_TEXT[Math.floor(rand() * REVIEW_TEXT.length)];
        reviews.push({
          id: `rev_${b.id}_${i}`, ticketId: `hist_${b.id}_${i}`, userId: author.id, businessId: spec.id, branchId: b.id, rating: r,
          waitRating: Math.min(5, r + (rand() < 0.3 ? -1 : 0)), serviceRating: r, text: rand() < 0.7 ? txt[author.locale === "ar" ? 1 : 0] : "",
          at: now - Math.floor(rand() * 60) * 864e5, hidden: false, authorName: author.name,
        });
      }
    }
    spec.services.forEach((s) => {
      services.push({
        id: s.id, businessId: spec.id, branchIds, name: L(s.name[0], s.name[1]), description: L(s.desc[0], s.desc[1]), durationMin: s.dur,
        prefix: s.prefix, active: true, remoteBooking: s.remote ?? true, queueType: s.queueType,
      });
    });
  }

  // A business awaiting verification (for the admin workflow)
  users.push({ id: "u_owner_nuqat", name: "Nuqat Barbers Owner", phone: "+96599887766", locale: "ar", role: "business_owner", businessId: "biz_nuqat", avatarHue: 20, status: "active", createdAt: now - 2 * 864e5, savedLocations: [], prefs: basePrefs });
  businesses.push({
    id: "biz_nuqat", name: L("Nuqat Barbers", "حلاق نقاط"), description: L("New barbershop in Hawalli.", "صالون حلاقة جديد في حولي."), categoryId: "cat_salon",
    ownerId: "u_owner_nuqat", hue: 20, initials: "NB", phone: "+965 22001122", email: "hello@nuqat.demo", crNumber: "CR-448120", verification: "pending", isDemo: true, createdAt: now - 2 * 864e5,
  });

  const reports: Report[] = [
    { id: "rep_1", kind: "complaint", businessId: "biz_saffron", userId: "u_c2", text: "Ticket was skipped while I was at the door.", status: "open", at: now - 5 * 3600e3 },
    { id: "rep_2", kind: "review_flag", reviewId: reviews[3]?.id, businessId: reviews[3]?.businessId, userId: "u_owner_oasis", text: "This review mentions a different shop.", status: "open", at: now - 26 * 3600e3 },
    { id: "rep_3", kind: "bug", userId: "u_c5", text: "Notification arrived late on Android.", status: "resolved", at: now - 4 * 864e5 },
  ];

  return {
    version: DB_VERSION,
    areas: AREAS,
    users,
    categories: CATEGORIES,
    businesses,
    branches,
    services,
    employees,
    sessions: [],
    tickets: [],
    events: [],
    notifications: [],
    reviews,
    favorites: [],
    reports,
    audit: [
      { id: "aud_seed", actorId: "system", actorLabel: "System", action: "platform.seeded", target: "demo", at: now - 864e5, note: "Demo dataset created" },
    ],
    support: [],
    recentBranchIds: [],
  };
}
