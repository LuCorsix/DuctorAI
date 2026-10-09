# Ductor AI

Mentora de estudos anti-plágio e suporte emocional para estudantes do Ensino Médio.
Node.js + Express, IA via Groq, login com bcrypt + token assinado, dados individuais por usuário,
interface em Português, English e Español.

## Estrutura

```
ductor-ai/
├── server.js        servidor (API + serve o site)
├── storage.js       armazenamento: JSON local ou PostgreSQL
├── prompt.js        personalidade e regras da IA
├── package.json
├── .env.example     modelo das variáveis de ambiente
└── public/          TUDO que o navegador pode baixar (site)
    ├── login.html / login.css / login.js
    ├── index.html / style.css / script.js
    ├── cropper.js   recorte da foto de perfil
    ├── i18n.js      traduções PT / EN / ES
    └── config.js    descobre o endereço da API
```

Regra de ouro: **só a pasta `public/` é pública.** `server.js`, `.env` e os dados nunca ficam acessíveis pelo navegador.

## Rodar no seu computador

```bash
npm install
cp .env.example .env      # no Windows: copy .env.example .env
# edite o .env: GROQ_API_KEY, TOKEN_SECRET e (opcional) o e-mail
npm start
```

Abra http://localhost:3001

> **Não abra o site pelo Live Server (porta 5500).** O servidor grava os dados em `dados_usuarios/` a cada mensagem e o Live Server recarrega a página quando um arquivo muda. Use sempre `http://localhost:3001`. Se mesmo assim quiser o Live Server, este projeto já traz `.vscode/settings.json` para ele ignorar essas pastas, ou defina `DATA_DIR` no `.env` para guardar os dados fora do projeto.

- Sem `DATABASE_URL`, os dados ficam em `usuarios.json` e `dados_usuarios/` (se você já tinha usuários, copie o `usuarios.json` para esta pasta).
- Para testar o e-mail sem enviar nada: `EMAIL_TEST=true` (o código aparece no terminal).

## Segurança já incluída

- Senhas com bcrypt (mínimo 8 caracteres) e sessões por token assinado (7 dias); trocar a senha derruba as sessões antigas.
- Cada usuário só acessa os próprios dados (o servidor identifica pelo token, nunca por dados enviados pelo navegador).
- Limites: 5 erros de login por IP+e-mail em 15 min; recuperação com 1 pedido/min por e-mail e 5/hora; código de 6 dígitos queimado após 5 erros; chat limitado a 15 mensagens/min por usuário.
- A tela de recuperação não revela se um e-mail está cadastrado.
- Cabeçalhos de segurança (CSP, X-Frame-Options etc.), validação de tudo que o navegador envia, HTML sempre escapado.
- Detecção de mensagens de risco (autoagressão): a IA acolhe e informa o CVV (188), em qualquer modo.

## Publicar na web de graça

Combinação gratuita: GitHub (código) + Neon (banco PostgreSQL) + Render (servidor) + Brevo (e-mail por API, porque o Render gratuito bloqueia SMTP). Variáveis necessárias: `NODE_ENV=production`, `GROQ_API_KEY`, `TOKEN_SECRET`, `DATABASE_URL`, `EMAIL_PROVIDER=brevo`, `BREVO_API_KEY`, `EMAIL_FROM`.
