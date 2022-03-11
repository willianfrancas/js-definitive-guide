"use strict";

/*
* Este script define a função calculate() chamada pelas rotinas de tratamento de evento
* no código HTML acima. A função lê valores de elementos <input>, calcula
* as informações de pagamento de empréstimo, exibe o resultado em elementos <span>.
* Também salva os dados do usuário, exibe links para financeiras e desenha um gráfico.
*/
function calculate() {
    // Pesquisa os elementos de entrada e saída no documento
    var amount = document.getElementById("amount");
    var apr = document.getElementById("apr");
    var years = document.getElementById("years");
    var zipcode = document.getElementById("zipcode");
    var payment = document.getElementById("payment");
    var total = document.getElementById("total");
    var totalinterest = document.getElementById("totalinterest");

    // Obtém a entrada do usuário através dos elementos de entrada. Presume que tudo isso é válido

    var principal = parseFloat(amount.value);
    var interest = parseFloat(apr.value) / 100 / 12; // Converte os juros de porcentagem para decimais e converte de taxa anual para mensal.
    var payments = parseFloat(years.value) * 12 // Converte o periodo de pagamento em anos para o numero de pagamentos mensais.

    // Calcula o valor do pagamento mensal
    var x = Math.pow(1 + interest, payments); // Math.pow() calcula potencias
    var monthly = (principal * x * interest) / (x - 1);

    // Se o resultado é um numero finito, a entrada do usuario estava correta e temos resultados significativos para exibir
    if (isFinite(monthly)) {
        //Preenche os campos de saida, arredondando para 2 casas decimais
        payment.innerHTML = monthly.toFixed(2);
        total.innerHTML = (monthly * payments).toFixed(2);
        totalinterest.innerHTML = ((monthly * payments) - principal).toFixed(2);

        var params = { amount: amount.value, apr: apr.value, years: years.value, zipcode: zipcode.value };
        // Salva a entrada do usuário para que possamos recupera-la na próxima vez que ele visitar
        save(params);
        try { // Captura quaisquer erros que ocorram dentro destas chaves
            getLenders(lendersParam);
        }
        catch (e) { /*Ignora os erros*/ }

        // Traça o gráfico do saldo devedor, dos juros e dos pagamentos do capital
        chart(principal, interest, monthly, payments);
    } else {
        // O resultado foi Not-A-Number ou infinito, o que significa que a entrada estava incompleta ou era inválida.
        // Apaga qualquer saída exibida anteriormente.
        // Apaga o condeudo dos elementos
        payment.innerHTML = "";
        total.innerHTML = "";
        totalinterest.innerHTML = "";
        // Sem argumentos, apaga o gráfico
        chart();
    }
}


// Salva a entrada do usuário como propriedades do objeto localStorage.
// Essas propriedades ainda existirão quando o usuário visitar no futuro
// Esse recurso de armazenamento não vai funcionar em alguns navegadores (Firefox, por exemplo),
// se você executar o exemplo a partir de um arquivo local:// URL
// Contudo, funciona com HTTP
function save(params) {
    if (window.localStorage) {
        localStorage.loan_amount = params.amount;
        localStorage.loan_apr = params.apr;
        localStorage.loan_years = params.years;
        localStorage.loan_zipcode = params.zipcode;
    }
}


// Tenta restaurar os campos de entrada automaticamente quando o documento é carregado pela primeira vez.
window.onload = function () {
    // Se o navegador suporta localStorage e temos alguns dados armazenados
    var savedValues = "";
    if (window.localStorage && localStorage.loan_amount) {
        document.getElementById("amount").value = localStorage.loan_amount;
        document.getElementById("apr").value = localStorage.loan_apr;
        document.getElementById("years").value = localStorage.loan_years;
        document.getElementById("zipcode").value = localStorage.loan_zipcode;
        savedValues = [
            localStorage.loan_amount,
            localStorage.loan_apr,
            localStorage.loan_years,
            localStorage.loan_zipcode
        ];
    }
    var principal = parseFloat(localStorage.loan_amount);
    var interest = parseFloat(localStorage.loan_apr) / 100 / 12; // Converte os juros de porcentagem para decimais e converte de taxa anual para mensal.
    var payments = parseFloat(localStorage.loan_years) * 12 // Converte o periodo de pagamento em anos para o numero de pagamentos mensais.
    var x = Math.pow(1 + interest, payments); // Math.pow() calcula potencias
    var monthly = (principal * x * interest) / (x - 1);
    chart(principal, interest, monthly, payments);
}

// Passa a entrada do usuario para um script do lado do servidor que (teoricamente) pode retornar
// uma lista de links para financeiras locais interessadas em fazer empréstimos.
// Este exemplo não contém uma implementação real desse serviço de busca de financeiras.
// Mas se o serviço existisse, essa função funcionaria.
function getLenders(params) {

    //Se o navegador não suporta o objeto XMLHttpRequest, não faz nada
    if (!window.XMLHttpRequest) return;

    // Localiza o elemento para exibir a lista de financeiras
    var ad = document.getElementById("lenders");
    if (!ad) return; // Encerra se não há ponto de saida

    // Codifica a entrada do usuário como parâmetros de consulta em URL
    // URL do serviço e dados do usuário na string de consulta
    var url = `getLenders.php?amt=${encodeURIComponent(apr)}&yrs=${encodeURIComponent(years)}&zip=${encodeURIComponent(zipcode)}`;

    // Busca o conteúdo desse URL usando o objeto XMLHttpRequest
    var req = new XMLHttpRequest(); // Inicia um novo pedido
    req.open('GET', url); // Um pedido GET da HTTP para o URL
    req.send(null); // Envia o pedido sem corpo

    // Antes de retornar, registra uma função de rotina de tratamento de evento que será
    // chamada em um momento posterior, quando a resposta do servidor de HTTP chegar.

    // Esse tipo de programação assincrona é muito comum em javascript no lado do cliente
    req.onreadystatechange = function () {
        if (req.readyState === 4 && req.status === 200) {
            // Se chegamos até aqui, obtivemos uma resposta HTTP válida e completa
            var response = req.responseText; // Resposta HTTP como string
            var lenders = JSON.parse(response); // Analisa em um array JS

            // Converte o array de objetos lender em uma String HTML
            var list = "";
            for (var i = 0; i < lenders.length; i++) {
                list += `<li> <a href="${lenders[i]?.url}"> ${lenders[i]?.name} </a>`;
            }
            // Exibe o código HTML no elemento acima.
            ad.innerHTML = `<ul> ${list} </ul>`;
        }
    }
}

