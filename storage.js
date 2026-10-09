/**
 * CAMADA DE ARMAZENAMENTO DA DUCTOR AI
 * ------------------------------------------------------------------
 * O servidor não sabe (nem precisa saber) onde os dados ficam.
 *  - Sem DATABASE_URL  -> arquivos JSON locais (desenvolvimento no seu PC)
 *  - Com DATABASE_URL  -> PostgreSQL (produção / hospedagem gratuita)
 * Os dois modos expõem exatamente a mesma interface assíncrona.
 */
const fs = require('fs');
const path = require('path');

const dadosPadrao = () => ({
    chats: [],
    settings: { theme: 'dark', fontSize: 'normal', language: null },
    avatar: null
});

function erroEmailEmUso() {
    const e = new Error('EMAIL_TAKEN');
    e.code = 'EMAIL_TAKEN';
    return e;
}

// ======================================================================
// MODO 1: ARQUIVOS JSON
// ======================================================================
function criarStorageJson(baseDir) {
    const arquivoUsuarios = path.join(baseDir, 'usuarios.json');
    const pastaDados = path.join(baseDir, 'dados_usuarios');

    function lerUsuarios() {
        try {
            if (!fs.existsSync(arquivoUsuarios)) return [];
            return JSON.parse(fs.readFileSync(arquivoUsuarios, 'utf8'));
        } catch (erro) {
            console.error('Erro ao ler usuarios.json:', erro);
            return [];
        }
    }

    function gravarAtomico(arquivo, conteudo) {
        const temporario = arquivo + '.tmp';
        fs.writeFileSync(temporario, conteudo);
        fs.renameSync(temporario, arquivo); // troca atômica: nunca deixa arquivo pela metade
    }

    const caminhoDados = (id) => path.join(pastaDados, `${parseInt(id, 10)}.json`);

    return {
        tipo: 'json',

        async iniciar() {
            fs.mkdirSync(pastaDados, { recursive: true });
            if (!fs.existsSync(arquivoUsuarios)) gravarAtomico(arquivoUsuarios, '[]');
        },

        async buscarUsuarioPorEmail(email) {
            return lerUsuarios().find(u => String(u.email).trim().toLowerCase() === email) || null;
        },

        async buscarUsuarioPorId(id) {
            return lerUsuarios().find(u => u.id === id) || null;
        },

        async criarUsuario({ name, email, password }) {
            // Sem "await" entre ler e gravar: o Node executa isso de forma indivisível
            const usuarios = lerUsuarios();
            if (usuarios.some(u => String(u.email).trim().toLowerCase() === email)) throw erroEmailEmUso();
            const novo = {
                id: usuarios.reduce((maior, u) => Math.max(maior, u.id), 0) + 1,
                name, email, password
            };
            usuarios.push(novo);
            gravarAtomico(arquivoUsuarios, JSON.stringify(usuarios, null, 2));
            return novo;
        },

        async atualizarSenha(id, hash) {
            const usuarios = lerUsuarios();
            const alvo = usuarios.find(u => u.id === id);
            if (!alvo) return false;
            alvo.password = hash;
            gravarAtomico(arquivoUsuarios, JSON.stringify(usuarios, null, 2));
            return true;
        },

        async lerDados(id) {
            try {
                const arquivo = caminhoDados(id);
                if (!fs.existsSync(arquivo)) return dadosPadrao();
                const salvo = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
                const base = dadosPadrao();
                return { ...base, ...salvo, settings: { ...base.settings, ...(salvo.settings || {}) } };
            } catch (erro) {
                console.error('Erro ao ler dados do usuário:', erro);
                return dadosPadrao();
            }
        },

        async gravarDados(id, dados) {
            gravarAtomico(caminhoDados(id), JSON.stringify(dados));
        }
    };
}

// ======================================================================
// MODO 2: POSTGRESQL (Neon, Supabase, Render Postgres, etc.)
// ======================================================================
function criarStoragePostgres(databaseUrl, baseDir, PoolClasse, legacyDir) {
    const Pool = PoolClasse || require('pg').Pool;
    const local = /localhost|127\.0\.0\.1/.test(databaseUrl);
    const pool = new Pool({
        connectionString: databaseUrl,
        ssl: local ? false : true, // bancos na nuvem exigem conexão criptografada
        max: 5,
        idleTimeoutMillis: 30000
    });
    pool.on('error', (e) => console.error('Erro inesperado no pool do Postgres:', e.message));

    async function importarJsonSeExistir() {
        const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM users');
        if (rows[0].n > 0) return;

        const origem = [baseDir, legacyDir].filter(Boolean).find(d => fs.existsSync(path.join(d, 'usuarios.json')));
        if (!origem) return;

        const usuarios = JSON.parse(fs.readFileSync(path.join(origem, 'usuarios.json'), 'utf8'));
        for (const u of usuarios) {
            await pool.query(
                'INSERT INTO users (id, name, email, password) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
                [u.id, u.name, String(u.email).trim().toLowerCase(), u.password]
            );
            const dados = path.join(origem, 'dados_usuarios', `${u.id}.json`);
            if (fs.existsSync(dados)) {
                await pool.query(
                    'INSERT INTO user_data (user_id, data) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [u.id, fs.readFileSync(dados, 'utf8')]
                );
            }
        }
        await pool.query("SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE((SELECT MAX(id) FROM users), 1))");
        console.log(`📦 ${usuarios.length} usuário(s) importado(s) do JSON para o PostgreSQL.`);
    }

    return {
        tipo: 'postgres',

        async iniciar() {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT NOT NULL UNIQUE,
                    password TEXT NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )`);
            await pool.query(`
                CREATE TABLE IF NOT EXISTS user_data (
                    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                    data JSONB NOT NULL,
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )`);
            await importarJsonSeExistir();
        },

        async buscarUsuarioPorEmail(email) {
            const { rows } = await pool.query('SELECT id, name, email, password FROM users WHERE email = $1', [email]);
            return rows[0] || null;
        },

        async buscarUsuarioPorId(id) {
            const { rows } = await pool.query('SELECT id, name, email, password FROM users WHERE id = $1', [id]);
            return rows[0] || null;
        },

        async criarUsuario({ name, email, password }) {
            try {
                const { rows } = await pool.query(
                    'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, password',
                    [name, email, password]
                );
                return rows[0];
            } catch (erro) {
                if (erro.code === '23505') throw erroEmailEmUso(); // violação de UNIQUE
                throw erro;
            }
        },

        async atualizarSenha(id, hash) {
            const r = await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hash, id]);
            return r.rowCount > 0;
        },

        async lerDados(id) {
            const { rows } = await pool.query('SELECT data FROM user_data WHERE user_id = $1', [id]);
            const base = dadosPadrao();
            if (!rows[0]) return base;
            const salvo = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
            return { ...base, ...salvo, settings: { ...base.settings, ...(salvo.settings || {}) } };
        },

        async gravarDados(id, dados) {
            await pool.query(
                `INSERT INTO user_data (user_id, data) VALUES ($1, $2)
                 ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
                [id, JSON.stringify(dados)]
            );
        }
    };
}

function criarStorage(baseDir, opcoes = {}) {
    const url = opcoes.databaseUrl !== undefined ? opcoes.databaseUrl : process.env.DATABASE_URL;
    return url ? criarStoragePostgres(url, baseDir, opcoes.Pool, opcoes.legacyDir) : criarStorageJson(baseDir);
}

module.exports = { criarStorage, criarStorageJson, criarStoragePostgres, dadosPadrao };
