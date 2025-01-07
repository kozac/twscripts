/*
 * Script Name: Frontline Stacks Planner
 * Version: v1.1.1
 * Last Updated: 2025-01-07
 * Author: RedAlert (Modificado por MKich)
 * Author URL: https://twscripts.dev/
 * Author Contact: redalert_tw (Discord)
 * Approved: N/A
 * Approved Date: 2023-10-15
 */

/*--------------------------------------------------------------------------------------
 * Este script NÃO pode ser clonado e modificado sem permissão do autor original.
 --------------------------------------------------------------------------------------*/

// Configurações Iniciais
if (typeof DEBUG !== 'boolean') DEBUG = false;
if (typeof HC_AMOUNT === 'undefined') HC_AMOUNT = null;

// Configuração do Script
const scriptConfig = {
    scriptData: {
        prefix: 'frontlineStacksPlanner',
        name: `Frontline Stacks Planner`,
        version: 'v1.1.1',
        author: 'RedAlert',
        authorUrl: 'https://twscripts.dev/',
        helpLink: 'https://forum.tribalwars.net/index.php?threads/frontline-stacks-planner.291478/',
    },
    translations: {
        // Traduções podem ser adicionadas aqui
    },
    allowedMarkets: [],
    allowedScreens: ['ally'], // Especifica a tela permitida
    allowedModes: ['members_defense'], // Especifica os modos permitidos
    isDebug: DEBUG,
    enableCountApi: true,
};

// Função para Carregar o twSDK
function loadTwSDK(callback) {
    $.getScript(`https://twscripts.dev/scripts/twSDK.js?url=${document.currentScript.src}`, function () {
        if (typeof twSDK !== 'undefined') {
            callback();
        } else {
            UI.ErrorMessage('Erro ao carregar o twSDK!');
            console.error('twSDK não foi carregado corretamente.');
        }
    }).fail(function () {
        UI.ErrorMessage('Falha ao carregar o twSDK!');
        console.error('Falha ao carregar o twSDK.');
    });
}

// Inicialização do Script após Carregar o twSDK
loadTwSDK(function () {
    try {
        // Verifica se a localização atual é válida
        if (twSDK.checkValidLocation('screen', scriptConfig.allowedScreens) && 
            twSDK.checkValidLocation('mode', scriptConfig.allowedModes)) {
            // Inicia a execução principal
            initScript();
        } else {
            if (DEBUG) console.log('Localização inválida. Redirecionando para a tela de defesa da tribo.');
            twSDK.redirectTo('ally', 'members_defense');
        }
    } catch (error) {
        UI.ErrorMessage(twSDK.tt('There was an error!'));
        console.error(`${scriptConfig.scriptData.name} Error:`, error);
    }
});

// Função Principal de Inicialização
async function initScript() {
    const { villages, players, tribes } = await fetchWorldData();
    
    // Verifica se o jogador está em uma tribo
    if (!parseInt(game_data.player.ally)) {
        UI.ErrorMessage(twSDK.tt('You can only run this script if you are a member of a tribe!'));
        return;
    }

    // Obtém a lista de membros da tribo
    const membersToFetch = await getTribeMembersList();

    if (membersToFetch.length === 0) {
        UI.ErrorMessage(twSDK.tt('Tribe members have not shared their troop counts with tribe leadership!'));
        return;
    }

    // Inicia a barra de progresso
    twSDK.startProgressBar(membersToFetch.length);

    // Fetch de dados de cada membro
    const playersData = await fetchPlayersData(membersToFetch);

    // Extrai os dados de tropas de cada aldeia
    const troopMap = mapTroopColumns();
    const villagesData = extractTroopData(troopMap);

    if (DEBUG) {
        console.log('Mapped Troop Columns:', troopMap);
        console.log('Extracted Villages Data:', villagesData);
    }

    // Construção da Interface de Usuário
    buildUI();

    // Inserção dos dados nos quadradinhos do mapa
    displayTroopDataOnMap(villagesData);

    // Registro de handlers para ações adicionais
    handleCalculateStackPlans(playersData);
    handleBacklineStacks(playersData);
    handleExport();
}