// Faz o gráfico do saldo devedor mensal, dos juros e do capital em um elemento <canvas> do HTML.
// Se for chamado sem argumentos, basta apagar qualquer gráfico desenhado anteriormente.

function chart(principal, interest, monthly, payments) {
    var graph = document.getElementById("graph"); // Obtém a marca <canvas>
    graph.width = graph.width; // Mágica para apagar e redefinir o elemento <canvas>

    // Se chamamos sem argumentos ou se esse navegador não suporta elementos 
    // gráficos em um elemento <canvas>, basta retornar.
    if (arguments.length === 0 || !graph.getContext) return;

    // Obtém o objeto contexto de canvas que define a API de desenho
    var g = graph.getContext('2d'); // Todo desenho é feito com esse objeto
    var width = graph.width, height = graph.height; // Obtém o tamanho da tela de desenho


    // Funções que convertem números de pagamentos e valores monetários em pixels
    function paymentToX(n) {
        return n * width / payments;
    }
    function amountToY(a) {
        return height - (a * height / (monthly * payments * 1.05));
    }


    // Os pagamentos são uma linha reta de (0,0) à (payments, monthly * payments)
    g.moveTo(paymentToX(0), amountToY(0)); // Começa no canto inferior esquerdo
    g.lineTo(paymentToX(payments), amountToY(monthly * payments)); // Desenta até o canto superior direito
    g.lineTo(paymentToX(payments), amountToY(0)); // Para baixo até o canto inferior direito

    g.closePath(); // Volta para o inicio
    g.fillStyle = "#f88"; // Define a cor: vermelho claro
    g.fill(); // Preenche o triangulo
    g.font = "bold 12px sans-serif"; // Define uma fonte
    g.fillText("Total Interest Payments", 20, 20); // Desenha texto na legenda

    // O capital acumulado não é linear e é mais complicado de representar no gráfico
    var equity = 0;
    g.beginPath(); // Inicia uma nova figura
    g.moveTo(paymentToX(0), amountToY(0)); // começando no canto inferior esquerdo

    for (var p = 1; p <= payments; p++) {
        // Para cada pagamento, descobre qual é o juro
        var thisMonthsInterest = (principal - equity) * interest;
        equity += (monthly - thisMonthsInterest); // O resto vai para o capital
        g.lineTo(paymentToX(p), amountToY(equity)); // Linha até este ponto
    }
    g.lineTo(paymentToX(payments), amountToY(0)); // Linha de volta para o eixo X
    g.closePath(); // E volta para o ponto inicial
    g.fillStyle = "green"; // Aplica cor: verde
    g.fill(); // Preenche a área sob a curva
    g.fillText("Total Equity", 20, 35); // Rotula em verde

    // Faz laço novamente, como acima, mas representa o saldo devedor como uma linha preta grossa no grafico
    var bal = principal;
    g.beginPath();
    g.moveTo(paymentToX(0), amountToY(bal));
    for (var p = 1; p <= payments; p++) {
        var thisMonthsInterest = bal * interest;
        bal -= (monthly - thisMonthsInterest); // O resto vai para o capital
        g.lineTo(paymentToX(p), amountToY(bal)); // Desenha a linha até esse ponto
    }
    g.lineWidth = 3; // Usa uma linha grossa
    g.stroke(); // Desenha a curva do saldo
    g.fillStyle = "black"; // Troca para texto preto 
    g.fillText("Loan Balance", 20, 50); // Entrada da legenda


    // Agora faz marcações anuais e os numeros de ano no eixo X
    g.textAlign = "center"; // Centraliza o texto nas marcas

    var y = amountToY(0); // Coordena Y do eixo X
    for (var year = 1; year * 12 <= payments; year++) { // Para cada ano
        var x = paymentToX(year * 12); // calcula a posição da marca
        g.fillRect(x - 0.5, y - 3, 1, 3); // desenha a marca
        if (year === 1) g.fillText("Year", x, y - 5); // rotula o eixo
        if (year % 5 === 0 && year * 12 !== payments) g.fillText(String(year), x, y - 5); // Numera cada 5 anos
    }
    // Marca valores de pagamento ao longo da margem direita
    g.textAlign = "rigth"; // Alinha o texto à direita
    g.textBaseline = "middle"; // Centraliza verticalmente
    var ticks = [monthly * payments, principal]; // Os dois pontos que marcaremos;
    var rightEdge = paymentToX(payments); // Coordena X do eixo Y
    for (var i = 0; i < ticks.length; i++) { // Para cada um dos 2 pontos
        var y = amountToY(ticks[i]); // Calcula a posição Y da marca
        g.fillRect(rightEdge - 3, y - 0.5, 3, 1); // Desenha a marcação
        g.fillText(String(ticks[i].toFixed(0)), rightEdge - 5, y); // Rotula
    }
}
