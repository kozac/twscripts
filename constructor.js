

// ==UserScript==
// @name                Upador Automático Tribal Wars com Recrutamento de Paladino
// @namespace           Murilo KZC
// @include             **screen=main*
// @version             0.1.0
// @grant               GM_getResourceText
// @grant               GM_addStyle
// @grant               GM_getValue
// @grant               unsafeWindow
// @grant               none
// @updateURL    https://raw.githubusercontent.com/kozac/twscripts/main/constructor.js
// @downloadURL  https://raw.githubusercontent.com/kozac/twscripts/main/constructor.js
// ==/UserScript==


//*************************** CONFIGURAÇÃO ***************************//
// Escolha Tempo de espera mínimo e máximo entre ações (em milissegundos)
const Min_Tempo_Espera = 800000; // 13 minutos 20 segundos
const Max_Tempo_Espera = 900000; // 15 minutos

// Etapa_1: Upar o bot automaticamente em Série de Edifícios
const Etapa = "Etapa_1";

// Escolha se você deseja que o bot enfileire os edifícios na ordem definida (= true) ou
// assim que um prédio estiver disponível para a fila de construção (= false)
const Construção_Edificios_Ordem = true;

// Configuração para coletar recompensas de quests
const Quest_Interval_Minutes = 1; // em minutos, padrão 10
const Quest_Interval = Quest_Interval_Minutes * 60 * 1000;

// Nível alvo da estátua para iniciar o recrutamento do paladino
const NivelEstatuaAlvo = "Nível 1";
const COOKIE_RECRUTAMENTO = "recrutadoPaladino"; // Nome do cookie
const DIAS_VALIDADE_COOKIE = 99; // Validade do cookie em dias
//*************************** /CONFIGURAÇÃO ***************************//

// Constantes (NÃO DEVE SER ALTERADAS)
const Visualização_Geral = "OVERVIEW_VIEW";
const Edificio_Principal = "HEADQUARTERS_VIEW";

// Flag para controlar o processo de recrutamento
let isRecruiting = false;

// ID da aldeia atual
let currentVillageId = null;

// CSRF Token
let csrfToken = null;

(function () {
    'use strict';

    console.log("-- Script do Tribal Wars ativado --");

    // Criar a UI para exibir o próximo edifício
    createBuildingUI();

    if (Etapa === "Etapa_1") {
        executarEtapa1();
    }

    // Configurar intervalo para coletar recompensas de quests
    setInterval(collectQuestRewards, Quest_Interval);

    // Configurar intervalo para verificar a conclusão da estátua
    setInterval(verificarEstatua, 5000); // Verifica a cada 5 segundos

})();

//*************************** FUNÇÕES DE CONSTRUÇÃO ***************************//

// Etapa 1: Construção
function executarEtapa1() {
    let Evoluir_vilas = getEvoluir_vilas();
    console.log("Evoluir_vilas: " + Evoluir_vilas);
    if (Evoluir_vilas === Edificio_Principal) {
        setInterval(function () {
            if (!isRecruiting) { // Verifica se não está no processo de recrutamento
                // Construir qualquer edifício custeável, se possível
                Proxima_Construção();
            }
        }, 1000);
    }
    else if (Evoluir_vilas === Visualização_Geral) {
        // Visualização Geral PG
        let l_main = document.getElementById("l_main");
        if (l_main && l_main.children.length > 0 && l_main.children[0].children.length > 0) {
            l_main.children[0].children[0].click();
            console.log("Clicou no botão de Visualização Geral.");
        }
        else {
            console.log("Botão de Visualização Geral não encontrado.");
        }
    }
}

// Gerenciamento da fila de construção
setInterval(function () {
    var tr = $('#buildqueue').find('tr').eq(1);

    if (tr.length > 0) {
        let text = tr.find('td').eq(1).find('span').eq(0).text().trim().replace(/\s/g, "");
        let timeSplit = text.split(':');

        if (timeSplit.length === 3) {
            let seconds = parseInt(timeSplit[0], 10) * 60 * 60 + parseInt(timeSplit[1], 10) * 60 + parseInt(timeSplit[2], 10);
            if (seconds < 3 * 60) {
                console.log("Completar Grátis");
                tr.find('td').eq(2).find('a').eq(2).click();
            }
        }
    }

    // Missão concluída - Tenta clicar em qualquer botão de confirmação visível
    $('.btn.btn-confirm-yes').each(function () {
        if (!$(this).hasClass('hidden') && !$(this).is(':disabled')) {
            $(this).click();
            console.log("Clicou no botão de confirmação.");
        }
    });

}, 500);