// Função para Mapear as Colunas de Tropas
function mapTroopColumns() {
    const troopMap = {};
    jQuery('table.vis.w100 thead tr th img').each(function(index) {
        const title = jQuery(this).attr('title').toLowerCase(); // Nome da tropa
        switch(title) {
            case 'lanceiro':
                troopMap['spear'] = index;
                break;
            case 'espadachim':
                troopMap['sword'] = index;
                break;
            case 'bárbaro':
                troopMap['axe'] = index;
                break;
            case 'explorador':
                troopMap['spy'] = index;
                break;
            case 'cavalaria leve':
                troopMap['light'] = index;
                break;
            case 'cavalaria pesada':
                troopMap['heavy'] = index;
                break;
            case 'aríete':
                troopMap['ram'] = index;
                break;
            case 'catapulta':
                troopMap['catapult'] = index;
                break;
            case 'paladino':
                troopMap['knight'] = index;
                break;
            case 'nobre':
                troopMap['snob'] = index;
                break;
            case 'milícia':
                troopMap['militia'] = index;
                break;
            // Adicione outros casos conforme necessário
            default:
                if (DEBUG) console.warn(`Tropa não mapeada: ${title}`);
                break;
        }
    });
    return troopMap;
}

// Função para Extrair Dados das Tropas
function extractTroopData(troopMap) {
    const villagesData = [];
    
    jQuery('table.vis.w100 tbody tr').each(function() {
        const row = jQuery(this);
        const cells = row.find('td');
        
        // Verifica se a linha contém dados de aldeia
        const villageLink = row.find('a[href*="screen=info_village&id="]');
        if(villageLink.length > 0) {
            const villageName = villageLink.text().trim();
            const pointsText = row.find('td').eq(1).text().trim().replace(/\./g, '');
            const points = parseInt(pointsText) || 0;
            
            // Captura a próxima linha que contém "a caminho"
            const defenseRow = row.next('tr');
            const defenseCells = defenseRow.find('td');
            
            const troops = {};
            
            for(const [unit, index] of Object.entries(troopMap)) {
                const cell = cells.eq(index);
                let count = cell.text().trim();
                if(count === '') {
                    // Tenta pegar da linha de defesa (a caminho)
                    const defenseCell = defenseCells.eq(index);
                    count = defenseCell.text().trim();
                }
                // Converte para número, tratando possíveis strings vazias
                count = parseInt(count) || 0;
                troops[unit] = count;
            }
            
            // Adiciona os dados da aldeia
            villagesData.push({
                name: villageName,
                points: points,
                troops: troops
            });

            if (DEBUG) {
                console.log(`Aldeia: ${villageName}, Pontos: ${points}, Tropas:`, troops);
            }
        }
    });
    
    return villagesData;
}

// Função para Buscar Dados dos Membros
async function fetchPlayersData(membersToFetch) {
    const playersData = [...membersToFetch];
    const memberUrls = membersToFetch.map(item => item.url);

    return new Promise((resolve, reject) => {
        twSDK.getAll(
            memberUrls,
            function (index, data) {
                twSDK.updateProgressBar(index, memberUrls.length);

                // Parseia a resposta como HTML
                const htmlDoc = jQuery.parseHTML(data);
                const villagesTableRows = jQuery(htmlDoc)
                    .find(`.table-responsive table.vis tbody tr`)
                    .not(':first');

                const villagesData = [];
                const troopMap = mapTroopColumns();

                // Parseia informações do jogador
                if (villagesTableRows && villagesTableRows.length) {
                    villagesTableRows.each(function () {
                        try {
                            const _this = jQuery(this);

                            const currentVillageName = _this.find('td:first a').text().trim();
                            if (currentVillageName) {
                                const currentVillageId = parseInt(
                                    twSDK.getParameterByName(
                                        'id',
                                        window.location.origin +
                                            _this.find('td:first a').attr('href')
                                    )
                                );

                                const currentVillageCoords = _this
                                    .find('td:eq(0)')
                                    .text()
                                    .trim()
                                    ?.match(twSDK.coordsRegex)[0];

                                let villageData = [];

                                _this.find('td')
                                    .not(':first')
                                    .not(':last')
                                    .not(':eq(0)')
                                    .each(function () {
                                        const unitAmount = jQuery(this).text().trim() !== '?' 
                                            ? parseInt(jQuery(this).text().trim()) 
                                            : 0;
                                        villageData.push(unitAmount);
                                    });

                                villageData = villageData.splice(0, Object.keys(troopMap).length);

                                let villageTroops = {};
                                Object.keys(troopMap).forEach((unit, idx) => {
                                    villageTroops[unit] = villageData[idx] || 0;
                                });

                                villagesData.push({
                                    villageId: currentVillageId,
                                    villageName: currentVillageName,
                                    villageCoords: currentVillageCoords,
                                    troops: villageTroops,
                                });
                            }
                        } catch (error) {
                            UI.ErrorMessage(twSDK.tt('Error fetching player incomings!'));
                            console.error(`${scriptConfig.scriptData.name} Error:`, error);
                        }
                    });
                }

                // Atualiza as informações dos jogadores
                playersData[index] = {
                    ...playersData[index],
                    villagesData: villagesData,
                };
            },
            function () {
                if (DEBUG) {
                    console.debug(`${scriptConfig.scriptData.name} playersData`, playersData);
                }

                // Mapeia as tropas e extrai os dados
                const troopMap = mapTroopColumns();
                const villagesData = extractTroopData(troopMap);

                if (DEBUG) {
                    console.log('Mapped Troop Columns:', troopMap);
                    console.log('Extracted Villages Data:', villagesData);
                }

                // Construção da Interface de Usuário
                buildUI();

                // Inserção dos dados nos quadradinhos do mapa
                displayTroopDataOnMap(villagesData);

                // Registro de handlers para ações adicionais
                handleCalculateStackPlans(playersData);
                handleBacklineStacks(playersData);
                handleExport();

                resolve(playersData);
            },
            function () {
                UI.ErrorMessage(twSDK.tt('Error fetching player incomings!'));
                reject('Error fetching player incomings!');
            }
        );
    });
}

