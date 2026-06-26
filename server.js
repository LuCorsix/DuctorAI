const express = require('express');
const cors = require('cors');
require('dotenv').config();
const Groq = require('groq-sdk');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer'); // 👈 Importado o Nodemailer para controle de e-mails

console.log("🚀 Inicializando o servidor da Ductor AI...");

const app = express();
app.use(cors());
app.use(express.json());

// --- CONFIGURAÇÃO DO BANCO DE DADOS EM ARQUIVO (JSON) ---
const FILE_PATH = path.join(__dirname, 'usuarios.json');

// Função auxiliar para ler os usuários do arquivo
function obterUsuarios() {
    try {
        if (!fs.existsSync(FILE_PATH)) {
            fs.writeFileSync(FILE_PATH, JSON.stringify([]));
        }
        const dados = fs.readFileSync(FILE_PATH, 'utf8');
        return JSON.parse(dados);
    } catch (error) {
        console.error("Erro ao ler o arquivo de usuários:", error);
        return [];
    }
}

// Função auxiliar para salvar os usuários no arquivo
function salvarUsuarios(usuarios) {
    try {
        fs.writeFileSync(FILE_PATH, JSON.stringify(usuarios, null, 2));
    } catch (error) {
        console.error("Erro ao salvar o arquivo de usuários:", error);
    }
}

console.log("💾 Banco de dados JSON configurado com sucesso!");


// --- CONFIGURAÇÃO DO TRANSPORTE DE E-MAILS (NODEMAILER) ---
// Configurado com o serviço do Ethereal (Conta de teste automática)
// Se no futuro quiser usar o Gmail real, basta trocar os dados de "host", "port" e "auth"
const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
        user: 'seu_usuario_teste@ethereal.email', // Substitua pelos seus dados reais se desejar
        pass: 'sua_senha_teste'
    }
});

// Memória temporária do servidor para guardar os tokens de 6 dígitos
const codigosRecuperacao = {}; 


// Inicializa a IA da Groq
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// --- DIRETRIZES EXPANDIDAS DA DUCTOR AI ---
const SYSTEM_PROMPT = `Você é a Ductor AI, uma inteligência artificial que atua como Mentora Integral, Conselheira e Assistente Pedagógica para estudantes do Ensino Médio (14 a 18 anos). Você é madura, extremamente empática, perspicaz e focada no desenvolvimento humano e acadêmico do aluno.

Sua inteligência é regida por 7 Diretrizes Blindadas. Você deve equilibrá-las em todas as respostas:

1. DIRETRIZ ANTI-PLÁGIO RÍGIDO (TUTORIA SOCRÁTICA)
Nunca entregue respostas prontas, redações prontas, resumos solicitados para cópia ou códigos finalizados. Se o aluno pedir "faça meu trabalho" ou fizer perguntas diretas como "Quanto é 15% de 200?", adote o Método Socrático: quebre o problema em partes, explique a fórmula ou o conceito por trás, dê um exemplo prático parecido e faça perguntas que o induzam a construir a própria resposta. Ensine-o a pensar, não a copiar.

2. DIRETRIZ DE ENGENHARIA DE ESTUDOS (APRENDIZADO ATIVO)
Quando o aluno estiver perdido sobre "como estudar", recomende técnicas científicas de aprendizado ativo adaptadas para a realidade dele. Sugira ativamente métodos como: Técnica Feynman (explicar para si mesmo), Mapas Mentais, Flashcards (repetição espaçada) e Blocos de Foco (Pomodoro). Ajude-o a estruturar cronogramas de estudo realistas e combater a procrastinação dividindo tarefas em micropassos.

3. DIRETRIZ DE CARREIRA, ENEM E FUTURO (MENTORIA)
O Ensino Médio é cheio de dúvidas sobre o futuro. Esteja pronta para orientar o aluno sobre o funcionamento do ENEM, Sisu, ProUni, vestibulares e o Novo Ensino Médio. Se ele estiver em dúvida sobre qual profissão seguir, faça perguntas sobre os interesses dele, explique como é o mercado de trabalho atual e desmistifique mitos sobre as carreiras, agindo como uma orientadora vocacional.

4. DIRETRIZ DE APOIO EMOCIONAL E ESCUTA ATIVA
O bem-estar mental do estudante é sua prioridade. Diante de relatos de cansaço, burnout escolar, ansiedade pré-provas ou crises de inferioridade, NUNCA responda de forma fria ou puramente estatística. Valide o sentimento dele primeiro ("Eu sei que parece muita coisa agora...", "É normal se sentir assim..."). Ofereça um porto seguro para desabafos e ensine técnicas de alívio rápido (como a respiração 4-7-8 ou mindfulness).

5. DIRETRIZ DE CONVIVÊNCIA E HABILIDADES SOCIAIS
Se o aluno pedir conselhos sobre problemas na escola (ex: conflitos em trabalhos de grupo, timidez para apresentar seminários, ansiedade social ou relação com professores), fornece estratégias de comunicação assertiva, inteligência emocional e resolução de conflitos, ajudando-o a navegar pelo ecossistema social da escola de forma saudável.

6. DIRETRIZ DE SEGURANÇA, ÉTICA E IMREPREVISTOS PRÁTICOS
- VOCÊ NÃO É UM PSICÓLOGO OU PSIQUIATRA. Nunca dê diagnósticos clínicos. Se o aluno relatar sintomas crônicos, oriente-o a buscar os pais ou ajuda profissional médica.
- PROTOCOLO DE CRISE: Se o usuário demonstrar intenções de automutilação ou ideação suicida, interrompa o aconselhamento imediatamente, adote um tom de profundo acolhimento humano, forneça explicitamente o contato do Centro de Valorização da Vida (Ligue 188 ou acesse cvv.org.br) e ordene que ele converse com um adulto de confiança.
- ACIDENTES FÍSICOS: Se o aluno relatar acidentes com equipamentos da escola (ex: "derrubei água no computador", "quebrei a cadeira"), ordene que ele remova a energia/afaste-se se houver risco elétrico, tranquilize-o e diga para avisar IMEDIATAMENTE o professor, lembrando que objetos têm conserto e a integridade dele importa mais.

7. TOM DE VOZ, ESTILO E FORMATAÇÃO
- Tom: Acolhedor, jovem (mas maduro e sem gírias forçadas), encorajador e focado em soluções. Sempre que souber o nome do estudante, use-o para criar conexão.
- Formatação Obrigatória: Suas respostas serão renderizadas em uma tela que converte Markdown básico. Portanto, SEMPRE organize seu texto pulando linhas duplas para criar parágrafos bem espaçados. Use negritos (**) para destacar palavras-chave e listas com asterisco (* ) que viram tópicos limpos (•). Evite blocos massivos de texto para não cansar o estudante.`;


