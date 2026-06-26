/**
 * =========================================================================
 * DUCTOR AI - MOTOR DE INTEGRAÇÃO INTEGRAL E GERENCIAMENTO DO PAINEL
 * Modo Capricho Ativado: Estrutura 100% Completa, Expandida e Comentada.
 * Suporta Conexão Real (Porta 3001) + Formatador de Respostas Espaçadas.
 * =========================================================================
 */

// ==========================================
// 1. CONFIGURAÇÕES GERAIS DO SISTEMA
// ==========================================
// Alinhado perfeitamente na porta 3001 do seu ecossistema Node.js
const BACKEND_API_URL = 'http://localhost:3001/api/chat'; 


// ==========================================
// 2. MAPEAMENTO DE ELEMENTOS DO DOM
// ==========================================
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const chatMessages = document.getElementById('chat-messages');
const sendBtn = document.getElementById('send-btn');

// Elementos de Modais
const settingsModal = document.getElementById('settings-modal');
const profileModal = document.getElementById('profile-modal');

// Botões de Controle de Modais
const settingsBtn = document.getElementById('settings-btn');
const profileBtn = document.getElementById('profile-btn');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const closeProfileBtn = document.getElementById('close-profile-btn');

// Seletores de Preferências do Aluno
const themeSelector = document.getElementById('theme-selector');
const fontSizeSelector = document.getElementById('font-size-selector');

// Outros Controles da Interface Lateral
const newChatBtn = document.getElementById('new-chat-btn');
const logoutBtn = document.getElementById('logout-btn');


// ==========================================
// 3. SISTEMA DE STREAMING COM FORMATADOR ACADÊMICO
// ==========================================
/**
 * Renderiza o texto recebido respeitando parágrafos, negritos e listas da IA.
 * @param {HTMLElement} element - O container do balão de mensagem da IA.
 * @param {string} text - O texto cru vindo do Gemini/Backend.
 * @param {number} speed - Velocidade da digitação.
 */
function streamResponseEffect(element, text, speed = 25) {
    
    // --- PARSER DE MARKDOWN INTEGRADO ---
    // Prepara o texto processando as quebras de linha e marcações antes de fatiar em palavras
    const formattedText = text
        .replace(/\n\n/g, ' <br><br> ')                          // Transforma parágrafos duplos em espaçamentos reais
        .replace(/\n/g, ' <br> ')                               // Transforma quebras simples em saltos de linha
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')      // Transforma **texto** em Negrito de verdade
        .replace(/\* /g, '• ')                                 // Transforma marcadores de lista em tópicos limpos
        .trim();

    // Divide o texto por espaços, mas preserva as tags HTML intactas
    const words = formattedText.split(/ +/);
    let wordIndex = 0;
    element.innerHTML = '';

    return new Promise((resolve) => {
        const interval = setInterval(() => {
            if (wordIndex < words.length) {
                element.innerHTML += words[wordIndex] + ' ';
                chatMessages.scrollTop = chatMessages.scrollHeight;
                wordIndex++;
            } else {
                clearInterval(interval);
                resolve();
            }
        }, speed);
    });
}


