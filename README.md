# Mireya — Massage Therapy & Wellness

Statik, 4 dilli (SQ · SR · EN · TR) premium masaj salonu sitesi. Derleme gerektirmez; dosyaları herhangi bir hostinge yüklemeniz yeterli.

## Yerelde çalıştırma
```bash
python -m http.server 8944 --directory mireya-spa
```
Tarayıcıda `http://localhost:8944` adresini açın. Dil seçmek için `?lang=sq|sr|en|tr` ekleyebilirsiniz.

## Nereyi düzenlemeli?
| Ne | Dosya |
|---|---|
| WhatsApp, telefon, adres, çalışma saatleri, Instagram, harita | `js/config.js` |
| Masaj listesi, süre ve fiyatlar, galeri, yorumlar | `js/services.js` |
| Metinler ve çeviriler | `js/i18n/sq.js`, `sr.js`, `en.js`, `tr.js` |
| Görseller | `assets/img/` |

- `config.js` içinde boş bırakılan alanlar sitede "Yakında" olarak görünür.
- `whatsappNumber` doldurulduğunda form, WhatsApp'a hazır bir mesaj açar. `formEndpoint` (Formspree vb.) doldurulursa form oraya gönderilir.
- Bir masajı kaldırmak için `services.js` içindeki satırını silin. Çeviri anahtarları kalabilir.

## Geçici içerik (yayından önce değiştirilecek)
- `stock-*.jpg` görselleri Unsplash stok fotoğraflarıdır. Gerçek salon fotoğraflarıyla değiştirin (aynı dosya adıyla).
- `mireya-lounge.jpg` bir render görselidir.
- Fiyatlar örnek fiyatlardır.
- `services.js` içindeki yorumlar örnek yorumlardır.
- Logo, yazı tipiyle oluşturuldu. Vektör logo (SVG) gelirse değiştirilebilir.

CSS/JS dosyalarını değiştirdikten sonra `index.html` içindeki `?v=` numarasını artırın; böylece tarayıcı önbelleği yenilenir.
