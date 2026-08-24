const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const nodemailer = require('nodemailer');
const cron = require('node-cron');

const CONFIG = {
    url: 'https://visa.vfsglobal.com/ago/pt/prt/',
    emailUser: 'noelcortez0012@gmail.com',
    emailPass: 'ivlx vvtr gotw kadl',
    emailTo: 'noelcortez0012@gmail.com',
    checkInterval: 15
};

const PALAVRAS_VAGA = [
    'vaga disponivel',
    'vagas disponiveis',
    'agendamento disponivel',
    'slots disponiveis',
    'marcar consulta',
    'agendar agora',
    'reservar vaga',
    'appointment available',
    'book now',
    'available slots'
];

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: CONFIG.emailUser,
        pass: CONFIG.emailPass
    }
});

function delayAleatorio(min, max) {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function verificarSite() {
    console.log(`\n🔍 Verificando site VFS...`);
    console.log(`📅 ${new Date().toLocaleString('pt-PT')}`);
    
    let browser;
    
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-first-run',
                '--single-process',
                '--disable-blink-features=AutomationControlled',
                '--disable-features=IsolateOrigins,site-per-process',
                '--allow-running-insecure-content',
                '--disable-web-resources'
            ]
        });
        
        const page = await browser.newPage();
        
        // Setar headers realistas
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0'
        });
        
        // Definir user agent realista
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Viewport realista
        await page.setViewport({ width: 1920, height: 1080 });
        
        // Desabilitar webdriver
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
            });
        });
        
        // Delay inicial aleatório
        await delayAleatorio(2000, 5000);
        
        console.log('📡 Tentando acessar...');
        await page.goto(CONFIG.url, {
            waitUntil: 'networkidle2',
            timeout: 90000
        });
        
        // Delay após carregar
        await delayAleatorio(5000, 10000);
        
        // Simular comportamento humano - scrolling
        await page.evaluate(() => {
            window.scrollBy(0, window.innerHeight);
        });
        
        await delayAleatorio(1000, 3000);
        
        const conteudo = await page.evaluate(() => {
            return document.body ? document.body.innerText : '';
        });
        
        // Verificar se foi bloqueado
        if (conteudo.includes('403') || 
            conteudo.includes('Cloudflare') || 
            conteudo.includes('blocked') ||
            conteudo.includes('Challenge') ||
            conteudo.includes('unusual traffic') ||
            conteudo.includes('Ray ID')) {
            console.log('⚠️ Cloudflare bloqueou - tentando novamente com delay maior...');
            await delayAleatorio(30000, 60000);
            return;
        }
        
        const textoPagina = conteudo.toLowerCase();
        let vagasEncontradas = [];
        
        for (const palavra of PALAVRAS_VAGA) {
            if (textoPagina.includes(palavra)) {
                vagasEncontradas.push(palavra);
            }
        }
        
        if (vagasEncontradas.length > 0) {
            console.log('🎉 VAGAS ENCONTRADAS!');
            
            await transporter.sendMail({
                from: CONFIG.emailUser,
                to: CONFIG.emailTo,
                subject: '🚨 VAGAS VFS DISPONÍVEIS!',
                html: `<h2>🚨 VAGAS DETECTADAS!</h2>
                       <p><strong>Data:</strong> ${new Date().toLocaleString('pt-PT')}</p>
                       <p><strong>Palavras:</strong> ${vagasEncontradas.join(', ')}</p>
                       <hr>
                       <p><a href="${CONFIG.url}">Acesse agora!</a></p>`
            });
            
            console.log('✅ Email enviado!');
        } else {
            console.log('😔 Nenhuma vaga detectada');
        }
        
    } catch (erro) {
        console.error('❌ Erro:', erro.message);
        if (erro.message.includes('net::ERR_NAME_NOT_RESOLVED')) {
            console.log('⚠️ Erro de DNS - verificar conexão');
        } else if (erro.message.includes('ERR_TIMED_OUT')) {
            console.log('⚠️ Timeout - site pode estar lento');
        }
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

async function iniciar() {
    console.log('🤖 Bot VFS Anti-Cloudflare iniciado');
    console.log(`⏰ A cada ${CONFIG.checkInterval} minutos`);
    console.log('🛡️ Proteções ativas: Stealth + Headers + Delays');
    
    await verificarSite();
    
    cron.schedule(`*/${CONFIG.checkInterval} * * * *`, async () => {
        await verificarSite();
    });
    
    console.log('✅ Monitoramento ativo!');
}

iniciar().catch(console.error);

// Manter o processo vivo
setInterval(() => {
    console.log('💓 Bot ainda está vivo');
}, 60000);
