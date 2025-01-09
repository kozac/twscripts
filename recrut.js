// ==UserScript==
// @name         Continuous Recruiting Enhanced
// @version      0.1.13
// @description  Recruta automaticamente as unidades configuradas mantendo a fila de recrutamento sempre ativa. Inclui opções de refresh configurável, atualização automática e configuração de packs e quantidade de tropas por recrutamento.
// @author       Murilo KZC
// @include        **screen=train*
// @include        **screen=stable*
// @include        **screen=barracks*
// @grant        none
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/kozac/twscripts/main/recrut.js
// @downloadURL  https://raw.githubusercontent.com/kozac/twscripts/main/recrut.js
// ==/UserScript==

(function() {
    'use strict';

    // =======================
    // Configurações do Usuário
    // =======================

    // Intervalo de refresh em minutos. Defina como 0 para desativar o refresh automático.
    const refreshIntervalMinutes = 1; // Alterar conforme necessário

    // Número máximo de packs na fila de recrutamento.
    const maxPacksInQueue = 2; // Alterar para o número desejado de packs

    // Quantidade de tropas a recrutar por pack.
    const unitsPerRecruit = 1; // Alterar conforme necessário

    // Configuração das unidades a recrutar
    const unidadesConfig = [
        { nome: "spear", recrutar: true, selector: 'input[name="spear"]' },
        { nome: "sword", recrutar: false, selector: 'input[name="sword"]' },
        { nome: "axe", recrutar: false, selector: 'input[name="axe"]' },
        { nome: "spy", recrutar: false, selector: 'input[name="spy"]' },
        { nome: "light", recrutar: false, selector: 'input[name="light"]' },
        { nome: "heavy", recrutar: false, selector: 'input[name="heavy"]' },
        { nome: "ram", recrutar: false, selector: 'input[name="ram"]' },
        { nome: "catapult", recrutar: false, selector: 'input[name="catapult"]' }
    ];

    // Flag para evitar recrutamentos simultâneos
    let isAddingPack = false;

    // ===========================
    // Funções Auxiliares
    // ===========================

    /**
     * Gera um tempo aleatório entre inferior e superior (em milissegundos)
     * @param {number} inferior - Limite inferior em ms
     * @param {number} superior - Limite superior em ms
     * @returns {number} - Tempo aleatório gerado
     */
    function gerarTempoAleatorio(inferior, superior) {
        return Math.round(Math.random() * (superior - inferior) + inferior);
    }

    /**
     * Conta o número de packs na fila de recrutamento
     * @returns {number} - Número de packs na fila
     */
    function contarPacksNaFila() {
        const fila = $('#trainqueue_barracks');
        let count = 0;
        if (fila.length > 0) {
            // Conta as linhas com a classe .sortable_row
            count += fila.find('.sortable_row').length;
        }
        // Conta a linha com a classe .lit (se existir)
        const litRow = $('#trainqueue_wrap_barracks tr.lit').length;
        count += litRow;
        return count;
    }

    /**
     * Verifica e recruta unidades conforme a configuração
     */
    function verificarERecrutar() {
        if (isAddingPack) {
            console.log("Já está adicionando um pack. Aguardando.");
            return;
        }
        try {
            const currentPacks = contarPacksNaFila();
            let packsToAdd = maxPacksInQueue - currentPacks;

            if (packsToAdd <= 0) {
                console.log(`Número máximo de packs na fila já alcançado (${maxPacksInQueue}).`);
                return;
            }

            console.log(`Packs na fila: ${currentPacks}. Adicionando ${packsToAdd} pack(s).`);

            // Selecionar as unidades que devem ser recrutadas
            const unidadesParaRecrutar = unidadesConfig.filter(unidade => unidade.recrutar);

            if (unidadesParaRecrutar.length === 0) {
                console.warn("Nenhuma unidade configurada para recrutamento.");
                return;
            }

            // Recrutar packs conforme necessário
            unidadesParaRecrutar.forEach(unidade => {
                if (packsToAdd <= 0) return; // Já adicionou o número necessário de packs

                const input = $(unidade.selector);
                if (input.length > 0 && input.is(':visible')) {
                    input.val(unitsPerRecruit);
                    console.log(`Recrutando unidade: ${unidade.nome} com quantidade: ${unitsPerRecruit}`);

                    // Clicar no botão de recrutar
                    const recrutarBtn = $('.btn-recruit');
                    if (recrutarBtn.length > 0 && recrutarBtn.is(':visible') && !recrutarBtn.prop('disabled')) {
                        isAddingPack = true;
                        recrutarBtn.click();
                        console.log(`Clique no botão de recrutar para ${unidade.nome}`);

                        // Adicionar um pequeno delay para evitar problemas
                        setTimeout(() => {
                            isAddingPack = false;
                            verificarERecrutar(); // Chamada recursiva após delay
                        }, 2000); // 2 segundos

                        packsToAdd--; // Reduzir o número de packs a adicionar
                    } else {
                        console.warn("Botão de recrutar não está disponível.");
                    }
                } else {
                    console.warn(`Input para a unidade ${unidade.nome} não encontrado ou não está visível.`);
                }
            });

        } catch (error) {
            console.error("Erro na função verificarERecrutar:", error);
        }
    }

    /**
     * Inicia o ciclo de verificação com intervalos aleatórios
     */
    function iniciarCiclo() {
        try {
            const tempo = gerarTempoAleatorio(10000, 60000); // Entre 10s e 60s
            console.log(`Próxima verificação em ${tempo / 1000} segundos.`);
            setTimeout(() => {
                verificarERecrutar();
                iniciarCiclo();
            }, tempo);
        } catch (error) {
            console.error("Erro na função iniciarCiclo:", error);
        }
    }

    /**
     * Agenda o refresh da página conforme a configuração
     */
    function agendarRefresh() {
        if (refreshIntervalMinutes <= 0) {
            console.log("Refresh automático desativado.");
            return;
        }

        const tempoMs = refreshIntervalMinutes * 60 * 1000;
        console.log(`A página será recarregada automaticamente em ${refreshIntervalMinutes} minutos.`);

        setTimeout(() => {
            console.log("Recarregando a página conforme configuração de refresh.");
            location.reload();
        }, tempoMs);
    }

    // ===========================
    // Inicialização do Script
    // ===========================

    /**
     * Espera até que o formulário de recrutamento e os inputs estejam disponíveis
     * @param {Function} callback - Função a ser chamada após a disponibilidade
     */
    function esperarInputsRecrutamento(callback) {
        const interval = setInterval(() => {
            const form = $('#train_form');
            if (form.length > 0) {
                // Verificar se pelo menos um input está presente e visível
                const inputsExistem = unidadesConfig.some(unidade => $(unidade.selector).length > 0 && $(unidade.selector).is(':visible'));
                if (inputsExistem) {
                    clearInterval(interval);
                    callback();
                }
            }
        }, 500); // Verifica a cada 500ms
    }

    esperarInputsRecrutamento(() => {
        try {
            console.log("Script de recrutamento contínuo aprimorado iniciado.");

            verificarERecrutar(); // Verificação inicial

            iniciarCiclo(); // Iniciar ciclo de verificações

            agendarRefresh(); // Agendar refresh da página, se configurado
        } catch (error) {
            console.error("Erro na inicialização do script:", error);
        }
    });

})();
