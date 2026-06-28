import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { config } from './config.js';

const supabase = createClient(config.url, config.key);

function formatDate(date) {
    if (!date) return new Date().toISOString().split('T')[0];
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
        return d.toISOString().split('T')[0];
    } catch {
        return new Date().toISOString().split('T')[0];
    }
}

function buildUrl(path) {
    if (path.startsWith('http')) return path;
    if (path.startsWith('/')) return `${config.site}${path}`;
    return `${config.site}/${path}`;
}

async function generateSitemap() {
    console.log('🚀 Sitemap oluşturma başlıyor...');
    
    const urls = [];
    const now = new Date().toISOString().split('T')[0];

    // ===== STATİK SAYFALAR =====
    console.log('📄 Statik sayfalar ekleniyor...');
    const staticPages = [
        { loc: '/', priority: 1.0, changefreq: 'daily' },
        { loc: '/hakkimizda.html', priority: 0.8, changefreq: 'monthly' },
        { loc: '/haberler.html', priority: 0.9, changefreq: 'weekly' },
        { loc: '/yerel-rehber.html', priority: 0.9, changefreq: 'weekly' },
        { loc: '/glutensiz-yasam.html', priority: 0.9, changefreq: 'weekly' },
        { loc: '/bagis.html', priority: 0.8, changefreq: 'monthly' },
        { loc: '/iletisim.html', priority: 0.7, changefreq: 'monthly' }
    ];

    staticPages.forEach(page => {
        urls.push({
            loc: buildUrl(page.loc),
            lastmod: now,
            changefreq: page.changefreq,
            priority: page.priority
        });
    });

    // ===== HERO İÇERİKLERİ =====
    console.log('🎯 Hero içerikleri çekiliyor...');
    try {
        const { data: heroes, error } = await supabase
            .from('hero')
            .select('id, slug, updated_at, created_at')
            .eq('is_active', true);

        if (error) {
            console.error('❌ Hero hatası:', error.message);
        } else if (heroes && heroes.length > 0) {
            console.log(`✅ ${heroes.length} hero içeriği bulundu`);
            heroes.forEach(hero => {
                const loc = hero.slug 
                    ? `/detay.html?slug=${encodeURIComponent(hero.slug)}`
                    : `/detay.html?id=${hero.id}`;
                
                urls.push({
                    loc: buildUrl(loc),
                    lastmod: formatDate(hero.updated_at || hero.created_at),
                    changefreq: 'weekly',
                    priority: 0.9
                });
            });
        }
    } catch (error) {
        console.error('❌ Hero sorgu hatası:', error.message);
    }

    // ===== ARTICLES =====
    console.log('📰 Makaleler çekiliyor...');
    try {
        const { data: articles, error } = await supabase
            .from('articles')
            .select('id, slug, pubDate, updated_at, created_at')
            .eq('is_published', true);

        if (error) {
            console.error('❌ Makale hatası:', error.message);
        } else if (articles && articles.length > 0) {
            console.log(`✅ ${articles.length} makale bulundu`);
            articles.forEach(article => {
                const loc = article.slug 
                    ? `/detay.html?slug=${encodeURIComponent(article.slug)}`
                    : `/detay.html?id=${article.id}`;
                
                urls.push({
                    loc: buildUrl(loc),
                    lastmod: formatDate(article.updated_at || article.pubDate || article.created_at),
                    changefreq: 'weekly',
                    priority: 0.7
                });
            });
        }
    } catch (error) {
        console.error('❌ Makale sorgu hatası:', error.message);
    }

    // ===== BENZERSİZ URL'LER =====
    const uniqueUrls = [];
    const urlSet = new Set();
    urls.forEach(url => {
        if (!urlSet.has(url.loc)) {
            urlSet.add(url.loc);
            uniqueUrls.push(url);
        }
    });

    console.log(`📊 Toplam ${uniqueUrls.length} benzersiz URL`);

    // ===== XML OLUŞTUR =====
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
    xml += '        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n';
    xml += '        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9\n';
    xml += '        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">\n';

    uniqueUrls.forEach(url => {
        xml += '  <url>\n';
        xml += `    <loc>${url.loc}</loc>\n`;
        xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
        xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
        xml += `    <priority>${url.priority}</priority>\n`;
        xml += '  </url>\n';
    });

    xml += '</urlset>';

    // ===== DOSYAYI KAYDET =====
    try {
        writeFileSync('./sitemap.xml', xml, 'utf8');
        console.log(`✅ Sitemap başarıyla oluşturuldu!`);
        console.log(`📄 Dosya: sitemap.xml`);
        console.log(`🔗 URL sayısı: ${uniqueUrls.length}`);
        console.log(`📦 Boyut: ${(xml.length / 1024).toFixed(2)} KB`);
        return true;
    } catch (error) {
        console.error('❌ Dosya yazma hatası:', error.message);
        return false;
    }
}

generateSitemap()
    .then(success => {
        if (success) {
            console.log('🎉 Başarılı!');
            process.exit(0);
        } else {
            console.error('❌ Başarısız!');
            process.exit(1);
        }
    })
    .catch(error => {
        console.error('❌ Hata:', error);
        process.exit(1);
    });