// ==========================================
// 4. MOTOR DE PROCESSAMENTO DE MENSAGENS (ASYNC)
// ==========================================
chatForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const messageText = userInput.value.trim();

    if (messageText === '') {
        return;
    }

    // 📍 [NOVO] FILTRO DE VALIDAÇÃO DE INTENÇÃO (ACADÊMICO VS EMOCIONAL)
    const currentMode = document.getElementById('current-ai-mode').value;
    const termosAcademicos = ['plagio', 'plágio', 'artigo', 'tcc', 'paragrafo', 'texto', 'academico', 'faculdade', 'referencia', 'citacao', 'resumo'];
    const termosEmocionais = ['triste', 'ansioso', 'ansiedade', 'sobrecarregado', 'desabafo', 'mal', 'cansado', 'burnout', 'estressado', 'pressao', 'sentimento', 'emocional'];
    
    // Deixa o texto limpo (sem acentos e minúsculo) para evitar que o aluno drible o filtro
    const textoMinusculo = messageText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // Caso A: Está no modo Emocional, mas digitou algo Acadêmico
    if (currentMode === 'emotional' && termosAcademicos.some(termo => textoMinusculo.includes(termo))) {
        const avisoDiv = document.createElement('div');
        avisoDiv.classList.add('message', 'ia-message');
        chatMessages.appendChild(avisoDiv);
        userInput.value = '';
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Usa o seu efeito de digitação real para dar o aviso
        await streamResponseEffect(avisoDiv, '⚠️ **Aviso do Guia:** Identifiquei que sua dúvida é de cunho acadêmico. Para que eu possa analisar textos, verificar plágios ou ajudar nos seus estudos com total rigor, por favor, **selecione a opção "Rigor Acadêmico"** logo abaixo.', 20);
        return; // Para o código aqui e impede o envio para o servidor/fallback
    }

    // Caso B: Está no modo Acadêmico, mas digitou algo Emocional
    if (currentMode === 'academic' && termosEmocionais.some(termo => textoMinusculo.includes(termo))) {
        const avisoDiv = document.createElement('div');
        avisoDiv.classList.add('message', 'ia-message');
        chatMessages.appendChild(avisoDiv);
        userInput.value = '';
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Usa o seu efeito de digitação real para dar o aviso
        await streamResponseEffect(avisoDiv, '⚠️ **Aviso do Guia:** Sinto que você precisa de um espaço para desabafar ou falar sobre a pressão dos estudos. Para conversarmos sobre seus sentimentos e organizarmos sua mente de forma acolhedora, **selecione a opção "Suporte Emocional"** logo abaixo.', 20);
        return; // Para o código aqui e impede o envio para o servidor/fallback
    }
    // 📍 FIM DO FILTRO DE VALIDAÇÃO

    // --- PASSO A: INJETAR MENSAGEM DO USUÁRIO NA TELA ---
    const userMessageDiv = document.createElement('div');
    userMessageDiv.classList.add('message', 'user-message');
    userMessageDiv.textContent = messageText;
    chatMessages.appendChild(userMessageDiv);
    
    userInput.value = '';
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // GATILHO DO HISTÓRICO: Salva a pergunta do Aluno na barra lateral
    if (window.salvarInteracaoNoHistorico) {
        window.salvarInteracaoNoHistorico('user', messageText);
    }

   // --- PASSO B: CRIAR BALÃO DE CARREGAMENTO DA IA ---
    const iaMessageDiv = document.createElement('div');
    iaMessageDiv.classList.add('message', 'ia-message');
    iaMessageDiv.textContent = 'Ductor AI está processando sua solicitação...';
    chatMessages.appendChild(iaMessageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    sendBtn.disabled = true;

        // ─── 🧠 [CORRIGIDO PARA GROQ] CAPTURA DA MEMÓRIA DO CHAT ───
    const divMensagens = chatMessages.querySelectorAll('.message');
    const chatHistory = [];
    
    divMensagens.forEach(div => {
        if (div === iaMessageDiv || div === userMessageDiv) return;
        
        if (div.classList.contains('user-message')) {
            // Padrão Groq: role 'user' e texto em 'content'
            chatHistory.push({ role: 'user', content: div.textContent.trim() });
        } else if (div.classList.contains('ia-message')) {
            if (div.textContent.includes('Área de conversação reiniciada') || div.textContent.includes('⚠️')) return;
            // Padrão Groq: role 'assistant' e texto em 'content'
            chatHistory.push({ role: 'assistant', content: div.textContent.trim() });
        }
    });
    // ───────────────────────────────────────────────────────────

    // --- PASSO C: REQUISIÇÃO PARA O BACKEND COM MEMÓRIA INTEGRADA ---
    try {
        const response = await fetch(BACKEND_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                message: messageText,
                history: chatHistory, // 👈 Enviando todo o histórico do chat aqui!
                studentName: localStorage.getItem('userName') || "Estudante",
                timestamp: new Date().toISOString()
            })
        });
        if (response.ok) {
            const data = await response.json();
            const realAiText = data.response || data.text || data.message || data.conteudo;
            
            // Renderiza com espaçamento profissional e negritos interpretados
            await streamResponseEffect(iaMessageDiv, realAiText, 25);
            
            // GATILHO DO HISTÓRICO - ONLINE: Salva a resposta vinda do Servidor
            if (window.salvarInteracaoNoHistorico) {
                window.salvarInteracaoNoHistorico('ia', realAiText);
            }

            sendBtn.disabled = false;
            userInput.focus();
            return;
        }
        
        throw new Error('Servidor indisponível no momento.');

    } catch (error) {
        console.warn("Conexão direta offline. Rodando motor de contingência formatado.");
        
        setTimeout(() => {
            let respostaFallback = "";
            const textoLimpo = messageText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

            if (textoLimpo.includes('agua') || textoLimpo.includes('derrubei') || textoLimpo.includes('computador')) {
                respostaFallback = `Ai meu Deus, respira fundo! Acidentes acontecem e o pânico não vai ajudar agora.\n\n` +
                                   `Aqui está o que você precisa fazer **imediatamente**:\n` +
                                   `* **1. Desligue tudo:** Tire o aparelho da tomada e não tente ligá-lo de jeito nenhum.\n` +
                                   `* **2. Seja honesto:** Procure o responsável pelo laboratório ou seu professor agora mesmo.\n\n` +
                                   `Equipamentos são substituíveis, sua integridade não. Quer ajuda para pensar em como falar com a direção?`;
            } else if (textoLimpo === 'oi' || textoLimpo === 'ola') {
                respostaFallback = "Olá!\n\nComo posso apoiar sua rotina, tirar dúvidas de matérias ou te dar um suporte emocional hoje? Estou aqui para o que der e vier.";
            } else {
                respostaFallback = `Compreendo sua preocupação sobre **"${messageText}"**.\n\n` +
                                   `Lidar com imprevistos práticos ou acadêmicos exige calma.\n\n` +
                                   `Para podermos resolver isso juntos: qual é o seu maior medo ou dúvida sobre isso agora? Me conta os detalhes!`;
            }

            streamResponseEffect(iaMessageDiv, respostaFallback, 25).then(() => {
                // GATILHO DO HISTÓRICO - OFFLINE: Salva a resposta gerada no Fallback local
                if (window.salvarInteracaoNoHistorico) {
                    window.salvarInteracaoNoHistorico('ia', respostaFallback);
                }

                sendBtn.disabled = false;
                userInput.focus();
            });

        }, 600);
    }
});

