/*
 * Script Name: Frontline Stacks Planner
 * Version: v1.0.8
 * Last Updated: 2025-01-10
 * Author: RedAlert
 * Author URL: https://twscripts.dev/
 * Author Contact: redalert_tw (Discord)
 * Approved: N/A
 * Approved Date: 2023-10-15
 * Mod: MKich
 */

/*--------------------------------------------------------------------------------------
 * This script can NOT be cloned and modified without permission from the script author.
 --------------------------------------------------------------------------------------*/

// **Ativação do Modo de Depuração**
if (typeof DEBUG !== 'boolean') DEBUG = false; // Defina como true para ativar logs de depuração
if (typeof HC_AMOUNT === 'undefined') HC_AMOUNT = null; // Valor fornecido pelo jogador

// **Configuração do Script**
var scriptConfig = {
    scriptData: {
        prefix: 'frontlineStacksPlanner',
        name: `Frontline Stacks Planner`,
        version: 'v1.0.8',
        author: 'RedAlert',
        authorUrl: 'https://twscripts.dev/',
        helpLink:
            'https://forum.tribalwars.net/index.php?threads/frontline-stacks-planner.291478/',
    },
    translations: {
        en_DK: {
            'Frontline Stacks Planner': 'Frontline Stacks Planner',
            Help: 'Help',
            'There was an error!': 'There was an error!',
            'Redirecting...': 'Redirecting...',
            'Error fetching player incomings!':
                'Error fetching player incomings!',
            'You can only run this script if you are member of a tribe!':
                'You can only run this script if you are member of a tribe!',
            'Tribe members have not shared their troop counts with tribe leadership!':
                'Tribe members have not shared their troop counts with tribe leadership!',
            'Start typing and suggestions will show ...':
                'Start typing and suggestions will show ...',
            'Select enemy tribes': 'Select enemy tribes',
            Distance: 'Distance',
            'Stack Limit': 'Stack Limit',
            'Scale down per field (k)': 'Scale down per field (k)',
            'Required Stack Amount': 'Required Stack Amount',
            'Calculate Stacks': 'Calculate Stacks',
            'Find Backline Stacks': 'Find Backline Stacks',
            'Fill all the required fields!': 'Fill all the required fields!',
            'You need to select an enemy tribe!':
                'You need to select an enemy tribe!',
            Village: 'Village',
            Map: 'Map',
            'Pop.': 'Pop.',
            'Missing Troops': 'Missing Troops',
            'All villages have been properly stacked!':
                'All villages have been properly stacked!',
            Export: 'Export',
            'No stack plans have been prepared!':
                'No stack plans have been prepared!',
            'Copied on clipboard!': 'Copied on clipboard!',
            'Select Troop Type': 'Select Troop Type',
            Defensiva: 'Defensive',
            Atacante: 'Attacking',
            'Select Building Type': 'Select Building Type',
        },
    },
    allowedMarkets: [],
    allowedScreens: ['map'],
    allowedModes: [],
    isDebug: DEBUG,
    enableCountApi: true,
};

