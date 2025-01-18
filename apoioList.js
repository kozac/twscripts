javascript:(function() {
    // Função auto-executável para evitar poluição do escopo global
    (function() {
        // Verifica se o jogador está em uma tribo
        function isInTribe() {
            return parseInt(game_data.player.ally) > 0;
        }

        // Função para buscar os membros da tribo
        function fetchTribeMembers() {
            return new Promise(function(resolve, reject) {
                let membersDefenseURL = `/game.php?village=${game_data.village.id}&screen=ally&mode=members_defense`;
                if (game_data.player.sitter != '0') {
                    membersDefenseURL += `&t=${game_data.player.id}`;
                }

                $.get(membersDefenseURL, function(data) {
                    // Parseia o HTML recebido
                    let html = $(data);
                    // Seleciona todas as opções na classe '.input-nicer' que não estão desabilitadas
                    let options = html.find('.input-nicer option:not([disabled])');

                    let tribeMembers = [];

                    options.each(function() {
                        let name = $(this).text().trim();
                        if (name) {
                            tribeMembers.push(name);
                        }
                    });

                    resolve(tribeMembers);
                }).fail(function() {
                    reject('Falha ao buscar os membros da tribo.');
                });
            });
        }

        // Função para extrair os nomes dos jogadores que enviaram apoio
        function getSupportingPlayers() {
            let supportingPlayers = new Set();

            // Seletores para apoio ainda a caminho
            let supportEnRouteSelector = '#commands_outgoings > table > tbody > tr > td:nth-child(1) > span > span > a > span.quickedit-label';
            $(supportEnRouteSelector).each(function() {
                let fullText = $(this).text().trim();
                let playerName = fullText.split(':')[0].trim(); // Extrai o nome antes dos ':'
                if (playerName) {
                    supportingPlayers.add(playerName);
                }
            });

            // Seletores para apoio já chegou
            let supportArrivedSelector = '#withdraw_selected_units_village_info > table > tbody > tr > td:nth-child(1) > a:nth-child(2)';
            $(supportArrivedSelector).each(function() {
                let playerName = $(this).text().trim();
                if (playerName) {
                    supportingPlayers.add(playerName);
                }
            });

            return Array.from(supportingPlayers);
        }

        // Função para comparar membros da tribo com jogadores que enviaram apoio
        function compareSupport(tribeMembers, supportingPlayers) {
            let supported = [];
            let notSupported = [];

            tribeMembers.forEach(function(member) {
                if (supportingPlayers.includes(member)) {
                    supported.push(member);
                } else {
                    notSupported.push(member);
                }
            });

            return { supported, notSupported };
        }

        // Função para exibir as informações de apoio na interface do usuário
        function displaySupportInfo(supported, notSupported) {
            // Remove qualquer container anterior para evitar duplicações
            $('#supportInfoContainer').remove();

            // Cria um contêiner fixo na parte inferior direita da página
            let container = $('<div id="supportInfoContainer"></div>').css({
                position: 'fixed',
                bottom: '10px',
                right: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '2px solid #000',
                borderRadius: '8px',
                padding: '15px',
                zIndex: 10000,
                maxHeight: '400px',
                overflowY: 'auto',
                width: '350px',
                boxShadow: '0 0 10px rgba(0,0,0,0.5)'
            });

            // Título
            container.append('<h3 style="margin-top:0; text-align:center;">Apoio à Aldeia Atual</h3>');

            // Membros que enviaram apoio
            container.append(`<h4>Membros que Enviaram Apoio (${supported.length})</h4>`);
            if (supported.length > 0) {
                let supportedList = $('<ul></ul>').css({ 'list-style-type': 'disc', 'padding-left': '20px' });
                supported.forEach(function(name) {
                    supportedList.append(`<li>${name}</li>`);
                });
                container.append(supportedList);
            } else {
                container.append('<p>Nenhum membro enviou apoio.</p>');
            }

            // Membros que não enviaram apoio
            container.append(`<h4>Membros que Não Enviaram Apoio (${notSupported.length})</h4>`);
            if (notSupported.length > 0) {
                let notSupportedList = $('<ul></ul>').css({ 'list-style-type': 'disc', 'padding-left': '20px' });
                notSupported.forEach(function(name) {
                    notSupportedList.append(`<li>${name}</li>`);
                });
                container.append(notSupportedList);
            } else {
                container.append('<p>Todos os membros enviaram apoio.</p>');
            }

            // Botão para fechar o contêiner
            let closeButton = $('<button>Fechar</button>').css({
                position: 'absolute',
                top: '10px',
                right: '10px',
                padding: '5px 10px',
                cursor: 'pointer',
                backgroundColor: '#ff4d4d',
                color: '#fff',
                border: 'none',
                borderRadius: '4px'
            }).on('click', function() {
                container.remove();
            });
            container.append(closeButton);

            // Adiciona o contêiner ao corpo da página
            $('body').append(container);
        }

        // Função principal que executa todas as etapas
        function main() {
            if (!isInTribe()) {
                alert('Você precisa estar em uma tribo para usar este script.');
                return;
            }

            // Exibe um indicador de carregamento
            let loadingIndicator = $('<div id="supportLoadingIndicator"></div>').css({
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'rgba(0,0,0,0.7)',
                color: '#fff',
                padding: '20px',
                borderRadius: '8px',
                zIndex: 10000
            }).text('Analisando apoio, por favor aguarde...');
            $('body').append(loadingIndicator);

            fetchTribeMembers().then(function(tribeMembers) {
                let supportingPlayers = getSupportingPlayers();
                let { supported, notSupported } = compareSupport(tribeMembers, supportingPlayers);
                displaySupportInfo(supported, notSupported);
                loadingIndicator.remove();
            }).catch(function(error) {
                loadingIndicator.remove();
                alert(error);
                console.error(error);
            });
        }

        // Executa a função principal
        main();

    })();
})();
