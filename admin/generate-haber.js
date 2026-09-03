import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ============================================================
// SUPABASE BAĞLANTISI
// ============================================================
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ HATA: SUPABASE_URL veya SUPABASE_ANON_KEY çevre değişkenleri eksik!')
    console.error('   Lütfen .env dosyası oluşturun veya ortam değişkenlerini ayarlayın.')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// ============================================================
// ŞABLON DOSYASINI OKU
// ============================================================
const templatePath = path.join(__dirname, '../templates/haber-template.html')

if (!fs.existsSync(templatePath)) {
    console.error(`❌ Şablon dosyası bulunamadı: ${templatePath}`)
    process.exit(1)
}

const template = fs.readFileSync(templatePath, 'utf-8')
console.log('✅ Şablon dosyası okundu.')

// ============================================================
// YARDIMCI FONKSİYONLAR
// ============================================================
function slugify(text) {
    if (!text) return 'bos-baslik'
    return text
        .toString()
        .toLowerCase()
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ı/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '')
}

function formatDate(dateStr) {
    if (!dateStr) return ''
    try {
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) return ''
        return date.toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        })
    } catch {
        return ''
    }
}

function formatDateISO(dateStr) {
    if (!dateStr) return new Date().toISOString()
    try {
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) return new Date().toISOString()
        return date.toISOString()
    } catch {
        return new Date().toISOString()
    }
}

function escapeHtml(text) {
    if (!text) return ''
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
}

function getCategoryClass(category) {
    if (!category) return ''
    if (category === 'Dernek Haberi') return 'tag-dernek'
    if (category === 'Öne Çıkan') return 'tag-hero'
    if (category === 'Köşe Yazısı') return 'tag-article'
    return ''
}

function getCategory(sourceTable) {
    if (sourceTable === 'dernek_haberleri') return 'Dernek Haberi'
    if (sourceTable === 'hero') return 'Öne Çıkan'
    if (sourceTable === 'articles') return 'Köşe Yazısı'
    return 'Haber'
}

function getSource(sourceTable) {
    if (sourceTable === 'dernek_haberleri') return 'Dernek'
    if (sourceTable === 'hero') return 'Öne Çıkan'
    if (sourceTable === 'articles') return 'Köşe Yazısı'
    return 'Haber'
}

function getImage(haber, sourceTable) {
    const defaultImage = 'https://tmtdpykzmdvxszxwyege.supabase.co/storage/v1/object/public/icerikler/logo.png'
    
    // Sadece debug modunda logla (çok fazla log olmasın)
    // console.log(`🔍 getImage: source=${sourceTable}`)
    
    if (sourceTable === 'dernek_haberleri') {
        const img = haber.gorsel_url || haber.image_url || haber.resim || haber.foto || null
        return img || defaultImage
    }
    if (sourceTable === 'hero') {
        const img = haber.bg_image || haber.gorsel_url || haber.image_url || haber.resim || null
        return img || defaultImage
    }
    if (sourceTable === 'articles') {
        const img = haber.featured_image || haber.image_url || haber.resim || haber.foto || null
        return img || defaultImage
    }
    return defaultImage
}

function getContent(haber) {
    const content = haber.icerik || 
                    haber.fullContent || 
                    haber.content || 
                    haber.full_description || 
                    haber.description || 
                    haber.ozet || 
                    haber.summary || 
                    ''
    
    // Eğer içerik boşsa ve hero kaydıysa, link ekle
    if (!content && haber._source === 'hero') {
        return `<p><strong>${escapeHtml(getTitle(haber))}</strong> — Bu içerik yalnızca yönlendirme amaçlıdır. Detaylı bilgi için lütfen ana sayfayı ziyaret edin.</p>
                <p><a href="../index.html" style="color:var(--primary);font-weight:600;">Ana Sayfaya Dön →</a></p>`
    }
    
    return content || '<p>İçerik bulunamadı.</p>'
}

function getTitle(haber) {
    return haber.baslik || haber.title || 'Başlıksız Haber'
}

function getDescription(haber) {
    const desc = haber.ozet || haber.summary || haber.excerpt || haber.description || haber.meta_description || ''
    const clean = String(desc).replace(/<[^>]*>/g, '').trim()
    if (clean.length > 160) return clean.slice(0, 157) + '…'
    return clean || getTitle(haber)
}

