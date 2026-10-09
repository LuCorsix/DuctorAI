/**
 * TELA DE LOGIN / CADASTRO / RECUPERAÇÃO DE SENHA
 */
const { t, tErro } = window.i18n;

const boxes = {
    login: document.getElementById('box-login'),
    register: document.getElementById('box-register'),
    recover: document.getElementById('box-recover')
};

// ---------- mensagens dentro do formulário (no lugar de alert) ----------
function mostrarMsg(form, texto, tipo = 'error') {
    const el = form.querySelector('.form-msg');
    if (!el) return;
    el.textContent = texto;
    el.className = `form-msg ${tipo}`;
    el.hidden = false;
}

function limparMsgs() {
    document.querySelectorAll('.form-msg').forEach(el => { el.hidden = true; el.textContent = ''; });
}

function trocarTela(nome, aviso) {
    limparMsgs();
    Object.values(boxes).forEach(b => b.classList.remove('active'));
    boxes[nome].classList.add('active');
    if (aviso) mostrarMsg(boxes[nome].querySelector('form'), aviso.texto, aviso.tipo);
}

document.getElementById('go-to-register').addEventListener('click', (e) => { e.preventDefault(); trocarTela('register'); });
document.getElementById('go-to-recover').addEventListener('click', (e) => { e.preventDefault(); resetarRecuperacao(); trocarTela('recover'); });
document.querySelectorAll('.go-to-login').forEach(a => a.addEventListener('click', (e) => { e.preventDefault(); trocarTela('login'); }));

// ---------- idioma ----------
document.querySelectorAll('[data-lang-select]').forEach(sel => {
    sel.addEventListener('change', () => window.i18n.definirIdioma(sel.value));
});

// ---------- olhinho da senha ----------
document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
        const campo = document.getElementById(btn.dataset.target);
        const escondida = campo.type === 'password';
        campo.type = escondida ? 'text' : 'password';
        btn.classList.toggle('visible', escondida);
        const icone = btn.querySelector('i');
        icone.classList.toggle('fa-eye', !escondida);
        icone.classList.toggle('fa-eye-slash', escondida);
    });
});

// ---------- chamada à API com tratamento de erro padrão ----------
async function chamarApi(caminho, corpo) {
    const resposta = await fetch(`${window.API_BASE}${caminho}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo)
    });
    const dados = await resposta.json().catch(() => ({}));
    return { ok: resposta.ok && dados.success, dados };
}

// Desativa o botão durante o envio (evita cliques duplos) e restaura o texto no final
async function comBotaoOcupado(form, textoOcupado, acao) {
    const botao = form.querySelector('button[type="submit"]');
    const textoOriginal = botao.textContent;
    botao.disabled = true;
    if (textoOcupado) botao.textContent = textoOcupado;
    try {
        await acao();
    } catch (erro) {
        mostrarMsg(form, t('net.error'));
    } finally {
        botao.disabled = false;
        botao.textContent = textoOriginal;
    }
}

// ---------- LOGIN ----------
document.getElementById('form-login').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    limparMsgs();

    if (!email || !password) return mostrarMsg(form, t('err.missing_fields'));

    comBotaoOcupado(form, '...', async () => {
        const { ok, dados } = await chamarApi('/login', { email, password });
        if (!ok) return mostrarMsg(form, tErro(dados));

        localStorage.setItem('authToken', dados.token);
        localStorage.setItem('userName', dados.name);
        localStorage.setItem('userEmail', dados.email);
        window.location.href = 'index.html';
    });
});

// ---------- CADASTRO ----------
document.getElementById('form-cadastro').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    limparMsgs();

    if (!name || !email || !password) return mostrarMsg(form, t('err.missing_fields'));
    if (password.length < 8) return mostrarMsg(form, t('err.weak_password'));

    comBotaoOcupado(form, '...', async () => {
        const { ok, dados } = await chamarApi('/register', { name, email, password });
        if (!ok) return mostrarMsg(form, tErro(dados));

        form.reset();
        document.getElementById('login-email').value = email;
        trocarTela('login', { texto: t('reg.success'), tipo: 'success' });
    });
});

// ---------- RECUPERAÇÃO DE SENHA (2 etapas) ----------
const passo1 = document.getElementById('recover-step-1');
const passo2 = document.getElementById('recover-step-2');
let emailEmRecuperacao = '';

function resetarRecuperacao() {
    emailEmRecuperacao = '';
    passo1.hidden = false;
    passo2.hidden = true;
    document.getElementById('form-recuperar-email').reset();
    document.getElementById('form-recuperar-confirmar').reset();
}

document.getElementById('form-recuperar-email').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    const email = document.getElementById('recover-email').value.trim();
    limparMsgs();
    if (!email) return mostrarMsg(form, t('err.missing_fields'));

    comBotaoOcupado(form, t('rec.sending'), async () => {
        const { ok, dados } = await chamarApi('/recover-request', { email, language: window.i18n.idioma() });
        if (!ok) return mostrarMsg(form, tErro(dados));

        emailEmRecuperacao = email;
        passo1.hidden = true;
        passo2.hidden = false;
        mostrarMsg(document.getElementById('form-recuperar-confirmar'), t('rec.sent'), 'success');
        document.getElementById('recover-code').focus();
    });
});

document.getElementById('form-recuperar-confirmar').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    const codigo = document.getElementById('recover-code').value.trim();
    const newPassword = document.getElementById('recover-new-password').value;
    limparMsgs();

    if (!codigo || !newPassword) return mostrarMsg(form, t('err.missing_fields'));
    if (newPassword.length < 8) return mostrarMsg(form, t('err.weak_password'));

    comBotaoOcupado(form, '...', async () => {
        const { ok, dados } = await chamarApi('/recover-confirm', { email: emailEmRecuperacao, codigo, newPassword });
        if (!ok) {
            // código queimado ou expirado: volta para pedir outro
            if (dados.code === 'code_burned' || dados.code === 'code_expired') {
                resetarRecuperacao();
                trocarTela('recover', { texto: tErro(dados), tipo: 'error' });
                return;
            }
            return mostrarMsg(form, tErro(dados));
        }

        const email = emailEmRecuperacao;
        resetarRecuperacao();
        document.getElementById('login-email').value = email;
        trocarTela('login', { texto: t('rec.done'), tipo: 'success' });
    });
});

// só dígitos no campo do código
document.getElementById('recover-code').addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
});
