/**
 * RECORTE DE FOTO DE PERFIL
 * - Arrastar para posicionar, zoom (controle, roda do mouse, teclado), girar 90°
 * - Pré-visualização ao vivo em dois tamanhos (menu lateral e perfil)
 * - Exporta um JPEG quadrado de 256x256
 *
 * Uso:  const dataUrl = await window.abrirCropper(arquivo);   // null se o usuário cancelar
 */
(function () {
    const VIEW = 300;          // lado da área de edição (px)
    const CIRCLE = 260;        // diâmetro do círculo de recorte (px)
    const SAIDA = 256;         // tamanho final da foto
    const MAX_ARQUIVO = 15 * 1024 * 1024;
    const MAX_LADO = 2048;     // imagens maiores são reduzidas antes de editar (mais rápido)

    const modal = document.getElementById('crop-modal');
    if (!modal) return;
    const canvas = document.getElementById('crop-canvas');
    const ctx = canvas.getContext('2d');
    const slider = document.getElementById('crop-zoom');
    const prevSidebar = document.getElementById('crop-prev-sidebar');
    const prevProfile = document.getElementById('crop-prev-profile');

    let fonte = null;          // HTMLImageElement ou HTMLCanvasElement
    let sw = 0, sh = 0;        // tamanho da fonte
    let minEscala = 1;         // escala em que a imagem apenas cobre o círculo
    let zoom = 1;              // 1 = mínimo; 4 = máximo
    let cx = VIEW / 2, cy = VIEW / 2; // centro da imagem dentro da área de edição
    let resolver = null;
    let arrastando = null;

    // alta resolução em telas retina
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width = VIEW * dpr;
    canvas.height = VIEW * dpr;

    const escala = () => minEscala * zoom;
    const limitar = (v, min, max) => Math.min(Math.max(v, min), max);

    function erro(chave) {
        const e = new Error(chave);
        e.i18nKey = chave;
        return e;
    }

    // Mantém o círculo sempre dentro da imagem (nunca aparece "buraco" na foto)
    function enquadrar() {
        const s = escala();
        const mw = (sw * s) / 2;
        const mh = (sh * s) / 2;
        cx = limitar(cx, VIEW / 2 + CIRCLE / 2 - mw, VIEW / 2 - CIRCLE / 2 + mw);
        cy = limitar(cy, VIEW / 2 + CIRCLE / 2 - mh, VIEW / 2 - CIRCLE / 2 + mh);
    }

    // Região da imagem original que está dentro do círculo
    function regiaoDeCorte() {
        const s = escala();
        const lado = CIRCLE / s;
        let sx = (VIEW / 2 - CIRCLE / 2 - (cx - (sw * s) / 2)) / s;
        let sy = (VIEW / 2 - CIRCLE / 2 - (cy - (sh * s) / 2)) / s;
        sx = limitar(sx, 0, Math.max(0, sw - lado));
        sy = limitar(sy, 0, Math.max(0, sh - lado));
        return { sx, sy, lado };
    }

    function desenharEm(destino, tamanho) {
        const c = destino.getContext('2d');
        const { sx, sy, lado } = regiaoDeCorte();
        c.fillStyle = '#ffffff'; // fundo para PNG com transparência
        c.fillRect(0, 0, tamanho, tamanho);
        c.imageSmoothingQuality = 'high';
        c.drawImage(fonte, sx, sy, lado, lado, 0, 0, tamanho, tamanho);
    }

    function desenhar() {
        if (!fonte) return;
        enquadrar();
        const s = escala();

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, VIEW, VIEW);
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(fonte, cx - (sw * s) / 2, cy - (sh * s) / 2, sw * s, sh * s);

        // escurece tudo fora do círculo
        ctx.save();
        ctx.fillStyle = 'rgba(2, 6, 23, 0.68)';
        ctx.beginPath();
        ctx.rect(0, 0, VIEW, VIEW);
        ctx.arc(VIEW / 2, VIEW / 2, CIRCLE / 2, 0, Math.PI * 2, true);
        ctx.fill('evenodd');
        ctx.restore();

        // borda do círculo + guias de terços
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(VIEW / 2, VIEW / 2, CIRCLE / 2, 0, Math.PI * 2);
        ctx.stroke();

        // previews ao vivo
        desenharEm(prevSidebar, prevSidebar.width);
        desenharEm(prevProfile, prevProfile.width);
    }

    function definirZoom(novo) {
        const antes = escala();
        zoom = limitar(novo, 1, 4);
        const razao = escala() / antes;
        // mantém o ponto central do círculo fixo enquanto o zoom muda
        cx = VIEW / 2 + (cx - VIEW / 2) * razao;
        cy = VIEW / 2 + (cy - VIEW / 2) * razao;
        slider.value = zoom;
        desenhar();
    }

    function iniciarFonte(origem) {
        fonte = origem;
        sw = origem.width;
        sh = origem.height;
        minEscala = CIRCLE / Math.min(sw, sh);
        zoom = 1;
        cx = VIEW / 2;
        cy = VIEW / 2;
        slider.value = 1;
    }

    // Reduz fotos gigantes de celular (ex.: 4000x3000) antes de editar
    function reduzirSeNecessario(img) {
        const maior = Math.max(img.naturalWidth, img.naturalHeight);
        if (maior <= MAX_LADO) {
            img.width = img.naturalWidth;
            img.height = img.naturalHeight;
            return img;
        }
        const f = MAX_LADO / maior;
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * f);
        c.height = Math.round(img.naturalHeight * f);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        return c;
    }

    function carregarImagem(arquivo) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(arquivo);
            const img = new Image();
            img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
            img.onerror = () => { URL.revokeObjectURL(url); reject(erro('crop.error')); };
            img.src = url;
        });
    }

    function girar() {
        if (!fonte) return;
        const c = document.createElement('canvas');
        c.width = sh;
        c.height = sw;
        const g = c.getContext('2d');
        g.translate(sh, 0);
        g.rotate(Math.PI / 2); // 90° no sentido horário
        g.drawImage(fonte, 0, 0);
        iniciarFonte(c);
        desenhar();
    }

    function gerarSaida() {
        const c = document.createElement('canvas');
        c.width = SAIDA;
        c.height = SAIDA;
        desenharEm(c, SAIDA);
        return c.toDataURL('image/jpeg', 0.88);
    }

    function fechar(resultado) {
        modal.classList.remove('open');
        fonte = null;
        const r = resolver;
        resolver = null;
        if (r) r(resultado);
    }

    // ---------- interação: arrastar ----------
    const pxPorUnidade = () => VIEW / canvas.getBoundingClientRect().width;

    canvas.addEventListener('pointerdown', (e) => {
        if (!fonte) return;
        canvas.setPointerCapture(e.pointerId);
        arrastando = { x: e.clientX, y: e.clientY, cx, cy };
        canvas.classList.add('grabbing');
    });
    canvas.addEventListener('pointermove', (e) => {
        if (!arrastando) return;
        const k = pxPorUnidade();
        cx = arrastando.cx + (e.clientX - arrastando.x) * k;
        cy = arrastando.cy + (e.clientY - arrastando.y) * k;
        desenhar();
    });
    const soltar = () => { arrastando = null; canvas.classList.remove('grabbing'); };
    canvas.addEventListener('pointerup', soltar);
    canvas.addEventListener('pointercancel', soltar);

    // ---------- interação: zoom e teclado ----------
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        definirZoom(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08));
    }, { passive: false });

    slider.addEventListener('input', () => definirZoom(parseFloat(slider.value)));
    document.getElementById('crop-zoom-in').addEventListener('click', () => definirZoom(zoom * 1.15));
    document.getElementById('crop-zoom-out').addEventListener('click', () => definirZoom(zoom / 1.15));
    document.getElementById('crop-rotate').addEventListener('click', girar);

    canvas.addEventListener('keydown', (e) => {
        const passo = 10;
        const mapa = { ArrowLeft: [-passo, 0], ArrowRight: [passo, 0], ArrowUp: [0, -passo], ArrowDown: [0, passo] };
        if (mapa[e.key]) {
            e.preventDefault();
            cx += mapa[e.key][0];
            cy += mapa[e.key][1];
            desenhar();
        } else if (e.key === '+' || e.key === '=') {
            definirZoom(zoom * 1.1);
        } else if (e.key === '-') {
            definirZoom(zoom / 1.1);
        }
    });

    // ---------- botões do modal ----------
    document.getElementById('crop-save').addEventListener('click', () => fechar(gerarSaida()));
    document.getElementById('crop-cancel').addEventListener('click', () => fechar(null));
    document.getElementById('crop-close').addEventListener('click', () => fechar(null));
    modal.addEventListener('click', (e) => { if (e.target === modal) fechar(null); });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('open')) fechar(null);
    });

    // ---------- API pública ----------
    window.abrirCropper = async function (arquivo) {
        if (!arquivo || !arquivo.type.startsWith('image/')) throw erro('crop.not_image');
        if (arquivo.size > MAX_ARQUIVO) throw erro('crop.too_big');

        const img = await carregarImagem(arquivo);
        if (!img.naturalWidth || !img.naturalHeight) throw erro('crop.error');

        iniciarFonte(reduzirSeNecessario(img));
        modal.classList.add('open');
        desenhar();
        canvas.focus();

        return new Promise((resolve) => { resolver = resolve; });
    };

    // Exposto apenas para testes
    window.__cropperInterno = { limitar };
})();
