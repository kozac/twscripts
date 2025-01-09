// ==UserScript==
// @name         Scavenge Auto
// @version      0.0.2
// @description  Auto scavenge and unlock new options
// @author       Murilo KZC
// @include      **mode=scavenge*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/kozac/twscripts/main/scavenge.js
// @downloadURL  https://raw.githubusercontent.com/kozac/twscripts/main/scavenge.js
// ==/UserScript==

// (Conteúdo do script permanece o mesmo)
(function () {
    "use strict";

    // Função para gerar tempo aleatório entre superior e inferior (em milissegundos)
    function randomTime(superior, inferior) {
        return Math.round(inferior + Math.random() * (superior - inferior));
    }

    const Scavange = new function () {
        const scavangesWeight = [15, 6, 3, 2]; // Pesos para cada tipo de coleta

        // Função para obter todas as coletas bloqueadas
        const getBlockedScavanges = () => {
            return Array.from(document.querySelectorAll("a.btn.unlock-button"));
        };

        // Função para obter todas as coletas disponíveis para envio
        const getAvailableScavanges = () => {
            return Array.from(document.querySelectorAll("a.btn.free_send_button"));
        };

        // Função para obter o peso total das coletas desbloqueadas
        const getScavangeWeight = () => {
            const blockedScavanges = getBlockedScavanges().length;
            let weightArray = scavangesWeight.slice(0, scavangesWeight.length - blockedScavanges);
            return weightArray.reduce((total, weight) => total + weight, 0);
        };

        // Função para obter as tropas disponíveis, excluindo certas unidades
        const getAvailableTroops = () => {
            const unitsToAvoid = ["knight", "light"];
            let responseTroops = [];
            const troops = document.querySelectorAll(".units-entry-all");

            troops.forEach(troop => {
                const unitType = troop.getAttribute("data-unit");
                if (!unitsToAvoid.includes(unitType)) {
                    const quantityText = troop.textContent.match(/\((\d+)\)/);
                    const quantity = quantityText ? parseInt(quantityText[1]) : 0;
                    responseTroops.push({
                        unit: unitType,
                        quantity: quantity
                    });
                }
            });

            return responseTroops;
        };

        // Função para calcular a quantidade de tropas a enviar com base nos pesos
        const calculateScavangeTroops = (scavangeWeight, troops) => {
            const totalWeight = getScavangeWeight();
            return troops.map(troop => ({
                unit: troop.unit,
                quantityToSend: Math.floor((troop.quantity * scavangeWeight) / totalWeight)
            }));
        };

        // Função para enviar a coleta
        const sendScavange = (weight, troops, element) => {
            const troopsToSend = calculateScavangeTroops(weight, troops);
            troopsToSend.forEach(troopToSend => {
                if (troopToSend.quantityToSend > 0) {
                    const input = document.querySelector(`input[name="${troopToSend.unit}"]`);
                    if (input) {
                        input.value = troopToSend.quantityToSend;
                        $(input).change();
                    }
                }
            });
            element.click();
            console.log(`Enviado coleta com peso ${weight}`);
        };

        // Função para tentar desbloquear uma coleta
        const attemptUnlock = () => {
            const blockedScavanges = getBlockedScavanges();
            if (blockedScavanges.length === 0) return; // Nenhuma coleta bloqueada

            // Desbloquear a primeira coleta bloqueada
            const unlockButton = blockedScavanges[0];
            unlockButton.click();
            console.log('Tentando desbloquear uma coleta');

            // Esperar a popup de desbloqueio aparecer
            setTimeout(() => {
                const popups = document.querySelectorAll('.popup_box.show');
                if (popups.length === 0) {
                    console.log('Popup de desbloqueio não encontrado');
                    return;
                }

                const popup = popups[popups.length -1]; // Seleciona o último popup aberto

                // Verificar se o botão de desbloqueio está habilitado
                const unlockPopupButton = popup.querySelector('a.btn.btn-default:not(.btn-disabled)');
                if (unlockPopupButton) {
                    unlockPopupButton.click();
                    console.log('Desbloqueio efetuado');

                    // Fechar a popup após desbloquear
                    setTimeout(() => {
                        const closeButton = popup.querySelector('a.popup_box_close');
                        if (closeButton) {
                            closeButton.click();
                            console.log('Popup de desbloqueio fechado');
                        }
                        // Re-iniciar o processo após desbloquear
                        Scavange.init();
                    }, 1000);
                } else {
                    console.log('Recursos insuficientes para desbloquear');
                    // Fechar a popup se não for possível desbloquear
                    const closeButton = popup.querySelector('a.popup_box_close');
                    if (closeButton) {
                        closeButton.click();
                        console.log('Popup de desbloqueio fechado sem efetuar desbloqueio');
                    }
                }
            }, 1000); // Tempo para a popup carregar
        };

        // Função principal de inicialização
        this.init = () => {
            // Tentar desbloquear coletas primeiro
            attemptUnlock();

            // Enviar coletas disponíveis
            const troops = getAvailableTroops();
            const availableScavanges = getAvailableScavanges();
            const scavangesUnlocked = scavangesWeight.length - getBlockedScavanges().length;

            if (availableScavanges.length >= scavangesUnlocked) {
                availableScavanges.forEach((element, index) => {
                    const weight = scavangesWeight[index];
                    const delayTime = 3000 + 3000 * index; // Atraso para evitar cliques simultâneos
                    setTimeout(() => sendScavange(weight, troops, element), delayTime);
                });
            } else {
                console.log('Não há coletas suficientes disponíveis para enviar');
            }
        };
    };

    // Inicializar o script após o carregamento da página
    $(document).ready(() => {
        // Espera 1 segundo após o carregamento para iniciar
        setTimeout(() => {
            Scavange.init();

            // Tenta desbloquear coletas a cada 1 minuto
            setInterval(() => {
                Scavange.init();
            }, 60000); // 60.000 ms = 1 minuto

        }, 1000);
    });

    // Configurar recarregamento da página entre 5 e 10 minutos
    const reloadTime = randomTime(300000, 600000); // 5 a 10 minutos
    console.log(`Recarregará a página em ${reloadTime / 1000} segundos`);
    setInterval(() => {
        console.log("Recarregando a página...");
        location.reload(true);
    }, reloadTime);

})();
