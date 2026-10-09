/**
 * DUCTOR AI - SERVIDOR (API + site)
 * ------------------------------------------------------------------
 * - Serve o site (pasta /public) e a API (/api/...) no mesmo endereço
 * - Login com token assinado, dados individuais por usuário
 * - Limites contra tentativas de invasão (login, recuperação, chat)
 * - Armazenamento em JSON (local) ou PostgreSQL (produção)
 */
require('dotenv').config({ quiet: true });
const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { criarStorage } = require('./storage');
const { SYSTEM_PROMPT } = require('./prompt');

const IS_PROD = process.env.NODE_ENV === 'production';
const IDIOMAS = ['pt', 'en', 'es'];
const NOME_IDIOMA = { pt: 'Português do Brasil', en: 'English', es: 'Español' };

// =======================================================
// UTILITÁRIOS
// =======================================================
const normalizarEmail = (email) => String(email || '').trim().toLowerCase();
const emailValido = (email) => email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
const idiomaValido = (l) => (IDIOMAS.includes(l) ? l : 'pt');
const dormir = (ms) => new Promise(r => setTimeout(r, ms));
const escaparHtml = (t) => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function senhaValida(senha) {
    // bcrypt só considera os primeiros 72 bytes, por isso esse teto
    return typeof senha === 'string' && senha.length >= 8 && Buffer.byteLength(senha, 'utf8') <= 72;
}

// Resposta de erro padronizada: "code" permite ao site traduzir a mensagem
function falha(res, status, code, mensagem, extra = {}) {
    return res.status(status).json({ error: mensagem, code, ...extra });
}

// =======================================================
// LIMITES DE TENTATIVAS (em memória; zeram se o servidor reiniciar)
// =======================================================
const contadores = new Map();

function contar(chave, janelaMs) {
    const agora = Date.now();
    let r = contadores.get(chave);
    if (!r || r.expira <= agora) {
        r = { n: 0, expira: agora + janelaMs };
        contadores.set(chave, r);
    }
    r.n++;
    return r;
}

// Quantas tentativas já foram feitas e quantos segundos faltam para zerar
function consultar(chave) {
    const r = contadores.get(chave);
    if (!r || r.expira <= Date.now()) return { n: 0, segundos: 0 };
    return { n: r.n, segundos: Math.ceil((r.expira - Date.now()) / 1000) };
}

const zerar = (chave) => contadores.delete(chave);

// Retorna os segundos de espera se o limite estourou; 0 se está liberado
function esperaNecessaria(chave, max) {
    const c = consultar(chave);
    return c.n >= max ? c.segundos : 0;
}

function bloquear(res, segundos, code = 'too_many_attempts') {
    res.set('Retry-After', String(segundos));
    return falha(res, 429, code, `Muitas tentativas. Tente novamente em ${Math.ceil(segundos / 60)} min.`, { retryAfter: segundos });
}

const MIN = 60 * 1000;
const HORA = 60 * MIN;
const LIMITES = {
    loginPorPar: { max: 5, janela: 15 * MIN },     // mesmo IP + mesmo e-mail
    loginPorIp: { max: 20, janela: 15 * MIN },     // qualquer e-mail, mesmo IP
    cadastroPorIp: { max: 10, janela: HORA },
    recuperarPorIp: { max: 10, janela: HORA },
    recuperarPorEmailHora: { max: 5, janela: HORA },
    recuperarIntervalo: { max: 1, janela: 60 * 1000 },
    confirmarPorIp: { max: 20, janela: 15 * MIN },
    tentativasPorCodigo: 5,
    chatPorMinuto: { max: 15, janela: MIN },
    chatPorDia: { max: 300, janela: 24 * HORA }
};

