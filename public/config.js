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
