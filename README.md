# Mireya — Massage Therapy & Wellness

Statik, 4 dilli (SQ · SR · EN · TR) premium masaj salonu sitesi. Derleme gerektirmez; dosyaları herhangi bir hostinge yüklemeniz yeterli.

## Yerelde çalıştırma
```bash
python -m http.server 8944 --directory mireya-spa
```
Tarayıcıda `http://localhost:8944` adresini açın. Dil seçmek için `?lang=sq|sr|en|tr` ekleyebilirsiniz.

## Düzenleme paneli
İçerik [Pages CMS](https://app.pagescms.org) panelinden düzenlenir. Panel ayarı `.pages.yml` dosyasındadır, içerik ise `content/` klasöründeki JSON dosyalarındadır:

| Panel bölümü | Dosya |
|---|---|
| İletişim ve Ayarlar (telefon, WhatsApp, adres, saatler, fiyat göster/gizle) | `content/settings.json` |
| Ana Sayfa Görselleri (giriş fotoğrafı/videosu, hakkımızda, randevu) | `content/images.json` |
| Masajlar (4 dilde ad/açıklama, fotoğraf, ritüel kartı, süre/fiyat) | `content/services.json` |
| Galeri | `content/gallery.json` |
| Yorumlar | `content/reviews.json` |
| Sayfa Metinleri (sitedeki tüm yazılar, 4 dil) | `content/ui.json` |
| Görünüm ve Bölümler (açılış dili, duyuru şeridi, bölümleri aç/kapat, giriş rakamları, vurgu rengi, animasyon, video, WhatsApp butonu) | `content/site.json` |

Diğer arayüz metinleri `js/i18n/*.js`, teknik varsayılanlar `js/config.js` içindedir. `js/boot.js` içeriği yükleyip siteyi başlatır.

## Geçici içerik (yayından önce değiştirilecek)
- `stock-*.jpg` görselleri Unsplash stok fotoğraflarıdır. Gerçek salon fotoğraflarıyla değiştirin (aynı dosya adıyla).
- `mireya-lounge.jpg` bir render görselidir.
- Fiyatlar örnek fiyatlardır.
- `services.js` içindeki yorumlar örnek yorumlardır.
- Logo, yazı tipiyle oluşturuldu. Vektör logo (SVG) gelirse değiştirilebilir.

CSS/JS dosyalarını değiştirdikten sonra `index.html` içindeki `?v=` numarasını artırın; böylece tarayıcı önbelleği yenilenir.
