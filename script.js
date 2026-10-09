/**
 * =========================================================================
 * DUCTOR AI - PAINEL DO ALUNO
 * Chat, histórico, perfil (com recorte de foto), temas, idiomas e sessão.
 * Todos os dados do aluno ficam no servidor, ligados à conta dele.
 * =========================================================================
 */
const { t, tErro } = window.i18n;

// ==========================================
// 1. SESSÃO PROTEGIDA
// ==========================================
const API_BASE = window.API_BASE;
const BACKEND_API_URL = `${API_BASE}/chat`;

// Sem token = sem acesso: volta para o login
if (!localStorage.getItem('authToken')) {
    window.location.replace('login.html');
}

function encerrarSessaoLocal() {
    ['authToken', 'userName', 'userEmail'].forEach(chave => localStorage.removeItem(chave));
    sessionStorage.removeItem('ductorChatAtual');
    window.location.replace('login.html');
}

// fetch que sempre envia o token; se o servidor disser que a sessão é inválida, desloga
async function authFetch(url, options = {}) {
    const resposta = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
    });
    if (resposta.status === 401) {
        encerrarSessaoLocal();
        throw new Error('session_expired');
    }
    return resposta;
}

// ==========================================
// 2. ELEMENTOS DA TELA
// ==========================================
const $ = (id) => document.getElementById(id);

const chatForm = $('chat-form');
const userInput = $('user-input');
const chatMessages = $('chat-messages');
const sendBtn = $('send-btn');
const newChatBtn = $('new-chat-btn');
const logoutBtn = $('logout-btn');
const historyList = $('chat-history-list');
const sidebar = $('sidebar');
const sidebarBackdrop = $('sidebar-backdrop');

const settingsModal = $('settings-modal');
const profileModal = $('profile-modal');
const themeSelector = $('theme-selector');
const fontSizeSelector = $('font-size-selector');
const languageSelector = $('language-selector');

const displayNomeSidebar = $('user-display-name');
const displayNomeModal = $('modal-profile-name');
const avatarSidebar = $('profile-avatar');
const avatarModal = $('modal-profile-avatar');
const fileInput = $('avatar-upload-input');
const removePhotoBtn = $('remove-photo-btn');

// ==========================================
// 3. ESTADO DO USUÁRIO + SALVAMENTO NO SERVIDOR
// ==========================================
const estadoUsuario = {
    carregado: false, // só vira true depois de baixar os dados; evita sobrescrever dados reais por engano
    chats: [],
    settings: { theme: 'dark', fontSize: 'normal', language: null },
    avatar: null
};
let chatAtualId = null;
let aguardandoResposta = false;

// Fila: garante que os salvamentos cheguem ao servidor na mesma ordem em que foram feitos
let filaDeSalvamento = Promise.resolve();
function salvarNoServidor(parcial) {
    filaDeSalvamento = filaDeSalvamento
        .then(() => authFetch(`${API_BASE}/me/data`, { method: 'PUT', body: JSON.stringify(parcial) }))
        .then(resposta => {
            if (!resposta.ok) {
                console.error('Falha ao salvar dados:', resposta.status);
                mostrarToast(t('sync.error'), 'error');
            }
        })
        .catch(erro => {
            if (erro.message === 'session_expired') return;
            console.error('Erro ao salvar dados:', erro);
            mostrarToast(t('sync.error'), 'error');
        });
    return filaDeSalvamento;
}

// ==========================================
// 4. COMPONENTES: AVISO (TOAST) E CONFIRMAÇÃO
// ==========================================
function mostrarToast(texto, tipo = 'info') {
    const caixa = $('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${tipo}`;
    el.textContent = texto;
    caixa.appendChild(el);
    setTimeout(() => el.remove(), 4500);
}

function confirmar(texto) {
    return new Promise((resolve) => {
        const modal = $('confirm-modal');
        $('confirm-text').textContent = texto;
        modal.classList.add('open');
        $('confirm-cancel').focus();

        const encerrar = (resultado) => {
            modal.classList.remove('open');
            $('confirm-ok').removeEventListener('click', ok);
            $('confirm-cancel').removeEventListener('click', cancelar);
            modal.removeEventListener('click', fora);
            document.removeEventListener('keydown', tecla);
            resolve(resultado);
        };
        const ok = () => encerrar(true);
        const cancelar = () => encerrar(false);
        const fora = (e) => { if (e.target === modal) encerrar(false); };
        const tecla = (e) => { if (e.key === 'Escape') encerrar(false); };

        $('confirm-ok').addEventListener('click', ok);
        $('confirm-cancel').addEventListener('click', cancelar);
        modal.addEventListener('click', fora);
        document.addEventListener('keydown', tecla);
    });
}

// ==========================================
// 5. CAIXA DE TEXTO
// ==========================================
userInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 160) + 'px';
});