// --- ROTA DE CADASTRO ---
app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: "Preencha todos os campos!" });
    }

    const usuarios = obterUsuarios();

    const usuarioExiste = usuarios.find(u => u.email === email);
    if (usuarioExiste) {
        return res.status(400).json({ error: "Este e-mail já está cadastrado!" });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const novoUsuario = {
            id: usuarios.length + 1,
            name,
            email,
            password: hashedPassword
        };

        usuarios.push(novoUsuario);
        salvarUsuarios(usuarios);

        res.json({ success: true, message: "Usuário criado com sucesso!" });
    } catch (error) {
        res.status(500).json({ error: "Erro interno ao cadastrar usuário." });
    }
});


// --- ROTA DE LOGIN ---
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Preencha todos os campos!" });
    }

    const usuarios = obterUsuarios();
    const user = usuarios.find(u => u.email === email);

    if (!user) {
        return res.status(400).json({ error: "E-mail ou senha incorretos!" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
        return res.status(400).json({ error: "E-mail ou senha incorretos!" });
    }

    res.json({ success: true, name: user.name });
});


// --- ROTA DE RECUPERAÇÃO - PARTE 1: GERAR E ENVIAR CÓDIGO ---
app.post('/api/recover-request', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: "Por favor, informe o e-mail." });
    }

    const usuarios = obterUsuarios();
    const usuario = usuarios.find(u => u.email === email);

    // Se o e-mail não existir no usuarios.json, barra na hora
    if (!usuario) {
        return res.status(400).json({ error: "Este e-mail não está cadastrado no sistema!" });
    }

    // Gera um código de verificação aleatório de 6 dígitos
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();

    // Salva o código temporariamente indexado ao e-mail com validade de 10 minutos
    codigosRecuperacao[email] = {
        codigo: codigo,
        expiracao: Date.now() + 10 * 60 * 1000
    };

    // Estrutura o design do e-mail em HTML
    const mailOptions = {
        from: '"Ductor AI 🧠" <suporte@ductorai.com>',
        to: email,
        subject: 'Código de Segurança - Ductor AI',
        html: `
            <div style="font-family: sans-serif; background-color: #0f172a; color: #f8fafc; padding: 30px; border-radius: 10px; max-width: 500px; margin: 0 auto;">
                <h2 style="color: #3b82f6; text-align: center; margin-bottom: 20px;">Ductor AI</h2>
                <p>Olá, <strong>${usuario.name}</strong>!</p>
                <p>Recebemos uma solicitação para redefinir a senha da sua conta de estudos. Utilize o código de segurança abaixo para prosseguir:</p>
                <div style="background-color: #1e293b; padding: 15px; text-align: center; font-size: 26px; font-weight: bold; letter-spacing: 6px; border-radius: 8px; color: #3b82f6; margin: 25px 0; border: 1px solid #334155;">
                    ${codigo}
                </div>
                <p style="font-size: 13px; color: #94a3b8; text-align: center;">Este código expira em 10 minutos. Caso não tenha solicitado a alteração, você pode ignorar este e-mail com segurança.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        
        // MOSTRA O CÓDIGO NO TERMINAL DO VS CODE PARA FACILITAR OS SEUS TESTES DE BROWSER
        console.log(`\n📬 [E-MAIL ENVIADO] Código gerado para ${email}: ${codigo}\n`);
        
        res.json({ success: true, message: "Código de verificação enviado!" });
    } catch (error) {
        console.error("Erro ao enviar e-mail com Nodemailer:", error);
        res.status(500).json({ error: "Erro ao enviar o e-mail de recuperação." });
    }
});


// --- ROTA DE RECUPERAÇÃO - PARTE 2: CONFERIR TOKEN E SALVAR SENHA ---
app.post('/api/recover-confirm', async (req, res) => {
    const { email, codigo, newPassword } = req.body;

    if (!email || !codigo || !newPassword) {
        return res.status(400).json({ error: "Preencha todos os campos obrigatórios!" });
    }

    const dadosToken = codigosRecuperacao[email];

    // Valida se existe um token gerado para esse e-mail e se confere com o digitado
    if (!dadosToken || dadosToken.codigo !== codigo) {
        return res.status(400).json({ error: "Código de verificação inválido ou incorreto!" });
    }

    // Verifica o tempo de expiração do código
    if (Date.now() > dadosToken.expiracao) {
        delete codigosRecuperacao[email]; // Remove da memória
        return res.status(400).json({ error: "Este código expirou! Solicite um novo código." });
    }

    const usuarios = obterUsuarios();
    const usuarioIndex = usuarios.findIndex(u => u.email === email);

    if (usuarioIndex === -1) {
        return res.status(400).json({ error: "Usuário não encontrado." });
    }

    try {
        // Criptografa a nova senha gerando um novo salt seguro
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Altera o dado no array e persiste gravando no arquivo usuarios.json
        usuarios[usuarioIndex].password = hashedPassword;
        salvarUsuarios(usuarios);

        // Limpa o token da memória para que o código não possa ser reusado por segurança
        delete codigosRecuperacao[email];

        res.json({ success: true, message: "Sua senha foi redefinida com sucesso!" });
    } catch (error) {
        console.error("Erro ao salvar nova senha criptografada:", error);
        res.status(500).json({ error: "Erro interno do servidor ao redefinir a senha." });
    }
});


// ========================================================
// ROTA DO CHAT INTEGRADA COM A MEMÓRIA DO GROQ
// ========================================================
app.post('/api/chat', async (req, res) => {
    try {
        // Recebe a mensagem atual, o histórico do chat e o nome do aluno
        const { message, history, studentName } = req.body;

        // Monta o "combo" de mensagens na ordem certa para o Groq entender o contexto
        const listaMensagens = [
            { 
                role: "system", 
                content: `Você é a Ductor AI, mentora de estudos anti-plágio e suporte emocional do aluno ${studentName}. Seja empática, acolhedora e use formatação Markdown limpa. Como você tem acesso ao histórico da conversa enviado, NUNCA repita saudações iniciais como "Olá" ou "Prazer em te conhecer" a partir da segunda mensagem. Responda direto ao ponto mantendo o contexto anterior.` 
            },
            ...(history || []), // Coloca o histórico de conversas que veio da tela aqui no meio
            { role: "user", content: message } // Por fim, a última pergunta do aluno
        ];

        // Se a sua variável do Groq lá no topo do arquivo não se chamar "groq" (ex: se for "groqClient"), mude aqui:
        const completion = await groq.chat.completions.create({
            messages: listaMensagens,
            model: "llama3-8b-8192", // Aqui fica o modelo do Groq que você usa (ex: llama3-8b-8192, mixtral-8x7b-32768, etc)
            temperature: 0.7,
        });

        // Pega a resposta gerada pelo Groq
        const responseText = completion.choices[0].message.content;

        // Devolve o texto limpo para o seu script.js do frontend
        res.json({ response: responseText });

    } catch (error) {
        console.error("Erro no motor do Groq:", error);
        res.status(500).json({ error: "Erro interno no processamento da IA." });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🧠 Servidor da Ductor AI rodando perfeitamente na porta ${PORT}`);
});