// Ação do processo
let delay = Math.floor(Math.random() * (Max_Tempo_Espera - Min_Tempo_Espera) + Min_Tempo_Espera);

// Ação do processo após o delay
setTimeout(function () {
    let Evoluir_vilas = getEvoluir_vilas();
    console.log("Ação após delay. Evoluir_vilas: " + Evoluir_vilas);
    if (Evoluir_vilas === Edificio_Principal) {
        if (!isRecruiting) { // Verifica se não está no processo de recrutamento
            // Construir qualquer edifício custeável, se possível
            Proxima_Construção();
        }
    }
    else if (Evoluir_vilas === Visualização_Geral) {
        // Visualização Geral Pag
        let l_main = document.getElementById("l_main");
        if (l_main && l_main.children.length > 0 && l_main.children[0].children.length > 0) {
            l_main.children[0].children[0].click();
            console.log("Clicou no botão de Visualização Geral.");
        }
        else {
            console.log("Botão de Visualização Geral não encontrado.");
        }
    }
}, delay);

// Função para obter a visualização atual
function getEvoluir_vilas() {
    let currentUrl = window.location.href;
    console.log("Current URL: " + currentUrl); // Para depuração

    if (currentUrl.includes('overview') || currentUrl.includes('Visualização Geral')) {
        return Visualização_Geral;
    }
    else if (currentUrl.includes('main')) {
        // Extrai o ID da aldeia atual
        const urlParams = new URLSearchParams(window.location.search);
        currentVillageId = urlParams.get('village');
        console.log("ID da Aldeia Atual: " + currentVillageId);

        // Extrai o token CSRF
        csrfToken = getCSRFToken();
        console.log("Token CSRF: " + csrfToken);

        return Edificio_Principal;
    }
    else {
        console.log("Não foi possível determinar a visualização atual.");
        return undefined;
    }
}

// Função para extrair o token CSRF
function getCSRFToken() {
    // Geralmente, o token CSRF está presente em um campo oculto do formulário
    let csrfInput = document.querySelector('input[name="h"]');
    if (csrfInput) {
        return csrfInput.value;
    }
    // Alternativamente, pode estar em uma variável JavaScript
    let csrfMeta = document.querySelector('meta[name="csrf-token"]');
    if (csrfMeta) {
        return csrfMeta.getAttribute('content');
    }
    console.log("Token CSRF não encontrado.");
    return null;
}

// Função para obter a próxima construção
function Proxima_Construção() {
    let Construção_proximo_edificio = getConstrução_proximo_edificio();
    if (Construção_proximo_edificio !== undefined) {
        Construção_proximo_edificio.click();
        console.log("Clicked on " + Construção_proximo_edificio.id);

        // Utilizar o ID do botão de construção para exibir na UI
        let buildingID = Construção_proximo_edificio.id;
        updateBuildingUI(buildingID);
        console.log("Próximo Edifício: " + buildingID);
    }
}

function getConstrução_proximo_edificio() {
    let Construção_Edifcios_Serie = getConstrução_Edifcios_Serie();
    let instituir;
    while (instituir === undefined && Construção_Edifcios_Serie.length > 0) {
        var proximo = Construção_Edifcios_Serie.shift();
        let próximo_edifício = document.getElementById(proximo);
        if (próximo_edifício) {
            var Visivel = próximo_edifício.offsetWidth > 0 || próximo_edifício.offsetHeight > 0;
            if (Visivel) {
                instituir = próximo_edifício;
            }
            if (Construção_Edificios_Ordem) {
                break;
            }
        }
    }
    return instituir;
}

