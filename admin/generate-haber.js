import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Supabase bağlantısı
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

// Şablon dosyasını oku
const templatePath = path.join(__dirname, '../templates/haber-template.html')
const template = fs.readFileSync(templatePath, 'utf-8')

// Yardımcı fonksiyonlar
function slugify(text) {
    if (!text) return ''
    return text
        .toString()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '')
}

function formatDate(dateStr) {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    })
}

function formatDateISO(dateStr) {
    if (!dateStr) return new Date().toISOString()
    const date = new Date(dateStr)
    return date.toISOString()
}

function escapeHtml(text) {
    if (!text) return ''
    return text
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
    if (sourceTable === 'dernek_haberleri') {
        return haber.gorsel_url || haber.image_url || defaultImage
    }
    if (sourceTable === 'hero') {
        return haber.bg_image || haber.gorsel_url || defaultImage
    }
    if (sourceTable === 'articles') {
        return haber.featured_image || haber.image_url || defaultImage
    }
    return defaultImage
}

function getContent(haber) {
    return haber.icerik || haber.fullContent || haber.content || haber.full_description || haber.description || haber.ozet || ''
}

function getTitle(haber) {
    return haber.baslik || haber.title || 'Başlıksız Haber'
}

function getDescription(haber) {
    const desc = haber.ozet || haber.summary || haber.excerpt || haber.description || haber.meta_description || ''
    if (desc.length > 160) return desc.slice(0, 157) + '…'
    return desc || getTitle(haber)
}

// Hero haberlerini çek
async function fetchHeroHaberleri() {
    const { data, error } = await supabase
        .from('hero')
        .select('*')
        .eq('is_active', true)
        .order('order', { ascending: true })
    
    if (error) {
        console.error('❌ Hero tablosu hatası:', error)
        return []
    }
    return data || []
}

// Dernek haberlerini çek
async function fetchDernekHaberleri() {
    const { data, error } = await supabase
        .from('dernek_haberleri')
        .select('*')
        .eq('is_active', true)
        .order('order', { ascending: true })
        .order('pub_date', { ascending: false })
    
    if (error) {
        console.error('❌ Dernek haberleri tablosu hatası:', error)
        return []
    }
    return data || []
}

// Articles (Köşe Yazıları) çek
async function fetchArticles() {
    try {
        const { data, error } = await supabase
            .from('articles')
            .select('*')
            .eq('is_published', true)
            .order('pubDate', { ascending: false })
        
        if (error) {
            console.error('❌ Articles tablosu hatası:', error)
            return []
        }
        return data || []
    } catch (e) {
        console.log('ℹ️ Articles tablosu bulunamadı, atlanıyor...')
        return []
    }
}

// Ana fonksiyon
async function generateHaberPages() {
    console.log('🔄 Haber sayfaları oluşturuluyor...')
    
    // Tüm verileri çek
    const [dernekHaberleri, heroHaberleri, articles] = await Promise.all([
        fetchDernekHaberleri(),
        fetchHeroHaberleri(),
        fetchArticles()
    ])
    
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
    
    console.log(`📊 Toplam ${tümHaberler.length} aktif içerik bulundu.`)
    console.log(`   📰 Dernek: ${dernekHaberleri.length}, ⭐ Hero: ${heroHaberleri.length}, ✍️ Köşe Yazısı: ${articles.length}`)
    
    // Her haber için HTML oluştur
    for (const haber of tümHaberler) {
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
        
        // ===== ALT BÖLÜMLERİ OLUŞTUR =====
        let authorPostsHTML = ''
        let heroSectionHTML = ''
        let dernekSectionHTML = ''
        let articlesSectionHTML = ''
        let emptySectionHTML = ''
        
        // 1) Öne Çıkan Haberler (Hero)
        const otherHero = heroHaberleri
            .filter(h => h.id !== haber.id)
            .slice(0, 3)
        
        if (otherHero.length > 0) {
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
            heroSectionHTML = `
                    <div class="extra-section">
                        <div class="section-head">
                            <h2><i class="fas fa-star" style="color:var(--accent);"></i> Öne Çıkan Haberler</h2>
                            <a href="../index.html">Tümü →</a>
                        </div>
                        <div class="extra-grid">${cards}</div>
                    </div>
                `
        }
        
        // 2) Dernek Haberleri
        const otherDernek = dernekHaberleri
            .filter(h => h.id !== haber.id)
            .slice(0, 3)
        
        if (otherDernek.length > 0) {
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
            dernekSectionHTML = `
                    <div class="extra-section">
                        <div class="section-head">
                            <h2><i class="fas fa-newspaper" style="color:var(--primary);"></i> Dernek Haberleri</h2>
                            <a href="../dernekhaber.html">Tümü →</a>
                        </div>
                        <div class="extra-grid">${cards}</div>
                    </div>
                `
        }
        
        // 3) Köşe Yazıları (Articles)
        const otherArticles = articles
            .filter(a => a.id !== haber.id)
            .slice(0, 3)
        
        if (otherArticles.length > 0) {
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
            articlesSectionHTML = `
                    <div class="extra-section">
                        <div class="section-head">
                            <h2><i class="fas fa-feather-alt" style="color:var(--primary);"></i> Köşe Yazıları</h2>
                            <a href="../yazilar.html">Tümü →</a>
                        </div>
                        <div class="extra-grid">${cards}</div>
                    </div>
                `
        }
        
        // Eğer hiç alt bölüm yoksa
        if (!heroSectionHTML && !dernekSectionHTML && !articlesSectionHTML) {
            emptySectionHTML = `
                    <div style="text-align:center; padding:2rem 0; color:var(--text-muted);">
                        <p>Diğer içerikler bulunmuyor.</p>
                        <a href="../index.html" style="display:inline-block; margin-top:1rem; background:var(--primary); color:#fff; padding:0.5rem 1.8rem; border-radius:30px; font-weight:600; text-decoration:none;">Ana Sayfa</a>
                    </div>
                `
        }
        
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
            .replace(/\{\{author_posts\}\}/g, authorPostsHTML)
            .replace(/\{\{hero_section\}\}/g, heroSectionHTML)
            .replace(/\{\{dernek_section\}\}/g, dernekSectionHTML)
            .replace(/\{\{articles_section\}\}/g, articlesSectionHTML)
            .replace(/\{\{empty_section\}\}/g, emptySectionHTML)
        
        // Dosyayı kaydet - Haberler haber/ klasörüne, köşe yazıları yazilar/ klasörüne
        let outputDir
        if (sourceTable === 'articles') {
            outputDir = path.join(__dirname, '../yazilar')
        } else {
            outputDir = path.join(__dirname, '../haber')
        }
        
        // Klasör yoksa oluştur
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true })
        }
        
        const outputPath = path.join(outputDir, `${slug}.html`)
        fs.writeFileSync(outputPath, html, 'utf-8')
        console.log(`✅ Oluşturuldu: ${sourceTable === 'articles' ? 'yazilar' : 'haber'}/${slug}.html`)
    }
    
    console.log('🎉 Tüm sayfalar oluşturuldu!')
}

// Script'i çalıştır
generateHaberPages()