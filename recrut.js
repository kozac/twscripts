// ==UserScript==
// @name         Continuous Recruiting Enhanced
// @version      0.1.3
// @description  Recruta automaticamente as unidades configuradas mantendo a fila de recrutamento sempre ativa. Inclui opções de refresh configurável, atualização automática e configuração de packs e quantidade de tropas por recrutamento.
// @author       Murilo KZC
// @match        https://*.tribalwars.com.br/*&screen=train*
// @match        https://*.tribalwars.com.br/*&screen=stable*
// @match        https://*.tribalwars.com.br/*&screen=barracks*
// @require      https://code.jquery.com/jquery-3.6.0.min.js
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
    const refreshIntervalMinutes = 15; // Alterar conforme necessário

    // Número máximo de packs na fila de recrutamento.
    const maxPacksInQueue = 2; // Alterar para o número desejado de packs

    // Quantidade de tropas a recrutar por pack.
    const unitsPerRecruit = 1; // Alterar conforme necessário

    // Configuração das unidades a recrutar
    const unidadesConfig = [
        { nome: "spear", recrutar: true, selector: ".unit_sprite_smaller.spear" },
        { nome: "sword", recrutar: false, selector: ".unit_sprite_smaller.sword" },
        { nome: "axe", recrutar: false, selector: ".unit_sprite_smaller.axe" },
        { nome: "spy", recrutar: false, selector: ".unit_sprite_smaller.spy" },
        { nome: "light", recrutar: false, selector: ".unit_sprite_smaller.light" },
        { nome: "heavy", recrutar: false, selector: ".unit_sprite_smaller.heavy" },
        { nome: "ram", recrutar: false, selector: ".unit_sprite_smaller.ram" },
        { nome: "catapult", recrutar: false, selector: ".unit_sprite_smaller.catapult" }
    ];

    // ===========================
    // Funções Auxiliares
    // ===========================

    // Função para gerar um tempo aleatório entre inferior e superior (em ms)
    function gerarTempoAleatorio(inferior, superior) {
        return Math.round(Math.random() * (superior - inferior) + inferior);
    }

    // Função para verificar e recrutar unidades
    function verificarERecrutar() {
        // Contar o número atual de packs na fila
        const currentPacks = $('.train_queue .queue_item').length;
        const packsToAdd = maxPacksInQueue - currentPacks;

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

        // Distribuir os packs entre as unidades configuradas
        for (let i = 0; i < packsToAdd; i++) {
            // Selecionar a unidade em ordem sequencial (round-robin)
            const unidade = unidadesParaRecrutar[i % unidadesParaRecrutar.length];

            // Verificar se a unidade está disponível para recrutamento
            if ($(unidade.selector).length > 0) {
                const input = $(`input[name=${unidade.nome}]`);
                if (input.length > 0 && !input.parent().is(":hidden")) {
                    input.val(unitsPerRecruit);
                    console.log(`Recrutando unidade: ${unidade.nome} com quantidade: ${unitsPerRecruit}`);
                } else {
                    console.warn(`Input para a unidade ${unidade.nome} não encontrado ou está oculto.`);
                    continue;
                }

                // Clicar no botão de recrutar
                $(".btn-recruit").click();
            } else {
                console.warn(`Elemento para a unidade ${unidade.nome} não encontrado.`);
            }
        }
    }

    // Função para inicializar o observador de mudanças na fila de recrutamento
    function iniciarObservador() {
        // Ajuste o seletor para a área correta da fila de recrutamento
        const targetNode = document.querySelector('.train_units'); // Verifique se este seletor está correto
        if (!targetNode) {
            console.warn("Elemento para observação não encontrado.");
            return;
        }

        const config = { childList: true, subtree: true };

        const callback = function(mutationsList, observer) {
            for (let mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    // Verificar se a fila está abaixo do máximo após a mudança
                    const currentPacks = $('.train_queue .queue_item').length;
                    if (currentPacks < maxPacksInQueue) {
                        verificarERecrutar();
                    }
                }
            }
        };

        const observer = new MutationObserver(callback);
        observer.observe(targetNode, config);
    }

    // Função para gerenciar o ciclo de verificação com intervalos aleatórios
    function iniciarCiclo() {
        const tempo = gerarTempoAleatorio(10000, 60000); // Entre 10s e 60s
        console.log(`Próxima verificação em ${tempo / 1000} segundos.`);
        setTimeout(() => {
            verificarERecrutar();
            iniciarCiclo();
        }, tempo);
    }

    // Função para agendar o refresh da página
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

    $(document).ready(function() {
        console.log("Script de recrutamento contínuo aprimorado iniciado.");

        verificarERecrutar(); // Verificação inicial

        iniciarCiclo(); // Iniciar ciclo de verificações

        iniciarObservador(); // Iniciar observador de mudanças na fila

        agendarRefresh(); // Agendar refresh da página, se configurado
    });

})();