// Função para Construir a Interface de Usuário
function buildUI() {
    const enemyTribePickerHtml = buildEnemyTribePicker(tribes, 'Tribes');
    const troopAmountsHtml = buildUnitsChooserTable();

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
    `;

    twSDK.renderBoxWidget(
        content,
        scriptConfig.scriptData.prefix,
        'ra-frontline-stacks',
        customStyle
    );
}

// Função para Exibir os Dados de Tropas no Mapa
function displayTroopDataOnMap(villagesData) {
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

    // Itera sobre cada aldeia e insere os dados no mapa
    villagesData.forEach(village => {
        const { name, troops } = village;
        const coords = village.name.match(/\((\d+)\|(\d+)\)/); // Extrai coordenadas do nome
        if (coords) {
            const x = parseInt(coords[1]);
            const y = parseInt(coords[2]);

            // Cria o elemento HTML para exibir as tropas
            let troopHTML = '';
            for (const [unit, count] of Object.entries(troops)) {
                if (count > 0 && unitIcons[unit]) {
                    troopHTML += `
                        <div style="display: flex; align-items: center; justify-content: center; gap: 2px;">
                            <img src="${unitIcons[unit]}" alt="${unit}" title="${unit}" style="width: 12px; height: 12px;">
                            <span style="font-size: 8px;">${count}</span>
                        </div>
                    `;
                }
            }

            if (troopHTML === '') {
                troopHTML = '0';
            }

            const troopDiv = $('<div></div>')
                .css({
                    position: 'absolute',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    color: '#fff',
                    width: '50px',
                    height: '35px',
                    zIndex: '10',
                    fontSize: '8px',
                    overflow: 'hidden',
                })
                .html(troopHTML);

            // Adiciona o elemento no mapa
            TWMap.mapHandler.spawnElement(troopDiv[0], x, y);

            if (DEBUG) {
                console.log(`Aldeia: ${village.name}, Tropas exibidas:`, troops);
            }
        }
    });
}

// Função para Buscar Lista de Membros da Tribo
async function getTribeMembersList() {
    let membersPageUrl = `/game.php?village=${game_data.village.id}&screen=ally&mode=members_defense`;
    if (game_data.player.sitter !== '0') {
        membersPageUrl += `&t=${game_data.player.id}`;
    }

    try {
        const response = await jQuery.get(membersPageUrl);
        const options = jQuery(response).find('.input-nicer option:not([disabled])');

        const membersToFetch = [];

        options.each(function (_, option) {
            const playerId = parseInt(option.value);
            if (!isNaN(playerId)) {
                const memberName = jQuery(option).text().trim();
                const url = `/game.php?screen=ally&mode=members_defense&player_id=${playerId}&village=${game_data.village.id}`;
                membersToFetch.push({
                    url: url,
                    id: playerId,
                    name: memberName,
                });
            }
        });

        return membersToFetch;
    } catch (error) {
        UI.ErrorMessage(twSDK.tt('Error fetching tribe members!'));
        console.error(`${scriptConfig.scriptData.name} Error:`, error);
        return [];
    }
}

// Função para Buscar Dados do Mundo
async function fetchWorldData() {
    try {
        const villages = await twSDK.worldDataAPI('village');
        const players = await twSDK.worldDataAPI('player');
        const tribes = await twSDK.worldDataAPI('ally');
        return { villages, players, tribes };
    } catch (error) {
        UI.ErrorMessage(`${scriptConfig.scriptData.name}: Error fetching world data!`);
        console.error(`${scriptConfig.scriptData.name} Error:`, error);
        return { villages: [], players: [], tribes: [] };
    }
}

// Função para Construir o Picker de Tribos Inimigas
function buildEnemyTribePicker(array, entity) {
    if (entity === 'Tribes') {
        array.sort((a, b) => parseInt(a[7]) - parseInt(b[7]));
    }

    let dropdown = `
        <label for="ra${entity}" class="ra-label">${twSDK.tt('Select enemy tribes')}</label>
        <input type="email" class="ra-input" multiple list="raSelect${entity}" placeholder="${twSDK.tt('Start typing and suggestions will show ...')}" id="ra${entity}">
        <datalist id="raSelect${entity}">
    `;

    array.forEach(item => {
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

    return dropdown;
}

// Função para Construir a Tabela de Seleção de Unidades
function buildUnitsChooserTable() {
    let unitsTable = ``;
    let thUnits = ``;
    let tableRow = ``;

    // Define as tropas relevantes na ordem de prioridade
    const defTroopTypes = ['spear', 'sword', 'axe', 'spy', 'light', 'heavy', 'ram', 'catapult', 'knight', 'snob', 'militia'];

    defTroopTypes.forEach(unit => {
        thUnits += `
            <th class="ra-text-center">
                <label for="unit_${unit}" class="ra-unit-type">
                    <img src="/graphic/unit/unit_${unit}.png" alt="${unit}" title="${unit}">
                </label>
            </th>
        `;

        tableRow += `
            <td class="ra-text-center">
                <input name="ra_unit_amounts" type="number" id="unit_${unit}" data-unit="${unit}" class="ra-input" value="0" min="0" />
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

    return unitsTable;
}