userInput.addEventListener('keydown', function (event) {
    // Enter envia, Shift+Enter quebra linha (ignora Enter de teclados com composição, como japonês)
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        chatForm.requestSubmit();
    }
});

// ==========================================
// 6. FORMATAÇÃO E EFEITO DE DIGITAÇÃO
// ==========================================
function escapeHtml(texto) {
    return String(texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// Sempre escapa o HTML primeiro: texto da IA ou do aluno nunca vira código executável
function parseMarkdown(text) {
    return escapeHtml(text)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/`([^`\n]+)`/g, '<code>$1</code>')
        .replace(/^[ \t]*[*-] /gm, '• ')
        .replace(/\n/g, '<br>')
        .trim();
}

const prefereMenosMovimento = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function streamResponseEffect(element, text, speed = 20) {
    if (prefereMenosMovimento) {
        element.innerHTML = parseMarkdown(text);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return Promise.resolve();
    }
    element.innerHTML = '';
    const words = text.split(' ');
    let i = 0;
    let acumulado = '';

    return new Promise((resolve) => {
        const intervalo = setInterval(() => {
            if (i < words.length) {
                acumulado += (i === 0 ? '' : ' ') + words[i];
                element.innerHTML = parseMarkdown(acumulado);
                chatMessages.scrollTop = chatMessages.scrollHeight;
                i++;
            } else {
                clearInterval(intervalo);
                resolve();
            }
        }, speed);
    });
}

function criarBalao(tipo, classeExtra) {
    const div = document.createElement('div');
    div.classList.add('message', tipo === 'user' ? 'user-message' : 'ia-message');
    if (classeExtra) div.classList.add(classeExtra);
    chatMessages.appendChild(div);
    return div;
}

// ==========================================
// 7. DETECÇÃO DE INTENÇÃO (MODO CERTO PARA CADA ASSUNTO)
// ==========================================
// Termos com "*" no fim valem como início de palavra; sem "*", só a palavra inteira.
// (Assim "contexto" não é confundido com "texto", nem "ventilador" com "vent".)
const montarRegex = (termos) => new RegExp(
    termos.map(x => x.endsWith('*') ? `\\b${x.slice(0, -1)}\\w*` : `\\b${x}\\b`).join('|'), 'i'
);

const REGEX_ACADEMICO = montarRegex([
    'plagio*', 'artigo*', 'tcc', 'paragrafo*', 'texto*', 'academ*', 'faculdade', 'referencia*', 'citacao', 'citacoes', 'resumo*',
    'plagiarism', 'essay*', 'paper*', 'thesis', 'citation*', 'summar*', 'reference*',
    'ensayo*', 'tesis', 'cita', 'citas', 'resumen'
]);

const REGEX_EMOCIONAL = montarRegex([
    'triste*', 'ansios*', 'ansiedade', 'sobrecarregad*', 'desabaf*', 'cansad*', 'burnout', 'estressad*', 'pressao',
    'sentimento*', 'emocional', 'depress*', 'chorar', 'me sinto mal',
    'sad', 'anxious', 'anxiety', 'overwhelm*', 'tired', 'stressed', 'pressure', 'feelings', 'crying',
    'agobiad*', 'estresad*', 'presion', 'sentimientos', 'desahog*', 'llorar', 'ansiedad'
]);

// Situação de risco: NUNCA bloqueia nem pede para trocar de modo; vai direto para a IA / CVV
const REGEX_RISCO = new RegExp([
    'suicid', 'me matar', 'quero morrer', 'vou me matar', 'acabar com (a )?(minha )?vida', 'tirar (a )?minha vida',
    'automutila', 'me cortar', 'me machucar', 'nao quero (mais )?viver', 'nao aguento mais viver',
    'kill myself', 'want to die', 'end my life', 'self[- ]?harm', 'hurt myself', "don'?t want to live",
    'quiero morir', 'quitarme la vida', 'matarme', 'hacerme dano', 'no quiero vivir'
].join('|'), 'i');

const semAcentos = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// ==========================================
// 8. HISTÓRICO DE CHATS (EM MEMÓRIA + SERVIDOR)
// ==========================================
function chatAtual() {
    return estadoUsuario.chats.find(c => c.id === chatAtualId) || null;
}

function salvarChats(chats) {
    estadoUsuario.chats = chats;
    salvarNoServidor({ chats });
}

function registrarMensagem(remetente, texto) {
    const chats = estadoUsuario.chats.slice();

    if (!chatAtualId) {
        chatAtualId = 'chat_' + Date.now();
        sessionStorage.setItem('ductorChatAtual', chatAtualId);
        chats.push({
            id: chatAtualId,
            title: texto.length > 22 ? texto.substring(0, 22) + '...' : texto,
            messages: [{ sender: remetente, text: texto }]
        });
    } else {
        const i = chats.findIndex(c => c.id === chatAtualId);
        if (i !== -1) {
            chats[i] = { ...chats[i], messages: [...chats[i].messages, { sender: remetente, text: texto }] };
        }
    }
    salvarChats(chats);
    renderizarSidebar();
}

function renderizarSidebar() {
    historyList.innerHTML = '';

    if (estadoUsuario.chats.length === 0) {
        const vazio = document.createElement('li');
        vazio.className = 'history-item empty-history';
        vazio.style.cssText = 'opacity: 0.6; pointer-events: none; font-size: 0.85rem;';
        vazio.innerHTML = '<i class="fa-solid fa-folder-open"></i> ';
        const span = document.createElement('span');
        span.textContent = t('chat.empty_history');
        vazio.appendChild(span);
        historyList.appendChild(vazio);
        return;
    }

    estadoUsuario.chats.slice().reverse().forEach(chat => {
        const li = document.createElement('li');
        li.className = `history-item ${chat.id === chatAtualId ? 'active' : ''}`;
        li.dataset.id = chat.id;

        const icone = document.createElement('i');
        icone.className = 'fa-regular fa-message';

        const titulo = document.createElement('span');
        titulo.className = 'history-title';
        titulo.textContent = chat.title; // textContent: título nunca vira HTML

        const btnApagar = document.createElement('button');
        btnApagar.type = 'button';
        btnApagar.className = 'delete-chat-btn';
        btnApagar.title = t('chat.delete_title');
        btnApagar.setAttribute('aria-label', t('chat.delete_title'));
        btnApagar.innerHTML = '<i class="fa-solid fa-trash"></i>';
        btnApagar.addEventListener('click', (e) => {
            e.stopPropagation();
            apagarChat(chat.id);
        });

        li.append(icone, titulo, btnApagar);
        li.addEventListener('click', () => { carregarChat(chat.id); fecharMenu(); });
        historyList.appendChild(li);
    });
}

function carregarChat(id) {
    const chat = estadoUsuario.chats.find(c => c.id === id);
    if (!chat) return;
    chatAtualId = id;
    sessionStorage.setItem('ductorChatAtual', id);

    chatMessages.innerHTML = '';
    chat.messages.forEach(msg => {
        const balao = criarBalao(msg.sender === 'user' ? 'user' : 'ia');
        balao.innerHTML = parseMarkdown(msg.text);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
    renderizarSidebar();
}

function novoChat() {
    chatAtualId = null;
    sessionStorage.removeItem('ductorChatAtual');
    chatMessages.innerHTML = '';
    const aviso = criarBalao('ia', 'system-notice');
    aviso.dataset.i18n = 'chat.reset';
    aviso.textContent = t('chat.reset');
    userInput.value = '';
    userInput.style.height = 'auto';
    userInput.focus();
    renderizarSidebar();
}

async function apagarChat(id) {
    if (!(await confirmar(t('chat.delete_confirm')))) return;
    salvarChats(estadoUsuario.chats.filter(c => c.id !== id));
    if (id === chatAtualId) novoChat();
    else renderizarSidebar();
}

newChatBtn.addEventListener('click', () => { novoChat(); fecharMenu(); });

// ==========================================
// 9. ENVIO DE MENSAGENS
// ==========================================
chatForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const messageText = userInput.value.trim();
    if (messageText === '' || aguardandoResposta) return;
    if (!estadoUsuario.carregado) return; // só conversa depois de carregar os dados do servidor

    const currentMode = $('current-ai-mode').value;
    const texto = semAcentos(messageText);
    const emRisco = REGEX_RISCO.test(texto);

    const limparCampo = () => { userInput.value = ''; userInput.style.height = 'auto'; };

    // Avisos de modo (não se aplicam a situações de risco: nesses casos a IA sempre responde)
    if (!emRisco) {
        let aviso = null;
        if (currentMode === 'emotional' && REGEX_ACADEMICO.test(texto)) aviso = t('warn.academic_in_emotional');
        if (currentMode === 'academic' && REGEX_EMOCIONAL.test(texto)) aviso = t('warn.emotional_in_academic');

        if (aviso) {
            const avisoDiv = criarBalao('ia', 'system-notice');
            limparCampo();
            chatMessages.scrollTop = chatMessages.scrollHeight;
            await streamResponseEffect(avisoDiv, aviso, 20);
            return;
        }
    }

    // Histórico enviado à IA = mensagens salvas deste chat (texto original, sem perder quebras de linha)
    const historico = (chatAtual() ? chatAtual().messages : []).map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
    }));

    // Mensagem do aluno
    const userDiv = criarBalao('user');
    userDiv.textContent = messageText;
    limparCampo();
    registrarMensagem('user', messageText);

    // Balão da IA
    const iaDiv = criarBalao('ia');
    iaDiv.textContent = t('chat.thinking');
    chatMessages.scrollTop = chatMessages.scrollHeight;

    aguardandoResposta = true;
    sendBtn.disabled = true;

    try {
        const response = await authFetch(BACKEND_API_URL, {
            method: 'POST',
            body: JSON.stringify({
                message: messageText,
                history: historico,
                mode: currentMode,
                language: window.i18n.idioma()
            })
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.response) {
            await streamResponseEffect(iaDiv, `⚠️ ${tErro(data)}`, 15);
            return;
        }

        await streamResponseEffect(iaDiv, data.response, 20);
        registrarMensagem('ia', data.response);

    } catch (erro) {
        if (erro.message === 'session_expired') return;
        console.error('Erro na comunicação com o servidor:', erro);
        await streamResponseEffect(iaDiv, t('chat.conn_error'), 15);
    } finally {
        aguardandoResposta = false;
        sendBtn.disabled = !estadoUsuario.carregado;
        userInput.focus();
    }
});

// ==========================================
// 10. MODOS DA IA (ACADÊMICO / EMOCIONAL)
// ==========================================
function selecionarModo(modo) {
    $('current-ai-mode').value = modo;
    $('mode-academic').classList.toggle('active', modo === 'academic');
    $('mode-emotional').classList.toggle('active', modo === 'emotional');
}
$('mode-academic').addEventListener('click', () => selecionarModo('academic'));
$('mode-emotional').addEventListener('click', () => selecionarModo('emotional'));

// ==========================================
// 11. MODAIS, MENU LATERAL (CELULAR) E ATALHOS
// ==========================================
const abrirModal = (m) => { m.classList.add('open'); };
const fecharModal = (m) => { m.classList.remove('open'); };

$('settings-btn').addEventListener('click', () => abrirModal(settingsModal));
$('close-settings-btn').addEventListener('click', () => fecharModal(settingsModal));
$('profile-btn').addEventListener('click', () => { atualizarBotaoRemoverFoto(); abrirModal(profileModal); });
$('close-profile-btn').addEventListener('click', () => fecharModal(profileModal));

[settingsModal, profileModal].forEach(m => m.addEventListener('click', (e) => { if (e.target === m) fecharModal(m); }));

document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if ($('crop-modal').classList.contains('open') || $('confirm-modal').classList.contains('open')) return; // esses têm o próprio Esc
    fecharModal(settingsModal);
    fecharModal(profileModal);
    fecharMenu();
});

function abrirMenu() { sidebar.classList.add('open'); sidebarBackdrop.classList.add('show'); }
function fecharMenu() { sidebar.classList.remove('open'); sidebarBackdrop.classList.remove('show'); }
$('menu-toggle').addEventListener('click', () => (sidebar.classList.contains('open') ? fecharMenu() : abrirMenu()));
sidebarBackdrop.addEventListener('click', fecharMenu);

logoutBtn.addEventListener('click', encerrarSessaoLocal);

// ==========================================
// 12. PREFERÊNCIAS (TEMA, FONTE, IDIOMA) - SALVAS POR USUÁRIO
// ==========================================
function aplicarConfiguracoes(config) {
    document.body.classList.toggle('light-theme', config.theme === 'light');
    document.body.classList.toggle('font-large', config.fontSize === 'large');
    themeSelector.value = config.theme;
    fontSizeSelector.value = config.fontSize;
    if (config.language) languageSelector.value = config.language;
}

function alterouPreferencia() {
    aplicarConfiguracoes(estadoUsuario.settings);
    salvarNoServidor({ settings: estadoUsuario.settings });
}

themeSelector.addEventListener('change', () => {
    estadoUsuario.settings.theme = themeSelector.value === 'light' ? 'light' : 'dark';
    alterouPreferencia();
});

fontSizeSelector.addEventListener('change', () => {
    estadoUsuario.settings.fontSize = fontSizeSelector.value === 'large' ? 'large' : 'normal';
    alterouPreferencia();
});

languageSelector.addEventListener('change', () => {
    const novo = languageSelector.value;
    estadoUsuario.settings.language = novo;
    window.i18n.definirIdioma(novo); // traduz a tela na hora
    alterouPreferencia();
});

// Ao trocar o idioma, refaz os textos montados por código
document.addEventListener('idioma-alterado', () => {
    renderizarSidebar();
    if (!estadoUsuario.carregado) return;
    const nome = localStorage.getItem('userName');
    if (nome) displayNomeSidebar.textContent = nome.trim().split(' ')[0];
});

// ==========================================
// 13. FOTO DE PERFIL (COM RECORTE E PRÉ-VISUALIZAÇÃO)
// ==========================================
function aplicarFotoPerfil(src) {
    [avatarSidebar, avatarModal].forEach(el => {
        el.textContent = '';
        if (!src) {
            el.textContent = '👤';
            return;
        }
        const img = document.createElement('img');
        img.src = src;
        img.alt = '';
        img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block;';
        el.appendChild(img);
    });
    atualizarBotaoRemoverFoto();
}

function atualizarBotaoRemoverFoto() {
    removePhotoBtn.hidden = !estadoUsuario.avatar;
}

const escolherFoto = () => fileInput.click();
avatarModal.addEventListener('click', escolherFoto);
$('change-photo-text').addEventListener('click', escolherFoto);

fileInput.addEventListener('change', async (event) => {
    const arquivo = event.target.files[0];
    fileInput.value = ''; // permite escolher a mesma foto outra vez
    if (!arquivo || !estadoUsuario.carregado) return;

    try {
        const foto = await window.abrirCropper(arquivo); // abre o recorte; null = cancelou
        if (!foto) return;
        estadoUsuario.avatar = foto;
        aplicarFotoPerfil(foto);
        salvarNoServidor({ avatar: foto });
    } catch (erro) {
        mostrarToast(t(erro.i18nKey || 'crop.error'), 'error');
    }
});

removePhotoBtn.addEventListener('click', () => {
    estadoUsuario.avatar = null;
    aplicarFotoPerfil(null);
    salvarNoServidor({ avatar: null });
});

// ==========================================
// 14. INICIALIZAÇÃO: BAIXA OS DADOS DESTE USUÁRIO
// ==========================================
async function iniciarApp() {
    sendBtn.disabled = true;
    try {
        const resposta = await authFetch(`${API_BASE}/me/data`);
        if (!resposta.ok) throw new Error(`Erro ${resposta.status}`);
        const dados = await resposta.json();

        estadoUsuario.chats = Array.isArray(dados.chats) ? dados.chats : [];
        estadoUsuario.avatar = dados.avatar || null;
        estadoUsuario.settings = {
            theme: dados.settings && dados.settings.theme === 'light' ? 'light' : 'dark',
            fontSize: dados.settings && dados.settings.fontSize === 'large' ? 'large' : 'normal',
            language: dados.settings && window.i18n.IDIOMAS.includes(dados.settings.language) ? dados.settings.language : null
        };
        estadoUsuario.carregado = true;

        localStorage.setItem('userName', dados.name);
        localStorage.setItem('userEmail', dados.email);
        displayNomeSidebar.textContent = dados.name.trim().split(' ')[0];
        displayNomeModal.textContent = dados.name;

        // Conta nova (sem idioma salvo): usa o idioma que a pessoa já estava vendo e grava
        if (estadoUsuario.settings.language) {
            window.i18n.definirIdioma(estadoUsuario.settings.language);
        } else {
            estadoUsuario.settings.language = window.i18n.idioma();
            salvarNoServidor({ settings: estadoUsuario.settings });
        }

        aplicarConfiguracoes(estadoUsuario.settings);
        aplicarFotoPerfil(estadoUsuario.avatar);
        renderizarSidebar();
        sendBtn.disabled = false;

        // Se a página recarregou no meio de uma conversa, volta para o mesmo chat (em vez de abrir um novo)
        const chatSalvo = sessionStorage.getItem('ductorChatAtual');
        if (chatSalvo && estadoUsuario.chats.some(c => c.id === chatSalvo)) carregarChat(chatSalvo);
    } catch (erro) {
        if (erro.message === 'session_expired') return;
        console.error('Erro ao carregar os dados do usuário:', erro);
        displayNomeSidebar.textContent = t('sidebar.offline');
        const aviso = criarBalao('ia', 'system-notice');
        aviso.textContent = t('chat.load_error');
    }
}

iniciarApp();
