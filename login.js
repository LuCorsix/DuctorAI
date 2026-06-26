const boxLogin = document.getElementById('box-login');
const boxRegister = document.getElementById('box-register');
const boxRecover = document.getElementById('box-recover');

const goToRegister = document.getElementById('go-to-register');
const goToRecover = document.getElementById('go-to-recover');
const goToLoginLinks = document.querySelectorAll('.go-to-login');

// Função simples e sem travar de troca de formulário
function switchForm(targetBox) {
    boxLogin.classList.remove('active');
    boxRegister.classList.remove('active');
    boxRecover.classList.remove('active');
    targetBox.classList.add('active');
}

// Configurando os cliques de transição
goToRegister.addEventListener('click', (e) => { e.preventDefault(); switchForm(boxRegister); });
goToRecover.addEventListener('click', (e) => { e.preventDefault(); switchForm(boxRecover); });
goToLoginLinks.forEach(link => { link.addEventListener('click', (e) => { e.preventDefault(); switchForm(boxLogin); }); });

// --- COMUNICAÇÃO REAL COM O SERVIDOR ---

// Evento de LOGIN
document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Captura os inputs baseados na ordem do formulário de login
    const inputs = e.target.querySelectorAll('input');
    const email = inputs[0].value;
    const password = inputs[1].value;

    try {
        const response = await fetch('http://localhost:3001/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            // Salva o nome do aluno na sessão para o chat usar
            localStorage.setItem('userName', data.name);
            window.location.href = 'index.html'; // Vai para a tela do chat
        } else {
            alert(data.error); // Mensagem caso erre e-mail ou senha
        }
    } catch (error) {
        alert("Erro ao conectar com o servidor. Verifique se deu 'node server.js' no terminal.");
    }
});

// Evento de CADASTRO
document.getElementById('form-cadastro').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Captura os inputs baseados na ordem do formulário de cadastro
    const inputs = e.target.querySelectorAll('input');
    const name = inputs[0].value;
    const email = inputs[1].value;
    const password = inputs[2].value;

    try {
        const response = await fetch('http://localhost:3001/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (data.success) {
            alert("Conta criada com sucesso! Agora faça seu login.");
            e.target.reset(); // Limpa as caixas de texto do cadastro
            switchForm(boxLogin); // Joga o usuário para o login
        } else {
            alert(data.error); // Mensagem se o email já existir
        }
    } catch (error) {
        alert("Erro ao conectar com o servidor.");
    }
});

// Evento de RECUPERAÇÃO DE SENHA
document.getElementById('form-recuperar').addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Se o e-mail estiver cadastrado, as instruções foram enviadas!');
    switchForm(boxLogin);
});

// ==========================================
// CONTROLE DE VISIBILIDADE DA SENHA (OLHINHO)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const togglePassword = document.getElementById('toggle-password');
    const passwordInput = document.getElementById('login-password');

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function () {
            // Alterna o tipo do input de password para text e vice-versa
            const isPassword = passwordInput.getAttribute('type') === 'password';
            passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
            
            // Muda o desenho do ícone (olho aberto / olho cortado)
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
            
            // Ajusta a cor para dar um feedback visual (azul quando ativo, cinza quando escondido)
            this.style.color = isPassword ? '#3b82f6' : '#94a3b8';
        });
    }
});