// Função para Registrar Handlers das Ações
function handleCalculateStackPlans(playersData) {
    jQuery('#raPlanStacks').on('click', function (e) {
        e.preventDefault();

        const { chosenTribes, distance, unitAmounts, stackLimit, scaleDownPerField } = collectUserInput();

        const villagesThatNeedStack = findVillagesThatNeedStack(playersData, chosenTribes, distance, unitAmounts, stackLimit);

        if (villagesThatNeedStack.length) {
            const villagesToBeStacked = calculateAmountMissingTroops(villagesThatNeedStack, unitAmounts, scaleDownPerField);
            villagesToBeStacked.sort((a, b) => a.fieldsAway - b.fieldsAway);

            const villagesTableHtml = buildVillagesTable(villagesToBeStacked);
            jQuery('#raStacks').show().html(villagesTableHtml);

            updateMap(villagesToBeStacked);
            jQuery('#raExport').attr('data-stack-plans', JSON.stringify(villagesToBeStacked));
        } else {
            UI.SuccessMessage(twSDK.tt('All villages have been properly stacked!'));
        }
    });
}

function handleBacklineStacks(playersData) {
    jQuery('#raBacklineStacks').on('click', function (e) {
        e.preventDefault();

        const { chosenTribes, distance } = collectUserInput();

        let playerVillages = playersData.flatMap(player => player.villagesData);
        let chosenTribeIds = twSDK.getEntityIdsByArrayIndex(chosenTribes, tribes, 2);
        let tribePlayers = getTribeMembersById(chosenTribeIds);
        let enemyTribeCoordinates = filterVillagesByPlayerIds(tribePlayers);

        // Filtra aldeias fora do raio
        let villagesOutsideRadius = [];
        playerVillages.forEach(village => {
            const { villageCoords, troops } = village;
            enemyTribeCoordinates.forEach(coordinate => {
                const villagesDistance = twSDK.calculateDistance(coordinate, villageCoords);
                if (villagesDistance > distance) {
                    const stackAmount = calculatePop(troops);
                    if (stackAmount > 30000) {
                        villagesOutsideRadius.push({
                            ...village,
                            fieldsAway: Math.round(villagesDistance * 100) / 100,
                            stackAmount: stackAmount,
                        });
                    }
                }
            });
        });

        villagesOutsideRadius.sort((a, b) => a.fieldsAway - b.fieldsAway);

        // Remove duplicatas
        let villagesObject = {};
        villagesOutsideRadius.forEach(item => {
            if (!villagesObject[item.villageId]) {
                villagesObject[item.villageId] = item;
            }
        });

        let villagesArray = Object.values(villagesObject);

        // Constrói as linhas da tabela
        let tableRows = villagesArray.map((village, index) => {
            return `
                <tr>
                    <td>${index + 1}</td>
                    <td class="ra-tal">
                        <a href="/game.php?screen=info_village&id=${village.villageId}" target="_blank" rel="noreferrer noopener">
                            ${village.villageName}
                        </a>
                    </td>
                    <td>${intToString(village.stackAmount)}</td>
                    <td>${village.fieldsAway}</td>
                </tr>
            `;
        }).join('');

        let villagesTableHtml = `
            <div class="ra-table-container ra-mb15">
                <table class="ra-table ra-table-v3" width="100%">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th class="ra-tal">${twSDK.tt('Village')}</th>
                            <th>${twSDK.tt('Pop.')}</th>
                            <th>${twSDK.tt('Distance')}</th>
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
    });
}

function handleExport() {
    jQuery('#raExport').on('click', function (e) {
        e.preventDefault();

        const dataStackPlans = jQuery(this).attr('data-stack-plans');
        if (dataStackPlans) {
            const stackPlans = JSON.parse(dataStackPlans);

            if (stackPlans.length) {
                let bbCode = `[table][**]#[||]${twSDK.tt('Village')}[||]${twSDK.tt('Missing Troops')}[||]${twSDK.tt('Distance')}[/**]\n`;

                stackPlans.forEach((stackPlan, index) => {
                    const { villageCoords, missingTroops, fieldsAway } = stackPlan;
                    const missingTroopsString = buildMissingTroopsString(missingTroops);
                    bbCode += `[*]${index + 1}[|] ${villageCoords} [|]${missingTroopsString}[|]${fieldsAway}\n`;
                });

                bbCode += `[/table]`;

                twSDK.copyToClipboard(bbCode);
                UI.SuccessMessage(twSDK.tt('Copied on clipboard!'));
            }
        } else {
            UI.ErrorMessage(twSDK.tt('No stack plans have been prepared!'));
        }
    });
}

