<?php
// Supabase bağlantı bilgileri
$SUPABASE_URL = 'https://tmtdpykzmdvxszxwyege.supabase.co';
$SUPABASE_ANON_KEY = 'sb_publishable_3S4Qryj5TCI4IDASoxisVw_Y9eoso2F';

// URL'den slug'ı al (örn: /paylasim/gectigimiz-ayin-ardindan-26)
$slug = isset($_GET['slug']) ? $_GET['slug'] : '';

// Eğer slug yoksa veya boşsa ana sayfaya yönlendir
if (empty($slug)) {
    header('Location: /index.html');
    exit;
}

// Supabase'den makaleyi çek
$url = $SUPABASE_URL . '/rest/v1/articles?select=title,summary,author_email&slug=eq.' . urlencode($slug) . '&is_published=eq.true';
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'apikey: ' . $SUPABASE_ANON_KEY,
    'Authorization: Bearer ' . $SUPABASE_ANON_KEY
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$article = null;
$authorEmail = null;

if ($httpCode == 200 && $response) {
    $data = json_decode($response, true);
    if (!empty($data)) {
        $article = $data[0];
        $authorEmail = $article['author_email'];
    }
}

// Yazar bilgilerini al
$authorAvatar = 'https://www.kirikkalecolyak.org.tr/img/logo.png';
$authorName = '';
$authorTitle = '';

if ($authorEmail) {
    $url = $SUPABASE_URL . '/rest/v1/authors?select=name,title,avatar&email=eq.' . urlencode($authorEmail);
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'apikey: ' . $SUPABASE_ANON_KEY,
        'Authorization: Bearer ' . $SUPABASE_ANON_KEY
    ]);
    $response = curl_exec($ch);
    curl_close($ch);
    
    if ($response) {
        $authorData = json_decode($response, true);
        if (!empty($authorData)) {
            if (!empty($authorData[0]['avatar'])) {
                $authorAvatar = $authorData[0]['avatar'];
            }
            $authorName = $authorData[0]['name'] ?? '';
            $authorTitle = $authorData[0]['title'] ?? '';
        }
    }
}

// Meta bilgileri
$title = $article ? $article['title'] : 'Kırıkkale Çölyak Derneği';
$description = $article ? ($article['summary'] ?? 'Çölyak hastalığı ve glutensiz yaşam hakkında bilgiler') : 'Çölyak hastalığı ve glutensiz yaşam rehberi';
$ogImage = $authorAvatar;
$targetUrl = 'https://www.kirikkalecolyak.org.tr/detay.html?slug=' . urlencode($slug);

// Bot mu kontrolü
$userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
$isBot = preg_match('/bot|crawler|spider|facebook|whatsapp|twitter|telegram/i', $userAgent);

// Bot değilse direkt yönlendir
if (!$isBot) {
    header('Location: ' . $targetUrl);
    exit;
}

// Bot ise meta etiketli HTML göster
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title><?php echo htmlspecialchars($title); ?></title>
    <meta property="og:title" content="<?php echo htmlspecialchars($title); ?>">
    <meta property="og:description" content="<?php echo htmlspecialchars($description); ?>">
    <meta property="og:image" content="<?php echo htmlspecialchars($ogImage); ?>">
    <meta property="og:image:width" content="512">
    <meta property="og:image:height" content="512">
    <meta property="og:type" content="article">
    <meta property="og:url" content="<?php echo htmlspecialchars($targetUrl); ?>">
    <meta name="twitter:card" content="summary_large_image">
    <meta http-equiv="refresh" content="0; url=<?php echo htmlspecialchars($targetUrl); ?>">
    <script>window.location.href = "<?php echo htmlspecialchars($targetUrl); ?>";</script>
</head>
<body>
    <p>Yönlendiriliyorsunuz. <a href="<?php echo htmlspecialchars($targetUrl); ?>">Tıklayın</a></p>
</body>
</html>