// =======================================================
// DETECÇÃO DE SITUAÇÃO DE RISCO (autoagressão / suicídio)
// =======================================================
const REGEX_CRISE = new RegExp([
    'suicid', 'me matar', 'quero morrer', 'vou me matar', 'acabar com (a )?(minha )?vida', 'tirar (a )?minha vida',
    'automutila', 'me cortar', 'me machucar', 'nao quero (mais )?viver', 'nao aguento mais viver',
    'kill myself', 'want to die', 'end my life', 'self[- ]?harm', 'hurt myself', "don'?t want to live",
    'quiero morir', 'quitarme la vida', 'matarme', 'hacerme dano', 'no quiero vivir'
].join('|'), 'i');

function mensagemDeRisco(texto) {
    const limpo = String(texto).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return REGEX_CRISE.test(limpo);
}

// =======================================================
// FILTRO DE RESPOSTA DA IA
// =======================================================
function sanitizarResposta(texto) {
    if (!texto) return '';
    let limpo = texto;
    limpo = limpo.replace(/<think>[\s\S]*?<\/think>/gi, '');
    limpo = limpo.replace(/^(Claro|Com certeza|Certamente|Entendido|Sim),?\s*(!|\.)?\s*/i, '');
    limpo = limpo.replace(/\n\n(Nota|Observação|Lembre-se):[\s\S]*$/i, '');
    limpo = limpo.trim();
    // Depois de cortar a abertura, garante a inicial maiúscula
    return limpo.charAt(0).toUpperCase() + limpo.slice(1);
}

// =======================================================
// E-MAIL (3 modos: Brevo por API, Gmail por SMTP, Ethereal de teste)
// =======================================================
const TEXTOS_EMAIL = {
    pt: { assunto: 'Código de segurança - Ductor AI', ola: 'Olá', corpo: 'Seu código de segurança para redefinir a senha é:', validade: 'Válido por 10 minutos. Se não foi você que pediu, ignore este e-mail.' },
    en: { assunto: 'Security code - Ductor AI', ola: 'Hello', corpo: 'Your security code to reset your password is:', validade: 'Valid for 10 minutes. If you did not request this, just ignore this email.' },
    es: { assunto: 'Código de seguridad - Ductor AI', ola: 'Hola', corpo: 'Tu código de seguridad para restablecer la contraseña es:', validade: 'Válido por 10 minutos. Si no lo solicitaste, ignora este correo.' }
};

function montarEmailRecuperacao(nome, codigo, idioma) {
    const t = TEXTOS_EMAIL[idioma] || TEXTOS_EMAIL.pt;
    const html = `
        <div style="font-family: sans-serif; background-color: #0f172a; color: #f8fafc; padding: 30px; border-radius: 10px; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #3b82f6; text-align: center;">Ductor AI</h2>
            <p>${t.ola}, <strong>${escaparHtml(nome)}</strong>!</p>
            <p>${t.corpo}</p>
            <div style="background-color: #1e293b; padding: 15px; text-align: center; font-size: 26px; font-weight: bold; letter-spacing: 6px; border-radius: 8px; color: #3b82f6; margin: 25px 0;">${codigo}</div>
            <p style="font-size: 13px; color: #94a3b8; text-align: center;">${t.validade}</p>
        </div>`;
    return { assunto: t.assunto, html };
}

