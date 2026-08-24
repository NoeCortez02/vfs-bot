const puppeteer = require('puppeteer');
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
                '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            ]
        });
        
        const page = await browser.newPage();
        
        await page.goto(CONFIG.url, {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });
        
        await delayAleatorio(5000, 10000);
        
        const conteudo = await page.evaluate(() => {
            return document.body ? document.body.innerText : '';
        });
        
        if (conteudo.includes('403') || conteudo.includes('blocked')) {
            console.log('⚠️ Cloudflare bloqueou');
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
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

async function iniciar() {
    console.log('🤖 Bot VFS no Railway iniciado');
    console.log(`⏰ A cada ${CONFIG.checkInterval} minutos`);
    
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
