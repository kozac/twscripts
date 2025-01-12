// ==UserScript==
// @name         Scavenge Auto
// @version      1.0.6
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

    function randomTime(superior, inferior) {
        return Math.round(inferior + Math.random() * (superior - inferior));
    }

    const Scavange = new function () {
        // Pesos originais de cada “slot” de coleta
        const scavangesWeight = [15, 6, 3, 2];

        // Bloqueadas (botão Desbloquear)
        const getBlockedScavanges = () => {
            return document.querySelectorAll("a.btn.unlock-button").length;
        };

        // Em desbloqueio (contagem regressiva, .unlocking-view)
        const getUnlockingScavanges = () => {
            return document.querySelectorAll(".unlocking-view").length;
        };

        // Botões de envio (free_send_button)
        const getAvailableScavanges = () => {
            return document.querySelectorAll("a.btn.free_send_button");
        };

        // Soma de pesos das coletas realmente “ativas”
        // (i.e., as que não estão bloqueadas nem desbloqueando)
        const getScavangeWeight = () => {
            const blockedCount = getBlockedScavanges();
            const unlockingCount = getUnlockingScavanges();
            // total “inativos”
            const totalNotAvailable = blockedCount + unlockingCount;

            // Ex.: se totalNotAvailable = 2 e scavangesWeight=[15,6,3,2],
            // slice(0, -2) => [15,6]
            // Se totalNotAvailable = 1, slice(0, -1) => [15,6,3]
            let activeWeights = scavangesWeight;
            if (totalNotAvailable > 0) {
                activeWeights = scavangesWeight.slice(0, scavangesWeight.length - totalNotAvailable);
            }

            return activeWeights.reduce((sum, w) => sum + w, 0);
        };

        // Mesma lógica do script antigo: troops exceto cavalo leve/paladino
        const getAvailableTroops = () => {
            const unitsToAvoid = ["knight", "light"];
            const troopsEntries = document.querySelectorAll(".units-entry-all");
            const responseTroops = [];
            troopsEntries.forEach(troop => {
                const unitType = troop.getAttribute("data-unit");
                if (!unitsToAvoid.includes(unitType)) {
                    const qttText = troop.textContent.match(/\((\d+)\)/);
                    const quantity = qttText ? parseInt(qttText[1]) : 0;
                    responseTroops.push({
                        unit: unitType,
                        quantity: quantity
                    });
                }
            });
            return responseTroops;
        };

        // Recebe um `weight` (tipo 15, 6, 3, 2) e distribui tropas
        // conforme a proporção weight/totalWeight
        const calculateScavangeTroops = (weight, troops) => {
            const totalWeight = getScavangeWeight(); // soma dos pesos “ativos”
            return troops.map(troop => {
                const quantityToSend = Math.floor((troop.quantity * weight) / totalWeight);
                return {
                    unit: troop.unit,
                    quantityToSend
                };
            });
        };

        // De fato coloca as tropas no input e clica
        const sendScavange = (weight, troops, element) => {
            const troopsToSend = calculateScavangeTroops(weight, troops);
            troopsToSend.forEach(troopToSend => {
                if (troopToSend.quantityToSend > 0) {
                    const input = document.querySelector(`input[name="${troopToSend.unit}"]`);
                    if (input) {
                        input.value = troopToSend.quantityToSend;
                        // disparamos o .change() p/ o jogo reconhecer
                        $(input).change();
                    }
                }
            });
            element.click();
            console.log(`Enviado coleta com peso ${weight}`);
        };

        // Tenta desbloquear a próxima coleta
        const attemptUnlock = () => {
            const blocked = document.querySelectorAll("a.btn.unlock-button");
            if (!blocked || blocked.length === 0) return;

            // Clica no primeiro
            blocked[0].click();
            console.log("Tentando desbloquear...");

            // Espera popup
            setTimeout(() => {
                const popups = document.querySelectorAll(".popup_box.show");
                if (popups.length === 0) {
                    console.log("Popup de desbloqueio não encontrado");
                    return;
                }
                const popup = popups[popups.length -1];
                const unlockPopupButton = popup.querySelector("a.btn.btn-default:not(.btn-disabled)");
                if (unlockPopupButton) {
                    unlockPopupButton.click();
                    console.log("Desbloqueio efetuado");
                    // Fecha e reinicia
                    setTimeout(() => {
                        const closeButton = popup.querySelector("a.popup_box_close");
                        if (closeButton) {
                            closeButton.click();
                            console.log("Popup fechado");
                        }
                        Scavange.init();
                    }, 1000);
                } else {
                    console.log("Recursos insuficientes para desbloquear");
                    const closeButton = popup.querySelector("a.popup_box_close");
                    if (closeButton) {
                        closeButton.click();
                    }
                }
            }, 1000);
        };

        this.init = () => {
            // Se já estiver desbloqueando, não tenta “desbloquear” outra
            if (getUnlockingScavanges() === 0) {
                attemptUnlock();
            } else {
                console.log("Já existe coleta em desbloqueio, não tentarei outra agora.");
            }

            // Montamos as tropas e vemos quais coletas tem .free_send_button
            const troops = getAvailableTroops();
            const availableButtons = getAvailableScavanges();
            
            // Quantas coletas estão efetivamente livres?
            // Ex.: se 1 locked, 1 unlocking => totalNotAvailable=2 => 2 livres
            const blockedCount = getBlockedScavanges();
            const unlockingCount = getUnlockingScavanges();
            const scavengeUnlocked = scavangesWeight.length - (blockedCount + unlockingCount);

            if (availableButtons.length >= scavengeUnlocked && scavengeUnlocked > 0) {
                // Igual ao script antigo: loop das coletas disponíveis
                for (let i = 0; i < scavengeUnlocked; i++) {
                    // weight = scavangesWeight[i], ex.: 15 pra 1ª, 6 pra 2ª
                    const weight = scavangesWeight[i];
                    const element = availableButtons[i];
                    // atraso para evitar clique simultâneo
                    const delayTime = 3000 + 3000 * i;
                    setTimeout(() => sendScavange(weight, troops, element), delayTime);
                }
            } else {
                console.log("Não há coletas suficientes (ou livres) para enviar agora.");
            }
        };
    };

    $(document).ready(() => {
        setTimeout(() => {
            Scavange.init();
            // Repetir a cada 1 min
            setInterval(() => Scavange.init(), 60000);
        }, 1000);
    });

    // Recarrega entre 5 e 10 minutos
    const reloadTime = randomTime(300000, 600000);
    console.log(`Recarregará a página em ${reloadTime / 1000} segundos`);
    setInterval(() => {
        console.log("Recarregando a página...");
        location.reload(true);
    }, reloadTime);

})();
