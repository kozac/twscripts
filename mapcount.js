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
                name: villageName,
                points: points,
                troops: troops,
                villageCoords: extractCoordsFromName(villageName), // Função para extrair coordenadas
                villageId: extractIdFromLink(villageLink.attr('href')), // Função para extrair ID da aldeia
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