async function criarEmailer() {
    try {
        if (process.env.EMAIL_TEST === 'true') {
            const conta = await nodemailer.createTestAccount();
            const transporte = nodemailer.createTransport({ host: 'smtp.ethereal.email', port: 587, secure: false, auth: { user: conta.user, pass: conta.pass } });
            console.log('📧 Modo de teste (Ethereal): nenhum e-mail real será enviado.');
            return {
                modo: 'teste',
                async enviar({ para, assunto, html }) {
                    const info = await transporte.sendMail({ from: '"Ductor AI" <teste@ductorai.com>', to: para, subject: assunto, html });
                    console.log('🔗 Veja o e-mail de teste em:', nodemailer.getTestMessageUrl(info));
                }
            };
        }

        if (process.env.EMAIL_PROVIDER === 'brevo' && process.env.BREVO_API_KEY && process.env.EMAIL_FROM) {
            console.log('📧 E-mail via Brevo (API HTTP). Remetente:', process.env.EMAIL_FROM);
            return {
                modo: 'brevo',
                async enviar({ para, assunto, html }) {
                    const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
                        method: 'POST',
                        headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
                        body: JSON.stringify({ sender: { name: 'Ductor AI', email: process.env.EMAIL_FROM }, to: [{ email: para }], subject: assunto, htmlContent: html })
                    });
                    if (!resp.ok) throw new Error(`Brevo respondeu ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
                }
            };
        }

        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            const transporte = nodemailer.createTransport({
                service: 'gmail',
                auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS.replace(/\s/g, '') }
            });
            await transporte.verify();
            console.log('📧 E-mail via Gmail (SMTP). Remetente:', process.env.EMAIL_USER);
            return {
                modo: 'gmail',
                async enviar({ para, assunto, html }) {
                    await transporte.sendMail({ from: `"Ductor AI" <${process.env.EMAIL_USER}>`, to: para, subject: assunto, html });
                }
            };
        }

        console.error('❌ Nenhum envio de e-mail configurado (veja .env.example). A recuperação de senha NÃO vai enviar e-mails.');
    } catch (erro) {
        console.error('❌ Falha ao configurar o e-mail:', erro.message);
        console.error('   Se for Gmail: use a SENHA DE APP de 16 caracteres. Se estiver em hospedagem gratuita, o SMTP é bloqueado: use o modo Brevo.');
    }
    return null;
}

// =======================================================
// APLICAÇÃO
// =======================================================
function criarApp({ storage, emailer, groq, tokenSecret, atrasoUsuarioInexistente = 700 }) {
    const app = express();
    app.set('trust proxy', 1); // atrás do proxy da hospedagem, req.ip passa a ser o IP real do visitante
    app.disable('x-powered-by');

    // ---------- tokens ----------
    const SEGREDO = tokenSecret || process.env.TOKEN_SECRET || crypto.randomBytes(48).toString('hex');
    if (!tokenSecret && !process.env.TOKEN_SECRET) {
        console.warn('⚠️  TOKEN_SECRET não definido: usando segredo temporário (todos serão deslogados ao reiniciar).');
        if (IS_PROD) console.warn('⚠️  Em produção, defina TOKEN_SECRET!');
    }
    const assinar = (texto) => crypto.createHmac('sha256', SEGREDO).update(texto).digest('base64url');
    const marcaDaSenha = (u) => assinar('pv:' + u.password).slice(0, 16); // muda quando a senha muda
    const VALIDADE_TOKEN = 7 * 24 * HORA;

    function criarToken(usuario) {
        const payload = Buffer.from(JSON.stringify({ uid: usuario.id, pv: marcaDaSenha(usuario), exp: Date.now() + VALIDADE_TOKEN })).toString('base64url');
        return `${payload}.${assinar(payload)}`;
    }

    function lerToken(token) {
        if (typeof token !== 'string') return null;
        const partes = token.split('.');
        if (partes.length !== 2) return null;
        const a = Buffer.from(partes[1]);
        const b = Buffer.from(assinar(partes[0]));
        if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
        try {
            const dados = JSON.parse(Buffer.from(partes[0], 'base64url').toString('utf8'));
            return dados.uid && Date.now() <= dados.exp ? dados : null;
        } catch { return null; }
    }

    async function exigirLogin(req, res, next) {
        try {
            const cab = req.headers.authorization || '';
            const dados = lerToken(cab.startsWith('Bearer ') ? cab.slice(7) : null);
            const usuario = dados ? await storage.buscarUsuarioPorId(dados.uid) : null;
            if (!usuario || dados.pv !== marcaDaSenha(usuario)) {
                return falha(res, 401, 'session_expired', 'Sessão inválida ou expirada. Faça login novamente.');
            }
            req.usuario = usuario;
            next();
        } catch (erro) {
            next(erro);
        }
    }

    // ---------- cabeçalhos de segurança ----------
    app.use((req, res, next) => {
        res.set({
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
            'Content-Security-Policy': [
                "default-src 'self'",
                "script-src 'self'",
                "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
                "font-src 'self' https://cdnjs.cloudflare.com data:",
                "img-src 'self' data: blob:",
                "connect-src 'self'",
                "frame-ancestors 'none'",
                "base-uri 'self'",
                "form-action 'self'"
            ].join('; ')
        });
        if (IS_PROD) res.set('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
        if (req.path.startsWith('/api/')) res.set('Cache-Control', 'no-store');
        next();
    });

    // ---------- CORS ----------
    const origensPermitidas = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
    app.use(cors({
        origin(origem, cb) {
            if (!origem) return cb(null, true);
            if (origensPermitidas.includes(origem)) return cb(null, true);
            if (!IS_PROD && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origem)) return cb(null, true);
            cb(null, false);
        }
    }));
    app.use(express.json({ limit: '5mb' }));

    // ---------- saúde (usada por hospedagem e monitoramento) ----------
    app.get('/api/health', (req, res) => res.json({ ok: true, storage: storage.tipo, email: emailer ? emailer.modo : 'desligado' }));

    // ---------- cadastro ----------
    app.post('/api/register', async (req, res, next) => {
        try {
            const ip = req.ip;
            const espera = esperaNecessaria(`cad:${ip}`, LIMITES.cadastroPorIp.max);
            if (espera) return bloquear(res, espera);

            const { name, password } = req.body || {};
            const email = normalizarEmail((req.body || {}).email);
            if (typeof name !== 'string' || !name.trim() || !email || typeof password !== 'string' || !password) {
                return falha(res, 400, 'missing_fields', 'Preencha todos os campos!');
            }
            if (name.trim().length < 2 || name.trim().length > 80) return falha(res, 400, 'invalid_name', 'Nome inválido.');
            if (!emailValido(email)) return falha(res, 400, 'invalid_email', 'E-mail inválido.');
            if (!senhaValida(password)) return falha(res, 400, 'weak_password', 'A senha precisa ter de 8 a 72 caracteres.');

            contar(`cad:${ip}`, LIMITES.cadastroPorIp.janela);
            const hash = await bcrypt.hash(password, 10);
            try {
                await storage.criarUsuario({ name: name.trim(), email, password: hash });
            } catch (erro) {
                if (erro.code === 'EMAIL_TAKEN') return falha(res, 409, 'email_taken', 'Este e-mail já está cadastrado!');
                throw erro;
            }
            res.json({ success: true });
        } catch (erro) { next(erro); }
    });

    // ---------- login ----------
    const HASH_FALSO = bcrypt.hashSync('senha-falsa-para-igualar-o-tempo', 10);

    app.post('/api/login', async (req, res, next) => {
        try {
            const email = normalizarEmail((req.body || {}).email);
            const password = (req.body || {}).password;
            if (!email || typeof password !== 'string' || !password) {
                return falha(res, 400, 'missing_fields', 'Preencha todos os campos!');
            }

            const ip = req.ip;
            const kPar = `login:${ip}:${email}`;
            const kIp = `login-ip:${ip}`;
            const espera = Math.max(esperaNecessaria(kPar, LIMITES.loginPorPar.max), esperaNecessaria(kIp, LIMITES.loginPorIp.max));
            if (espera) return bloquear(res, espera, 'login_locked');

            const usuario = await storage.buscarUsuarioPorEmail(email);
            // Compara sempre, mesmo se o e-mail não existe: o tempo de resposta não revela quem tem conta
            const ok = await bcrypt.compare(password, usuario ? usuario.password : HASH_FALSO);
            if (!usuario || !ok) {
                const par = contar(kPar, LIMITES.loginPorPar.janela);
                contar(kIp, LIMITES.loginPorIp.janela);
                return falha(res, 401, 'bad_credentials', 'E-mail ou senha incorretos!', {
                    attemptsLeft: Math.max(0, LIMITES.loginPorPar.max - par.n)
                });
            }
            zerar(kPar);
            res.json({ success: true, name: usuario.name, email: usuario.email, token: criarToken(usuario) });
        } catch (erro) { next(erro); }
    });

    // ---------- recuperação de senha ----------
    const codigosRecuperacao = new Map(); // email -> { hash, expira, tentativas }
    const hashDoCodigo = (email, codigo) => crypto.createHash('sha256').update(`${email}:${codigo}`).digest();

    setInterval(() => {
        const agora = Date.now();
        for (const [k, v] of codigosRecuperacao) if (v.expira <= agora) codigosRecuperacao.delete(k);
        for (const [k, v] of contadores) if (v.expira <= agora) contadores.delete(k);
    }, 5 * MIN).unref();

    app.post('/api/recover-request', async (req, res, next) => {
        try {
            const email = normalizarEmail((req.body || {}).email);
            const idioma = idiomaValido((req.body || {}).language);
            if (!email || !emailValido(email)) return falha(res, 400, 'invalid_email', 'Informe um e-mail válido.');

            const ip = req.ip;
            const espera = Math.max(
                esperaNecessaria(`rec-ip:${ip}`, LIMITES.recuperarPorIp.max),
                esperaNecessaria(`rec-int:${email}`, LIMITES.recuperarIntervalo.max),
                esperaNecessaria(`rec-h:${email}`, LIMITES.recuperarPorEmailHora.max)
            );
            if (espera) return bloquear(res, espera, 'recover_wait');

            // Conta o pedido mesmo se o e-mail não existir (impede usar a tela para "descobrir" contas)
            contar(`rec-ip:${ip}`, LIMITES.recuperarPorIp.janela);
            contar(`rec-int:${email}`, LIMITES.recuperarIntervalo.janela);
            contar(`rec-h:${email}`, LIMITES.recuperarPorEmailHora.janela);

            const usuario = await storage.buscarUsuarioPorEmail(email);
            if (!usuario) {
                await dormir(atrasoUsuarioInexistente + Math.random() * 300); // imita o tempo de enviar um e-mail
                return res.json({ success: true }); // resposta idêntica: não revela se o e-mail existe
            }

            if (!emailer) return falha(res, 503, 'email_not_configured', 'O envio de e-mails não está configurado no servidor.');

            const codigo = String(crypto.randomInt(100000, 1000000));
            codigosRecuperacao.set(email, { hash: hashDoCodigo(email, codigo), expira: Date.now() + 10 * MIN, tentativas: 0 });

            try {
                const msg = montarEmailRecuperacao(usuario.name, codigo, idioma);
                await emailer.enviar({ para: email, assunto: msg.assunto, html: msg.html });
                if (emailer.modo === 'teste') console.log(`📬 [teste] código para ${email}: ${codigo}`);
            } catch (erro) {
                console.error('Erro ao enviar e-mail de recuperação:', erro.message);
                codigosRecuperacao.delete(email);
                return falha(res, 502, 'email_failed', 'Não foi possível enviar o e-mail agora. Tente novamente em instantes.');
            }
            res.json({ success: true });
        } catch (erro) { next(erro); }
    });

    app.post('/api/recover-confirm', async (req, res, next) => {
        try {
            const email = normalizarEmail((req.body || {}).email);
            const { codigo, newPassword } = req.body || {};
            if (!email || typeof codigo !== 'string' || !codigo || typeof newPassword !== 'string' || !newPassword) {
                return falha(res, 400, 'missing_fields', 'Preencha todos os campos!');
            }
            if (!senhaValida(newPassword)) return falha(res, 400, 'weak_password', 'A senha precisa ter de 8 a 72 caracteres.');

            const ip = req.ip;
            const espera = esperaNecessaria(`conf-ip:${ip}`, LIMITES.confirmarPorIp.max);
            if (espera) return bloquear(res, espera);
            contar(`conf-ip:${ip}`, LIMITES.confirmarPorIp.janela);

            const registro = codigosRecuperacao.get(email);
            if (!registro) return falha(res, 400, 'invalid_code', 'Código de verificação inválido!');
            if (Date.now() > registro.expira) {
                codigosRecuperacao.delete(email);
                return falha(res, 400, 'code_expired', 'Código expirado! Solicite um novo.');
            }

            registro.tentativas++;
            const confere = crypto.timingSafeEqual(hashDoCodigo(email, codigo.trim()), registro.hash);
            if (!confere) {
                if (registro.tentativas >= LIMITES.tentativasPorCodigo) {
                    codigosRecuperacao.delete(email); // queimou o código: precisa pedir outro
                    return falha(res, 400, 'code_burned', 'Muitas tentativas erradas. Solicite um novo código.');
                }
                return falha(res, 400, 'invalid_code', 'Código de verificação inválido!', {
                    attemptsLeft: LIMITES.tentativasPorCodigo - registro.tentativas
                });
            }

            const usuario = await storage.buscarUsuarioPorEmail(email);
            if (!usuario) return falha(res, 400, 'invalid_code', 'Código de verificação inválido!');

            await storage.atualizarSenha(usuario.id, await bcrypt.hash(newPassword, 10));
            codigosRecuperacao.delete(email);
            zerar(`login:${ip}:${email}`);
            res.json({ success: true });
        } catch (erro) { next(erro); }
    });

    // ---------- dados individuais (protegidos por login) ----------
    function sanitizarChats(chats) {
        if (!Array.isArray(chats)) return null;
        return chats.slice(-200).map(chat => {
            chat = chat || {};
            const msgs = Array.isArray(chat.messages) ? chat.messages : [];
            return {
                id: String(chat.id || '').slice(0, 60),
                title: String(chat.title || '').slice(0, 120),
                messages: msgs.slice(-500).map(m => ({
                    sender: m && m.sender === 'user' ? 'user' : 'ia',
                    text: String((m && m.text) || '').slice(0, 20000)
                }))
            };
        }).filter(c => c.id);
    }

    const avatarValido = (a) => typeof a === 'string' && a.length <= 400000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(a);

    app.get('/api/me/data', exigirLogin, async (req, res, next) => {
        try {
            const dados = await storage.lerDados(req.usuario.id);
            res.json({ name: req.usuario.name, email: req.usuario.email, ...dados });
        } catch (erro) { next(erro); }
    });

    app.put('/api/me/data', exigirLogin, async (req, res, next) => {
        try {
            const atual = await storage.lerDados(req.usuario.id);
            const { chats, settings, avatar } = req.body || {};

            if (chats !== undefined) {
                const limpos = sanitizarChats(chats);
                if (!limpos) return falha(res, 400, 'invalid_data', 'Formato de chats inválido.');
                atual.chats = limpos;
            }
            if (settings !== undefined) {
                if (typeof settings !== 'object' || settings === null) return falha(res, 400, 'invalid_data', 'Configurações inválidas.');
                atual.settings = {
                    theme: settings.theme === 'light' ? 'light' : 'dark',
                    fontSize: settings.fontSize === 'large' ? 'large' : 'normal',
                    language: IDIOMAS.includes(settings.language) ? settings.language : null
                };
            }
            if (avatar !== undefined) {
                if (avatar === null) atual.avatar = null;
                else if (avatarValido(avatar)) atual.avatar = avatar;
                else return falha(res, 400, 'invalid_avatar', 'Foto inválida ou muito grande.');
            }

            await storage.gravarDados(req.usuario.id, atual);
            res.json({ success: true });
        } catch (erro) { next(erro); }
    });

    // ---------- chat com a IA ----------
    app.post('/api/chat', exigirLogin, async (req, res, next) => {
        try {
            if (!groq) return falha(res, 503, 'ai_unavailable', 'A IA não está configurada no servidor.');

            const { message, history, mode, language } = req.body || {};
            if (typeof message !== 'string' || !message.trim() || message.length > 4000) {
                return falha(res, 400, 'invalid_message', 'Mensagem inválida.');
            }

            const uid = req.usuario.id;
            const esperaMin = esperaNecessaria(`chat-m:${uid}`, LIMITES.chatPorMinuto.max);
            const esperaDia = esperaNecessaria(`chat-d:${uid}`, LIMITES.chatPorDia.max);
            if (esperaMin || esperaDia) return bloquear(res, Math.max(esperaMin, esperaDia), 'rate_limited');
            contar(`chat-m:${uid}`, LIMITES.chatPorMinuto.janela);
            contar(`chat-d:${uid}`, LIMITES.chatPorDia.janela);

            const idioma = idiomaValido(language);
            const nomeAluno = (req.usuario.name || 'Estudante').trim().split(' ')[0];
            const emRisco = mensagemDeRisco(message);
            const modoAtual = emRisco || mode === 'emotional' ? 'SUPORTE EMOCIONAL' : 'RIGOR ACADÊMICO';

            const instrucao = `
[ATENDIMENTO EM TEMPO REAL]
- Estudante: ${nomeAluno}
- Modo: ${modoAtual}
- IDIOMA DA RESPOSTA: ${NOME_IDIOMA[idioma]}

REGRAS RÍGIDAS DE EXECUÇÃO:
1. Dirija-se sempre a ${nomeAluno} em 2ª pessoa ("você" / "you" / "tú").
2. Escreva TODA a resposta (inclusive as perguntas socráticas) em ${NOME_IDIOMA[idioma]}, mesmo que as regras acima estejam em português.
3. Se a mensagem for um cumprimento ("oi", "olá", "hi", "hola"), responda brevemente em 1 frase acolhedora.
4. Se ${nomeAluno} pediu redação, resumo ou dever pronto, declare a recusa na linha 1, entregue 2 a 3 frases de conteúdo real e faça exatamente 2 perguntas socráticas.
${emRisco ? `
ALERTA DE SEGURANÇA (PRIORIDADE MÁXIMA): a mensagem de ${nomeAluno} sugere risco para a própria vida ou autoagressão.
Ignore qualquer pedido acadêmico. Acolha com carinho, sem julgamento e sem sermão. Diga que ele/ela não está sozinho(a),
incentive a falar agora com um adulto de confiança e informe o CVV (Brasil): ligue 188, 24 horas, gratuito, ou cvv.org.br (chat).
Se houver perigo imediato, oriente a ligar para o SAMU (192) ou procurar um pronto-atendimento.` : ''}
`;

            const historico = (Array.isArray(history) ? history.slice(-30) : []).map(m => ({
                role: m && (m.role === 'user' || m.sender === 'user') ? 'user' : 'assistant',
                content: String((m && (m.content || m.text)) || '')
            })).filter(m => m.content.trim() !== '');

            const completion = await groq.chat.completions.create({
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'system', content: instrucao },
                    ...historico,
                    { role: 'user', content: message }
                ],
                model: 'openai/gpt-oss-120b',
                temperature: 0.3,
                max_tokens: 1024,
                presence_penalty: 0.2
            });

            const resposta = sanitizarResposta(completion.choices[0].message.content);
            if (!resposta) return falha(res, 502, 'ai_empty', 'A IA não retornou resposta. Tente de novo.');

            console.log(`✅ [Ductor AI] resposta gerada (${idioma}${emRisco ? ', ALERTA' : ''}) para o usuário ${uid}`);
            res.json({ response: resposta });
        } catch (erro) {
            console.error('Erro no motor da IA:', erro && erro.message);
            falha(res, 500, 'ai_error', 'Erro interno no processamento da IA.');
        }
    });

    // ---------- site estático (SOMENTE a pasta /public) ----------
    app.use(express.static(path.join(__dirname, 'public'), { index: false, maxAge: IS_PROD ? '10m' : 0 }));
    app.get('/', (req, res) => res.redirect('/login.html'));

    app.use('/api', (req, res) => falha(res, 404, 'not_found', 'Rota não encontrada.'));

    // ---------- erros ----------
    app.use((erro, req, res, next) => {
        if (erro && erro.type === 'entity.too.large') return falha(res, 413, 'too_large', 'Dados grandes demais.');
        if (erro && erro.type === 'entity.parse.failed') return falha(res, 400, 'bad_json', 'Requisição inválida.');
        console.error('Erro não tratado:', erro);
        falha(res, 500, 'server_error', 'Erro interno do servidor.');
    });

    return app;
}


// =======================================================
// PASTA DE DADOS (modo JSON)
// Fica FORA da pasta do projeto por padrão: assim nenhuma ferramenta que vigia o projeto
// (Live Server, nodemon, node --watch, antivírus) reage a cada mensagem gravada.
// =======================================================
function prepararPastaDeDados() {
    const pasta = process.env.DATA_DIR || (IS_PROD ? __dirname : path.join(os.homedir(), 'ductor-ai-dados'));
    fs.mkdirSync(pasta, { recursive: true });

    // Traz para a nova pasta o que já existia dentro do projeto (sem sobrescrever nada)
    if (path.resolve(pasta) !== path.resolve(__dirname)) {
        const usuariosAntigos = path.join(__dirname, 'usuarios.json');
        const usuariosNovos = path.join(pasta, 'usuarios.json');
        if (fs.existsSync(usuariosAntigos) && !fs.existsSync(usuariosNovos)) {
            fs.copyFileSync(usuariosAntigos, usuariosNovos);
            console.log(`📦 usuarios.json copiado para ${pasta}`);
        }
        const dadosAntigos = path.join(__dirname, 'dados_usuarios');
        const dadosNovos = path.join(pasta, 'dados_usuarios');
        if (fs.existsSync(dadosAntigos) && !fs.existsSync(dadosNovos)) {
            fs.cpSync(dadosAntigos, dadosNovos, { recursive: true });
            console.log(`📦 dados_usuarios copiado para ${pasta}`);
        }
    }
    return pasta;
}

// =======================================================
// INICIALIZAÇÃO
// =======================================================
async function iniciar() {
    console.log('🚀 Inicializando o servidor da Ductor AI...');
    const pastaDados = prepararPastaDeDados();
    const storage = criarStorage(pastaDados, { legacyDir: __dirname });
    await storage.iniciar();
    console.log(`💾 Armazenamento: ${storage.tipo === 'postgres' ? 'PostgreSQL' : 'arquivos JSON em ' + pastaDados}`);
    if (IS_PROD && storage.tipo === 'json') {
        console.warn('⚠️  Produção com arquivos JSON: em hospedagem gratuita os dados SERÃO APAGADOS a cada reinício. Configure DATABASE_URL.');
    }

    const emailer = await criarEmailer();
    const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;
    if (!groq) console.error('❌ GROQ_API_KEY não definida: o chat com a IA não vai funcionar.');

    const app = criarApp({ storage, emailer, groq });
    const porta = process.env.PORT || 3001;
    const servidor = app.listen(porta, () => console.log(`🧠 Ductor AI no ar: http://localhost:${porta}`));

    const encerrar = () => {
        console.log('Encerrando o servidor...');
        servidor.close(() => process.exit(0));
        setTimeout(() => process.exit(0), 8000).unref();
    };
    process.on('SIGTERM', encerrar);
    process.on('SIGINT', encerrar);
}

if (require.main === module) {
    iniciar().catch(erro => {
        console.error('Falha ao iniciar o servidor:', erro);
        process.exit(1);
    });
}

module.exports = { prepararPastaDeDados, criarApp, mensagemDeRisco, sanitizarResposta, montarEmailRecuperacao };