function getConstrução_Edifcios_Serie() {
    var Sequência_Construção = [];

    // Estatua 1
    Sequência_Construção.push("main_buildlink_statue_1");

    // Bosque 1
    Sequência_Construção.push("main_buildlink_wood_1");
    // Argila 1
    Sequência_Construção.push("main_buildlink_stone_1");
    // Ferro 1
    Sequência_Construção.push("main_buildlink_iron_1");

    // Bosque 2
    Sequência_Construção.push("main_buildlink_wood_2");
    // Argila 2
    Sequência_Construção.push("main_buildlink_stone_2");
    // Ferro 2
    Sequência_Construção.push("main_buildlink_iron_2");

    // Bosque 3
    Sequência_Construção.push("main_buildlink_wood_3");
    // Argila 2
    Sequência_Construção.push("main_buildlink_stone_2");
    // Ferro 2
    Sequência_Construção.push("main_buildlink_iron_2");

    // Armazém 2
    Sequência_Construção.push("main_buildlink_storage_2");
    // Armazém 3
    Sequência_Construção.push("main_buildlink_storage_3");

    // Edifício Principal 2
    Sequência_Construção.push("main_buildlink_main_2");
    // Edifício Principal 3
    Sequência_Construção.push("main_buildlink_main_3");

    // Quartel 1
    Sequência_Construção.push("main_buildlink_barracks_1");
    // Mercado 1
    Sequência_Construção.push("main_buildlink_market_1");

    // Fazenda 2
    Sequência_Construção.push("main_buildlink_farm_2");
    // Fazenda 3
    Sequência_Construção.push("main_buildlink_farm_3");

    // Argila 3
    Sequência_Construção.push("main_buildlink_stone_3");
    // Ferro 3
    Sequência_Construção.push("main_buildlink_iron_3");

    // Armazém 4
    Sequência_Construção.push("main_buildlink_storage_4");

    // Muralha 1
    Sequência_Construção.push("main_buildlink_wall_1");
    // Muralha 2
    Sequência_Construção.push("main_buildlink_wall_2");

    // Mercado 2
    Sequência_Construção.push("main_buildlink_market_2");

    // Bosque 4
    Sequência_Construção.push("main_buildlink_wood_4");
    // Argila 4
    Sequência_Construção.push("main_buildlink_stone_4");
    // Ferro 4
    Sequência_Construção.push("main_buildlink_iron_4");

    // Esconderijo 2
    Sequência_Construção.push("main_buildlink_hide_2");
    // Esconderijo 3
    Sequência_Construção.push("main_buildlink_hide_3");

    // Quartel 2
    Sequência_Construção.push("main_buildlink_barracks_2");

    // Bosque 5
    Sequência_Construção.push("main_buildlink_wood_5");
    // Bosque 6
    Sequência_Construção.push("main_buildlink_wood_6");
    // Bosque 7
    Sequência_Construção.push("main_buildlink_wood_7");

    // Armazém 5
    Sequência_Construção.push("main_buildlink_storage_5");

    // Fazenda 4
    Sequência_Construção.push("main_buildlink_farm_4");
    // Fazenda 5
    Sequência_Construção.push("main_buildlink_farm_5");

    // Bosque 8
    Sequência_Construção.push("main_buildlink_wood_8");
    // Argila 5
    Sequência_Construção.push("main_buildlink_stone_5");
    // Argila 6
    Sequência_Construção.push("main_buildlink_stone_6");

    // Bosque 9
    Sequência_Construção.push("main_buildlink_wood_9");
    // Argila 7
    Sequência_Construção.push("main_buildlink_stone_7");
    // Ferro 5
    Sequência_Construção.push("main_buildlink_iron_5");

    // Armazém 6
    Sequência_Construção.push("main_buildlink_storage_6");
    // Fazenda 6
    Sequência_Construção.push("main_buildlink_farm_6");

    // Bosque 10
    Sequência_Construção.push("main_buildlink_wood_10");
    // Bosque 11
    Sequência_Construção.push("main_buildlink_wood_11");
    // Bosque 12
    Sequência_Construção.push("main_buildlink_wood_12");

    // Argila 8
    Sequência_Construção.push("main_buildlink_stone_8");
    // Ferro 6
    Sequência_Construção.push("main_buildlink_iron_6");

    // Armazém 7
    Sequência_Construção.push("main_buildlink_storage_7");

    // Bosque 13
    Sequência_Construção.push("main_buildlink_wood_13");
    // Argila 9
    Sequência_Construção.push("main_buildlink_stone_9");
    // Argila 10
    Sequência_Construção.push("main_buildlink_stone_10");
    // Ferro 7
    Sequência_Construção.push("main_buildlink_iron_7");

    // Bosque 14
    Sequência_Construção.push("main_buildlink_wood_14");
    // Argila 11
    Sequência_Construção.push("main_buildlink_stone_11");
    // Ferro 8
    Sequência_Construção.push("main_buildlink_iron_8");

    // Armazém 8
    Sequência_Construção.push("main_buildlink_storage_8");

    // Bosque 15
    Sequência_Construção.push("main_buildlink_wood_15");
    // Argila 12
    Sequência_Construção.push("main_buildlink_stone_12");
    // Ferro 9
    Sequência_Construção.push("main_buildlink_iron_9");

    // Armazém 9
    Sequência_Construção.push("main_buildlink_storage_9");

    // Fazenda 7
    Sequência_Construção.push("main_buildlink_farm_7");

    // Bosque 16
    Sequência_Construção.push("main_buildlink_wood_16");
    // Argila 13
    Sequência_Construção.push("main_buildlink_stone_13");
    // Ferro 10
    Sequência_Construção.push("main_buildlink_iron_10");

    // Armazém 10
    Sequência_Construção.push("main_buildlink_storage_10");

    // Fazenda 8
    Sequência_Construção.push("main_buildlink_farm_8");

    // Bosque 17
    Sequência_Construção.push("main_buildlink_wood_17");
    // Argila 14
    Sequência_Construção.push("main_buildlink_stone_14");
    // Ferro 11
    Sequência_Construção.push("main_buildlink_iron_11");

    // Bosque 18
    Sequência_Construção.push("main_buildlink_wood_18");
    // Argila 14
    Sequência_Construção.push("main_buildlink_stone_14");
    // Ferro 12
    Sequência_Construção.push("main_buildlink_iron_12");

    return Sequência_Construção;
}