// ==========================================
// 5. GERENCIAMENTO DE MODAIS (INTERFACE)
// ==========================================
settingsBtn.addEventListener('click', () => settingsModal.classList.add('open'));
closeSettingsBtn.addEventListener('click', () => settingsModal.classList.remove('open'));

profileBtn.addEventListener('click', () => profileModal.classList.add('open'));
closeProfileBtn.addEventListener('click', () => profileModal.classList.remove('open'));

window.addEventListener('click', function (event) {
    if (event.target === settingsModal) {
        settingsModal.classList.remove('open');
    }
    if (event.target === profileModal) {
        profileModal.classList.remove('open');
    }
});


// ==========================================
// 6. CONTROLE DE ACESSIBILIDADE E TEMAS
// ==========================================
themeSelector.addEventListener('change', function () {
    if (themeSelector.value === 'light') {
        document.body.classList.add('light-theme');
    } else {
        document.body.classList.remove('light-theme');
    }
});

fontSizeSelector.addEventListener('change', function () {
    if (fontSizeSelector.value === 'large') {
        document.body.classList.add('font-large');
    } else {
        document.body.classList.remove('font-large');
    }
});


// ==========================================
// 7. SISTEMA DE HISTÓRICO DINÂMICO E PERFIL (PREMIUM)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // --- CONTROLE DE USUÁRIO E PERFIL ---
    const nomeCompleto = localStorage.getItem('userName');
    const userEmail = localStorage.getItem('userEmail') || 'anonimo';
    
    const displayNomeSidebar = document.getElementById('user-display-name');
    const displayNomeModal = document.getElementById('modal-profile-name');
    const avatarSidebar = document.getElementById('profile-avatar');
    const avatarModal = document.getElementById('modal-profile-avatar');
    const changePhotoText = document.getElementById('change-photo-text');
    const fileInput = document.getElementById('avatar-upload-input');

    if (nomeCompleto) {
        const primeiroNome = nomeCompleto.trim().split(' ')[0];
        if (displayNomeSidebar) displayNomeSidebar.textContent = primeiroNome;
        if (displayNomeModal) displayNomeModal.textContent = nomeCompleto;
    }

    function aplicarFotoPerfil(base64Image) {
        if (!base64Image) return;
        const imgHTML = `<img src="${base64Image}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block;">`;
        if (avatarSidebar) avatarSidebar.innerHTML = imgHTML;
        if (avatarModal) avatarModal.innerHTML = imgHTML;
    }
    
    const fotoSalva = localStorage.getItem('userAvatar');
    if (fotoSalva) aplicarFotoPerfil(fotoSalva);

    if (avatarModal && fileInput) {
        const acionarUpload = () => fileInput.click();
        avatarModal.addEventListener('click', acionarUpload);
        if (changePhotoText) changePhotoText.addEventListener('click', acionarUpload);
    }

    if (fileInput) {
        fileInput.addEventListener('change', (event) => {
            const arquivo = event.target.files[0];
            if (arquivo && arquivo.type.startsWith('image/')) {
                const leitor = new FileReader();
                leitor.onload = (e) => {
                    localStorage.setItem('userAvatar', e.target.result);
                    aplicarFotoPerfil(e.target.result);
                };
                leitor.readAsDataURL(arquivo);
            }
        });
    }

    // --- MOTOR DE HISTÓRICO DINÂMICO (BALÕES DE CONVERSA) ---
    const historyList = document.getElementById('chat-history-list');
    let currentChatId = null;
    const STORAGE_KEY = `ductor_chats_${userEmail}`;

    function carregarTodosOsChats() {
        const dados = localStorage.getItem(STORAGE_KEY);
        return dados ? JSON.parse(dados) : [];
    }

    function salvarTodosOsChats(chats) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
    }

    function renderizarSidebar() {
        if (!historyList) return;
        historyList.innerHTML = '';
        const chats = carregarTodosOsChats();

        if (chats.length === 0) {
            historyList.innerHTML = `<li class="history-item empty-history" style="opacity: 0.6; pointer-events: none; font-size: 0.85rem;"><i class="fa-solid fa-folder-open"></i> Nenhum chat ainda</li>`;
            return;
        }

        chats.reverse().forEach(chat => {
            const li = document.createElement('li');
            li.className = `history-item ${chat.id === currentChatId ? 'active' : ''}`;
            li.setAttribute('data-id', chat.id);
            li.innerHTML = `<i class="fa-regular fa-message"></i> ${chat.title}`;
            
            li.addEventListener('click', () => {
                carregarChatEspecifico(chat.id);
            });

            historyList.appendChild(li);
        });
    }

    function carregarChatEspecifico(id) {
        currentChatId = id;
        const chats = carregarTodosOsChats();
        const chatAlvo = chats.find(c => c.id === id);

        if (chatAlvo && chatMessages) {
            chatMessages.innerHTML = '';
            
            chatAlvo.messages.forEach(msg => {
                const msgDiv = document.createElement('div');
                msgDiv.className = `message ${msg.sender === 'user' ? 'user-message' : 'ia-message'}`;
                msgDiv.innerHTML = msg.text.replace(/\n/g, '<br>');
                chatMessages.appendChild(msgDiv);
            });
            
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
            document.querySelectorAll('.history-item').forEach(item => {
                item.classList.remove('active');
                if (item.getAttribute('data-id') === id) item.classList.add('active');
            });
        }
    }

    window.salvarInteracaoNoHistorico = function(remetente, texto) {
        let chats = carregarTodosOsChats();

        if (!currentChatId) {
            currentChatId = 'chat_' + Date.now();
            let tituloDefinido = texto.length > 22 ? texto.substring(0, 22) + '...' : texto;
            
            const novoChat = {
                id: currentChatId,
                title: tituloDefinido,
                messages: [{ sender: remetente, text: texto }]
            };
            chats.push(novoChat);
        } else {
            const chatIndex = chats.findIndex(c => c.id === currentChatId);
            if (chatIndex !== -1) {
                chats[chatIndex].messages.push({ sender: remetente, text: texto });
            }
        }

        salvarTodosOsChats(chats);
        renderizarSidebar();
    };

    if (newChatBtn) {
        newChatBtn.addEventListener('click', function () {
            currentChatId = null;
            document.querySelectorAll('.history-item').forEach(i => i.classList.remove('active'));
            
            if (chatMessages) {
                chatMessages.innerHTML = `
                    <div class="message ia-message">
                        Área de conversação reiniciada. O espaço é seu! Pode mandar qualquer dúvida de matéria, desabafo ou situação imprevista.
                    </div>
                `;
            }
            if (userInput) userInput.focus();
            renderizarSidebar();
        });
    }

    // Configuração do botão de sair (Logout)
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
            alert('Sessão encerrada com segurança! Até logo.');
            // Opcional: Você pode redirecionar para a tela de login aqui
            window.location.href = 'login.html';
        });
    }

    renderizarSidebar();
});

console.log("Motor de estilização e renderização Ductor AI calibrado com Histórico Dinâmico.");

// ==========================================
// CONTROLADOR DE MODOS DINÂMICOS DA IA
// ==========================================
function selectAiMode(mode) {
    const academicBtn = document.getElementById('mode-academic');
    const emotionalBtn = document.getElementById('mode-emotional');
    const modeInput = document.getElementById('current-ai-mode');
    
    // Remove o acesos de ambos
    academicBtn.classList.remove('active');
    emotionalBtn.classList.remove('active');
    
    // Acende apenas o botão clicado
    if (mode === 'academic') {
        academicBtn.classList.add('active');
        modeInput.value = 'academic';
    } else {
        emotionalBtn.classList.add('active');
        modeInput.value = 'emotional';
    }
}