// ============================================================
// VERİ ÇEKME FONKSİYONLARI
// ============================================================

// Hero haberlerini çek
async function fetchHeroHaberleri() {
    console.log('🔍 Hero tablosu sorgulanıyor...')
    try {
        const { data, error } = await supabase
            .from('hero')
            .select('*')
            .eq('is_active', true)
            .order('order', { ascending: true })
        
        if (error) {
            console.error('❌ Hero tablosu hatası:', error.message)
            return []
        }
        console.log(`✅ Hero: ${data?.length || 0} kayıt bulundu`)
        return data || []
    } catch (err) {
        console.error('❌ Hero tablosu bağlantı hatası:', err.message)
        return []
    }
}

// Dernek haberlerini çek
async function fetchDernekHaberleri() {
    console.log('🔍 Dernek Haberleri tablosu sorgulanıyor...')
    try {
        const { data, error } = await supabase
            .from('dernek_haberleri')
            .select('*')
            .eq('is_active', true)
            .order('order', { ascending: true })
            .order('pub_date', { ascending: false })
        
        if (error) {
            console.error('❌ Dernek haberleri tablosu hatası:', error.message)
            return []
        }
        console.log(`✅ Dernek Haberleri: ${data?.length || 0} kayıt bulundu`)
        return data || []
    } catch (err) {
        console.error('❌ Dernek haberleri tablosu bağlantı hatası:', err.message)
        return []
    }
}

// Articles (Köşe Yazıları) çek
async function fetchArticles() {
    console.log('🔍 Articles tablosu sorgulanıyor...')
    try {
        const { data, error } = await supabase
            .from('articles')
            .select('*')
            .eq('is_published', true)
            .order('pubDate', { ascending: false })
        
        if (error) {
            console.log('ℹ️ Articles tablosu hatası (tablo mevcut olmayabilir):', error.message)
            return []
        }
        console.log(`✅ Articles: ${data?.length || 0} kayıt bulundu`)
        return data || []
    } catch (err) {
        console.log('ℹ️ Articles tablosu bulunamadı veya bağlantı hatası:', err.message)
        return []
    }
}

// ============================================================
// ALT BÖLÜM OLUŞTURMA FONKSİYONLARI
// ============================================================

function createHeroSection(heroHaberleri, currentHaber) {
    const otherHero = heroHaberleri
        .filter(h => h.id !== currentHaber.id)
        .slice(0, 3)
    
    if (otherHero.length === 0) return ''
    
    let cards = ''
    otherHero.forEach(item => {
        const img = getImage(item, 'hero')
        const itemSlug = item.slug || slugify(getTitle(item))
        const link = `../haber/${itemSlug}.html`
        const itemDate = formatDate(item.tarih || item.pub_date || item.created_at)
        cards += `
                <a href="${link}" class="extra-item">
                    <img src="${img}" alt="${escapeHtml(getTitle(item))}" loading="lazy" onerror="this.src='https://tmtdpykzmdvxszxwyege.supabase.co/storage/v1/object/public/icerikler/logo.png'">
                    <div class="body">
                        <span class="tag">Öne Çıkan</span>
                        <h4>${escapeHtml(getTitle(item))}</h4>
                        <span class="date">${itemDate}</span>
                    </div>
                </a>
            `
    })
    
    return `
            <div class="extra-section">
                <div class="section-head">
                    <h2><i class="fas fa-star" style="color:var(--accent);"></i> Öne Çıkan Haberler</h2>
                    <a href="../index.html">Tümü →</a>
                </div>
                <div class="extra-grid">${cards}</div>
            </div>
        `
}