//*************************** NOVA FUNCIONALIDADE ***************************//

// Funções de manipulação de cookies
function setCookie(nome, valor, dias) {
    const data = new Date();
    data.setTime(data.getTime() + (dias * 24 * 60 * 60 * 1000));
    const expires = "expires=" + data.toUTCString();
    document.cookie = nome + "=" + valor + ";" + expires + ";path=/";
}

function getCookie(nome) {
    const nomeEQ = nome + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nomeEQ) === 0) return c.substring(nomeEQ.length, c.length);
    }
    return null;
}

function checkCookie(nome) {
    const cookie = getCookie(nome);
    return cookie !== null;
}

function eraseCookie(nome) {
    document.cookie = nome + '=; Max-Age=-99999999; path=/';
}

// Função para verificar a conclusão da construção da estátua
function verificarEstatua() {
    if (isRecruiting) {
        // Já está no processo de recrutamento
        return;
    }
    if (checkCookie(COOKIE_RECRUTAMENTO)) {
        console.log("Recrutamento já realizado anteriormente.");
        return;
    }

    // Obter os níveis atuais dos edifícios
    let buildings = getCurrentBuildings();

    if (!buildings) {
        console.log("Não foi possível obter os níveis dos edifícios.");
        return;
    }
    const statueElement = document.querySelector('#main_buildrow_statue > td:nth-child(1) > span');

    // Obtém o texto dentro do elemento <span>
    let nivelEstatua = statueElement.textContent; // ou use spanElement.innerText
    console.log("Nível atual da estátua: " + nivelEstatua);

    if (nivelEstatua == NivelEstatuaAlvo) {
        console.log("Estátua atingiu o nível alvo. Iniciando recrutamento do paladino.");
        iniciarRecrutamentoPaladino();
    }
}

// Função para obter os níveis atuais dos edifícios a partir dos dados do jogo
function getCurrentBuildings() {
    // Tenta obter os dados a partir de uma variável global ou de um elemento da página
    // Adaptar conforme a estrutura real da página

    // Exemplo: Supondo que os dados estejam disponíveis em uma variável global `game_data`
    if (typeof unsafeWindow !== 'undefined' && unsafeWindow.game_data && unsafeWindow.game_data.village && unsafeWindow.game_data.village.buildings) {
        return unsafeWindow.game_data.village.buildings;
    }

    // Alternativamente, extrair dos elementos da página
    let buildings = {
        main: getBuildingLevel('main'),
        statue: getBuildingLevel('statue'),
        // Adicione outros edifícios conforme necessário
    };

    return buildings;
}

// Função para obter o nível de um edifício específico
function getBuildingLevel(buildingName) {
    let buildingElement = document.querySelector(`#main_buildlink_${buildingName} a`);
    if (buildingElement) {
        let levelText = buildingElement.textContent.match(/\d+/);
        return levelText ? levelText[0] : null;
    }
    return null;
}