// Função Auxiliar para Construir a Tabela de Aldeias
function buildVillagesTable(villages) {
    let villagesTableHtml = `
        <table class="ra-table ra-table-v3" width="100%">
            <thead>
                <tr>
                    <th>#</th>
                    <th class="ra-tal">${twSDK.tt('Village')}</th>
                    <th>${twSDK.tt('Map')}</th>
                    <th>${twSDK.tt('Pop.')}</th>
                    <th>${twSDK.tt('Distance')}</th>
                    <th>${twSDK.tt('Missing Troops')}</th>
                </tr>
            </thead>
            <tbody>
    `;

    villages.forEach((village, index) => {
        const { villageId, villageName, villageCoords, fieldsAway, missingTroops, pop } = village;
        const [x, y] = villageCoords.split('|');
        const missingTroopsString = buildMissingTroopsString(missingTroops);

        villagesTableHtml += `
            <tr>
                <td>${index + 1}</td>
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
                <td>${intToString(pop)}</td>
                <td>${fieldsAway}</td>
                <td>${missingTroopsString}</td>
            </tr>
        `;
    });

    villagesTableHtml += `
            </tbody>
        </table>
    `;

    return villagesTableHtml;
}

// Função Auxiliar para Construir a String das Tropas Faltantes
function buildMissingTroopsString(missingTroops) {
    let missingTroopsString = '';

    for (let [key, value] of Object.entries(missingTroops)) {
        missingTroopsString += `${key}: ${value}\n`;
    }

    return missingTroopsString;
}

