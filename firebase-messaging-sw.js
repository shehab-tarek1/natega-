// 1. استدعاء مكتبات فايربيز المتوافقة مع Service Worker
importScripts('https://www.gstatic.com/firebasejs/11.6.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.6.1/firebase-messaging-compat.js');

// 2. إعدادات فايربيز الخاصة بمشروعك
const firebaseConfig = {
    apiKey: "AIzaSyANg4wLchZaikXneXr1c3qhRgcOnvPbfoA",
    authDomain: "faculty-of-commerce-2026.firebaseapp.com",
    projectId: "faculty-of-commerce-2026",
    storageBucket: "faculty-of-commerce-2026.firebasestorage.app",
    messagingSenderId: "350727231766",
    appId: "1:350727231766:web:b08a0f335e38bfc2e79837"
};

// تهيئة فايربيز
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// استقبال الإشعارات في الخلفية (عندما يكون التطبيق مغلقاً)
messaging.onBackgroundMessage(function(payload) {
  console.log('[Service Worker] رسالة في الخلفية: ', payload);
  const notificationTitle = payload.notification?.title || 'إشعار جديد';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    dir: 'rtl'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});


// ==========================================
// 3. إعدادات PWA Offline Caching (التخزين المؤقت الذكي)
// ==========================================
const CACHE_NAME = 'thanawya-app-shell-v2';

// الملفات الأساسية التي يجب تحميلها ليفتح التطبيق أوفلاين
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png'
];

// حدث التثبيت (Install) - تخزين ملفات الهيكل الأساسي
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
        console.log('[Service Worker] جاري تخزين ملفات التطبيق الأساسية');
        return cache.addAll(APP_SHELL);
    })
  );
  // تفعيل النسخة الجديدة فوراً دون انتظار إغلاق التطبيق
  self.skipWaiting(); 
});

// حدث التفعيل (Activate) - تنظيف الكاش القديم عند التحديث
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  // السيطرة على كل الصفحات المفتوحة فوراً
  self.clients.claim(); 
});

// حدث جلب البيانات (Fetch) - التعامل مع الطلبات والإنترنت
self.addEventListener('fetch', event => {
  // نتجاهل أي طلب غير GET (مثل POST أو طلبات فايربيز الداخلية لقاعدة البيانات)
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // 1. المكتبات الخارجية (React, Tailwind, Firebase, FontAwesome)
  // الاستراتيجية: نبحث في الكاش أولاً، لو مش موجود نحمله من النت ونخزنه للمرات القادمة
  if (url.hostname.includes('esm.sh') || 
      url.hostname.includes('tailwindcss.com') || 
      url.hostname.includes('gstatic.com') ||
      url.hostname.includes('unpkg.com') ||
      url.hostname.includes('cdnjs.cloudflare.com')) {
      
      event.respondWith(
        caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) return cachedResponse; // موجود في الكاش
          
          return fetch(event.request).then(networkResponse => {
            return caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, networkResponse.clone()); // تخزين في الكاش
              return networkResponse;
            });
          }).catch(() => {
              // تجاهل الخطأ في حالة عدم وجود نت
          });
        })
      );
      return;
  }

  // 2. الصور والملفات الخارجية (Cloudinary, Unsplash)
  // الاستراتيجية: من النت فقط عشان مساحة الموبايل، لو مفيش نت نعرض صورة وهمية
  if (url.hostname.includes('cloudinary.com') || url.hostname.includes('unsplash.com')) {
      event.respondWith(
          fetch(event.request).catch(() => {
              // صورة SVG وهمية تظهر أوفلاين
              const offlineSvg = `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#e2e8f0"/><text x="50%" y="50%" font-family="sans-serif" font-size="20" fill="#64748b" text-anchor="middle" dominant-baseline="middle">بانتظار الاتصال بالإنترنت...</text></svg>`;
              return new Response(offlineSvg, { 
                  headers: { 'Content-Type': 'image/svg+xml' } 
              });
          })
      );
      return;
  }

  // 3. باقي ملفات الموقع (index.html وغيرها)
  // الاستراتيجية: نجيب أحدث نسخة من النت، لو مفيش نت نفتح من الكاش
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});