// Função para iniciar o recrutamento do paladino
async function iniciarRecrutamentoPaladino() {
    isRecruiting = true; // Pausa as construções
    console.log("Processo de recrutamento iniciado. Pausando construções.");

    try {
        // Recrutar o paladino
        let recrutamentoResponse = await recrutarPaladino();
        console.log("Recrutamento do paladino concluído:", recrutamentoResponse);

        // Verificar se há erros na resposta
        if (recrutamentoResponse && recrutamentoResponse.error) {
            console.error("Erro no recrutamento do paladino:", recrutamentoResponse.error);
            return; // Sai da função sem definir o cookie

        }

        // Verificar se o recrutamento foi bem-sucedido
        if (recrutamentoResponse && recrutamentoResponse.knight && recrutamentoResponse.knight.id) {
            let knightId = recrutamentoResponse.knight.id;
            console.log("ID do Paladino Recrutado:", knightId);

            // Acelerar o recrutamento
            let aceleracaoResponse = await acelerarRecrutamento(knightId);
            console.log("Aceleração do recrutamento concluída:", aceleracaoResponse);

            // Opcional: Verificar erros na aceleração
            if (aceleracaoResponse && aceleracaoResponse.error) {
                console.error("Erro ao acelerar o recrutamento:", aceleracaoResponse.error);
                return; // Sai da função sem definir o cookie
            }

            // Se tudo ocorreu bem, define o cookie
            setCookie(COOKIE_RECRUTAMENTO, "true", DIAS_VALIDADE_COOKIE);
            console.log("Recrutamento bem-sucedido. Cookie definido.");
        } else {
            console.log("Resposta inesperada ao recrutar o paladino.");
            return; // Sai da função sem definir o cookie
        }

    } catch (error) {
        console.error("Erro durante o recrutamento do paladino:", error);
        // Não define o cookie em caso de erro
    } finally {
        isRecruiting = false; // Retoma as construções
        console.log("Processo de recrutamento concluído. Retomando construções.");
    }
}