// Função para Construir o Picker de Unidades
function buildUnitsChooserTable() {
    let unitsTable = ``;
    let thUnits = ``;
    let tableRow = ``;

    const defTroopTypes = ['spear', 'sword', 'axe', 'spy', 'light', 'heavy', 'ram', 'catapult', 'knight', 'snob', 'militia'];

    defTroopTypes.forEach(unit => {
        thUnits += `
            <th class="ra-text-center">
                <label for="unit_${unit}" class="ra-unit-type">
                    <img src="/graphic/unit/unit_${unit}.png" alt="${unit}" title="${unit}">
                </label>
            </th>
        `;

        tableRow += `
            <td class="ra-text-center">
                <input name="ra_unit_amounts" type="number" id="unit_${unit}" data-unit="${unit}" class="ra-input" value="0" min="0" />
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

    return unitsTable;
}

// Função para Calcular a População Total
function calculatePop(units) {
    let total = 0;

    for (let [key, value] of Object.entries(units)) {
        if (value) {
            const unitPopAmount = key !== 'heavy' ? twSDK.unitsFarmSpace[key] : HC_AMOUNT;
            total += unitPopAmount * value;
        }
    }

    if (DEBUG) console.log('Calculo da População:', total);
    return total;
}

// Função para Coletar Input do Usuário
function collectUserInput() {
    let chosenTribes = jQuery('#raTribes').val().trim();
    let distance = parseInt(jQuery('#raDistance').val()) || DEFAULT_VALUES.DISTANCE;
    let stackLimit = parseInt(jQuery('#raStack').val()) || DEFAULT_VALUES.STACK;
    let scaleDownPerField = parseInt(jQuery('#raScalePerField').val()) || DEFAULT_VALUES.SCALE_PER_FIELD;
    let unitAmounts = {};

    if (chosenTribes === '') {
        UI.ErrorMessage(twSDK.tt('You need to select an enemy tribe!'));
        return;
    } else {
        chosenTribes = chosenTribes.split(',');
    }

    jQuery('#raUnitSelector input').each(function () {
        const unit = jQuery(this).attr('data-unit');
        const amount = parseInt(jQuery(this).val()) || 0;

        if (amount > 0) {
            unitAmounts[unit] = amount;
        }
    });

    return {
        chosenTribes,
        distance,
        unitAmounts,
        stackLimit,
        scaleDownPerField,
    };
}

// Função para Converter Números Grandes em Formato Legível (e.g., 1000 -> 1k)
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

// Função para Buscar Membros da Tribo por IDs
function getTribeMembersById(tribeIds) {
    return players
        .filter(player => tribeIds.includes(parseInt(player[2])))
        .map(player => parseInt(player[0]));
}

// Função para Filtrar Aldeias por IDs de Jogadores
function filterVillagesByPlayerIds(playerIds) {
    return villages
        .filter(village => playerIds.includes(parseInt(village[4])))
        .map(village => `${village[2]}|${village[3]}`);
}

// Função para Calcular a Quantidade Faltante de Tropas
function calculateAmountMissingTroops(villagesThatNeedStack, unitAmounts, scaleDownPerField) {
    let villagesToBeStacked = [];

    villagesThatNeedStack.forEach(village => {
        const { troops, fieldsAway } = village;
        const distance = parseInt(fieldsAway);
        const missingTroops = calculateMissingTroops(troops, unitAmounts, distance, scaleDownPerField);

        villagesToBeStacked.push({
            ...village,
            missingTroops: missingTroops,
        });
    });

    return villagesToBeStacked;
}

// Função para Calcular Tropas Faltantes
function calculateMissingTroops(troops, unitAmounts, distance, scaleDownPerField) {
    let missingTroops = {};

    const nonScalingUnits = ['spy', 'heavy'];

    distance = distance - 1;

    for (let [key, value] of Object.entries(unitAmounts)) {
        let troopsAfterScalingDown = value - parseInt(distance) * scaleDownPerField * 1000;
        if (troopsAfterScalingDown > 0 && !nonScalingUnits.includes(key)) {
            let troopsDifference = troops[key] - troopsAfterScalingDown;
            if (troopsDifference < 0) { // Faltando tropas
                missingTroops[key] = Math.abs(troopsDifference);
            }
        }
    }

    return missingTroops;
}

// Função para Encontrar Aldeias que Precisam de Stack
function findVillagesThatNeedStack(playersData, chosenTribes, distance, unitAmount, stackLimit) {
    let playerVillages = playersData.flatMap(player => player.villagesData);

    let chosenTribeIds = twSDK.getEntityIdsByArrayIndex(chosenTribes, tribes, 2);
    let tribePlayers = getTribeMembersById(chosenTribeIds);
    let enemyTribeCoordinates = filterVillagesByPlayerIds(tribePlayers);

    // Filtra aldeias dentro do raio
    let villagesWithinRadius = [];
    playerVillages.forEach(village => {
        const { villageCoords, troops } = village;
        enemyTribeCoordinates.forEach(coordinate => {
            const villagesDistance = twSDK.calculateDistance(coordinate, villageCoords);
            if (villagesDistance <= distance) {
                villagesWithinRadius.push({
                    ...village,
                    fieldsAway: Math.round(villagesDistance * 100) / 100,
                });
            }
        });
    });

    // Filtra aldeias que precisam de stack
    let villagesThatNeedStack = [];
    villagesWithinRadius.forEach(village => {
        const { troops } = village;
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
            });
        }
    });

    villagesThatNeedStack.sort((a, b) => a.fieldsAway - b.fieldsAway);

    // Remove duplicatas
    let villagesObject = {};
    villagesThatNeedStack.forEach(item => {
        if (!villagesObject[item.villageId]) {
            villagesObject[item.villageId] = item;
        }
    });

    return Object.values(villagesObject);
}

// Função para Atualizar o Mapa com os Dados das Aldeias
function updateMap(villages) {
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

    // Itera sobre cada aldeia e insere os dados no mapa
    villages.forEach(village => {
        const { villageCoords, troops } = village;
        const coordsMatch = villageCoords.match(/(\d+)\|(\d+)/);
        if (coordsMatch) {
            const x = parseInt(coordsMatch[1]);
            const y = parseInt(coordsMatch[2]);

            // Cria o elemento HTML para exibir as tropas
            let troopHTML = '';
            for (const [unit, count] of Object.entries(troops)) {
                if (count > 0 && unitIcons[unit]) {
                    troopHTML += `
                        <div style="display: flex; align-items: center; justify-content: center; gap: 2px;">
                            <img src="${unitIcons[unit]}" alt="${unit}" title="${unit}" style="width: 12px; height: 12px;">
                            <span style="font-size: 8px;">${count}</span>
                        </div>
                    `;
                }
            }

            if (troopHTML === '') {
                troopHTML = '0';
            }

            const troopDiv = $('<div></div>')
                .css({
                    position: 'absolute',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    color: '#fff',
                    width: '50px',
                    height: '35px',
                    zIndex: '10',
                    fontSize: '8px',
                    overflow: 'hidden',
                })
                .html(troopHTML);

            // Adiciona o elemento no mapa
            TWMap.mapHandler.spawnElement(troopDiv[0], x, y);

            if (DEBUG) {
                console.log(`Aldeia: ${village.name}, Tropas exibidas:`, troops);
            }
        }
    });
}

// Função para Registrar Handlers das Ações
function handleCalculateStackPlans(playersData) {
    jQuery('#raPlanStacks').on('click', function (e) {
        e.preventDefault();

        const { chosenTribes, distance, unitAmounts, stackLimit, scaleDownPerField } = collectUserInput();

        const villagesThatNeedStack = findVillagesThatNeedStack(playersData, chosenTribes, distance, unitAmounts, stackLimit);

        if (villagesThatNeedStack.length) {
            const villagesToBeStacked = calculateAmountMissingTroops(villagesThatNeedStack, unitAmounts, scaleDownPerField);
            villagesToBeStacked.sort((a, b) => a.fieldsAway - b.fieldsAway);

            const villagesTableHtml = buildVillagesTable(villagesToBeStacked);
            jQuery('#raStacks').show().html(villagesTableHtml);

            updateMap(villagesToBeStacked);
            jQuery('#raExport').attr('data-stack-plans', JSON.stringify(villagesToBeStacked));
        } else {
            UI.SuccessMessage(twSDK.tt('All villages have been properly stacked!'));
        }
    });
}

function handleBacklineStacks(playersData) {
    jQuery('#raBacklineStacks').on('click', function (e) {
        e.preventDefault();

        const { chosenTribes, distance } = collectUserInput();

        let playerVillages = playersData.flatMap(player => player.villagesData);
        let chosenTribeIds = twSDK.getEntityIdsByArrayIndex(chosenTribes, tribes, 2);
        let tribePlayers = getTribeMembersById(chosenTribeIds);
        let enemyTribeCoordinates = filterVillagesByPlayerIds(tribePlayers);

        // Filtra aldeias fora do raio
        let villagesOutsideRadius = [];
        playerVillages.forEach(village => {
            const { villageCoords, troops } = village;
            enemyTribeCoordinates.forEach(coordinate => {
                const villagesDistance = twSDK.calculateDistance(coordinate, villageCoords);
                if (villagesDistance > distance) {
                    const stackAmount = calculatePop(troops);
                    if (stackAmount > 30000) {
                        villagesOutsideRadius.push({
                            ...village,
                            fieldsAway: Math.round(villagesDistance * 100) / 100,
                            stackAmount: stackAmount,
                        });
                    }
                }
            });
        });

        villagesOutsideRadius.sort((a, b) => a.fieldsAway - b.fieldsAway);

        // Remove duplicatas
        let villagesObject = {};
        villagesOutsideRadius.forEach(item => {
            if (!villagesObject[item.villageId]) {
                villagesObject[item.villageId] = item;
            }
        });

        let villagesArray = Object.values(villagesObject);

        // Constrói as linhas da tabela
        let tableRows = villagesArray.map((village, index) => {
            return `
                <tr>
                    <td>${index + 1}</td>
                    <td class="ra-tal">
                        <a href="/game.php?screen=info_village&id=${village.villageId}" target="_blank" rel="noreferrer noopener">
                            ${village.villageName}
                        </a>
                    </td>
                    <td>${intToString(village.stackAmount)}</td>
                    <td>${village.fieldsAway}</td>
                </tr>
            `;
        }).join('');

        let villagesTableHtml = `
            <div class="ra-table-container ra-mb15">
                <table class="ra-table ra-table-v3" width="100%">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th class="ra-tal">${twSDK.tt('Village')}</th>
                            <th>${twSDK.tt('Pop.')}</th>
                            <th>${twSDK.tt('Distance')}</th>
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
    });
}

