import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Supabase bağlantısı
const supabaseUrl = process.env.https://tmtdpykzmdvxszxwyege.supabase.co
const supabaseKey = process.env.sb_publishable_3S4Qryj5TCI4IDASoxisVw_Y9eoso2F
const supabase = createClient(supabaseUrl, supabaseKey)

// Şablon dosyasını oku
const templatePath = path.join(__dirname, '../templates/haber-template.html')
const template = fs.readFileSync(templatePath, 'utf-8')

async function generateHaberPages() {
    console.log('🔄 Haber sayfaları oluşturuluyor...')
    
    // Supabase'den tüm haberleri çek
    const { data: haberler, error } = await supabase
        .from('haberler')
        .select('*')
        .eq('durum', 'yayinda')
        .order('tarih', { ascending: false })
    
    if (error) {
        console.error('❌ Supabase hatası:', error)
        return
    }
    
    console.log(`📊 ${haberler.length} haber bulundu.`)
    
    // Her haber için HTML oluştur
    for (const haber of haberler) {
        const slug = haber.slug || slugify(haber.baslik)
        const content = haber.icerik || haber.ozet || ''
        
        // Template'deki yer tutucuları doldur
        let html = template
            .replace(/\{\{title\}\}/g, haber.baslik)
            .replace(/\{\{description\}\}/g, haber.ozet || haber.baslik)
            .replace(/\{\{image_url\}\}/g, haber.gorsel_url || '/images/default-haber.jpg')
            .replace(/\{\{slug\}\}/g, slug)
            .replace(/\{\{date\}\}/g, formatDate(haber.tarih))
            .replace(/\{\{category\}\}/g, haber.kategori || 'Haber')
            .replace(/\{\{content\}\}/g, content)
        
        // Haber görseli yoksa varsayılan logo
        if (!haber.gorsel_url) {
            html = html.replace(
                '{{image_url}}',
                'https://senin-site.com/images/dernek-logosu.png'
            )
        }
        
        // Dosyayı kaydet
        const outputPath = path.join(__dirname, '../haber', `${slug}.html`)
        fs.writeFileSync(outputPath, html, 'utf-8')
        console.log(`✅ Oluşturuldu: haber/${slug}.html`)
    }
    
    console.log('🎉 Tüm haber sayfaları oluşturuldu!')
}

// Yardımcı fonksiyonlar
function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .replace(/\s+/g, '-')           // Boşlukları tire ile değiştir
        .replace(/[^\w\-]+/g, '')       // Geçersiz karakterleri temizle
        .replace(/\-\-+/g, '-')         // Birden fazla tirenin tekline indirge
        .replace(/^-+/, '')             // Baştaki tireleri kaldır
        .replace(/-+$/, '')             // Sondaki tireleri kaldır
}

function formatDate(dateStr) {
    const date = new Date(dateStr)
    return date.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    })
}

// Script'i çalıştır
generateHaberPages()