function createDernekSection(dernekHaberleri, currentHaber) {
    const otherDernek = dernekHaberleri
        .filter(h => h.id !== currentHaber.id)
        .slice(0, 3)
    
    if (otherDernek.length === 0) return ''
    
    let cards = ''
    otherDernek.forEach(item => {
        const img = getImage(item, 'dernek_haberleri')
        const itemSlug = item.slug || slugify(getTitle(item))
        const link = `../haber/${itemSlug}.html`
        const itemDate = formatDate(item.tarih || item.pub_date || item.created_at)
        cards += `
                <a href="${link}" class="extra-item">
                    <img src="${img}" alt="${escapeHtml(getTitle(item))}" loading="lazy" onerror="this.src='https://tmtdpykzmdvxszxwyege.supabase.co/storage/v1/object/public/icerikler/logo.png'">
                    <div class="body">
                        <span class="tag">Dernek Haberi</span>
                        <h4>${escapeHtml(getTitle(item))}</h4>
                        <span class="date">${itemDate}</span>
                    </div>
                </a>
            `
    })
    
    return `
            <div class="extra-section">
                <div class="section-head">
                    <h2><i class="fas fa-newspaper" style="color:var(--primary);"></i> Dernek Haberleri</h2>
                    <a href="../dernekhaber.html">Tümü →</a>
                </div>
                <div class="extra-grid">${cards}</div>
            </div>
        `
}

function createArticlesSection(articles, currentHaber) {
    const otherArticles = articles
        .filter(a => a.id !== currentHaber.id)
        .slice(0, 3)
    
    if (otherArticles.length === 0) return ''
    
    let cards = ''
    otherArticles.forEach(item => {
        const img = getImage(item, 'articles')
        const itemSlug = item.slug || slugify(item.title)
        const link = `../yazilar/${itemSlug}.html`
        const authorName = item.author_name || item.author || 'Yazar'
        const itemDate = formatDate(item.pubDate || item.created_at)
        cards += `
                <a href="${link}" class="extra-item">
                    <img src="${img}" alt="${escapeHtml(item.title)}" loading="lazy" onerror="this.src='https://tmtdpykzmdvxszxwyege.supabase.co/storage/v1/object/public/icerikler/logo.png'">
                    <div class="body">
                        <span class="tag">${escapeHtml(authorName)}</span>
                        <h4>${escapeHtml(item.title)}</h4>
                        ${item.summary ? `<div class="description">${escapeHtml(item.summary)}</div>` : ''}
                        <span class="date">${itemDate}</span>
                    </div>
                </a>
            `
    })
    
    return `
            <div class="extra-section">
                <div class="section-head">
                    <h2><i class="fas fa-feather-alt" style="color:var(--primary);"></i> Köşe Yazıları</h2>
                    <a href="../yazilar.html">Tümü →</a>
                </div>
                <div class="extra-grid">${cards}</div>
            </div>
        `
}

function createEmptySection() {
    return `
            <div style="text-align:center; padding:2rem 0; color:var(--text-muted);">
                <p>Diğer içerikler bulunmuyor.</p>
                <a href="../index.html" style="display:inline-block; margin-top:1rem; background:var(--primary); color:#fff; padding:0.5rem 1.8rem; border-radius:30px; font-weight:600; text-decoration:none;">Ana Sayfa</a>
            </div>
        `
}