// Função para recrutar o paladino
async function recrutarPaladino() {
    if (!currentVillageId || !csrfToken) {
        console.log("Dados necessários para recrutamento não disponíveis.");
        return null;
    }

    let url = `https://${window.location.host}/game.php?village=${currentVillageId}&screen=statue&ajaxaction=recruit`;
    let formData = new URLSearchParams();
    formData.append('home', currentVillageId);
    formData.append('name', 'Paul'); // Nome do paladino
    formData.append('h', csrfToken);

    let response = await fetch(url, {
        method: 'POST',
        headers: {
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest',
            // Outros cabeçalhos podem ser adicionados conforme necessário
        },
        body: formData.toString(),
        credentials: 'include' // Inclui cookies
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    let data = await response.json();
    return data;
}

// Função para acelerar o recrutamento do paladino
async function acelerarRecrutamento(knightId) {
    if (!currentVillageId || !csrfToken || !knightId) {
        console.log("Dados necessários para acelerar recrutamento não disponíveis.");
        return null;
    }

    let url = `https://${window.location.host}/game.php?village=${currentVillageId}&screen=statue&ajaxaction=recruit_rush`;
    let formData = new URLSearchParams();
    formData.append('knight', knightId);
    formData.append('home', currentVillageId);
    formData.append('h', csrfToken);

    let response = await fetch(url, {
        method: 'POST',
        headers: {
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest',
            // Outros cabeçalhos podem ser adicionados conforme necessário
        },
        body: formData.toString(),
        credentials: 'include' // Inclui cookies
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    let data = await response.json();
    console.log("Resposta da aceleração:", data);

    // Verificar se há erros na aceleração
    if (data && data.error) {
        console.error("Erro na aceleração:", data.error);
        return data;
    }

    return data;
}



//*************************** /NOVA FUNCIONALIDADE ***************************//

// Função para coletar recompensas de quests
function collectQuestRewards() {
    console.log("Iniciando coleta de recompensas de quests.");

    // Step 1: Verificar se o popup de quests já está aberto
    const popupContent = document.querySelector('.popup_box_content');
    if (popupContent && isElementVisible(popupContent)) {
        console.log("Popup de quests já está aberto.");
        processRewards();
        return;
    }

    // Step 2: Encontrar e clicar no botão que abre o popup de quests
    let questButton = document.querySelector('#new_quest');
    if (questButton) {
        questButton.click();
        console.log("Clicou no botão que abre o popup de quests.");
    } else {
        console.log("Botão para abrir o popup de quests não encontrado.");
        return;
    }

    // Step 3: Esperar até que o popup esteja aberto
    let popupOpenInterval = setInterval(function () {
        const popupContent = document.querySelector('.popup_box_content');
        if (popupContent && isElementVisible(popupContent)) {
            clearInterval(popupOpenInterval);
            console.log("Popup de quests aberto.");
            processRewards();
        }
    }, 500); // Verifica a cada 500ms
}

function processRewards() {
    // Step 4: Clicar na aba 'Recompensas' usando o seletor correto
    let recompensasTab = document.querySelector('a.tab-link[data-tab="reward-tab"]');
    if (recompensasTab) {
        recompensasTab.click();
        console.log("Clicou na aba 'Recompensas'.");
    } else {
        console.log("Aba 'Recompensas' não encontrada.");
        fecharPopup();
        return;
    }

    // Step 5: Esperar um pouco para a aba de recompensas carregar
    setTimeout(function () {
        // Step 6: Encontrar todos os botões 'Reivindicar'
        let reivindicarButtons = document.querySelectorAll('.reward-system-claim-button');
        if (reivindicarButtons.length > 0) {
            console.log(`Encontrou ${reivindicarButtons.length} botões 'Reivindicar'.`);
            reivindicarButtons.forEach(function (button, index) {
                if (!button.disabled && isElementVisible(button)) {
                    // Simular um pequeno atraso entre cliques para evitar detecção de bot
                    setTimeout(function () {
                        button.click();
                        console.log(`Clicou no botão 'Reivindicar' com data-reward-id=${button.getAttribute('data-reward-id')}.`);
                    }, index * 500); // 500ms entre cada clique
                }
            });
        } else {
            console.log("Nenhum botão 'Reivindicar' encontrado.");
        }

        // Step 7: Esperar um pouco para os diálogos de confirmação
        setTimeout(function () {
            // Step 8: Clicar nos botões de confirmação
            let confirmButtons = document.querySelectorAll('.btn.btn-confirm-yes');
            confirmButtons.forEach(function (button) {
                if (isElementVisible(button)) {
                    setTimeout(function () {
                        button.click();
                        console.log("Clicou no botão de confirmação.");
                    }, 500); // 500ms de atraso
                }
            });

            // Step 9: Fechar o popup
            setTimeout(function () {
                fecharPopup();
            }, 1000); // Espera 1 segundo antes de fechar
        }, 2000); // Espera 2 segundos para as confirmações aparecerem
    }, 1500); // Espera 1.5 segundos para a aba de recompensas carregar
}

function fecharPopup() {
    // Step 10: Encontrar e clicar no botão de fechar o popup
    // Tentando encontrar um botão de fechar com classes conhecidas
    let closeButton = document.querySelector('.popup_box_content a.close') ||
        document.querySelector('.popup_box_content a.popup_close') ||
        document.querySelector('.popup_box_content a.btn-close');
    if (closeButton && isElementVisible(closeButton)) {
        closeButton.click();
        console.log("Fechou o popup de quests clicando no botão de fechar.");
    } else {
        // Alternativa: tentar pressionar a tecla Esc
        console.log("Botão de fechar popup não encontrado. Tentando pressionar Esc.");
        let escEvent = new KeyboardEvent('keydown', { 'key': 'Escape', 'keyCode': 27, 'which': 27 });
        document.dispatchEvent(escEvent);
    }
}

// Função auxiliar para verificar a visibilidade de um elemento
function isElementVisible(element) {
    return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
}

// Função para criar a UI de construção
function createBuildingUI() {
    // Verifica se a UI já existe para evitar duplicações
    if (document.getElementById('building-ui')) return;

    // Cria o container da UI
    let uiContainer = document.createElement('div');
    uiContainer.id = 'building-ui';
    uiContainer.style.position = 'fixed';
    uiContainer.style.top = '50px';
    uiContainer.style.left = '10px';
    uiContainer.style.padding = '10px';
    uiContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    uiContainer.style.color = '#fff';
    uiContainer.style.fontSize = '14px';
    uiContainer.style.borderRadius = '5px';
    uiContainer.style.zIndex = '1000';
    uiContainer.style.fontFamily = 'Arial, sans-serif';
    uiContainer.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
    uiContainer.innerHTML = '<strong>Próximo Edifício:</strong> Nenhum';

    // Adiciona a UI ao corpo do documento
    document.body.appendChild(uiContainer);
}

// Função para atualizar a UI com o próximo edifício
function updateBuildingUI(buildingID) {
    let ui = document.getElementById('building-ui');
    if (ui) {
        ui.innerHTML = `<strong>Próximo Edifício:</strong> ${buildingID}`;
    }
}

//*************************** /NOVA FUNCIONALIDADE ***************************//
