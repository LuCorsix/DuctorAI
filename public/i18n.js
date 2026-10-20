/**
 * INTERNACIONALIZAÇÃO (PT-BR / EN / ES)
 * Uso no HTML:  data-i18n="chave"  data-i18n-placeholder="chave"  data-i18n-title="chave"  data-i18n-aria="chave"
 * Uso no JS:    i18n.t('chave', { variavel: valor })
 */
(function () {
    const IDIOMAS = ['pt', 'en', 'es'];
    const HTML_LANG = { pt: 'pt-BR', en: 'en', es: 'es' };

    const DICT = {
        // ====================================================== PORTUGUÊS
        pt: {
            'confirm.cancel': `Cancelar`,
            'confirm.delete': `Apagar`,
            'sync.error': `Não foi possível salvar suas alterações. Verifique sua conexão.`,
            'chat.new_chat_hint': `Novo chat`,
            'lang.label': `Idioma`,
            'net.error': `Erro ao conectar com o servidor. Tente novamente.`,

            'login.title': `Ductor AI - Entrar`,
            'login.welcome': `Bem-vindo! 🧠`,
            'login.subtitle': `Faça login para acessar a Ductor AI`,
            'field.email': `E-mail`,
            'field.email.ph': `Digite seu e-mail`,
            'field.password': `Senha`,
            'field.password.ph': `Digite sua senha`,
            'login.submit': `Entrar`,
            'login.noaccount': `Não tem uma conta?`,
            'login.signup': `Cadastre-se`,
            'login.forgot': `Esqueceu sua senha?`,
            'login.toggle_password': `Mostrar ou ocultar a senha`,

            'reg.title': `Criar Conta ✨`,
            'reg.subtitle': `Cadastre-se para começar seus estudos`,
            'field.name': `Nome Completo`,
            'field.name.ph': `Ex: João Silva`,
            'reg.email.ph': `Ex: joao@escola.com`,
            'reg.password.ph': `Crie uma senha (mínimo 8 caracteres)`,
            'reg.submit': `Criar Conta`,
            'reg.have': `Já tem uma conta?`,
            'reg.signin': `Fazer Login`,
            'reg.success': `Conta criada com sucesso! Agora faça seu login.`,

            'rec.title': `Recuperar Senha 🔑`,
            'rec.step1': `Informe seu e-mail para receber um código de segurança`,
            'rec.email': `E-mail Cadastrado`,
            'rec.send': `Enviar Código`,
            'rec.sending': `Enviando...`,
            'rec.step2': `Digite o código de 6 dígitos enviado ao seu e-mail e defina a nova senha`,
            'rec.code': `Código de Verificação`,
            'rec.newpass': `Nova Senha`,
            'rec.newpass.ph': `Mínimo de 8 caracteres`,
            'rec.reset': `Redefinir Senha`,
            'rec.sent': `Se o e-mail estiver cadastrado, enviamos um código. Confira sua caixa de entrada e a pasta de spam.`,
            'rec.done': `Senha redefinida com sucesso! Faça login com a nova senha.`,
            'rec.remembered': `Lembrou a senha?`,
            'rec.back': `Voltar para o Login`,

            'app.title': `Ductor AI - Área do Aluno`,
            'sidebar.new': `Novo Chat`,
            'sidebar.history': `Histórico de Conversas`,
            'sidebar.connecting': `Conectando...`,
            'sidebar.offline': `Sem conexão`,
            'sidebar.role': `Painel do Aluno`,
            'sidebar.profile': `Perfil`,
            'sidebar.profile.title': `Visualizar meu perfil`,
            'sidebar.settings': `Opções`,
            'sidebar.settings.title': `Configurações do sistema`,
            'sidebar.logout': `Sair`,
            'sidebar.logout.title': `Sair da conta`,
            'header.tagline': `Sua mentora de estudos anti-plágio e suporte emocional`,
            'mode.academic': `Rigor Acadêmico`,
            'mode.emotional': `Suporte Emocional`,
            'chat.placeholder': `Digite sua dúvida ou desabafo aqui...`,
            'chat.send': `Enviar mensagem`,
            'chat.welcome': `Olá! Eu sou a Ductor AI. Estou aqui para te apoiar na sua jornada de estudos e na sua organização. Como está sendo o seu dia? O que gostaria de explorar ou conversar hoje?`,
            'chat.reset': `Área de conversação reiniciada. O espaço é seu! Pode mandar qualquer dúvida de matéria, desabafo ou situação imprevista.`,
            'chat.thinking': `Ductor AI está processando sua solicitação...`,
            'chat.empty_history': `Nenhum chat ainda`,
            'chat.delete_title': `Apagar este chat`,
            'chat.delete_confirm': `Tem certeza que deseja apagar este chat? Essa ação não pode ser desfeita.`,
            'chat.conn_error': `⚠️ **Falha de conexão**\n\nNão foi possível falar com a Ductor AI agora. Verifique sua internet e tente novamente em instantes.`,
            'chat.load_error': `⚠️ Não foi possível carregar seus dados. Verifique sua conexão e recarregue a página.`,
            'warn.academic_in_emotional': `⚠️ **Aviso do Guia:** Identifiquei que sua dúvida é de cunho acadêmico. Para que eu possa analisar textos, verificar plágios ou ajudar nos seus estudos com total rigor, por favor, **selecione a opção "Rigor Acadêmico"** logo acima.`,
            'warn.emotional_in_academic': `⚠️ **Aviso do Guia:** Sinto que você precisa de um espaço para desabafar ou falar sobre a pressão dos estudos. Para conversarmos sobre seus sentimentos e organizarmos sua mente de forma acolhedora, **selecione a opção "Suporte Emocional"** logo acima.`,

            'settings.title': `Configurações do Sistema`,
            'settings.theme': `Tema do Painel`,
            'theme.dark': `Escuro Absoluto (Padrão)`,
            'theme.light': `Modo Claro`,
            'settings.font': `Tamanho da Fonte do Chat`,
            'font.normal': `Normal`,
            'font.large': `Grande (Acessibilidade)`,
            'settings.language': `Idioma`,
            'settings.pedagogy': `Respostas Pedagógicas`,
            'settings.antiplagiarism': `Modo Anti-Plágio Rígido Ativo`,
            'modal.close': `Fechar`,

            'profile.title': `Perfil do Estudante`,
            'profile.photo_title': `Clique para alterar sua foto`,
            'profile.change_photo': `Clique na foto para alterar`,
            'profile.remove_photo': `Remover foto`,
            'profile.role': `Estudante - Ensino Médio`,
            'profile.status': `Status da Conta`,
            'profile.active': `Ativo`,
            'profile.security': `Segurança`,
            'profile.encrypted': `Senha criptografada (bcrypt)`,

            'crop.title': `Ajustar foto de perfil`,
            'crop.hint': `Arraste a imagem para posicionar e use o zoom para enquadrar.`,
            'crop.zoom': `Zoom`,
            'crop.rotate': `Girar`,
            'crop.preview': `Como vai aparecer`,
            'crop.preview_sidebar': `Menu`,
            'crop.preview_profile': `Perfil`,
            'crop.save': `Salvar foto`,
            'crop.cancel': `Cancelar`,
            'crop.saving': `Salvando...`,
            'crop.error': `Não foi possível abrir essa imagem. Use um arquivo JPG, PNG ou WebP.`,
            'crop.not_image': `Escolha um arquivo de imagem.`,
            'crop.too_big': `Imagem grande demais (máximo de 15 MB).`,
            'crop.save_error': `Não foi possível salvar a foto. Tente novamente.`,

            'err.missing_fields': `Preencha todos os campos!`,
            'err.invalid_name': `Nome inválido. Use de 2 a 80 caracteres.`,
            'err.invalid_email': `Digite um e-mail válido.`,
            'err.weak_password': `A senha precisa ter de 8 a 72 caracteres.`,
            'err.email_taken': `Este e-mail já está cadastrado!`,
            'err.bad_credentials': `E-mail ou senha incorretos!`,
            'err.bad_credentials_left': `E-mail ou senha incorretos! Restam {left} tentativa(s) antes do bloqueio temporário.`,
            'err.login_locked': `Muitas tentativas de login. Por segurança, aguarde {min} min e tente novamente.`,
            'err.too_many_attempts': `Muitas tentativas. Aguarde {min} min e tente novamente.`,
            'err.recover_wait': `Aguarde {min} min antes de pedir outro código.`,
            'err.invalid_code': `Código de verificação inválido!`,
            'err.invalid_code_left': `Código inválido! Restam {left} tentativa(s).`,
            'err.code_expired': `Código expirado! Solicite um novo.`,
            'err.code_burned': `Muitas tentativas erradas. Solicite um novo código.`,
            'err.email_not_configured': `O envio de e-mails não está configurado no servidor.`,
            'err.email_failed': `Não foi possível enviar o e-mail agora. Tente novamente em instantes.`,
            'err.session_expired': `Sua sessão expirou. Faça login novamente.`,
            'err.rate_limited': `Você enviou muitas mensagens em pouco tempo. Aguarde {min} min.`,
            'err.ai_unavailable': `A IA está indisponível no momento.`,
            'err.ai_empty': `A IA não retornou resposta. Tente de novo.`,
            'err.ai_error': `Erro ao processar sua mensagem. Tente novamente.`,
            'err.invalid_message': `Mensagem inválida (vazia ou grande demais).`,
            'err.server_error': `Erro interno do servidor. Tente novamente.`
        },

        // ====================================================== ENGLISH
        en: {
            'confirm.cancel': `Cancel`,
            'confirm.delete': `Delete`,
            'sync.error': `Could not save your changes. Check your connection.`,
            'chat.new_chat_hint': `New chat`,
            'lang.label': `Language`,
            'net.error': `Could not reach the server. Please try again.`,

            'login.title': `Ductor AI - Sign in`,
            'login.welcome': `Welcome! 🧠`,
            'login.subtitle': `Sign in to access Ductor AI`,
            'field.email': `Email`,
            'field.email.ph': `Enter your email`,
            'field.password': `Password`,
            'field.password.ph': `Enter your password`,
            'login.submit': `Sign in`,
            'login.noaccount': `Don't have an account?`,
            'login.signup': `Sign up`,
            'login.forgot': `Forgot your password?`,
            'login.toggle_password': `Show or hide password`,

            'reg.title': `Create Account ✨`,
            'reg.subtitle': `Sign up to start studying`,
            'field.name': `Full Name`,
            'field.name.ph': `E.g.: John Smith`,
            'reg.email.ph': `E.g.: john@school.com`,
            'reg.password.ph': `Create a password (at least 8 characters)`,
            'reg.submit': `Create Account`,
            'reg.have': `Already have an account?`,
            'reg.signin': `Sign in`,
            'reg.success': `Account created successfully! Now sign in.`,

            'rec.title': `Reset Password 🔑`,
            'rec.step1': `Enter your email to receive a security code`,
            'rec.email': `Registered Email`,
            'rec.send': `Send Code`,
            'rec.sending': `Sending...`,
            'rec.step2': `Enter the 6-digit code we emailed you and choose a new password`,
            'rec.code': `Verification Code`,
            'rec.newpass': `New Password`,
            'rec.newpass.ph': `At least 8 characters`,
            'rec.reset': `Reset Password`,
            'rec.sent': `If the email is registered, we sent you a code. Check your inbox and spam folder.`,
            'rec.done': `Password reset successfully! Sign in with your new password.`,
            'rec.remembered': `Remembered your password?`,
            'rec.back': `Back to Sign in`,

            'app.title': `Ductor AI - Student Area`,
            'sidebar.new': `New Chat`,
            'sidebar.history': `Chat History`,
            'sidebar.connecting': `Connecting...`,
            'sidebar.offline': `Offline`,
            'sidebar.role': `Student Panel`,
            'sidebar.profile': `Profile`,
            'sidebar.profile.title': `View my profile`,
            'sidebar.settings': `Options`,
            'sidebar.settings.title': `System settings`,
            'sidebar.logout': `Log out`,
            'sidebar.logout.title': `Log out of your account`,
            'header.tagline': `Your anti-plagiarism study mentor and emotional support`,
            'mode.academic': `Academic Rigor`,
            'mode.emotional': `Emotional Support`,
            'chat.placeholder': `Type your question or what's on your mind...`,
            'chat.send': `Send message`,
            'chat.welcome': `Hi! I'm Ductor AI. I'm here to support you in your studies and in organizing your routine. How is your day going? What would you like to explore or talk about today?`,
            'chat.reset': `Conversation area reset. This space is yours! Send any question about your subjects, anything on your mind, or an unexpected situation.`,
            'chat.thinking': `Ductor AI is working on your request...`,
            'chat.empty_history': `No chats yet`,
            'chat.delete_title': `Delete this chat`,
            'chat.delete_confirm': `Are you sure you want to delete this chat? This cannot be undone.`,
            'chat.conn_error': `⚠️ **Connection failed**\n\nCould not reach Ductor AI right now. Check your internet connection and try again in a moment.`,
            'chat.load_error': `⚠️ Could not load your data. Check your connection and reload the page.`,
            'warn.academic_in_emotional': `⚠️ **Guide notice:** Your question looks academic. So I can analyze texts, check plagiarism and help with your studies with full rigor, please **select the "Academic Rigor" option** above.`,
            'warn.emotional_in_academic': `⚠️ **Guide notice:** It sounds like you need a space to open up or talk about study pressure. To talk about your feelings and organize your mind in a caring way, please **select the "Emotional Support" option** above.`,

            'settings.title': `System Settings`,
            'settings.theme': `Panel Theme`,
            'theme.dark': `Absolute Dark (Default)`,
            'theme.light': `Light Mode`,
            'settings.font': `Chat Font Size`,
            'font.normal': `Normal`,
            'font.large': `Large (Accessibility)`,
            'settings.language': `Language`,
            'settings.pedagogy': `Pedagogical Answers`,
            'settings.antiplagiarism': `Strict Anti-Plagiarism Mode Active`,
            'modal.close': `Close`,

            'profile.title': `Student Profile`,
            'profile.photo_title': `Click to change your photo`,
            'profile.change_photo': `Click the photo to change it`,
            'profile.remove_photo': `Remove photo`,
            'profile.role': `Student - High School`,
            'profile.status': `Account Status`,
            'profile.active': `Active`,
            'profile.security': `Security`,
            'profile.encrypted': `Encrypted password (bcrypt)`,

            'crop.title': `Adjust profile photo`,
            'crop.hint': `Drag the image to position it and use the zoom to frame it.`,
            'crop.zoom': `Zoom`,
            'crop.rotate': `Rotate`,
            'crop.preview': `How it will look`,
            'crop.preview_sidebar': `Menu`,
            'crop.preview_profile': `Profile`,
            'crop.save': `Save photo`,
            'crop.cancel': `Cancel`,
            'crop.saving': `Saving...`,
            'crop.error': `Could not open that image. Use a JPG, PNG or WebP file.`,
            'crop.not_image': `Choose an image file.`,
            'crop.too_big': `Image too large (15 MB maximum).`,
            'crop.save_error': `Could not save the photo. Please try again.`,

            'err.missing_fields': `Please fill in all fields!`,
            'err.invalid_name': `Invalid name. Use 2 to 80 characters.`,
            'err.invalid_email': `Enter a valid email.`,
            'err.weak_password': `The password must be 8 to 72 characters long.`,
            'err.email_taken': `This email is already registered!`,
            'err.bad_credentials': `Incorrect email or password!`,
            'err.bad_credentials_left': `Incorrect email or password! {left} attempt(s) left before a temporary lock.`,
            'err.login_locked': `Too many sign-in attempts. For your security, wait {min} min and try again.`,
            'err.too_many_attempts': `Too many attempts. Wait {min} min and try again.`,
            'err.recover_wait': `Wait {min} min before requesting another code.`,
            'err.invalid_code': `Invalid verification code!`,
            'err.invalid_code_left': `Invalid code! {left} attempt(s) left.`,
            'err.code_expired': `Code expired! Request a new one.`,
            'err.code_burned': `Too many wrong attempts. Request a new code.`,
            'err.email_not_configured': `Email sending is not configured on the server.`,
            'err.email_failed': `Could not send the email right now. Please try again shortly.`,
            'err.session_expired': `Your session expired. Please sign in again.`,
            'err.rate_limited': `You sent too many messages in a short time. Wait {min} min.`,
            'err.ai_unavailable': `The AI is unavailable right now.`,
            'err.ai_empty': `The AI returned no answer. Try again.`,
            'err.ai_error': `Error processing your message. Please try again.`,
            'err.invalid_message': `Invalid message (empty or too long).`,
            'err.server_error': `Internal server error. Please try again.`
        },

        // ====================================================== ESPAÑOL
        es: {
            'confirm.cancel': `Cancelar`,
            'confirm.delete': `Eliminar`,
            'sync.error': `No se pudieron guardar tus cambios. Revisa tu conexión.`,
            'chat.new_chat_hint': `Nuevo chat`,
            'lang.label': `Idioma`,
            'net.error': `No se pudo conectar con el servidor. Inténtalo de nuevo.`,

            'login.title': `Ductor AI - Iniciar sesión`,
            'login.welcome': `¡Bienvenido! 🧠`,
            'login.subtitle': `Inicia sesión para acceder a Ductor AI`,
            'field.email': `Correo electrónico`,
            'field.email.ph': `Escribe tu correo`,
            'field.password': `Contraseña`,
            'field.password.ph': `Escribe tu contraseña`,
            'login.submit': `Entrar`,
            'login.noaccount': `¿No tienes una cuenta?`,
            'login.signup': `Regístrate`,
            'login.forgot': `¿Olvidaste tu contraseña?`,
            'login.toggle_password': `Mostrar u ocultar la contraseña`,

            'reg.title': `Crear Cuenta ✨`,
            'reg.subtitle': `Regístrate para empezar a estudiar`,
            'field.name': `Nombre Completo`,
            'field.name.ph': `Ej.: Juan Pérez`,
            'reg.email.ph': `Ej.: juan@escuela.com`,
            'reg.password.ph': `Crea una contraseña (mínimo 8 caracteres)`,
            'reg.submit': `Crear Cuenta`,
            'reg.have': `¿Ya tienes una cuenta?`,
            'reg.signin': `Iniciar sesión`,
            'reg.success': `¡Cuenta creada con éxito! Ahora inicia sesión.`,

            'rec.title': `Recuperar Contraseña 🔑`,
            'rec.step1': `Escribe tu correo para recibir un código de seguridad`,
            'rec.email': `Correo Registrado`,
            'rec.send': `Enviar Código`,
            'rec.sending': `Enviando...`,
            'rec.step2': `Escribe el código de 6 dígitos que enviamos a tu correo y define la nueva contraseña`,
            'rec.code': `Código de Verificación`,
            'rec.newpass': `Nueva Contraseña`,
            'rec.newpass.ph': `Mínimo 8 caracteres`,
            'rec.reset': `Restablecer Contraseña`,
            'rec.sent': `Si el correo está registrado, enviamos un código. Revisa tu bandeja de entrada y la carpeta de spam.`,
            'rec.done': `¡Contraseña restablecida con éxito! Inicia sesión con la nueva contraseña.`,
            'rec.remembered': `¿Recordaste tu contraseña?`,
            'rec.back': `Volver al inicio de sesión`,

            'app.title': `Ductor AI - Área del Estudiante`,
            'sidebar.new': `Nuevo Chat`,
            'sidebar.history': `Historial de Conversaciones`,
            'sidebar.connecting': `Conectando...`,
            'sidebar.offline': `Sin conexión`,
            'sidebar.role': `Panel del Estudiante`,
            'sidebar.profile': `Perfil`,
            'sidebar.profile.title': `Ver mi perfil`,
            'sidebar.settings': `Opciones`,
            'sidebar.settings.title': `Configuración del sistema`,
            'sidebar.logout': `Salir`,
            'sidebar.logout.title': `Cerrar sesión`,
            'header.tagline': `Tu mentora de estudios antiplagio y apoyo emocional`,
            'mode.academic': `Rigor Académico`,
            'mode.emotional': `Apoyo Emocional`,
            'chat.placeholder': `Escribe tu duda o lo que quieras contar...`,
            'chat.send': `Enviar mensaje`,
            'chat.welcome': `¡Hola! Soy Ductor AI. Estoy aquí para apoyarte en tus estudios y en tu organización. ¿Cómo va tu día? ¿Qué te gustaría explorar o conversar hoy?`,
            'chat.reset': `Área de conversación reiniciada. ¡Este espacio es tuyo! Puedes enviar cualquier duda de la materia, desahogo o situación imprevista.`,
            'chat.thinking': `Ductor AI está procesando tu solicitud...`,
            'chat.empty_history': `Aún no hay chats`,
            'chat.delete_title': `Eliminar este chat`,
            'chat.delete_confirm': `¿Seguro que quieres eliminar este chat? Esta acción no se puede deshacer.`,
            'chat.conn_error': `⚠️ **Fallo de conexión**\n\nNo fue posible comunicarse con Ductor AI ahora. Revisa tu internet e inténtalo de nuevo en un momento.`,
            'chat.load_error': `⚠️ No se pudieron cargar tus datos. Revisa tu conexión y recarga la página.`,
            'warn.academic_in_emotional': `⚠️ **Aviso de la Guía:** Tu duda parece académica. Para que pueda analizar textos, verificar plagio y ayudarte en tus estudios con todo el rigor, por favor **selecciona la opción "Rigor Académico"** arriba.`,
            'warn.emotional_in_academic': `⚠️ **Aviso de la Guía:** Siento que necesitas un espacio para desahogarte o hablar de la presión de los estudios. Para conversar sobre tus sentimientos y ordenar tu mente con calma, por favor **selecciona la opción "Apoyo Emocional"** arriba.`,

            'settings.title': `Configuración del Sistema`,
            'settings.theme': `Tema del Panel`,
            'theme.dark': `Oscuro Absoluto (Predeterminado)`,
            'theme.light': `Modo Claro`,
            'settings.font': `Tamaño de Fuente del Chat`,
            'font.normal': `Normal`,
            'font.large': `Grande (Accesibilidad)`,
            'settings.language': `Idioma`,
            'settings.pedagogy': `Respuestas Pedagógicas`,
            'settings.antiplagiarism': `Modo Antiplagio Estricto Activo`,
            'modal.close': `Cerrar`,

            'profile.title': `Perfil del Estudiante`,
            'profile.photo_title': `Haz clic para cambiar tu foto`,
            'profile.change_photo': `Haz clic en la foto para cambiarla`,
            'profile.remove_photo': `Quitar foto`,
            'profile.role': `Estudiante - Educación Secundaria`,
            'profile.status': `Estado de la Cuenta`,
            'profile.active': `Activa`,
            'profile.security': `Seguridad`,
            'profile.encrypted': `Contraseña cifrada (bcrypt)`,

            'crop.title': `Ajustar foto de perfil`,
            'crop.hint': `Arrastra la imagen para colocarla y usa el zoom para encuadrarla.`,
            'crop.zoom': `Zoom`,
            'crop.rotate': `Girar`,
            'crop.preview': `Así se verá`,
            'crop.preview_sidebar': `Menú`,
            'crop.preview_profile': `Perfil`,
            'crop.save': `Guardar foto`,
            'crop.cancel': `Cancelar`,
            'crop.saving': `Guardando...`,
            'crop.error': `No se pudo abrir esa imagen. Usa un archivo JPG, PNG o WebP.`,
            'crop.not_image': `Elige un archivo de imagen.`,
            'crop.too_big': `Imagen demasiado grande (máximo 15 MB).`,
            'crop.save_error': `No se pudo guardar la foto. Inténtalo de nuevo.`,

            'err.missing_fields': `¡Rellena todos los campos!`,
            'err.invalid_name': `Nombre no válido. Usa de 2 a 80 caracteres.`,
            'err.invalid_email': `Escribe un correo válido.`,
            'err.weak_password': `La contraseña debe tener entre 8 y 72 caracteres.`,
            'err.email_taken': `¡Este correo ya está registrado!`,
            'err.bad_credentials': `¡Correo o contraseña incorrectos!`,
            'err.bad_credentials_left': `¡Correo o contraseña incorrectos! Te quedan {left} intento(s) antes del bloqueo temporal.`,
            'err.login_locked': `Demasiados intentos de inicio de sesión. Por seguridad, espera {min} min e inténtalo de nuevo.`,
            'err.too_many_attempts': `Demasiados intentos. Espera {min} min e inténtalo de nuevo.`,
            'err.recover_wait': `Espera {min} min antes de pedir otro código.`,
            'err.invalid_code': `¡Código de verificación no válido!`,
            'err.invalid_code_left': `¡Código no válido! Te quedan {left} intento(s).`,
            'err.code_expired': `¡Código expirado! Solicita uno nuevo.`,
            'err.code_burned': `Demasiados intentos fallidos. Solicita un código nuevo.`,
            'err.email_not_configured': `El envío de correos no está configurado en el servidor.`,
            'err.email_failed': `No se pudo enviar el correo ahora. Inténtalo de nuevo en unos instantes.`,
            'err.session_expired': `Tu sesión expiró. Inicia sesión de nuevo.`,
            'err.rate_limited': `Enviaste demasiados mensajes en poco tiempo. Espera {min} min.`,
            'err.ai_unavailable': `La IA no está disponible en este momento.`,
            'err.ai_empty': `La IA no devolvió respuesta. Inténtalo de nuevo.`,
            'err.ai_error': `Error al procesar tu mensaje. Inténtalo de nuevo.`,
            'err.invalid_message': `Mensaje no válido (vacío o demasiado largo).`,
            'err.server_error': `Error interno del servidor. Inténtalo de nuevo.`
        }
    };

    function detectar() {
        const nav = String(navigator.language || 'pt').slice(0, 2).toLowerCase();
        return IDIOMAS.includes(nav) ? nav : 'pt';
    }

    let idioma = localStorage.getItem('ductorLang');
    if (!IDIOMAS.includes(idioma)) idioma = detectar();

    function t(chave, vars) {
        let texto = (DICT[idioma] && DICT[idioma][chave]);
        if (texto === undefined) texto = DICT.pt[chave];
        if (texto === undefined) return chave;
        if (vars) {
            Object.keys(vars).forEach(k => { texto = texto.split(`{${k}}`).join(vars[k]); });
        }
        return texto;
    }

    // Traduz a mensagem de erro vinda da API (usa o "code" que o servidor envia)
    function tErro(dados) {
        if (!dados) return t('net.error');
        const min = Math.max(1, Math.ceil((dados.retryAfter || 60) / 60));
        let chave = dados.code ? `err.${dados.code}` : null;
        if (dados.code === 'bad_credentials' && typeof dados.attemptsLeft === 'number' && dados.attemptsLeft <= 2) chave = 'err.bad_credentials_left';
        if (dados.code === 'invalid_code' && typeof dados.attemptsLeft === 'number') chave = 'err.invalid_code_left';
        if (chave && DICT.pt[chave] !== undefined) return t(chave, { min, left: dados.attemptsLeft });
        return dados.error || t('net.error');
    }

    function aplicar(raiz) {
        raiz = raiz || document;
        raiz.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
        raiz.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
        raiz.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); });
        raiz.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
        document.documentElement.lang = HTML_LANG[idioma];
        const chaveTitulo = document.documentElement.dataset.titleKey;
        if (chaveTitulo) document.title = t(chaveTitulo);
        document.querySelectorAll('[data-lang-select]').forEach(sel => { sel.value = idioma; });
    }

    function definirIdioma(novo) {
        if (!IDIOMAS.includes(novo)) return;
        idioma = novo;
        localStorage.setItem('ductorLang', novo); // idioma não é dado sensível; ajuda a tela de login a abrir no idioma certo
        aplicar();
        document.dispatchEvent(new CustomEvent('idioma-alterado', { detail: novo }));
    }

    window.i18n = { t, tErro, aplicar, definirIdioma, idioma: () => idioma, IDIOMAS };
    document.addEventListener('DOMContentLoaded', () => aplicar());
})();
