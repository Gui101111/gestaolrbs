/*
 * ClipeCanalFoco.jsx - monta no After Effects o clipe vertical da campanha
 * CPMV do Canal Foco ("5 Milionarios x 5 Novatos").
 *
 * Como usar: After Effects > Arquivo > Scripts > Executar arquivo de script...
 * (File > Scripts > Run Script File...) e escolha este arquivo.
 * Instale antes a fonte Anton (clipes/fonts/Anton-Regular.ttf).
 *
 * O script pergunta: o episodio (mp4), a logo do Canal Foco (png), as
 * legendas (.json3 do YouTube ou .srt, opcional), o inicio do trecho, a
 * duracao, os jump zooms e a manchete. Cria a composicao "Clipe Canal Foco"
 * 1080x1920 30 fps com:
 *   - fundo desfocado + janela do video com zoom de entrada e jump zooms
 *   - flash branco de entrada e manchete com "pop"
 *   - logo fixa do inicio ao fim (pulsa no final, nunca some)
 *   - legendas palavra por palavra com a palavra ativa em amarelo
 *   - barra de progresso e chamada final "EPISODIO COMPLETO NO YOUTUBE"
 * Depois e so adicionar a fila de renderizacao (H.264 / MP4).
 */
(function () {
    var LARG = 1080, ALT = 1920, FPS = 30;
    var VIDEO_Y = 580, VIDEO_ALT = 900;
    var LOGO_Y = 470, LOGO_MAX_L = 460, LOGO_MAX_A = 170;
    var LEGENDA_Y = 1385, CTA_Y = 1600;
    var AMARELO = [1, 0.831, 0];
    var FONTE = "Anton-Regular";

    // ------------------------------------------------------------ utilidades
    function aparar(s) { return String(s).replace(/^\s+|\s+$/g, ""); }

    function segundos(valor) {
        var partes = aparar(valor).split(":"), s = 0;
        for (var i = 0; i < partes.length; i++) s = s * 60 + parseFloat(partes[i].replace(",", "."));
        return s;
    }

    function lerArquivo(f) {
        f.encoding = "UTF-8";
        f.open("r");
        var t = f.read();
        f.close();
        return t;
    }

    function eases(prop, influencia) {
        // propriedades espaciais (posicao) usam um unico KeyframeEase
        var espacial = prop.propertyValueType === PropertyValueType.TwoD_SPATIAL ||
            prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL;
        var n = !espacial && prop.value instanceof Array ? prop.value.length : 1, arr = [];
        for (var i = 0; i < n; i++) arr.push(new KeyframeEase(0, influencia));
        return arr;
    }

    // keys: [[tempo, valor], ...]; suaviza a entrada/saida de cada chave
    function animar(prop, keys) {
        for (var i = 0; i < keys.length; i++) prop.setValueAtTime(keys[i][0], keys[i][1]);
        for (var k = 1; k <= prop.numKeys; k++) {
            prop.setTemporalEaseAtKey(k, eases(prop, 60), eases(prop, 60));
        }
    }

    function escala(s) { return [s, s, 100]; }

    function estiloTexto(layer, texto, tamanho, cor, contorno) {
        var prop = layer.property("ADBE Text Properties").property("ADBE Text Document");
        var doc = prop.value;
        doc.resetCharStyle();
        doc.text = texto;
        doc.font = FONTE;
        doc.fontSize = tamanho;
        doc.applyFill = true;
        doc.fillColor = cor;
        doc.applyStroke = contorno > 0;
        if (contorno > 0) {
            doc.strokeColor = [0, 0, 0];
            doc.strokeWidth = contorno;
            doc.strokeOverFill = false;
        }
        doc.tracking = 10;
        doc.justification = ParagraphJustification.CENTER_JUSTIFY;
        prop.setValue(doc);
    }

    function centralizarAncora(layer) {
        var r = layer.sourceRectAtTime(layer.inPoint, false);
        layer.property("ADBE Transform Group").property("ADBE Anchor Point")
            .setValue([r.left + r.width / 2, r.top + r.height / 2]);
    }

    // pinta de amarelo os caracteres [ini, fim) usando um animador de texto.
    // addProperty invalida referencias antigas, entao tudo e buscado de novo.
    function destacar(layer, ini, fim, cor) {
        function animadores() {
            return layer.property("ADBE Text Properties").property("ADBE Text Animators");
        }
        var idx = animadores().addProperty("ADBE Text Animator").propertyIndex;
        function anim() { return animadores().property(idx); }
        anim().property("ADBE Text Animator Properties").addProperty("ADBE Text Fill Color").setValue(cor);
        anim().property("ADBE Text Selectors").addProperty("ADBE Text Selector");
        function sel() { return anim().property("ADBE Text Selectors").property(1); }
        sel().property("ADBE Text Range Advanced").property("ADBE Text Range Units").setValue(2); // indice
        sel().property("ADBE Text Index Start").setValue(ini);
        sel().property("ADBE Text Index End").setValue(fim);
    }

    function texto(comp, conteudo, tamanho, x, y, cor, contorno) {
        var layer = comp.layers.addText(conteudo);
        estiloTexto(layer, conteudo, tamanho, cor, contorno);
        centralizarAncora(layer);
        layer.property("ADBE Transform Group").property("ADBE Position").setValue([x, y]);
        return layer;
    }

    // ------------------------------------------------------------ legendas
    function palavrasJson3(conteudo) {
        var dados = eval("(" + conteudo + ")"), palavras = [];
        var evs = dados.events || [];
        for (var i = 0; i < evs.length; i++) {
            var ev = evs[i], segs = ev.segs || [], ini = (ev.tStartMs || 0) / 1000;
            for (var j = 0; j < segs.length; j++) {
                var t = aparar(segs[j].utf8 || "");
                if (!t) continue;
                var ws = t.split(/\s+/);
                for (var k = 0; k < ws.length; k++) {
                    palavras.push({ t: ws[k], ini: ini + (segs[j].tOffsetMs || 0) / 1000, fim: 0 });
                }
            }
        }
        palavras.sort(function (a, b) { return a.ini - b.ini; });
        for (var p = 0; p < palavras.length; p++) {
            var prox = p + 1 < palavras.length ? palavras[p + 1].ini : palavras[p].ini + 0.6;
            palavras[p].fim = Math.min(prox, palavras[p].ini + 1.2);
        }
        return palavras;
    }

    function palavrasSrt(conteudo) {
        var blocos = conteudo.replace(/\r/g, "").split(/\n\s*\n/), palavras = [];
        var re = /([\d:.,]+)\s+-->\s+([\d:.,]+)/;
        for (var i = 0; i < blocos.length; i++) {
            var linhas = aparar(blocos[i]).split("\n");
            for (var j = 0; j < linhas.length; j++) {
                var m = re.exec(linhas[j]);
                if (!m) continue;
                var ini = segundos(m[1]), fim = segundos(m[2]);
                var ws = aparar(linhas.slice(j + 1).join(" ").replace(/<[^>]+>/g, "")).split(/\s+/);
                var total = 0, t = ini;
                for (var k = 0; k < ws.length; k++) total += ws[k].length;
                for (k = 0; k < ws.length; k++) {
                    if (!ws[k]) continue;
                    var d = (fim - ini) * ws[k].length / (total || 1);
                    palavras.push({ t: ws[k], ini: t, fim: t + d });
                    t += d;
                }
                break;
            }
        }
        return palavras;
    }

    function agrupar(palavras) {
        var grupos = [], atual = [];
        for (var i = 0; i < palavras.length; i++) {
            var p = palavras[i], ultima = atual[atual.length - 1], letras = p.t.length;
            for (var j = 0; j < atual.length; j++) letras += atual[j].t.length + 1;
            if (ultima && (atual.length >= 3 || letras > 16 || p.ini - ultima.fim > 0.45 ||
                /[.!?,;:]$/.test(ultima.t))) {
                grupos.push(atual);
                atual = [];
            }
            atual.push(p);
        }
        if (atual.length) grupos.push(atual);
        return grupos;
    }

    // ------------------------------------------------------------ perguntas
    var arqVideo = File.openDialog("1/3 - Escolha o episodio (mp4) \"5 Milionarios x 5 Novatos\"");
    if (!arqVideo) return;
    var arqLogo = File.openDialog("2/3 - Escolha a logo do Canal Foco (PNG da Biblioteca). OBRIGATORIA na campanha.");
    if (!arqLogo) { alert("Sem a logo do Canal Foco o video nao vale na campanha."); return; }
    var arqLeg = File.openDialog("3/3 - Legendas do episodio (.json3 ou .srt). Cancelar = sem legendas");

    var inicio = segundos(prompt("Inicio do trecho no episodio (ex.: 12:34 ou 754.5)", "0:00") || "0");
    var duracao = parseFloat(prompt("Duracao do clipe em segundos (minimo 15)", "30") || "30");
    if (!(duracao >= 15)) { alert("A campanha exige no minimo 15 segundos."); return; }
    var cortesTxt = prompt("Segundos dos jump zooms dentro do trecho (separados por virgula)", "4.5,10,16.5,22") || "";
    var cropX = parseFloat(prompt("Recorte horizontal: 0 = esquerda, 0.5 = centro, 1 = direita", "0.5") || "0.5");
    var manchete = prompt("Manchete (| quebra linha, *texto* fica amarelo). Use so fatos do episodio.",
        "5 MILION\u00C1RIOS x 5 NOVATOS|DISPUTAM *R$ 750 MIL*") || "";
    var cta = "\u25B6 EPIS\u00D3DIO COMPLETO NO YOUTUBE";
    var ctaSeg = 3.5;

    var cortes = [];
    var partesCortes = cortesTxt.split(",");
    for (var c = 0; c < partesCortes.length; c++) {
        if (aparar(partesCortes[c])) cortes.push(parseFloat(aparar(partesCortes[c])));
    }

    app.beginUndoGroup("Clipe Canal Foco");

    var pasta = app.project.items.addFolder("Clipe Canal Foco");
    var video = app.project.importFile(new ImportOptions(arqVideo));
    var logo = app.project.importFile(new ImportOptions(arqLogo));
    video.parentFolder = pasta;
    logo.parentFolder = pasta;

    var comp = app.project.items.addComp("Clipe Canal Foco", LARG, ALT, 1, duracao, FPS);
    comp.parentFolder = pasta;
    var ctaIni = Math.max(duracao - ctaSeg, 3.2);

    // ------------------------------------------------------------ fundo
    var fundo = comp.layers.add(video);
    fundo.name = "Fundo desfocado";
    fundo.startTime = -inicio;
    fundo.audioEnabled = false;
    var sFundo = Math.max(LARG / video.width, ALT / video.height) * 120;
    fundo.property("ADBE Transform Group").property("ADBE Scale").setValue(escala(sFundo));
    fundo.property("ADBE Transform Group").property("ADBE Position").setValue([LARG / 2, ALT / 2]);
    var blur = fundo.property("ADBE Effect Parade").addProperty("ADBE Gaussian Blur 2");
    blur.property("ADBE Gaussian Blur 2-0001").setValue(90);
    blur.property("ADBE Gaussian Blur 2-0003").setValue(1); // repetir pixels da borda
    var brilho = fundo.property("ADBE Effect Parade").addProperty("ADBE Brightness & Contrast 2");
    brilho.property("ADBE Brightness & Contrast 2-0001").setValue(-40);

    // ------------------------------------------------------------ janela do video
    var janela = app.project.items.addComp("Janela do video", LARG, VIDEO_ALT, 1, duracao, FPS);
    janela.parentFolder = pasta;
    var frente = janela.layers.add(video);
    frente.startTime = -inicio;
    var sBase = Math.max(LARG / video.width, VIDEO_ALT / video.height) * 100;
    var larguraEscalada = video.width * sBase / 100;
    var px = LARG / 2 + (larguraEscalada - LARG) * (0.5 - cropX);
    frente.property("ADBE Transform Group").property("ADBE Position").setValue([px, VIDEO_ALT / 2]);
    var escFrente = frente.property("ADBE Transform Group").property("ADBE Scale");
    animar(escFrente, [[0, escala(sBase * 1.18)], [0.6, escala(sBase)]]);
    // jump zooms: alterna 100% / 110% a cada corte (chaves "hold" = corte seco)
    for (var z = 0; z < cortes.length; z++) {
        var k = escFrente.addKey(cortes[z]);
        escFrente.setValueAtKey(k, escala(sBase * (z % 2 === 0 ? 1.1 : 1)));
    }
    for (var h = 3; h <= escFrente.numKeys; h++) {
        escFrente.setInterpolationTypeAtKey(h, KeyframeInterpolationType.HOLD);
    }
    if (escFrente.numKeys >= 3) {
        escFrente.setInterpolationTypeAtKey(2, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.HOLD);
    }
    var camadaJanela = comp.layers.add(janela);
    camadaJanela.name = "Janela do video";
    camadaJanela.property("ADBE Transform Group").property("ADBE Position")
        .setValue([LARG / 2, VIDEO_Y + VIDEO_ALT / 2]);

    var linha = comp.layers.addSolid([1, 1, 1], "Linha", LARG, 4, 1, duracao);
    linha.property("ADBE Transform Group").property("ADBE Position").setValue([LARG / 2, VIDEO_Y - 2]);
    linha.property("ADBE Transform Group").property("ADBE Opacity").setValue(85);

    // ------------------------------------------------------------ barra de progresso
    var trilho = comp.layers.addSolid([0, 0, 0], "Trilho da barra", LARG, 10, 1, duracao);
    trilho.property("ADBE Transform Group").property("ADBE Position").setValue([LARG / 2, VIDEO_Y + VIDEO_ALT + 5]);
    trilho.property("ADBE Transform Group").property("ADBE Opacity").setValue(55);
    var barra = comp.layers.addSolid(AMARELO, "Barra de progresso", LARG, 10, 1, duracao);
    barra.property("ADBE Transform Group").property("ADBE Anchor Point").setValue([0, 5]);
    barra.property("ADBE Transform Group").property("ADBE Position").setValue([0, VIDEO_Y + VIDEO_ALT + 5]);
    var escBarra = barra.property("ADBE Transform Group").property("ADBE Scale");
    escBarra.setValueAtTime(0, [0, 100, 100]);
    escBarra.setValueAtTime(duracao, [100, 100, 100]);

    // ------------------------------------------------------------ logo (o video inteiro)
    var camadaLogo = comp.layers.add(logo);
    camadaLogo.name = "Logo Canal Foco (nao remover)";
    camadaLogo.inPoint = 0;
    camadaLogo.outPoint = duracao;
    var sLogo = Math.min(LOGO_MAX_L / logo.width, LOGO_MAX_A / logo.height) * 100;
    camadaLogo.property("ADBE Transform Group").property("ADBE Position").setValue([LARG / 2, LOGO_Y]);
    var escLogo = camadaLogo.property("ADBE Transform Group").property("ADBE Scale");
    escLogo.setValue(escala(sLogo));
    escLogo.expression = "var t0 = " + ctaIni.toFixed(3) + ";\n" +
        "if (time < t0) { value; } else {\n" +
        "  var k = 1 + 0.06 * Math.abs(Math.sin((time - t0) * Math.PI * 1.6));\n" +
        "  [value[0] * k, value[1] * k];\n}";

    // ------------------------------------------------------------ manchete
    var linhas = manchete.split("|");
    var ys = linhas.length > 1 ? [190, 312] : [262];
    for (var l = 0; l < Math.min(linhas.length, 2); l++) {
        var bruto = aparar(linhas[l]);
        var marcas = [], limpo = "", dentro = false;
        for (var ch = 0; ch < bruto.length; ch++) {
            if (bruto.charAt(ch) === "*") {
                dentro = !dentro;
                if (dentro) marcas.push([limpo.length, -1]); else marcas[marcas.length - 1][1] = limpo.length;
            } else {
                limpo += bruto.charAt(ch);
            }
        }
        var tamanho = l === 1 ? 100 : 82;
        var camada = texto(comp, limpo, tamanho, LARG / 2, ys[l], [1, 1, 1], 12);
        camada.name = "Manchete " + (l + 1);
        for (var mk = 0; mk < marcas.length; mk++) {
            if (marcas[mk][1] > marcas[mk][0]) destacar(camada, marcas[mk][0], marcas[mk][1], AMARELO);
        }
        var atraso = (2 + l * 7) / FPS;
        animar(camada.property("ADBE Transform Group").property("ADBE Scale"),
            [[atraso, escala(0)], [atraso + 0.14, escala(118)], [atraso + 0.24, escala(100)]]);
    }

    // ------------------------------------------------------------ legendas
    if (arqLeg) {
        var conteudo = lerArquivo(arqLeg);
        var todas = /\.json3?$/i.test(arqLeg.name) ? palavrasJson3(conteudo) : palavrasSrt(conteudo);
        var trecho = [];
        for (var w = 0; w < todas.length; w++) {
            if (todas[w].ini >= inicio - 0.05 && todas[w].ini < inicio + duracao) {
                trecho.push({ t: todas[w].t.toUpperCase(), ini: todas[w].ini - inicio,
                    fim: Math.min(todas[w].fim, inicio + duracao) - inicio });
            }
        }
        var grupos = agrupar(trecho);
        for (var g = 0; g < grupos.length; g++) {
            var gr = grupos[g], textoGrupo = "", posicoes = [];
            for (var gi = 0; gi < gr.length; gi++) {
                if (gi) textoGrupo += " ";
                posicoes.push([textoGrupo.length, textoGrupo.length + gr[gi].t.length]);
                textoGrupo += gr[gi].t;
            }
            var fimGrupo = gr[gr.length - 1].fim + 0.15;
            if (g + 1 < grupos.length) fimGrupo = Math.min(fimGrupo, grupos[g + 1][0].ini);
            fimGrupo = Math.min(fimGrupo, duracao);
            for (var a = 0; a < gr.length; a++) {
                var ate = a + 1 < gr.length ? gr[a + 1].ini : fimGrupo;
                if (ate <= gr[a].ini) continue;
                var leg = texto(comp, textoGrupo, 100, LARG / 2, LEGENDA_Y - 40, [1, 1, 1], 14);
                leg.name = "Legenda " + (g + 1) + "." + (a + 1);
                destacar(leg, posicoes[a][0], posicoes[a][1], AMARELO);
                leg.inPoint = gr[a].ini;
                leg.outPoint = ate;
                if (a === 0) {
                    animar(leg.property("ADBE Transform Group").property("ADBE Scale"),
                        [[gr[a].ini, escala(75)], [gr[a].ini + 0.11, escala(100)]]);
                }
            }
        }
    }

    // ------------------------------------------------------------ chamada final
    var ctaTexto = texto(comp, cta, 72, LARG / 2, CTA_Y, [0, 0, 0], 0);
    ctaTexto.name = "CTA texto";
    var r = ctaTexto.sourceRectAtTime(0, false);
    var forma = comp.layers.addShape();
    forma.name = "CTA fundo";
    forma.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
    function conteudoForma() {
        return forma.property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group");
    }
    var ret = conteudoForma().addProperty("ADBE Vector Shape - Rect");
    ret.property("ADBE Vector Rect Size").setValue([r.width + 72, r.height + 36]);
    conteudoForma().property(1).property("ADBE Vector Rect Roundness").setValue(18);
    conteudoForma().addProperty("ADBE Vector Graphic - Fill").property("ADBE Vector Fill Color").setValue(AMARELO);
    forma.property("ADBE Transform Group").property("ADBE Position").setValue([LARG / 2, CTA_Y]);
    forma.moveAfter(ctaTexto);
    var ctaNulo = comp.layers.addNull(duracao);
    ctaNulo.name = "CTA controle";
    ctaNulo.property("ADBE Transform Group").property("ADBE Position").setValue([LARG / 2, CTA_Y]);
    ctaTexto.parent = ctaNulo;
    forma.parent = ctaNulo;
    var camadasCta = [ctaTexto, forma, ctaNulo];
    for (var q = 0; q < camadasCta.length; q++) {
        camadasCta[q].inPoint = ctaIni;
        camadasCta[q].outPoint = duracao;
    }
    animar(ctaNulo.property("ADBE Transform Group").property("ADBE Scale"),
        [[ctaIni, escala(0)], [ctaIni + 0.18, escala(115)], [ctaIni + 0.3, escala(100)]]);
    animar(ctaNulo.property("ADBE Transform Group").property("ADBE Position"),
        [[ctaIni, [LARG / 2, CTA_Y + 250]], [ctaIni + 0.3, [LARG / 2, CTA_Y]]]);
    ctaNulo.property("ADBE Transform Group").property("ADBE Rotate Z").expression =
        "var t = time - inPoint; t > 0.4 ? Math.sin((t - 0.4) * 9.4) * 2.2 : 0;";

    // ------------------------------------------------------------ flash de entrada
    var flash = comp.layers.addSolid([1, 1, 1], "Flash", LARG, ALT, 1, 0.4);
    var opFlash = flash.property("ADBE Transform Group").property("ADBE Opacity");
    opFlash.setValueAtTime(0, 100);
    opFlash.setValueAtTime(0.35, 0);

    // ------------------------------------------------------------ whoosh (opcional)
    var whoosh = new File(File($.fileName).parent.parent.fsName + "/remotion/public/sfx/whoosh.wav");
    if (whoosh.exists) {
        var somItem = app.project.importFile(new ImportOptions(whoosh));
        somItem.parentFolder = pasta;
        var tempos = [0, ctaIni];
        for (var s = 0; s < tempos.length; s++) {
            var som = comp.layers.add(somItem);
            som.startTime = tempos[s];
            som.property("ADBE Audio Group").property("ADBE Audio Levels").setValue([-9, -9]);
        }
    }

    comp.openInViewer();
    app.endUndoGroup();
    alert("Pronto! Composicao \"Clipe Canal Foco\" criada (" + duracao + " s).\n" +
        "Confira a logo do inicio ao fim e renderize em H.264 (MP4).");
})();
