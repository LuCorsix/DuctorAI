/**
 * Descobre onde está a API.
 *  - Site e API no mesmo endereço (produção, ou http://localhost:3001) -> "/api"
 *  - Abrindo os arquivos por outra porta no PC (ex.: Live Server :5500)  -> http://localhost:3001/api
 */
(function () {
    const h = window.location.hostname;
    const local = h === 'localhost' || h === '127.0.0.1';
    const mesmoServidor = window.location.port === '3001' || !local;
    window.API_BASE = mesmoServidor ? '/api' : 'http://localhost:3001/api';
})();

/**
 * REDE DE SEGURANÇA
 * 1) O formulário do chat NUNCA recarrega a página (recarregar parece "chat novo" e apaga o que foi digitado).
 * 2) Se algum script quebrar, aparece uma faixa vermelha com o motivo (em vez de a tela simplesmente "não fazer nada").
 */
document.addEventListener('submit', function (e) {
    if (e.target && e.target.id === 'chat-form') e.preventDefault();
}, true);

(function () {
    function mostrar(texto) {
        if (!document.body || !texto || /ResizeObserver/.test(texto)) return;
        let faixa = document.getElementById('erro-global');
        if (!faixa) {
            faixa = document.createElement('div');
            faixa.id = 'erro-global';
            faixa.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#7f1d1d;color:#fff;font:13px/1.4 sans-serif;padding:10px 14px;text-align:center;';
            document.body.appendChild(faixa);
        }
        faixa.textContent = 'Erro na página: ' + texto + ' (pressione F12 e veja a aba Console)';
    }
    window.addEventListener('error', function (e) { mostrar(e.message); });
    window.addEventListener('unhandledrejection', function (e) { mostrar(e.reason && e.reason.message ? e.reason.message : String(e.reason)); });
})();
