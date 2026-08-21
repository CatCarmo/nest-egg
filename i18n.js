// ─────────────────────────────────────────────────────────────
// Saverly — English / Portuguese
//
// English stays in the HTML as the source text, so the markup remains
// readable and search engines still see real content. Portuguese lives in
// the dictionary below, keyed by the English it replaces, and is swapped in
// at runtime. Must load BEFORE app.js, which calls t() while rendering.
// ─────────────────────────────────────────────────────────────
(function () {
  const KEY = "saverly.lang";

  function detect() {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === "pt" || saved === "en") return saved;
    } catch (e) {}
    return (navigator.language || "en").toLowerCase().indexOf("pt") === 0 ? "pt" : "en";
  }

  let LANG = detect();

  // ── Static text, keyed by the English in the HTML ──
  const PT = {
    // Header and tabs
    "Dark": "Escuro",
    "Light": "Claro",
    "Goals": "Objetivos",
    "Budget": "Orçamento",
    "Projections": "Projeções",
    "Data": "Dados",
    "Toggle theme": "Mudar de tema",

    // Global notice
    "Back up now": "Fazer cópia agora",
    "Not now": "Agora não",
    "Install": "Instalar",
    "Show me how": "Mostra-me como",

    // Onboarding
    "Three steps and you're set up": "Três passos e está pronto",
    "<strong>Your income and expenses</strong>, on the <em>Budget</em> tab. Rough numbers are fine.":
      "<strong>O teu rendimento e as tuas despesas</strong>, no separador <em>Orçamento</em>. Valores aproximados chegam.",
    "<strong>Your emergency fund target</strong> appears here on its own, worked out from what you just entered.":
      "<strong>O alvo do teu fundo de emergência</strong> aparece aqui sozinho, calculado a partir do que acabaste de introduzir.",
    "<strong>Add one goal.</strong> A trip, a phone, a deposit. Just one, to begin.":
      "<strong>Acrescenta um objetivo.</strong> Uma viagem, um telemóvel, uma entrada. Só um, para começar.",

    // Goals view
    "Your savings goals": "Os teus objetivos de poupança",
    "Phones, trips, big purchases — track them all. Start with your emergency fund below.":
      "Telemóveis, viagens, compras grandes: acompanha tudo. Começa pelo fundo de emergência aqui em baixo.",
    "+ New goal": "+ Novo objetivo",
    "Your savings, so far": "A tua poupança, até agora",
    "No goals yet. Set your first one — even a small goal builds the habit.":
      "Ainda não tens objetivos. Define o primeiro, que mesmo um objetivo pequeno cria o hábito.",

    // Emergency fund
    "Emergency fund": "Fundo de emergência",
    "Your safety net — covers essential expenses if income stops. Build this before investing.":
      "A tua rede de segurança: cobre as despesas essenciais se o rendimento parar. Constrói isto antes de investires.",
    "Months of essentials to cover": "Meses de essenciais a cobrir",
    "Manual target override (€)": "Definir o alvo manualmente (€)",
    "Current balance (€)": "Saldo atual (€)",
    "Settings": "Definições",

    // New goal form
    "New goal": "Novo objetivo",
    "Icon": "Ícone",
    "Goal name": "Nome do objetivo",
    "Target (€)": "Objetivo (€)",
    "Already saved (€)": "Já poupado (€)",
    "Target date": "Data alvo",
    "Cancel": "Cancelar",
    "Save goal": "Guardar objetivo",
    "✈ Travel": "✈ Viagem",
    "🏖 Vacation": "🏖 Férias",
    "📱 Tech": "📱 Tecnologia",
    "🏠 Home": "🏠 Casa",
    "🚗 Car": "🚗 Carro",
    "👶 Baby": "👶 Bebé",
    "🎓 Education": "🎓 Educação",
    "💍 Wedding": "💍 Casamento",
    "🎁 Gift": "🎁 Presente",
    "💰 Money": "💰 Dinheiro",

    // History chart
    "Savings progress": "Evolução da poupança",
    "Start logging to see your progress.": "Começa a registar para veres a evolução.",

    // Budget view
    "Monthly budget": "Orçamento mensal",
    "The 50/30/20 rule: needs, wants, and savings. Adjust to fit your life.":
      "A regra 50/30/20: necessidades, gostos e poupança. Ajusta à tua vida.",
    "Start here": "Começa por aqui",
    "Put in what comes in and what goes out each month. An estimate is fine, you can change it any time. Everything else in Saverly is worked out from these two numbers.":
      "Mete o que entra e o que sai todos os meses. Uma estimativa serve, e podes mudar quando quiseres. Tudo o resto no Saverly é calculado a partir destes dois números.",
    "Monthly income after tax": "Rendimento mensal líquido",
    "How you split it": "Como divides",
    "Reset to 50/30/20": "Repor 50/30/20",
    "Send your savings to your goals": "Distribui a poupança pelos teus objetivos",
    "Suggest balanced split": "Sugerir divisão equilibrada",
    "Log this month's savings": "Registar a poupança deste mês",
    "Undo last log": "Anular o último registo",
    "Your monthly budget": "O teu orçamento mensal",
    "Needs": "Necessidades",
    "Wants": "Gostos",
    "Savings": "Poupança",
    "rent, food, bills": "renda, comida, contas",
    "fun, eating out, hobbies": "diversão, restaurantes, passatempos",
    "savings & investments": "poupança e investimentos",
    "Total allocated": "Total atribuído",

    // Expenses
    "Monthly expenses": "Despesas mensais",
    "Nothing tracked yet": "Ainda sem registos",
    "+ Add expense": "+ Nova despesa",
    "Description": "Descrição",
    "Category": "Categoria",
    "Amount (€)": "Valor (€)",
    "How often?": "Com que frequência?",
    "Every month": "Todos os meses",
    "Once a year": "Uma vez por ano",
    "Save expense": "Guardar despesa",
    "No expenses tracked yet. Add your first one — even just your rent — to see how much you have left to save.":
      "Ainda não registaste despesas. Acrescenta a primeira, nem que seja só a renda, para veres quanto te sobra para poupar.",
    "Housing": "Habitação",
    "Utilities": "Água, luz e gás",
    "Phone & internet": "Telemóvel e internet",
    "Food & groceries": "Alimentação",
    "Transport": "Transportes",
    "Health & insurance": "Saúde e seguros",
    "Subscriptions": "Subscrições",
    "Leisure & dining": "Lazer e restaurantes",
    "Shopping": "Compras",
    "Other": "Outros",

    // Projections
    "What if you keep saving?": "E se continuares a poupar?",
    "Monthly contribution (€)": "Contribuição mensal (€)",
    "Starting amount (€)": "Valor inicial (€)",
    "Years": "Anos",
    "Annual return (%)": "Rendimento anual (%)",
    "Annual inflation (%)": "Inflação anual (%)",
    "Final balance": "Saldo final",
    "You contributed": "Contribuíste",
    "Growth from returns": "Ganho dos rendimentos",

    // Data view
    "Your data": "Os teus dados",
    "Install on this device": "Instalar neste dispositivo",
    "Install Saverly": "Instalar o Saverly",
    "Installed": "Instalado",
    "iOS (Safari):": "iOS (Safari):",
    "Android (Chrome/Edge):": "Android (Chrome/Edge):",
    "Desktop (Chrome/Edge):": "Computador (Chrome/Edge):",
    "Storage protection": "Proteção do armazenamento",
    "Checking…": "A verificar…",
    "<strong>Checking…</strong>": "<strong>A verificar…</strong>",
    "Protect my data": "Proteger os meus dados",
    "Move to another device": "Passar para outro dispositivo",
    "Download my data": "Descarregar os meus dados",
    "Choose file…": "Escolher ficheiro…",
    "The file goes straight from one device to the other. It never passes through us.":
      "O ficheiro vai diretamente de um dispositivo para o outro. Nunca passa por nós.",
    "Export": "Exportar",
    "Import": "Importar",
    "Reset": "Repor",
    "Reset everything": "Apagar tudo",
    "Dismiss": "Fechar",

    // Footer
    "Not financial advice.": "Isto não é aconselhamento financeiro.",
    "Your data stays with you.": "Os teus dados ficam contigo.",
    "Privacy": "Privacidade",
    "Send feedback": "Enviar opinião",
    "Source code": "Código-fonte",
    "Back to Saverly": "← Voltar ao Saverly",
    "← Back to Saverly": "← Voltar ao Saverly",
  };

  // Longer blocks, kept apart only for readability.
  Object.assign(PT, {
    "No history yet. Head to the <strong>Budget</strong> tab and click <em>Log this month's savings</em> — once you do, this chart will show your savings climb month after month.":
      "Ainda não há histórico. Vai ao separador <strong>Orçamento</strong> e clica em <em>Registar a poupança deste mês</em>. A partir daí, este gráfico mostra a tua poupança a subir mês após mês.",
    "No goals yet. Add one on the <strong>Goals</strong> tab and you can dedicate a slice of your savings to it.":
      "Ainda não há objetivos. Cria um no separador <strong>Objetivos</strong> e podes dedicar-lhe uma fatia da tua poupança.",
    "Add Saverly to your home screen as a real app. Once installed, it opens in its own window and keeps working when you're offline.":
      "Adiciona o Saverly ao ecrã principal como uma app a sério. Depois de instalada, abre na sua própria janela e continua a funcionar sem internet.",
    "Browsers are allowed to clear a site's storage when space runs low, and on iPhone Safari clears it for any site you have not opened in about a week. Saverly can ask your browser to treat its data as protected instead.":
      "Os browsers podem limpar o armazenamento de um site quando falta espaço, e no iPhone o Safari limpa-o em qualquer site que não abras há cerca de uma semana. O Saverly pode pedir ao teu browser que trate estes dados como protegidos.",
    "Your phone and your laptop each keep their own copy, because nothing is stored on a server. To carry everything across, send yourself the file:":
      "O teu telemóvel e o teu computador guardam cada um a sua cópia, porque não há nada guardado num servidor. Para levares tudo de um para o outro, envia o ficheiro a ti própria:",
    "On this device, tap <strong>Download my data</strong> below. You get a small <code>.json</code> file.":
      "Neste dispositivo, toca em <strong>Descarregar os meus dados</strong> aqui em baixo. Recebes um pequeno ficheiro <code>.json</code>.",
    "Send that file to the other device however you like: email it to yourself, AirDrop it, or drop it in your cloud folder.":
      "Envia esse ficheiro para o outro dispositivo como quiseres: por email para ti própria, por AirDrop, ou para a tua pasta na nuvem.",
    "On the other device, open Saverly, come back to this tab, and use <strong>Choose file…</strong> under Import.":
      "No outro dispositivo, abre o Saverly, volta a este separador e usa <strong>Escolher ficheiro…</strong> em Importar.",
    "Download a JSON file with all your goals, expenses, budget, emergency fund, and log history. Keep it as a backup, or use it to move to another browser or device.":
      "Descarrega um ficheiro JSON com todos os teus objetivos, despesas, orçamento, fundo de emergência e histórico. Guarda-o como cópia de segurança, ou usa-o para mudares de browser ou de dispositivo.",
    "Restore from a Saverly backup file. <strong>This replaces your current data.</strong>":
      "Restaura a partir de uma cópia de segurança do Saverly. <strong>Isto substitui os teus dados atuais.</strong>",
    "Clear everything and start fresh. <strong>This cannot be undone</strong> — export a backup first if there's any chance you'll want it back.":
      "Apaga tudo e começa de novo. <strong>Isto não se pode desfazer</strong>, por isso exporta uma cópia antes se houver alguma hipótese de a quereres de volta.",
    "Back up, restore, or reset. Everything is stored in your browser — exporting is the only way to keep it safe across devices or browser resets.":
      "Faz cópias, restaura ou apaga. Está tudo guardado no teu browser, e exportar é a única forma de o manteres seguro entre dispositivos ou limpezas do browser.",
    "See what regular savings can grow into. The S&P 500 averaged ~10%/year (before inflation) historically.":
      "Vê no que a poupança regular se pode transformar. Historicamente, o S&P 500 rendeu em média cerca de 10% ao ano, antes da inflação.",
    "Returns are not guaranteed. Markets fluctuate; past performance doesn't predict future results. This projection ignores inflation and taxes.":
      "Os rendimentos não são garantidos. Os mercados oscilam e o passado não prevê o futuro. Esta projeção assume uma taxa constante e ignora impostos e comissões.",
    "<strong>iOS (Safari):</strong> tap the Share icon, then \"Add to Home Screen\".<br /> <strong>Android (Chrome/Edge):</strong> the install button above turns on when the browser is ready.<br /> <strong>Desktop (Chrome/Edge):</strong> a small install icon also appears in the address bar.":
      "<strong>iOS (Safari):</strong> toca no ícone de Partilhar e depois em \"Adicionar ao ecrã principal\".<br /> <strong>Android (Chrome/Edge):</strong> o botão acima fica ativo quando o browser estiver pronto.<br /> <strong>Computador (Chrome/Edge):</strong> aparece também um pequeno ícone de instalação na barra de endereço.",
    "<strong>Not financial advice.</strong> Saverly is a personal planning tool. Projections are estimates based on the numbers you type in, they assume a steady rate of return, and they ignore inflation, tax and fees. Real markets do not behave that way. For decisions about your money, talk to a qualified financial adviser.":
      "<strong>Isto não é aconselhamento financeiro.</strong> O Saverly é uma ferramenta de planeamento pessoal. As projeções são estimativas baseadas nos números que introduzes, assumem um rendimento constante e ignoram inflação, impostos e comissões. Os mercados reais não se comportam assim. Para decisões sobre o teu dinheiro, fala com um profissional qualificado.",
    "<strong>Your data stays with you.</strong> Everything you enter is saved in your own browser on this device. There are no accounts, no servers, no analytics, no trackers and no ads. Nothing is ever sent to us, because there is no \"us\" to send it to.":
      "<strong>Os teus dados ficam contigo.</strong> Tudo o que introduzes fica guardado no teu próprio browser, neste dispositivo. Não há contas, servidores, estatísticas, rastreadores nem anúncios. Nunca nos é enviado nada, porque não existe um \"nós\" para onde enviar.",
    "\"Essentials\" = Housing, Utilities, Phone & internet, Food & groceries, Transport, Health & insurance.":
      "\"Essenciais\" = Habitação, Água/luz/gás, Telemóvel e internet, Alimentação, Transportes, Saúde e seguros.",
  });


  // ── Privacy & Terms page ──
  Object.assign(PT, {
    "Privacy &amp; Terms": "Privacidade e Termos",
    "Privacy & Terms": "Privacidade e Termos",
    "Last updated: 20 August 2026": "Última atualização: 20 de agosto de 2026",

    "The short version": "A versão curta",
    "Saverly does not collect, store, transmit or sell any of your information. There is no account to create, no server to send data to, and no company behind this holding a database of your finances. Everything you type in stays inside your own web browser, on your own device.":
      "O Saverly não recolhe, guarda, transmite nem vende qualquer informação tua. Não há conta para criar, não há servidor para onde enviar dados, e não há empresa nenhuma por trás disto com uma base de dados das tuas finanças. Tudo o que introduzes fica dentro do teu próprio browser, no teu dispositivo.",

    "What is stored, and where": "O que é guardado, e onde",
    "Your goals, expenses, budget, emergency fund and log history are saved using your browser's local storage. That is a small private space that belongs to your browser on this device. It means:":
      "Os teus objetivos, despesas, orçamento, fundo de emergência e histórico são guardados no armazenamento local do teu browser. É um pequeno espaço privado que pertence ao teu browser neste dispositivo. Isso quer dizer que:",
    "Your data is not visible to anyone else, including the author of this site.":
      "Os teus dados não são visíveis para mais ninguém, incluindo quem fez este site.",
    "Your data does not follow you to another device or another browser. If you open Saverly on your phone, it will start empty.":
      "Os teus dados não te acompanham para outro dispositivo nem para outro browser. Se abrires o Saverly no telemóvel, começa vazio.",
    "Clearing your browser data, using private/incognito mode, or uninstalling the browser will erase your Saverly data permanently.":
      "Limpar os dados do browser, usar uma janela privada ou desinstalar o browser apaga os teus dados do Saverly de forma permanente.",
    "Because of that last point, use the <strong>Export</strong> button on the Data tab now and then. It downloads a backup file to your device that you can re-import later.":
      "Por causa deste último ponto, usa de vez em quando o botão <strong>Exportar</strong> no separador Dados. Descarrega para o teu dispositivo um ficheiro de cópia de segurança que podes voltar a importar mais tarde.",

    "Cookies, analytics and ads": "Cookies, estatísticas e anúncios",
    "There are none. No cookies are set, no analytics or tracking scripts run, no advertising networks are loaded, and no third-party fonts or scripts are fetched. Saverly loads only its own files.":
      "Não existem. Não são criados cookies, não corre nenhum script de estatísticas ou rastreio, não são carregadas redes de publicidade, e não são obtidas fontes nem scripts de terceiros. O Saverly carrega apenas os seus próprios ficheiros.",
    "The site is hosted on GitHub Pages. Like any web host, GitHub's servers may process technical request information such as IP addresses in order to serve the page. That is handled by GitHub under their own policy, and it is the same for any website you visit.":
      "O site está alojado no GitHub Pages. Como qualquer alojamento web, os servidores do GitHub podem processar informação técnica do pedido, como o endereço IP, para conseguirem servir a página. Isso é tratado pelo GitHub ao abrigo da política deles, e acontece igual em qualquer site que visites.",

    "Offline use": "Utilização sem internet",
    "Saverly installs a service worker so it keeps working without an internet connection. This only caches the site's own files on your device. It does not send anything anywhere.":
      "O Saverly instala um service worker para continuar a funcionar sem ligação à internet. Isso apenas guarda no teu dispositivo os ficheiros do próprio site. Não envia nada para lado nenhum.",

    "Terms of use": "Condições de utilização",
    "<strong>Saverly is not financial advice.</strong> It is a calculator and a planning aid. The projections it shows are simple mathematical estimates based entirely on the figures you enter. They assume a constant rate of return and do not account for inflation, tax, platform fees, or market volatility. Actual investment returns vary and you can lose money.":
      "<strong>O Saverly não é aconselhamento financeiro.</strong> É uma calculadora e um apoio ao planeamento. As projeções que mostra são estimativas matemáticas simples, baseadas inteiramente nos valores que introduzes. Assumem um rendimento constante e não têm em conta inflação, impostos, comissões nem a volatilidade dos mercados. Os rendimentos reais variam e podes perder dinheiro.",
    "Nothing here is a recommendation to buy, sell or hold any financial product. Before making decisions about your money, consider speaking with a qualified, regulated financial adviser.":
      "Nada aqui constitui uma recomendação para comprar, vender ou manter qualquer produto financeiro. Antes de tomares decisões sobre o teu dinheiro, pondera falar com um consultor financeiro qualificado e regulado.",
    "Saverly is provided \"as is\", free of charge, without warranty of any kind. To the extent permitted by law, the author accepts no liability for any loss arising from use of this tool, including loss of data.":
      "O Saverly é fornecido \"tal como está\", gratuitamente e sem garantia de qualquer tipo. Na medida do permitido por lei, a autora não aceita responsabilidade por qualquer prejuízo decorrente da utilização desta ferramenta, incluindo perda de dados.",

    "Your rights": "Os teus direitos",
    "Data protection rules such as the GDPR give you rights over personal data that an organisation holds about you. Since Saverly holds no personal data about you at all, there is nothing to request, correct or delete on our side. You are in full control: the <strong>Reset everything</strong> button on the Data tab erases your data instantly, as does clearing your browser storage.":
      "As regras de proteção de dados, como o RGPD, dão-te direitos sobre os dados pessoais que uma organização detém sobre ti. Como o Saverly não detém quaisquer dados pessoais teus, não há nada para pedir, corrigir ou apagar do nosso lado. O controlo é inteiramente teu: o botão <strong>Apagar tudo</strong> no separador Dados elimina os teus dados de imediato, tal como limpar o armazenamento do browser.",

    "Contact": "Contacto",
    "Questions or a bug to report? Open an issue on the <a href=\"https://github.com/CatCarmo/saverly\" rel=\"noopener\">project\u2019s GitHub page</a>.":
      "Dúvidas ou um erro a reportar? Abre um issue na <a href=\"https://github.com/CatCarmo/saverly\" rel=\"noopener\">página do projeto no GitHub</a>.",
    "Questions or a bug to report? Open an issue on the <a href=\"https://github.com/CatCarmo/saverly\" rel=\"noopener\">project's GitHub page</a>.":
      "Dúvidas ou um erro a reportar? Abre um issue na <a href=\"https://github.com/CatCarmo/saverly\" rel=\"noopener\">página do projeto no GitHub</a>.",
    "<a href=\"app.html\">← Back to Saverly</a>": "<a href=\"app.html\">← Voltar ao Saverly</a>",
  });

  // Attribute values worth translating (placeholders, tooltips, labels).
  const ATTRS = ["placeholder", "title", "aria-label"];

  function tr(s) {
    const k = String(s).trim();
    return Object.prototype.hasOwnProperty.call(PT, k) ? PT[k] : null;
  }

  let observer = null;

  function norm(x) { return String(x == null ? "" : x).replace(/\s+/g, " ").trim(); }

  function applyI18n() {
    if (!document.body) return;
    const all = document.body.querySelectorAll("*");

    for (let i = 0; i < all.length; i++) {
      const el = all[i];
      const tag = el.tagName;
      if (tag === "SCRIPT" || tag === "STYLE") continue;

      const isHTML = el.children.length > 0;
      const current = isHTML ? el.innerHTML : el.textContent;
      const cur = norm(current);

      // Already showing our Portuguese for this element?
      if (el.__ptNorm !== undefined && cur === el.__ptNorm) {
        if (LANG === "en" && el.__en !== undefined) {
          if (isHTML) el.innerHTML = el.__en; else el.textContent = el.__en;
        }
        continue;
      }

      // Otherwise treat what is on screen right now as the English source.
      // Re-reading every pass is what keeps dynamically redrawn parts correct.
      const pt = tr(cur);
      if (pt !== null) {
        el.__en = current;
        el.__ptNorm = norm(pt);
        if (LANG === "pt") {
          if (isHTML) el.innerHTML = pt; else el.textContent = pt;
        }
      }

      for (let a = 0; a < ATTRS.length; a++) {
        const name = ATTRS[a];
        if (!el.hasAttribute(name)) continue;
        const val = el.getAttribute(name);
        const cacheEn = "__en_" + name;
        const cachePt = "__pt_" + name;
        if (el[cachePt] !== undefined && val === el[cachePt]) {
          if (LANG === "en") el.setAttribute(name, el[cacheEn]);
          continue;
        }
        const ptv = tr(val);
        if (ptv !== null) {
          el[cacheEn] = val;
          el[cachePt] = ptv;
          if (LANG === "pt") el.setAttribute(name, ptv);
        }
      }
    }
  }

  function refresh() {
    if (observer) observer.disconnect();
    applyI18n();
    if (observer) observer.observe(document.body, { childList: true, subtree: true });
  }

  function setLang(l) {
    LANG = l === "pt" ? "pt" : "en";
    try { localStorage.setItem(KEY, LANG); } catch (e) {}
    document.documentElement.setAttribute("lang", LANG);
    document.documentElement.setAttribute("data-lang", LANG);
    // Let the app redraw anything it generates itself, then translate the rest.
    if (typeof window.rerenderAll === "function") window.rerenderAll();
    refresh();
    syncButtons();
  }

  function syncButtons() {
    const en = document.getElementById("lang-en");
    const pt = document.getElementById("lang-pt");
    if (en) en.setAttribute("aria-pressed", String(LANG === "en"));
    if (pt) pt.setAttribute("aria-pressed", String(LANG === "pt"));
  }

  // Exposed for app.js: t("English", "Português")
  window.t = function (en, pt) { return LANG === "pt" ? pt : en; };
  window.SaverlyLang = {
    get: function () { return LANG; },
    set: setLang,
    locale: function () { return LANG === "pt" ? "pt-PT" : "en-IE"; },
    refresh: refresh,
  };

  document.documentElement.setAttribute("lang", LANG);
  document.documentElement.setAttribute("data-lang", LANG);

  document.addEventListener("DOMContentLoaded", function () {
    refresh();
    syncButtons();
    const en = document.getElementById("lang-en");
    const pt = document.getElementById("lang-pt");
    if (en) en.addEventListener("click", function () { setLang("en"); });
    if (pt) pt.addEventListener("click", function () { setLang("pt"); });

    observer = new MutationObserver(function () { refresh(); });
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