function handleExport() {
    jQuery('#raExport').on('click', function (e) {
        e.preventDefault();

        const dataStackPlans = jQuery(this).attr('data-stack-plans');
        if (dataStackPlans) {
            const stackPlans = JSON.parse(dataStackPlans);

            if (stackPlans.length) {
                let bbCode = `[table][**]#[||]${twSDK.tt('Village')}[||]${twSDK.tt('Missing Troops')}[||]${twSDK.tt('Distance')}[/**]\n`;

                stackPlans.forEach((stackPlan, index) => {
                    const { villageCoords, missingTroops, fieldsAway } = stackPlan;
                    const missingTroopsString = buildMissingTroopsString(missingTroops);
                    bbCode += `[*]${index + 1}[|] ${villageCoords} [|]${missingTroopsString}[|]${fieldsAway}\n`;
                });

                bbCode += `[/table]`;

                twSDK.copyToClipboard(bbCode);
                UI.SuccessMessage(twSDK.tt('Copied on clipboard!'));
            }
        } else {
            UI.ErrorMessage(twSDK.tt('No stack plans have been prepared!'));
        }
    });
}

// Função Auxiliar para Construir a Tabela de Aldeias
function buildVillagesTable(villages) {
    let villagesTableHtml = `
        <table class="ra-table ra-table-v3" width="100%">
            <thead>
                <tr>
                    <th>#</th>
                    <th class="ra-tal">${twSDK.tt('Village')}</th>
                    <th>${twSDK.tt('Map')}</th>
                    <th>${twSDK.tt('Pop.')}</th>
                    <th>${twSDK.tt('Distance')}</th>
                    <th>${twSDK.tt('Missing Troops')}</th>
                </tr>
            </thead>
            <tbody>
    `;

    villages.forEach((village, index) => {
        const { villageId, villageName, villageCoords, fieldsAway, missingTroops, pop } = village;
        const [x, y] = villageCoords.split('|');
        const missingTroopsString = buildMissingTroopsString(missingTroops);

        villagesTableHtml += `
            <tr>
                <td>${index + 1}</td>
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
                <td>${intToString(pop)}</td>
                <td>${fieldsAway}</td>
                <td>${missingTroopsString}</td>
            </tr>
        `;
    });

    villagesTableHtml += `
            </tbody>
        </table>
    `;

    return villagesTableHtml;
}

// Função Auxiliar para Construir a String das Tropas Faltantes
function buildMissingTroopsString(missingTroops) {
    let missingTroopsString = '';

    for (let [key, value] of Object.entries(missingTroops)) {
        missingTroopsString += `${key}: ${value}\n`;
    }

    return missingTroopsString;
}
