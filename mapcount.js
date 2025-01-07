// User Input
if (typeof DEBUG !== 'boolean') DEBUG = false;
if (typeof HC_AMOUNT === 'undefined') HC_AMOUNT = null;

// Script Config
var scriptConfig = {
    scriptData: {
        prefix: 'frontlineStacksPlanner',
        name: 'Frontline Stacks Planner',
        version: 'v1.0.2',
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
            'Tropa': 'Troop',
            'Quantidade Total': 'Total Amount',
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
        // Initialize Library
        await twSDK.init(scriptConfig);
        const scriptInfo = twSDK.scriptInfo();
        const isValidScreen = twSDK.checkValidLocation('screen');

        // Check that the player is a member of a tribe
        if (!parseInt(game_data.player.ally)) {
            UI.ErrorMessage(
                twSDK.tt(
                    'You can only run this script if you are member of a tribe!'
                )
            );
            return;
        }

        if ('TWMap' in window) mapOverlay = TWMap;

        const hcPopAmount = HC_AMOUNT ?? twSDK.unitsFarmSpace['heavy']; // HC_AMOUNT is provided by the player

        const DEFAULT_VALUES = {
            DISTANCE: 5,
            STACK: 100,
            SCALE_PER_FIELD: 5,
        };

        const { villages, players, tribes } = await fetchWorldData();

        // Entry Point
        (function () {
            try {
                if (isValidScreen) {
                    // build user interface
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

        // Initialize the script
        async function initScript() {
            const playersToFetch = await getTribeMembersList();

            if (playersToFetch.length) {
                const playersData = [...playersToFetch];
                const memberUrls = playersToFetch.map((item) => item.url);

                // Show progress bar and notify user
                twSDK.startProgressBar(memberUrls.length);

                twSDK.getAll(
                    memberUrls,
                    function (index, data) {
                        console.log(`Fetching data for member ${index + 1}/${memberUrls.length}`);
                        twSDK.updateProgressBar(index, memberUrls.length);

                        // parse response as html
                        const htmlDoc = jQuery.parseHTML(data);
                        console.log('Received HTML:', htmlDoc);

                        const villagesTableRows = jQuery(htmlDoc)
                            .find('.table-responsive table.vis tbody tr')
                            .filter(function () {
                                return jQuery(this).find('td:first a').length > 0 && jQuery(this).find('td:first a').text().includes('Na Aldeia');
                            });

                        console.log(`Number of village rows found: ${villagesTableRows.length}`);

                        const villagesData = [];

                        // parse player information
                        if (villagesTableRows && villagesTableRows.length) {
                            villagesTableRows.each(function () {
                                try {
                                    const _this = jQuery(this);

                                    const currentVillageName = _this
                                        .find('td:first a')
                                        .text()
                                        .trim();
                                    console.log('Village Name:', currentVillageName);
                                    if (currentVillageName) {
                                        const villageHref = _this.find('td:first a').attr('href');
                                        console.log('Village HREF:', villageHref);
                                        const currentVillageId = parseInt(
                                            twSDK.getParameterByName(
                                                'id',
                                                window.location.origin + villageHref
                                            )
                                        );
                                        console.log('Village ID:', currentVillageId);

                                        const currentVillageCoordsMatch = _this
                                            .find('td:eq(0)')
                                            .text()
                                            .trim()
                                            .match(twSDK.coordsRegex);
                                        const currentVillageCoords = currentVillageCoordsMatch ? currentVillageCoordsMatch[0] : 'N/A';
                                        console.log('Village Coordinates:', currentVillageCoords);

                                        let villageData = [];

                                        _this
                                            .find('td')
                                            .not(':first')
                                            .not(':last')
                                            .not(':eq(0)')
                                            .each(function () {
                                                const unitAmountText = jQuery(this).text().trim();
                                                const unitAmount = unitAmountText !== '?' ? parseInt(unitAmountText.replace(/\./g, '')) : 0;
                                                if (isNaN(unitAmount)) {
                                                    console.warn(`Invalid unit amount in cell ${jQuery(this).index()}: "${unitAmountText}"`);
                                                }
                                                villageData.push(unitAmount);
                                            });

                                        console.log('Raw troop data:', villageData);

                                        villageData = villageData.splice(
                                            0,
                                            game_data.units.length
                                        );

                                        let villageTroops = {};
                                        game_data.units.forEach(
                                            (unit, index) => {
                                                villageTroops[unit] = villageData[index] || 0;
                                            }
                                        );

                                        console.log('Village Troops:', villageTroops);

                                        villagesData.push({
                                            villageId: currentVillageId,
                                            villageName: currentVillageName,
                                            villageCoords: currentVillageCoords,
                                            troops: villageTroops,
                                        });
                                    }
                                } catch (error) {
                                    UI.ErrorMessage(
                                        twSDK.tt(
                                            'Error fetching player incomings!'
                                        )
                                    );
                                    console.error(
                                        `${scriptInfo} Error:`,
                                        error
                                    );
                                }
                            });
                        } else {
                            console.warn('No village rows found in the table.');
                        }

                        // update players info
                        playersData[index] = {
                            ...playersData[index],
                            villagesData: villagesData,
                        };
                    },
                    function () {
                        if (DEBUG) {
                            console.debug(
                                `${scriptInfo} playersData`,
                                playersData
                            );
                        }

                        // build user interface
                        buildUI();

                        // register action handlers
                        handleCalculateStackPlans(playersData);
                        handleBacklineStacks(playersData);
                        handleExport();
                    },
                    function (error) {
                        UI.ErrorMessage(
                            twSDK.tt('Error fetching player incomings!')
                        );
                        console.error(`${scriptInfo} Error:`, error);
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

        // Render: Build the user interface
        function buildUI() {
            const enemyTribePickerHtml = buildEnemyTribePicker(
                tribes,
                'Tribes'
            );
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
                .ra-total-troops-overlay img {
                    width: 16px;
                    height: 16px;
                    vertical-align: middle;
                    margin-right: 4px;
                }
            `;

            twSDK.renderBoxWidget(
                content,
                scriptConfig.scriptData.prefix,
                'ra-frontline-stacks',
                customStyle
            );
        }

        // Action Handler: Check frontline villages stacks and find missing stacks
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

                console.log(`Number of villages needing stack: ${villagesThatNeedStack.length}`);

                if (villagesThatNeedStack.length) {
                    const villagesToBeStacked = calculateAmountMissingTroops(
                        villagesThatNeedStack,
                        unitAmounts,
                        scaleDownPerField
                    );

                    console.log('Villages to be stacked:', villagesToBeStacked);

                    // Sum the total troops per unit type
                    const totalTroops = villagesToBeStacked.reduce((totals, village) => {
                        for (let [unit, amount] of Object.entries(village.missingTroops)) {
                            if (!totals[unit]) {
                                totals[unit] = 0;
                            }
                            totals[unit] += amount;
                        }
                        return totals;
                    }, {});

                    console.log('Total troops to stack:', totalTroops);

                    // Convert the totalTroops object to an array for easier manipulation
                    const totalTroopsArray = Object.entries(totalTroops).map(([unit, amount]) => ({ unit, amount }));

                    // Build the total troops table
                    const totalTroopsTableHtml = buildTotalTroopsTable(totalTroopsArray);

                    jQuery('#raStacks').show();
                    jQuery('#raStacks').html(totalTroopsTableHtml);

                    // Update the map with total troops
                    updateMapWithTotalTroops(totalTroops);
                    jQuery('#raExport').attr(
                        'data-stack-plans',
                        JSON.stringify(totalTroops)
                    );
                } else {
                    UI.SuccessMessage(
                        twSDK.tt('All villages have been properly stacked!')
                    );
                }
            });
        }

        // Action Handler: Find backline stacks
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

                // filter villages by radius
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
            });
        }

        // Action Handler: Export stack plans
        function handleExport() {
            jQuery('#raExport').on('click', function (e) {
                e.preventDefault();

                const dataStackPlans = jQuery(this).attr('data-stack-plans');
                if (dataStackPlans) {
                    const stackPlans = JSON.parse(dataStackPlans);

                    if (Object.keys(stackPlans).length) {
                        let bbCode = `[table][**]${twSDK.tt('Tropa')}[||]${twSDK.tt('Quantidade Total')}[/**]\n`;

                        for (let [unit, amount] of Object.entries(stackPlans)) {
                            bbCode += `[*]${twSDK.tt(capitalizeFirstLetter(unit))}[|]${intToString(amount)}\n`;
                        }

                        bbCode += `[/table]`;

                        twSDK.copyToClipboard(bbCode);
                        UI.SuccessMessage(twSDK.tt('Copied on clipboard!'));
                    }
                } else {
                    UI.ErrorMessage(
                        twSDK.tt('No stack plans have been prepared!')
                    );
                }
            });
        }

        // Helper: Build a table of total missing troops
        function buildTotalTroopsTable(totalTroopsArray) {
            let tableRows = `
                <tr>
                    <th>${twSDK.tt('Tropa')}</th>
                    <th>${twSDK.tt('Quantidade Total')}</th>
                </tr>
            `;

            totalTroopsArray.forEach((troop) => {
                tableRows += `
                    <tr>
                        <td>
                            <img src="/graphic/unit/unit_${troop.unit}.png" alt="${troop.unit}" title="${twSDK.tt(capitalizeFirstLetter(troop.unit))}" /> ${twSDK.tt(capitalizeFirstLetter(troop.unit))}
                        </td>
                        <td>
                            ${intToString(troop.amount)}
                        </td>
                    </tr>
                `;
            });

            const totalTroopsTableHtml = `
                <table class="ra-table ra-table-v3" width="100%">
                    <thead>
                        ${tableRows}
                    </thead>
                </table>
            `;

            return totalTroopsTableHtml;
        }

        // Helper: Capitalize first letter
        function capitalizeFirstLetter(string) {
            return string.charAt(0).toUpperCase() + string.slice(1);
        }

        // Helper: Update the map UI with total troops
        function updateMapWithTotalTroops(totalMissingTroops) {
            // Clear any previous elements
            jQuery('.ra-total-troops-overlay').remove();

            // Build the total troops string
            let totalTroopsString = '';
            for (let [unit, amount] of Object.entries(totalMissingTroops)) {
                totalTroopsString += `${twSDK.tt(capitalizeFirstLetter(unit))}: ${intToString(amount)}\n`;
            }

            // Create an element to display the total troops in the center of the map
            const totalTroopsDiv = $('<div></div>')
                .addClass('ra-total-troops-overlay')
                .css({
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    color: '#fff',
                    padding: '10px',
                    borderRadius: '5px',
                    zIndex: '1000',
                    whiteSpace: 'pre-line',
                    fontSize: '12px',
                })
                .html(totalTroopsString);

            // Add to the map
            jQuery('#map').append(totalTroopsDiv);

            // Optional: Remove the display after some seconds
            setTimeout(() => {
                totalTroopsDiv.fadeOut(500, () => {
                    totalTroopsDiv.remove();
                });
            }, 10000); // Remove after 10 seconds
        }

        // Helper: Build enemy tribes picker
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

            return dropdown;
        }

        // Helper: Build the missing troops string
        function buildMissingTroopsString(missingTroops) {
            let missingTroopsString = '';

            for (let [key, value] of Object.entries(missingTroops)) {
                missingTroopsString += `${twSDK.tt(capitalizeFirstLetter(key))}: ${value}\n`;
            }

            return missingTroopsString;
        }

        // Helper: Build table of units and unit amounts
        function buildUnitsChooserTable() {
            let unitsTable = ``;
            let thUnits = ``;
            let tableRow = ``;

            const defTroopTypes = ['spear', 'sword', 'archer', 'spy', 'heavy'];

            defTroopTypes.forEach((unit) => {
                thUnits += `
                    <th class="ra-text-center">
                        <label for="unit_${unit}" class="ra-unit-type">
                            <img src="/graphic/unit/unit_${unit}.png">
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

        // Helper: Calculate amounts of needed troops for each village
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
            });

            return villagesToBeStacked;
        }

        // Helper: Calculate missing troop amounts for every village
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
                    if (troopsDifference > 0) {
                        missingTroops[key] = troopsDifference;
                    }
                }
            }

            return missingTroops;
        }

        // Helper: Find villages that need to be stacked
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

            console.log('Player villages:', playerVillages);

            let chosenTribeIds = twSDK.getEntityIdsByArrayIndex(
                chosenTribes,
                tribes,
                2
            );
            console.log('Chosen tribe IDs:', chosenTribeIds);
            let tribePlayers = getTribeMembersById(chosenTribeIds);
            console.log('Players in chosen tribes:', tribePlayers);

            let enemyTribeCoordinates = filterVillagesByPlayerIds(tribePlayers);
            console.log('Enemy tribe coordinates:', enemyTribeCoordinates);

            // filter villages by radius
            let villagesWithinRadius = [];
            playerVillages.forEach((village) => {
                const { villageCoords } = village;
                enemyTribeCoordinates.forEach((coordinate) => {
                    const villagesDistance = twSDK.calculateDistance(
                        coordinate,
                        villageCoords
                    );
                    if (villagesDistance <= distance) {
                        villagesWithinRadius.push({
                            ...village,
                            fieldsAway:
                                Math.round(villagesDistance * 100) / 100,
                        });
                    }
                });
            });

            console.log(`Villages within radius of ${distance}:`, villagesWithinRadius);

            // filter villages by stack size
            let villagesThatNeedStack = [];
            villagesWithinRadius.forEach((village) => {
                const { troops } = village;
                const villageTroopTotal = Object.values(troops).reduce((sum, val) => sum + val, 0);
                const realStackLimit = stackLimit * 1000;

                let shouldAdd = false;

                for (let [key, value] of Object.entries(unitAmount)) {
                    if (troops[key] < value) {
                        shouldAdd = true;
                        break;
                    }
                }

                if (villageTroopTotal < realStackLimit) {
                    shouldAdd = true;
                }

                if (shouldAdd) {
                    villagesThatNeedStack.push({
                        ...village,
                        troopTotal: villageTroopTotal,
                    });
                }
            });

            console.log('Villages that need stack:', villagesThatNeedStack);

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

            console.log('Final villages that need stack:', villagesArray);

            return villagesArray;
        }

        // Helper: Calculate total pop
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

            console.log(`Total population calculated: ${total}`);

            return total;
        }

        // Helper: Collect user input
        function collectUserInput() {
            let chosenTribes = jQuery('#raTribes').val().trim();
            let distance = parseInt(jQuery('#raDistance').val());
            let stackLimit = parseInt(jQuery('#raStack').val());
            let scaleDownPerField = parseInt(jQuery('#raScalePerField').val());
            let unitAmounts = {};

            if (chosenTribes === '') {
                UI.ErrorMessage(twSDK.tt('You need to select an enemy tribe!'));
            } else {
                chosenTribes = chosenTribes.split(',');
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

            return {
                chosenTribes,
                distance,
                unitAmounts,
                stackLimit,
                scaleDownPerField,
            };
        }

        // Helper: Convert 1000 to 1k
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

        // Helper: Get tribe members by tribe ids
        function getTribeMembersById(tribeIds) {
            return players
                .filter((player) => tribeIds.includes(parseInt(player[2])))
                .map((player) => parseInt(player[0]));
        }

        // Helper: Filter villages by player ids
        function filterVillagesByPlayerIds(playerIds) {
            return villages
                .filter((village) => playerIds.includes(parseInt(village[4])))
                .map((village) => village[2] + '|' + village[3]);
        }

        // Helper: Fetch players list
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
                        name: option.text,
                    });
                }
            });

            return membersToFetch;
        }

        // Helper: Fetch all required world data
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
    }
);