$.getScript(
    `https://twscripts.dev/scripts/twSDK.js?url=${document.currentScript.src}`,
    async function () {
        // **Inicialização da Biblioteca**
        await twSDK.init(scriptConfig);
        const scriptInfo = twSDK.scriptInfo();
        const isValidScreen = twSDK.checkValidLocation('screen');

        // **Verificação de Membro da Tribo**
        if (!parseInt(game_data.player.ally)) {
            UI.ErrorMessage(
                twSDK.tt(
                    'You can only run this script if you are member of a tribe!'
                )
            );
            return;
        }

        if ('TWMap' in window) mapOverlay = TWMap;

        const hcPopAmount = HC_AMOUNT ?? twSDK.unitsFarmSpace['heavy']; // HC_AMOUNT fornecido pelo jogador

        const DEFAULT_VALUES = {
            DISTANCE: 5,
            STACK: 100,
            SCALE_PER_FIELD: 5,
        };

        const { villages, players, tribes } = await fetchWorldData();

        // **Definição da Ordem Fixa das Tropas Conforme a Tabela**
        const TROOP_ORDER = [
            'spear',
            'sword',
            'axe',
            'spy',
            'light',
            'heavy',
            'ram',
            'catapult',
            'knight',
            'snob',
            'militia',
        ];

        // **Definição dos Tipos de Tropas**
        const TROOP_TYPES = {
            def: ['spear', 'sword', 'heavy'],
            atk: ['axe', 'light', 'ram'],
        };

        // **Definição dos Tipos de Edifícios**
        const BUILDING_TYPES = {
            torre: 'watchtower',
            muralha: 'wall',
            nobres: 'snob',
        };

        // **Icones de Edifícios**
        const buildingIcons = {
            watchtower: '/graphic/buildings/watchtower.png',
            wall: '/graphic/buildings/wall.png',
            snob: '/graphic/buildings/snob.png',
        };

        // **Ponto de Entrada**
        (function () {
            try {
                if (isValidScreen) {
                    // Construir interface do usuário
                    initScript();
                } else {
                    UI.InfoMessage(twSDK.tt('Redirecting...'));
                    twSDK.redirectTo('map');
                }
            } catch (error) {
                UI.ErrorMessage(twSDK.tt('There was an error!'));
                console.error(`${scriptInfo} Error:`, error);
            }
        })();

        // **Função para Extrair os Dados das Tropas com Base na Ordem Fixa**
        function extractTroopData(html) {
            const villagesData = [];
            const troopOrderLength = TROOP_ORDER.length;

            // Seleciona todas as linhas da tabela de defesa
            const rows = html.find('table.vis.w100 tr');

            // Log de depuração: Número de linhas encontradas
            if (DEBUG) {
                console.log(`Número de linhas encontradas na tabela: ${rows.length}`);
            }

            rows.each(function () {
                const row = jQuery(this);
                const cells = row.find('td');

                // Verifica se a linha corresponde a um membro (possui links para aldeias)
                const villageLink = row.find('a[href*="screen=info_village&id="]');
                if (villageLink.length > 0) {
                    const villageName = villageLink.text().trim();
                    const pointsText = row.find('td').eq(1).text().trim();
                    const points = parseInt(pointsText.replace(/\./g, '')) || 0;

                    // Troca de rowspan para pegar a segunda linha referente à mesma aldeia
                    const defenseRow = row.next('tr');
                    const defenseCells = defenseRow.find('td');

                    const troops = {};

                    for (let i = 0; i < TROOP_ORDER.length; i++) {
                        // As tropas começam a partir do quarto <td> (índice 3)
                        // Considerando que as duas primeiras colunas são Aldeia e Pontos
                        // E a terceira coluna é "Na Aldeia" ou "a caminho"
                        const cellIndex = 3 + i;
                        let countText = cells.eq(cellIndex).text().trim();

                        // Se o valor estiver vazio na primeira linha, tenta pegar da segunda linha ("a caminho")
                        if (countText === '') {
                            countText = defenseCells.eq(cellIndex).text().trim();
                        }

                        // Converte para número, tratando possíveis strings vazias e NaN
                        const count = parseInt(countText) || 0;
                        troops[TROOP_ORDER[i]] = count;
                    }

                    // Adiciona os dados da aldeia
                    villagesData.push({
                        villageName: villageName, // **Propriedade Atualizada para 'villageName'**
                        points: points,
                        troops: troops,
                        villageCoords: extractCoordsFromName(villageName), // Função para extrair coordenadas
                        villageId: extractIdFromLink(villageLink.attr('href')), // Função para extrair ID da aldeia
                        buildings: {}, // **Inicializa o objeto de edifícios**
                    });

                    // **Log de Depuração: Dados Extraídos por Aldeia**
                    if (DEBUG) {
                        console.log(`Aldeia: ${villageName}`);
                        console.log(`Pontos: ${points}`);
                        console.log('Tropas:', troops);
                    }
                }
            });

            // **Log de Depuração: Dados Completos das Aldeias**
            if (DEBUG) {
                console.log('Dados Extraídos das Aldeias:', villagesData);
            }

            return villagesData;
        }

        // **Função para Extrair os Dados dos Edifícios**
        function extractBuildingData(html) {
            const buildingsData = [];

            // Seleciona todas as linhas da tabela de edifícios
            const rows = html.find('table.vis.w100 tr');

            // Log de depuração: Número de linhas encontradas
            if (DEBUG) {
                console.log(`Número de linhas encontradas na tabela de edifícios: ${rows.length}`);
            }

            rows.each(function () {
                const row = jQuery(this);
                const cells = row.find('td');

                // Verifica se a linha corresponde a um membro (possui links para aldeias)
                const villageLink = row.find('a[href*="screen=info_village&id="]');
                if (villageLink.length > 0) {
                    const villageName = villageLink.text().trim();

                    const torre = parseInt(cells.eq(6).text().trim()) || 0; // watchtower.png (posição 5)
                    const muralha = parseInt(cells.eq(18).text().trim()) || 0; // wall.png (posição 16)
                    const nobres = parseInt(cells.eq(6).text().trim()) || 0; // snob.png (posição 6)

                    buildingsData.push({
                        villageName: villageName,
                        torre: torre,
                        muralha: muralha,
                        nobres: nobres,
                    });

                    // **Log de Depuração: Dados Extraídos dos Edifícios**
                    if (DEBUG) {
                        console.log(`Edifícios da Aldeia: ${villageName}`);
                        console.log(`Torre: ${torre}, Muralha: ${muralha}, Nobres: ${nobres}`);
                    }
                }
            });

            // **Log de Depuração: Dados Completos dos Edifícios**
            if (DEBUG) {
                console.log('Dados Extraídos dos Edifícios:', buildingsData);
            }

            return buildingsData;
        }

        // **Função de Inicialização do Script**
        async function initScript() {
            const playersToFetch = await getTribeMembersList();

            if (playersToFetch.length) {
                const playersData = [...playersToFetch];
                const memberUrls = playersToFetch.map((item) => item.url);

                // Mostrar barra de progresso e notificar o usuário
                twSDK.startProgressBar(memberUrls.length * 2); // **Ajustado para duas requisições por membro**

                // **Primeira Requisição: Dados de Tropas**
                twSDK.getAll(
                    memberUrls,
                    function (index, data) {
                        twSDK.updateProgressBar(index, memberUrls.length * 2);

                        // Parsear a resposta como HTML
                        const htmlDoc = jQuery.parseHTML(data);
                        const html = jQuery(htmlDoc);

                        // **Log de Depuração: Página HTML do Membro Carregada**
                        if (DEBUG) {
                            console.log(`Página HTML para o Jogador ${playersData[index].name} carregada.`);
                        }

                        const villagesData = extractTroopData(html);

                        // **Log de Depuração: Dados das Aldeias por Jogador**
                        if (DEBUG) {
                            console.log(`Dados da Aldeia para Jogador ${index + 1} (${playersData[index].name}):`, villagesData);
                        }

                        // Atualiza as informações dos jogadores
                        playersData[index] = {
                            ...playersData[index],
                            villagesData: villagesData,
                        };
                    },
                    function () {
                        // **Segunda Requisição: Dados de Edifícios**
                        const buildingUrls = playersToFetch.map((item) => {
                            let buildingUrl = `/game.php?screen=ally&mode=members_buildings&player_id=${item.id}&village=${game_data.village.id}`;
                            if (game_data.player.sitter != '0') {
                                buildingUrl += `&t=${game_data.player.id}`;
                            }
                            return buildingUrl;
                        });

                        twSDK.getAll(
                            buildingUrls,
                            function (index, data) {
                                twSDK.updateProgressBar(index + memberUrls.length, memberUrls.length * 2);

                                // Parsear a resposta como HTML
                                const htmlDoc = jQuery.parseHTML(data);
                                const html = jQuery(htmlDoc);

                                // **Log de Depuração: Página HTML de Edifícios do Membro Carregada**
                                if (DEBUG) {
                                    console.log(`Página HTML de Edifícios para o Jogador ${playersData[index].name} carregada.`);
                                }

                                const buildingsData = extractBuildingData(html);

                                // **Log de Depuração: Dados de Edifícios por Jogador**
                                if (DEBUG) {
                                    console.log(`Dados de Edifícios para Jogador ${index + 1} (${playersData[index].name}):`, buildingsData);
                                }

                                // Atualiza as informações dos jogadores com os edifícios
                                buildingsData.forEach((building) => {
                                    const village = playersData[index].villagesData.find(
                                        (v) => v.villageName === building.villageName
                                    );
                                    if (village) {
                                        village.buildings = {
                                            torre: building.torre,
                                            muralha: building.muralha,
                                            nobres: building.nobres,
                                        };
                                    }
                                });
                            },
                            function () {
                                if (DEBUG) {
                                    console.debug(`${scriptInfo} playersData com edifícios`, playersData);
                                }

                                // Extrai os dados das tropas e edifícios
                                const allVillagesData = playersData
                                    .map(player => player.villagesData)
                                    .flat();

                                if (DEBUG) {
                                    console.log('Dados Extraídos das Aldeias após fetchAll:', allVillagesData);
                                }

                                // Construir interface do usuário
                                buildUI();

                                // Registrar manipuladores de ações
                                handleCalculateStackPlans(playersData);
                                handleBacklineStacks(playersData);
                                handleExport();

                                // Registrar manipulador para mudança de tipo de tropa
                                handleTroopTypeChange(allVillagesData);
                            },
                            function () {
                                UI.ErrorMessage(
                                    twSDK.tt('Error fetching player incomings!')
                                );
                            }
                        );
                    },
                    function () {
                        UI.ErrorMessage(
                            twSDK.tt('Error fetching player incomings!')
                        );
                    }
                );
            } else {
                UI.ErrorMessage(
                    twSDK.tt(
                        'Tribe members have not shared their troop counts with tribe leadership!'
                    )
                );
            }
        }

        // **Helper: Extrair Coordenadas da Aldeia a Partir do Nome**
        function extractCoordsFromName(villageName) {
            const regex = /\((\d+)\|(\d+)\)/;
            const match = villageName.match(regex);
            if (match) {
                return `${match[1]}|${match[2]}`;
            }
            return '';
        }

        // **Helper: Extrair ID da Aldeia a Partir do Link**
        function extractIdFromLink(href) {
            const regex = /id=(\d+)/;
            const match = href.match(regex);
            if (match) {
                return parseInt(match[1]);
            }
            return null;
        }

        // **Helper: Construir Interface do Usuário**
        function buildUI() {
            const enemyTribePickerHtml = buildEnemyTribePicker(tribes, 'Tribes');
            const troopAmountsHtml = buildUnitsChooserTable();
            const troopTypeSelectorHtml = buildTroopTypeSelector(); // **Adicionado: Selector de Tipo de Tropa**

            const content = `
                <div class="ra-mb15">
                    <div class="ra-grid">
                        <div>
                            ${enemyTribePickerHtml}
                        </div>
                        <div>
                            <label for="raDistance" class="ra-label">
                                ${twSDK.tt('Distance')}
                            </label>
                            <input type="number" class="ra-input" id="raDistance" value="${DEFAULT_VALUES.DISTANCE}">
                        </div>
                        <div>
                            <label for="raStack" class="ra-label">
                                ${twSDK.tt('Stack Limit')}
                            </label>
                            <input type="number" class="ra-input" id="raStack" value="${DEFAULT_VALUES.STACK}">
                        </div>
                        <div>
                            <label for="raScalePerField" class="ra-label">
                                ${twSDK.tt('Scale down per field (k)')}
                            </label>
                            <input type="number" class="ra-input" id="raScalePerField" value="${DEFAULT_VALUES.SCALE_PER_FIELD}">
                        </div>
                    </div>
                </div>
                <div class="ra-mb15">
                    <label for="raStack" class="ra-label">
                        ${twSDK.tt('Required Stack Amount')}
                    </label>
                    <div>
                        ${troopAmountsHtml}
                    </div>
                </div>
                <div class="ra-mb15">
                    ${troopTypeSelectorHtml} <!-- **Adicionado: Selector de Tipo de Tropa** -->
                </div>
                <div>
                    <a href="javascript:void(0);" id="raPlanStacks" class="btn">
                        ${twSDK.tt('Calculate Stacks')}
                    </a>
                    <a href="javascript:void(0);" id="raBacklineStacks" class="btn" data-backline-stacks="">
                        ${twSDK.tt('Find Backline Stacks')}
                    </a>
                    <a href="javascript:void(0);" id="raExport" class="btn" data-stack-plans="">
                        ${twSDK.tt('Export')}
                    </a>
                </div>
                <div class="ra-mt15 ra-table-container" id="raStacks" style="display:none;"></div>
            `;

            const customStyle = `
                #${scriptConfig.scriptData.prefix} .ra-table-v3 th,
                #${scriptConfig.scriptData.prefix} .ra-table-v3 td { text-align: center; }
                .ra-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; grid-gap: 15px; }
                .ra-input { width: 100% !important; padding: 5px; font-size: 14px; line-height: 1; }
                .ra-label { margin-bottom: 6px; font-weight: 600; display: block; }
                .ra-text-center .ra-input { text-align: center; }
                .ra-troop-type-selector { display: flex; gap: 10px; align-items: center; }
                .ra-troop-type-selector label { font-weight: 600; }
            `;

            twSDK.renderBoxWidget(
                content,
                scriptConfig.scriptData.prefix,
                'ra-frontline-stacks',
                customStyle
            );
        }

        // **Helper: Construir Selector de Tipo de Tropa**
        function buildTroopTypeSelector() {
            const content = `
                <div class="ra-troop-type-selector">
                    <label for="raTroopType">${twSDK.tt('Select Troop Type')}:</label>
                    <label>
                        <input type="radio" name="raTroopType" value="def" checked>
                        ${twSDK.tt('Defensiva')}
                    </label>
                    <label>
                        <input type="radio" name="raTroopType" value="atk">
                        ${twSDK.tt('Atacante')}
                    </label>
                </div>
            `;

            // **Log de Depuração: Selector de Tipo de Tropa Construído**
            if (DEBUG) {
                console.log('Troop Type Selector HTML:', content);
            }

            return content;
        }

        // **Action Handler: Calcular Planos de Stacks**
        function handleCalculateStackPlans(playersData) {
            jQuery('#raPlanStacks').on('click', function (e) {
                e.preventDefault();

                const {
                    chosenTribes,
                    distance,
                    unitAmounts,
                    stackLimit,
                    scaleDownPerField,
                } = collectUserInput();

                const villagesThatNeedStack = findVillagesThatNeedStack(
                    playersData,
                    chosenTribes,
                    distance,
                    unitAmounts,
                    stackLimit
                );

                if (villagesThatNeedStack.length) {
                    const villagesToBeStacked = calculateAmountMissingTroops(
                        villagesThatNeedStack,
                        unitAmounts,
                        scaleDownPerField
                    );

                    villagesToBeStacked.sort(
                        (a, b) => a.fieldsAway - b.fieldsAway
                    );

                    const villagesTableHtml = buildVillagesTable(villagesToBeStacked);

                    jQuery('#raStacks').show();
                    jQuery('#raStacks').html(villagesTableHtml);

                    updateMap(villagesToBeStacked);
                    jQuery('#raExport').attr(
                        'data-stack-plans',
                        JSON.stringify(villagesToBeStacked)
                    );

                    // **Log de Depuração: Villages To Be Stacked**
                    if (DEBUG) {
                        console.log('Villages to be stacked:', villagesToBeStacked);
                    }
                } else {
                    UI.SuccessMessage(
                        twSDK.tt('All villages have been properly stacked!')
                    );
                }
            });
        }

        // **Action Handler: Encontrar Backline Stacks**
        function handleBacklineStacks(playersData) {
            jQuery('#raBacklineStacks').on('click', function (e) {
                e.preventDefault();

                const { chosenTribes, distance } = collectUserInput();

                let playerVillages = playersData
                    .map((player) => {
                        const { villagesData } = player;
                        return villagesData;
                    })
                    .flat();

                let chosenTribeIds = twSDK.getEntityIdsByArrayIndex(
                    chosenTribes,
                    tribes,
                    2
                );
                let tribePlayers = getTribeMembersById(chosenTribeIds);
                let enemyTribeCoordinates =
                    filterVillagesByPlayerIds(tribePlayers);

                // Filtrar aldeias fora do raio
                let villagesOutsideRadius = [];

                playerVillages.forEach((village) => {
                    const { villageCoords, troops } = village;
                    enemyTribeCoordinates.forEach((coordinate) => {
                        const villagesDistance = twSDK.calculateDistance(
                            coordinate,
                            villageCoords
                        );
                        if (villagesDistance > distance) {
                            const stackAmount = calculatePop(troops);
                            if (stackAmount > 30000) {
                                villagesOutsideRadius.push({
                                    ...village,
                                    fieldsAway:
                                        Math.round(villagesDistance * 100) /
                                        100,
                                    stackAmount: stackAmount,
                                });
                            }
                        }
                    });
                });

                villagesOutsideRadius.sort(
                    (a, b) => a.fieldsAway - b.fieldsAway
                );

                let villagesObject = {};
                let villagesArray = [];
                villagesOutsideRadius.forEach((item) => {
                    const { villageId } = item;
                    if (!villagesObject[villageId]) {
                        villagesObject = {
                            ...villagesObject,
                            [villageId]: item,
                        };
                    }
                });

                for (let [_, value] of Object.entries(villagesObject)) {
                    villagesArray.push(value);
                }

                let tableRows = villagesArray
                    .map((village, index) => {
                        index++;
                        const {
                            fieldsAway,
                            stackAmount,
                            villageId,
                            villageName,
                        } = village;
                        return `
                            <tr>
                                <td>
                                    ${index}
                                </td>
                                <td class="ra-tal">
                                    <a href="/game.php?screen=info_village&id=${villageId}" target="_blank" rel="noreferrer noopener">
                                        ${villageName}
                                    </a>
                                </td>
                                <td>
                                    ${intToString(stackAmount)}
                                </td>
                                <td>
                                    ${fieldsAway}
                                </td>
                            </tr>
                        `;
                    })
                    .join('');

                let villagesTableHtml = `
                    <div class="ra-table-container ra-mb15">
                        <table class="ra-table ra-table-v3" width="100%">
                            <thead>
                                <tr>
                                    <th>
                                        #
                                    </th>
                                    <th class="ra-tal">
                                        ${twSDK.tt('Village')}
                                    </th>
                                    <th>
                                        ${twSDK.tt('Pop.')}
                                    </th>
                                    <th>
                                        ${twSDK.tt('Distance')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tableRows}
                            </tbody>
                        </table>
                    </div>
                `;

                twSDK.renderFixedWidget(
                    villagesTableHtml,
                    'raFrontlineStacks-popup',
                    'ra-frontline-stacks-popup',
                    '',
                    '560px'
                );

                // **Log de Depuração: Villages Outside Radius**
                if (DEBUG) {
                    console.log('Villages Outside Radius:', villagesOutsideRadius);
                }
            });
        }

        // **Action Handler: Exportar Planos de Stacks**
        function handleExport() {
            jQuery('#raExport').on('click', function (e) {
                e.preventDefault();

                const dataStackPlans = jQuery(this).attr('data-stack-plans');
                if (dataStackPlans) {
                    const stackPlans = JSON.parse(dataStackPlans);

                    if (stackPlans.length) {
                        let bbCode = `[table][**]#[||]${twSDK.tt(
                            'Village'
                        )}[||]${twSDK.tt('Missing Troops')}[||]${twSDK.tt(
                            'Distance'
                        )}[/**]\n`;

                        stackPlans.forEach((stackPlan, index) => {
                            index++;
                            const { villageCoords, missingTroops, fieldsAway } =
                                stackPlan;
                            const missingTroopsString =
                                buildMissingTroopsString(missingTroops);

                            bbCode += `[*]${index}[|] ${villageCoords} [|]${missingTroopsString}[|]${fieldsAway}\n`;
                        });

                        bbCode += `[/table]`;

                        twSDK.copyToClipboard(bbCode);
                        UI.SuccessMessage(twSDK.tt('Copied on clipboard!'));

                        // **Log de Depuração: BBCode Exportado**
                        if (DEBUG) {
                            console.log('BBCode Exportado:', bbCode);
                        }
                    }
                } else {
                    UI.ErrorMessage(
                        twSDK.tt('No stack plans have been prepared!')
                    );
                }
            });
        }

        // **Helper: Construir Tabela de Aldeias**
        function buildVillagesTable(villages) {
            let villagesTableHtml = `
                <table class="ra-table ra-table-v3" width="100%">
                    <thead>
                        <tr>
                            <th>
                                #
                            </th>
                            <th class="ra-tal">
                                ${twSDK.tt('Village')}
                            </th>
                            <th>
                                ${twSDK.tt('Map')}
                            </th>
                            <th>
                                ${twSDK.tt('Pop.')}
                            </th>
                            <th>
                                ${twSDK.tt('Distance')}
                            </th>
                            <th>
                                ${twSDK.tt('Missing Troops')}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            villages.forEach((village, index) => {
                const {
                    villageId,
                    villageName,
                    villageCoords,
                    fieldsAway,
                    troops,
                    pop,
                    missingTroops,
                    buildings, // **Adicionado: Dados de Edifícios**
                } = village;
                let [x, y] = villageCoords.split('|');
                let missingTroopsString =
                    buildMissingTroopsString(missingTroops);

                // **Construir HTML dos Edifícios**
                let buildingsHTML = '';
                if (buildings) {
                    const { torre, muralha, nobres } = buildings;
                    buildingsHTML = `
                        <div style="display: flex; justify-content: center; align-items: center; gap: 2px; flex: 1;">
                            ${torre > 0
                            ? `<img src="${buildingIcons.watchtower}" alt="Torre" title="Torre" style="width: 8px; height: 8px;">
                                       <span style="font-size: 6px;">${torre}</span>`
                            : ''
                        }
                            ${muralha > 0
                            ? `<img src="${buildingIcons.wall}" alt="Muralha" title="Muralha" style="width: 8px; height: 8px;">
                                       <span style="font-size: 6px;">${muralha}</span>`
                            : ''
                        }
                            ${nobres > 0
                            ? `<img src="${buildingIcons.snob}" alt="Nobres" title="Nobres" style="width: 8px; height: 8px;">
                                       <span style="font-size: 6px;">${nobres}</span>`
                            : ''
                        }
                        </div>
                    `;
                }

                index++;

                villagesTableHtml += `
                    <tr>
                        <td>
                            ${index}
                        </td>
                        <td class="ra-tal">
                            <a href="/game.php?screen=info_village&id=${villageId}" target="_blank" rel="noreferrer noopener">
                                ${villageName}
                            </a>
                        </td>
                        <td>
                            <a href="javascript:TWMap.focus(${x}, ${y});">
                                ${villageCoords}
                            </a>
                        </td>
                        <td>
                            ${intToString(pop)}
                        </td>
                        <td>
                            ${fieldsAway}
                        </td>
                        <td>
                            ${missingTroopsString}
                        </td>
                    </tr>
                `;
            });

            villagesTableHtml += `</tbody></table>`;

            // **Log de Depuração: Tabela de Aldeias Construída**
            if (DEBUG) {
                console.log('Tabela de Aldeias:', villagesTableHtml);
            }

            return villagesTableHtml;
        }

        // **Helper: Construir Picker de Tribos Inimigas**
        function buildEnemyTribePicker(array, entity) {
            if (entity === 'Tribes') {
                array.sort((a, b) => parseInt(a[7]) - parseInt(b[7]));
            }

            let dropdown = `<label for="ra${entity}" class="ra-label">${twSDK.tt(
                'Select enemy tribes'
            )}</label><input type="email" class="ra-input" multiple list="raSelect${entity}" placeholder="${twSDK.tt(
                'Start typing and suggestions will show ...'
            )}" id="ra${entity}"><datalist id="raSelect${entity}">`;

            array.forEach((item) => {
                if (item[0].length !== 0) {
                    if (entity === 'Tribes') {
                        const [id, _, tag] = item;
                        const cleanTribeTag = twSDK.cleanString(tag);
                        dropdown += `<option value="${cleanTribeTag}">`;
                    }
                    if (entity === 'Players' || entity === 'ExcludedPlayers') {
                        const [id, name] = item;
                        const cleanPlayerName = twSDK.cleanString(name);
                        dropdown += `<option value="${cleanPlayerName}">`;
                    }
                }
            });

            dropdown += '</datalist>';

            // **Log de Depuração: Picker de Tribos Construído**
            if (DEBUG) {
                console.log('Picker de Tribos HTML:', dropdown);
            }

            return dropdown;
        }

        // **Helper: Construir String de Tropas Faltantes**
        function buildMissingTroopsString(missingTroops) {
            let missingTroopsString = '';

            for (let [key, value] of Object.entries(missingTroops)) {
                missingTroopsString += `${key}: ${value}\n`;
            }

            // **Log de Depuração: String de Tropas Faltantes**
            if (DEBUG) {
                console.log('Tropas Faltantes:', missingTroopsString);
            }

            return missingTroopsString;
        }

        // **Helper: Construir Tabela de Seleção de Tropas**
        function buildUnitsChooserTable() {
            let unitsTable = ``;
            let thUnits = ``;
            let tableRow = ``;

            const defTroopTypes = TROOP_ORDER; // Usando a ordem fixa definida anteriormente

            defTroopTypes.forEach((unit) => {
                thUnits += `
                    <th class="ra-text-center">
                        <label for="unit_${unit}" class="ra-unit-type">
                            <img src="/graphic/unit/unit_${unit}.png" alt="${unit}" title="${unit}">
                        </label>
                    </th>
                `;

                tableRow += `
                    <td class="ra-text-center">
                        <input name="ra_unit_amounts" type="text" id="unit_${unit}" data-unit="${unit}" class="ra-input" value="0" />
                    </td>
                `;
            });

            unitsTable = `
                <table class="ra-table ra-table-v3 vis" width="100%" id="raUnitSelector">
                    <thead>
                        <tr>
                            ${thUnits}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            ${tableRow}
                        </tr>
                    </tbody>
                </table>
            `;

            // **Log de Depuração: Tabela de Seleção de Tropas Construída**
            if (DEBUG) {
                console.log('Tabela de Seleção de Tropas HTML:', unitsTable);
            }

            return unitsTable;
        }

        // **Helper: Atualizar a Interface do Mapa**
        function updateMap(villages) {
            const villageCoords = villages.map(
                (village) => village.villageCoords
            );

            if (mapOverlay.mapHandler._spawnSector) {
                // Já existe, não recriar
            } else {
                // Não existe ainda
                mapOverlay.mapHandler._spawnSector =
                    mapOverlay.mapHandler.spawnSector;
            }

            // Mapeamento de ícones das tropas
            const unitIcons = {
                spear: '/graphic/unit/unit_spear.png',
                sword: '/graphic/unit/unit_sword.png',
                axe: '/graphic/unit/unit_axe.png',
                spy: '/graphic/unit/unit_spy.png',
                light: '/graphic/unit/unit_light.png',
                heavy: '/graphic/unit/unit_heavy.png',
                ram: '/graphic/unit/unit_ram.png',
                catapult: '/graphic/unit/unit_catapult.png',
                knight: '/graphic/unit/unit_knight.png',
                snob: '/graphic/unit/unit_snob.png',
                militia: '/graphic/unit/unit_militia.png',
                // Adicione outros tipos de tropas conforme necessário
            };

            TWMap.mapHandler.spawnSector = function (data, sector) {
                // Override Map Sector Spawn
                mapOverlay.mapHandler._spawnSector(data, sector);
                var beginX = sector.x - data.x;
                var endX = beginX + mapOverlay.mapSubSectorSize;
                var beginY = sector.y - data.y;
                var endY = beginY + mapOverlay.mapSubSectorSize;

                for (var x in data.tiles) {
                    var x = parseInt(x, 10);
                    if (x < beginX || x >= endX) {
                        continue;
                    }
                    for (var y in data.tiles[x]) {
                        var y = parseInt(y, 10);

                        if (y < beginY || y >= endY) {
                            continue;
                        }
                        var xCoord = data.x + x;
                        var yCoord = data.y + y;
                        var v = mapOverlay.villages[xCoord * 1000 + yCoord];
                        if (v) {
                            var vXY = '' + v.xy;
                            var vCoords =
                                vXY.slice(0, 3) + '|' + vXY.slice(3, 6);
                            if (villageCoords.includes(vCoords)) {
                                const currentVillage = villages.find(
                                    (obj) => obj.villageCoords == vCoords
                                );

                                if (!currentVillage) {
                                    // Aldeia não encontrada nos dados
                                    continue;
                                }

                                // **Obter Tipo de Tropa Selecionado**
                                const selectedTroopType = jQuery('input[name="raTroopType"]:checked').val();

                                let troopsToDisplay = [];
                                if (selectedTroopType === 'def') {
                                    troopsToDisplay = TROOP_TYPES.def;
                                } else if (selectedTroopType === 'atk') {
                                    troopsToDisplay = TROOP_TYPES.atk;
                                }

                                // **Início das Modificações: Adicionar Edifícios**
                                const buildings = currentVillage.buildings;
                                let buildingsHTML = '';
                                if (buildings) {
                                    const { torre, muralha } = buildings;
                                    const troops = currentVillage.troops;
                                    const nobres = troops[snob] || 0; // Mostra 0 se não houver tropas
                                    buildingsHTML = `
                                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                                    ${torre > 0
                                            ? `<div style="display: flex; align-items: center; gap: 1px;">
                                           <img src="${buildingIcons.watchtower}" alt="Torre" title="Torre" style="width: 5px; height: 5px;">
                                           <span style="font-size: 5px;">${torre}</span>
                                       </div>`
                                            : '<div style="width: 20px;"></div>'
                                        }
                                    ${muralha > 0
                                            ? `<div style="display: flex; align-items: center; gap: 1px;">
                                           <img src="${buildingIcons.wall}" alt="Muralha" title="Muralha" style="width: 5px; height: 5px;">
                                           <span style="font-size: 5px;">${muralha}</span>
                                       </div>`
                                            : '<div style="width: 20px;"></div>'
                                        }
                                    ${nobres > 0
                                            ? `<div style="display: flex; align-items: center; gap: 1px;">
                                           <img src="${buildingIcons.snob}" alt="Nobres" title="Nobres" style="width: 5px; height: 5px;">
                                           <span style="font-size: 5px;">${nobres}</span>
                                       </div>`
                                            : '<div style="width: 20px;"></div>'
                                        }
                                </div>
                            `;
                                }
                                // **Fim das Modificações**

                                // **Início das Modificações: Adicionar Tropas**
                                const troops = currentVillage.troops;
                                let villageTroopsHTML = '';

                                troopsToDisplay.forEach((unit) => {
                                    const count = troops[unit] || 0; // Mostra 0 se não houver tropas
                                    villageTroopsHTML += `
                                <div style="display: flex; align-items: center; gap: 1px; width: 100%;">
                                    <img src="${unitIcons[unit]}" alt="${unit}" title="${unit}" style="width: 10px; height: 10px;">
                                    <span style="font-size: 10px;">${count}</span>
                                </div>
                            `;
                                });

                                // **Fim das Modificações**

                                // **Início das Modificações: Estrutura do Quadradinho**
                                const eleDIV = $('<div></div>')
                                    .css({
                                        position: 'absolute',
                                        display: 'flex',
                                        flexDirection: 'column', // Flex column para estruturar as linhas
                                        alignItems: 'center',
                                        justifyContent: 'flex-start',
                                        gap: '1px',
                                        padding: '2px',
                                        backgroundColor: 'rgba(255, 255, 255, 0.6)', // Cor de fundo atualizada para branco semi-transparente
                                        color: '#000', // Cor do texto alterada para preto
                                        width: '50px', // Mantido conforme solicitado
                                        height: '35px', // Aumentado para acomodar edifícios e tropas
                                        zIndex: '10',
                                        fontSize: '10px', // Mantido para legibilidade
                                        overflow: 'hidden', // Evita que o conteúdo ultrapasse o div
                                    })
                                    .attr('id', 'dsm' + v.id)
                                    .html(`
                                ${buildingsHTML}
                                <hr style="width: 100%; border: none; border-top: 1px solid #ccc; margin: 1px 0;">
                                <div style="display: flex; flex-direction: column; gap: 1px; width: 100%;">
                                    ${villageTroopsHTML}
                                </div>
                            `); // Estrutura ajustada para incluir uma linha separadora

                                // **Fim das Modificações**

                                sector.appendElement(
                                    eleDIV[0],
                                    data.x + x - sector.x,
                                    data.y + y - sector.y
                                );

                                // **Log de Depuração: Atualização do Mapa para Aldeia**
                                if (DEBUG) {
                                    console.log(`Atualizando Mapa para Aldeia: ${currentVillage.villageName}`);
                                    console.log('Tropas no Mapa:', troops);
                                    console.log('Edifícios no Mapa:', buildings);
                                }
                            }
                        }
                    }

                }
            };

            mapOverlay.reload();
        }

        // **Helper: Calcular Quantidades de Tropas Necessárias para Cada Aldeia**
        function calculateAmountMissingTroops(
            villagesThatNeedStack,
            unitAmounts,
            scaleDownPerField
        ) {
            let villagesToBeStacked = [];

            villagesThatNeedStack.forEach((village) => {
                const { troops, fieldsAway } = village;
                const distance = parseInt(fieldsAway);
                const missingTroops = calculateMissingTroops(
                    troops,
                    unitAmounts,
                    distance,
                    scaleDownPerField
                );

                villagesToBeStacked.push({
                    ...village,
                    missingTroops: missingTroops,
                });

                // **Log de Depuração: Troops Calculated for Village**
                if (DEBUG) {
                    console.log(`Troops Calculated for Village ${village.villageName}:`, missingTroops);
                }
            });

            return villagesToBeStacked;
        }

        // **Helper: Calcular Quantidades de Tropas Faltantes para Cada Aldeia**
        function calculateMissingTroops(
            troops,
            unitAmounts,
            distance,
            scaleDownPerField
        ) {
            let missingTroops = {};

            const nonScalingUnits = ['spy', 'heavy'];

            distance = distance - 1;

            for (let [key, value] of Object.entries(unitAmounts)) {
                let troopsAfterScalingDown =
                    value - parseInt(distance) * scaleDownPerField * 1000;
                if (
                    troopsAfterScalingDown > 0 &&
                    !nonScalingUnits.includes(key)
                ) {
                    let troopsDifference = troops[key] - troopsAfterScalingDown;
                    missingTroops[key] = Math.abs(troopsDifference);
                }
            }

            // **Log de Depuração: Missing Troops Calculated**
            if (DEBUG) {
                console.log('Missing Troops:', missingTroops);
            }

            return missingTroops;
        }

        // **Helper: Encontrar Aldeias que Precisam de Stack**
        function findVillagesThatNeedStack(
            playersData,
            chosenTribes,
            distance,
            unitAmount,
            stackLimit
        ) {
            let playerVillages = playersData
                .map((player) => {
                    const { villagesData } = player;
                    return villagesData;
                })
                .flat();

            let chosenTribeIds = twSDK.getEntityIdsByArrayIndex(
                chosenTribes,
                tribes,
                2
            );
            let tribePlayers = getTribeMembersById(chosenTribeIds);
            let enemyTribeCoordinates =
                filterVillagesByPlayerIds(tribePlayers);

            // Filtrar aldeias por raio
            let villagesThatNeedStack = [];
            playerVillages.forEach((village) => {
                const { villageCoords, troops } = village;
                enemyTribeCoordinates.forEach((coordinate) => {
                    const villagesDistance = twSDK.calculateDistance(
                        coordinate,
                        villageCoords
                    );
                    if (villagesDistance <= distance) {
                        const villagePop = calculatePop(troops);
                        const realStackLimit = stackLimit * 1000;

                        let shouldAdd = false;

                        for (let [key, value] of Object.entries(unitAmount)) {
                            if (troops[key] < value) {
                                shouldAdd = true;
                            }
                        }

                        if (villagePop < realStackLimit) {
                            shouldAdd = true;
                        }

                        if (shouldAdd) {
                            villagesThatNeedStack.push({
                                ...village,
                                pop: villagePop,
                                fieldsAway: Math.round(villagesDistance * 100) / 100,
                            });

                            // **Log de Depuração: Village Needs Stack**
                            if (DEBUG) {
                                console.log(`Village Needs Stack: ${village.villageName}`, village);
                            }
                        }
                    }
                });
            });

            villagesThatNeedStack.sort((a, b) => a.fieldsAway - b.fieldsAway);

            let villagesObject = {};
            let villagesArray = [];
            villagesThatNeedStack.forEach((item) => {
                const { villageId } = item;
                if (!villagesObject[villageId]) {
                    villagesObject = {
                        ...villagesObject,
                        [villageId]: item,
                    };
                }
            });

            for (let [_, value] of Object.entries(villagesObject)) {
                villagesArray.push(value);
            }

            // **Log de Depuração: Villages That Need Stack Array**
            if (DEBUG) {
                console.log('Villages That Need Stack:', villagesArray);
            }

            return villagesArray;
        }

        // **Helper: Calcular População Total**
        function calculatePop(units) {
            let total = 0;

            for (let [key, value] of Object.entries(units)) {
                if (value) {
                    const unitPopAmount =
                        key !== 'heavy'
                            ? twSDK.unitsFarmSpace[key]
                            : hcPopAmount;
                    total += unitPopAmount * value;
                }
            }
            if (DEBUG) {
                console.log('Total Pop Calculation:', units, total);
            }
            return total;
        }

        // **Helper: Coletar Entrada do Usuário**
        function collectUserInput() {
            let chosenTribes = jQuery('#raTribes').val().trim();
            let distance = parseInt(jQuery('#raDistance').val());
            let stackLimit = parseInt(jQuery('#raStack').val());
            let scaleDownPerField = parseInt(jQuery('#raScalePerField').val());
            let unitAmounts = {};

            if (chosenTribes === '') {
                UI.ErrorMessage(twSDK.tt('You need to select an enemy tribe!'));
            } else {
                chosenTribes = chosenTribes.split(',').map(item => item.trim());
            }

            jQuery('#raUnitSelector input').each(function () {
                const unit = jQuery(this).attr('data-unit');
                const amount = parseInt(jQuery(this).val());

                if (amount > 0) {
                    unitAmounts = {
                        ...unitAmounts,
                        [unit]: amount,
                    };
                }
            });

            // **Log de Depuração: Coleta de Entrada do Usuário**
            if (DEBUG) {
                console.log('User Input Collected:', {
                    chosenTribes,
                    distance,
                    stackLimit,
                    scaleDownPerField,
                    unitAmounts,
                });
            }

            return {
                chosenTribes,
                distance,
                unitAmounts,
                stackLimit,
                scaleDownPerField,
            };
        }

        // **Helper: Converter Número para String com Sufixo**
        // https://www.html-code-generator.com/javascript/shorten-long-numbers
        function intToString(num) {
            num = num.toString().replace(/[^0-9.]/g, '');
            if (num < 1000) {
                return num;
            }
            let si = [
                { v: 1e3, s: 'K' },
                { v: 1e6, s: 'M' },
                { v: 1e9, s: 'B' },
                { v: 1e12, s: 'T' },
                { v: 1e15, s: 'P' },
                { v: 1e18, s: 'E' },
            ];
            let index;
            for (index = si.length - 1; index > 0; index--) {
                if (num >= si[index].v) {
                    break;
                }
            }
            return (
                (num / si[index].v)
                    .toFixed(2)
                    .replace(/\.0+$|(\.[0-9]*[1-9])0+$/, '$1') + si[index].s
            );
        }

        // **Helper: Obter Membros da Tribo por IDs de Tribo**
        function getTribeMembersById(tribeIds) {
            return players
                .filter((player) => tribeIds.includes(parseInt(player[2])))
                .map((player) => parseInt(player[0]));
        }

        // **Helper: Filtrar Aldeias por IDs de Jogadores**
        function filterVillagesByPlayerIds(playerIds) {
            return villages
                .filter((village) => playerIds.includes(parseInt(village[4])))
                .map((village) => village[2] + '|' + village[3]);
        }

        // **Helper: Obter Lista de Membros da Tribo**
        async function getTribeMembersList() {
            let troopsMemberPage =
                '/game.php?village=' +
                game_data.village.id +
                '&screen=ally&mode=members_defense';
            if (game_data.player.sitter != '0') {
                troopsMemberPage += '&t=' + game_data.player.id;
            }

            const response = await jQuery.get(troopsMemberPage);
            const options = jQuery(response).find(
                '.input-nicer option:not([disabled])'
            );

            const membersToFetch = [];

            options.each(function (_, option) {
                let url =
                    '/game.php?screen=ally&mode=members_defense&player_id=' +
                    option.value +
                    '&village=' +
                    game_data.village.id +
                    '';
                if (game_data.player.sitter != '0') {
                    url += '&t=' + game_data.player.id;
                }
                if (!isNaN(parseInt(option.value))) {
                    membersToFetch.push({
                        url: url,
                        id: parseInt(option.value),
                        name: option.text.trim(), // **Adicionado .trim() para remover espaços em branco**
                    });
                }
            });

            // **Log de Depuração: Lista de Membros para Buscar**
            if (DEBUG) {
                console.log('Members to Fetch:', membersToFetch);
            }

            return membersToFetch;
        }

        // **Helper: Buscar Dados Necessários do Mundo**
        async function fetchWorldData() {
            try {
                const villages = await twSDK.worldDataAPI('village');
                const players = await twSDK.worldDataAPI('player');
                const tribes = await twSDK.worldDataAPI('ally');
                return { villages, players, tribes };
            } catch (error) {
                UI.ErrorMessage(error);
                console.error(`${scriptInfo} Error:`, error);
            }
        }

        // **Helper: Registrar Manipulador para Mudança de Tipo de Tropa**
        function handleTroopTypeChange(allVillagesData) {
            jQuery('input[name="raTroopType"]').on('change', function () {
                const selectedTroopType = jQuery(this).val();

                if (DEBUG) {
                    console.log(`Troop Type Changed to: ${selectedTroopType}`);
                }

                // Atualizar o mapa com base no novo tipo de tropa selecionado
                updateMap(allVillagesData);
            });
        }
    }
);