// ============================================================
// ANA FONKSİYON
// ============================================================
async function generateHaberPages() {
    console.log('\n🚀 =========================================')
    console.log('🚀 HABER SAYFALARI OLUŞTURULUYOR')
    console.log('🚀 =========================================\n')
    console.log(`📁 Çalışma dizini: ${__dirname}`)
    console.log(`📄 Şablon: ${templatePath}\n`)
    
    // Tüm verileri çek
    console.log('📡 Veritabanı sorgulanıyor...\n')
    
    const [dernekHaberleri, heroHaberleri, articles] = await Promise.all([
        fetchDernekHaberleri(),
        fetchHeroHaberleri(),
        fetchArticles()
    ])
    
    console.log('\n📊 İstatistikler:')
    console.log(`   📰 Dernek Haberleri: ${dernekHaberleri.length}`)
    console.log(`   ⭐ Öne Çıkan (Hero): ${heroHaberleri.length}`)
    console.log(`   ✍️ Köşe Yazıları: ${articles.length}`)
    
    // Her haber için kaynak tablosunu ekleyelim
    const taggedDernek = dernekHaberleri.map(h => ({ ...h, _source: 'dernek_haberleri' }))
    const taggedHero = heroHaberleri.map(h => ({ ...h, _source: 'hero' }))
    const taggedArticles = articles.map(h => ({ ...h, _source: 'articles' }))
    
    let tümHaberler = [...taggedDernek, ...taggedHero, ...taggedArticles]

    // Haberleri tarihe göre sıralıyoruz (en yeni en üstte)
    tümHaberler.sort((a, b) => {
        const dateA = a.tarih || a.pub_date || a.created_at || a.pubDate || 0
        const dateB = b.tarih || b.pub_date || b.created_at || b.pubDate || 0
        return new Date(dateB) - new Date(dateA)
    })
    
    console.log(`\n📊 Toplam ${tümHaberler.length} aktif içerik bulundu.\n`)
    
    if (tümHaberler.length === 0) {
        console.log('⚠️ Hiç içerik bulunamadı! Çıkılıyor...')
        return
    }
    
    // Her haber için HTML oluştur
    let createdCount = 0
    const errors = []
    
    for (const haber of tümHaberler) {
        try {
            const slug = haber.slug || slugify(getTitle(haber))
            const sourceTable = haber._source || 'unknown'
            const category = getCategory(sourceTable)
            const categoryClass = getCategoryClass(category)
            const imageUrl = getImage(haber, sourceTable)
            const content = getContent(haber)
            const title = getTitle(haber)
            const description = getDescription(haber)
            const date = formatDate(haber.tarih || haber.pub_date || haber.created_at || haber.pubDate)
            const dateISO = formatDateISO(haber.tarih || haber.pub_date || haber.created_at || haber.pubDate)
            const source = getSource(sourceTable)
            
            // ALT BÖLÜMLER
            const heroSectionHTML = createHeroSection(heroHaberleri, haber)
            const dernekSectionHTML = createDernekSection(dernekHaberleri, haber)
            const articlesSectionHTML = createArticlesSection(articles, haber)
            const emptySectionHTML = (heroSectionHTML || dernekSectionHTML || articlesSectionHTML) ? '' : createEmptySection()
            
            // Şablondaki yer tutucuları doldur
            let html = template
                .replace(/\{\{title\}\}/g, title)
                .replace(/\{\{description\}\}/g, description)
                .replace(/\{\{image_url\}\}/g, imageUrl)
                .replace(/\{\{slug\}\}/g, slug)
                .replace(/\{\{date\}\}/g, date)
                .replace(/\{\{date_iso\}\}/g, dateISO)
                .replace(/\{\{category\}\}/g, category)
                .replace(/\{\{category_class\}\}/g, categoryClass)
                .replace(/\{\{source\}\}/g, source)
                .replace(/\{\{content\}\}/g, content)
                .replace(/\{\{author_posts\}\}/g, '')
                .replace(/\{\{hero_section\}\}/g, heroSectionHTML)
                .replace(/\{\{dernek_section\}\}/g, dernekSectionHTML)
                .replace(/\{\{articles_section\}\}/g, articlesSectionHTML)
                .replace(/\{\{empty_section\}\}/g, emptySectionHTML)
            
            // Dosyayı kaydet
            let outputDir
            if (sourceTable === 'articles') {
                outputDir = path.join(__dirname, '../yazilar')
            } else {
                outputDir = path.join(__dirname, '../haber')
            }
            
            // Klasör yoksa oluştur
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true })
                console.log(`📁 Klasör oluşturuldu: ${path.basename(outputDir)}/`)
            }
            
            const outputPath = path.join(outputDir, `${slug}.html`)
            fs.writeFileSync(outputPath, html, 'utf-8')
            
            const folderName = sourceTable === 'articles' ? 'yazilar' : 'haber'
            console.log(`✅ ${folderName}/${slug}.html (${category})`)
            createdCount++
            
        } catch (err) {
            console.error(`❌ Hata: ${getTitle(haber)} - ${err.message}`)
            errors.push({ title: getTitle(haber), error: err.message })
        }
    }
    
    console.log('\n📊 =========================================')
    console.log(`📊 ${createdCount} sayfa başarıyla oluşturuldu!`)
    if (errors.length > 0) {
        console.log(`⚠️ ${errors.length} hata oluştu:`)
        errors.forEach(e => console.log(`   ❌ ${e.title}: ${e.error}`))
    }
    console.log('📊 =========================================\n')
}

// ============================================================
// SCRIPT ÇALIŞTIR
// ============================================================
console.log('🔄 Başlatılıyor...\n')
generateHaberPages()
    .then(() => {
        console.log('🏁 İşlem tamamlandı.')
        process.exit(0)
    })
    .catch((err) => {
        console.error('💥 Beklenmeyen hata:', err)
        process.exit(1)
    })
