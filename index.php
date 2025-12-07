<?php
// =================================================================
// 1. GÜVENLİK VE GİRİŞ KONTROLÜ (EN ÜSTTE OLMALIDIR)
// =================================================================
$KULLANICI_ADI = 'admin'; // Lütfen KENDİ GÜVENLİ KULLANICI ADINIZLA DEĞİŞTİRİN
$SIFRE = 'ordinus7743';     // Lütfen KENDİ GÜÇLÜ ŞİFRENİZLE DEĞİŞTİRİN

// Tarayıcıdan Gelen Kullanıcı Adı ve Şifreyi Kontrol Etme
if (!isset($_SERVER['PHP_AUTH_USER']) || $_SERVER['PHP_AUTH_USER'] != $KULLANICI_ADI || $_SERVER['PHP_AUTH_PW'] != $SIFRE) {
    // Yanlışsa veya girilmediyse şifre sorma penceresini göster
    header('WWW-Authenticate: Basic realm="Yukleyiciye Giris Yap"');
    header('HTTP/1.0 401 Unauthorized');
    echo 'Bu alana erişim yetkiniz yok. Lütfen kullanıcı adı ve şifrenizi girin.';
    exit;
}

// --- GEREKLİ AYARLAR ---
$hedef_klasor = "dosyalar/"; 
$max_boyut = 5 * 1024 * 1024; // Maksimum 5 MB (Değiştirebilirsiniz)
// =================================================================
?>
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kış Temalı Güvenli Dosya Paylaşım Aracı</title>
    <style>
        /* GENEL VE ARKA PLAN AYARLARI */
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            min-height: 100vh; 
            background: #0d1a26; /* Koyu arka plan */
            margin: 0;
            overflow: hidden; 
        }
        
        /* KAR KANVASI CSS - TÜM EKRANI KAPLAR */
        #snowstorm-canvas {
            display: block;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10; 
        }

        /* YÜKLEME KUTUSU CSS - KARIN ÜZERİNDE GÖRÜNMELİ */
        .kutu { 
            background: rgba(255, 255, 255, 0.9); 
            padding: 40px; 
            border-radius: 12px; 
            box-shadow: 0 4px 20px rgba(0,0,0,0.5); 
            text-align: center; 
            width: 90%;
            max-width: 500px;
            position: relative; 
            z-index: 20; 
        }
        
        /* KUTU İÇİ STİLLER */
        h2 { color: #1a2a3a; margin-bottom: 25px; }
        input[type="file"] { display: block; width: 100%; padding: 10px; margin-bottom: 20px; border: 1px solid #ccc; border-radius: 5px; box-sizing: border-box; }
        button { padding: 12px 25px; background: #007bff; color: white; border: none; cursor: pointer; border-radius: 5px; font-size: 16px; transition: background 0.3s; }
        button:hover { background: #0056b3; }
        .link { margin-top: 25px; background: #e8f0fe; padding: 15px; border: 1px solid #b3d7ff; color: #004085; border-radius: 5px; font-size: 14px; word-break: break-all; }
        .hata { color: red; margin-top: 15px; }
        .basari { color: green; margin-top: 15px; }
    </style>
</head>
<body>

    <canvas id="snowstorm-canvas"></canvas>
    
    <div class="kutu">
        <h2>🚀 Güvenli Dosya Yükleme Aracı</h2>
        
        <form action="" method="post" enctype="multipart/form-data">
            <input type="file" name="yuklenecek_dosya" required>
            <button type="submit" name="yukle">Yükle ve Paylaşım Linkini Al</button>
        </form>

        <?php
        // =================================================================
        // 4. DOSYA YÜKLEME PHP MANTIĞI
        // =================================================================
        if(isset($_POST['yukle'])){

            // Klasör yoksa oluştur
            if (!is_dir($hedef_klasor)) {
                mkdir($hedef_klasor, 0755, true); 
            }

            $dosya = $_FILES["yuklenecek_dosya"];
            
            if ($dosya["error"] != UPLOAD_ERR_OK) {
                echo "<p class='hata'>Hata: Dosya yüklenirken bir sorun oluştu.</p>";
            } 
            else if ($dosya["size"] > $max_boyut) {
                echo "<p class='hata'>Hata: Dosya boyutu (" . round($max_boyut / 1024 / 1024, 2) . " MB) sınırını aşıyor.</p>";
            }
            else {
                // Güvenli ve benzersiz dosya adı oluşturma
                $rastgele_ad = uniqid() . "_" . basename($dosya["name"]);
                $hedef_yol = $hedef_klasor . $rastgele_ad;
                
                if (move_uploaded_file($dosya["tmp_name"], $hedef_yol)) {
                    
                    // Link Oluşturma
                    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || $_SERVER['SERVER_PORT'] == 443) ? "https://" : "http://";
                    $base_url = $protocol . $_SERVER['HTTP_HOST'] . dirname($_SERVER['REQUEST_URI']);
                    $tam_link = $base_url . "/" . $hedef_klasor . $rastgele_ad;
                    
                    echo "<p class='basari'>✅ Dosya başarıyla yüklendi!</p>";
                    echo "<div class='link'><strong>Paylaşım Linkiniz:</strong><br><a href='{$tam_link}' target='_blank'>{$tam_link}</a></div>";
                    
                } else {
                    echo "<p class='hata'>Hata: Dosya sunucuya taşınamadı. **dosyalar** klasörünün izinlerini (0755) kontrol edin.</p>";
                }
            }
        }
        ?>
    </div>
    
    <script>
        (function (window, document) {
            "use strict";

            var snowCanvas = document.getElementById('snowstorm-canvas');
            if (!snowCanvas) return;

            var snowCtx = snowCanvas.getContext('2d');
            var windowW, windowH;
            var flakes = [];
            
            var snowOptions = {
                snowflakes: 200, maxSize: 2.5, minSize: 1, maxVelocity: 1.5, windForce: 0.8 
            };
            
            function randomBetween(min, max, round) {
                var num = Math.random() * (max - min) + min;
                return round ? Math.floor(num) : num;
            }

            function scaleCanvas() {
                windowW = window.innerWidth;
                windowH = window.innerHeight;
                snowCanvas.width = windowW;
                snowCanvas.height = windowH;
            }

            function Flake(x, y) {
                this.x = x;
                this.y = y;
                this.r = randomBetween(0, snowOptions.windForce);
                this.a = randomBetween(0, Math.PI);
                this.aStep = 0.01 + Math.random() * 0.01;
                this.weight = randomBetween(snowOptions.minSize, snowOptions.maxSize);
                this.alpha = (this.weight / snowOptions.maxSize);
                this.speed = (this.weight / snowOptions.maxSize) * snowOptions.maxVelocity; 

                this.update = function() {
                    this.x += Math.cos(this.a) * this.r;
                    this.a += this.aStep;
                    this.y += this.speed;
                }
            }

            function snowLoop() {
                var i = flakes.length;
                var flakeA;

                snowCtx.clearRect(0, 0, windowW, windowH);

                while (i--) {
                    flakeA = flakes[i];
                    flakeA.update();

                    snowCtx.beginPath();
                    snowCtx.arc(flakeA.x, flakeA.y, flakeA.weight, 0, 2 * Math.PI, false);
                    snowCtx.fillStyle = 'rgba(255, 255, 255, ' + flakeA.alpha + ')';
                    snowCtx.fill();

                    if (flakeA.y >= windowH) {
                        flakeA.y = -flakeA.weight; 
                        flakeA.x = randomBetween(0, windowW, true);
                    }
                    if (flakeA.x > windowW) {
                        flakeA.x = 0;
                    }
                    if (flakeA.x < 0) {
                        flakeA.x = windowW;
                    }
                }
                window.requestAnimationFrame(snowLoop);
            }

            function initSnow() {
                var i = snowOptions.snowflakes;
                while (i--) {
                    var x = randomBetween(0, windowW, true);
                    var y = randomBetween(0, windowH, true);
                    flakes.push(new Flake(x, y));
                }
                snowLoop();
            }

            function initialize() {
                scaleCanvas(); 
                initSnow();
            }
            
            window.addEventListener('resize', scaleCanvas);
            document.addEventListener("DOMContentLoaded", initialize);

        })(window, document);
    </script>

</body>
</html>
