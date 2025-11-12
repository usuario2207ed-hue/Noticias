const fontes = [
  { nome: "Olhar Digital", rss: "https://olhardigital.com.br/feed/" },
  { nome: "Canaltech", rss: "https://feeds.feedburner.com/canaltechbr" },
  { nome: "TechTudo", rss: "https://feeds.feedburner.com/techtudo" },
  { nome: "TecMundo", rss: "https://feeds.feedburner.com/tecmundo" },
  { nome: "Tecnoblog", rss: "https://feeds.feedburner.com/tecnoblog" },
  { nome: "Gizmodo Brasil", rss: "https://gizmodo.uol.com.br/feed/" }
];

let allNoticias = [];
let paginaAtual = 0;
const porPagina = 3;
const maxTentativas = 3;
const loadingOverlay = document.getElementById('loading-overlay');

if ('Notification' in window) {
  Notification.requestPermission().then(permission => {
    if (permission === "granted") {
      new Notification("📰 Bem-vindo(a) às notícias EDCELL-TECH!", {
        body: "As últimas novidades serão atualizadas automaticamente.",
        icon: "https://cdn-icons-png.flaticon.com/512/21/21601.png"
      });
    }
  });
}

async function fetchFeed(site, tentativas = 1) {
  try {
    const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(site.rss)}`;
    const response = await fetch(url);
    const data = await response.json();
    if (!data.items || data.items.length === 0) throw new Error("Nenhuma notícia encontrada");

    return data.items.filter(item => {
      const imagem = item.enclosure?.link || item.thumbnail || null;
      const descricao = item.description?.replace(/<[^>]+>/g, "").trim();
      return imagem && descricao;
    }).map(item => ({
      site: site.nome,
      titulo: item.title,
      link: item.link,
      descricao: item.description.replace(/<[^>]+>/g, "").substring(0,150) + "...",
      imagem: item.enclosure?.link || item.thumbnail
    }));

  } catch (err) {
    if (tentativas < maxTentativas) {
      await new Promise(r => setTimeout(r, 1500));
      return fetchFeed(site, tentativas + 1);
    } else {
      return [];
    }
  }
}

function carregarMaisNoticias() {
  const feed = document.getElementById('feed-principal');
  const inicio = paginaAtual * porPagina;
  const fim = inicio + porPagina;
  const noticiasParaMostrar = allNoticias.slice(inicio, fim);

  noticiasParaMostrar.forEach(noticia => {
    if(!noticia.imagem || !noticia.descricao) return;

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <a href="${noticia.link}" target="_blank">
        <img src="${noticia.imagem}" alt="${noticia.site}">
        <h4>${noticia.titulo}</h4>
        <p>${noticia.descricao}</p>
      </a>
    `;
    feed.appendChild(card);
    setTimeout(() => card.classList.add('visible'), 100);
  });

  paginaAtual++;
}

function mostrarNoticiasInstantaneamente() {
  const feed = document.getElementById('feed-principal');
  feed.innerHTML = "";
  paginaAtual = 0;
  carregarMaisNoticias();
}

async function atualizarNoticiasEmSegundoPlano() {
  let todasNoticias = [];
  for (const site of fontes) {
    const noticias = await fetchFeed(site);
    todasNoticias.push(...noticias);
  }

  const novas = todasNoticias.filter((v,i,a)=>a.findIndex(t=>(t.titulo===v.titulo))===i);
  const antigas = JSON.parse(localStorage.getItem('noticias') || "[]");

  if (JSON.stringify(novas) !== JSON.stringify(antigas)) {
    localStorage.setItem('noticias', JSON.stringify(novas));
    allNoticias = novas;
    // Atualiza suavemente sem o usuário perceber
    const feed = document.getElementById('feed-principal');
    feed.style.opacity = "0.7";
    setTimeout(() => {
      feed.innerHTML = "";
      paginaAtual = 0;
      carregarMaisNoticias();
      feed.style.opacity = "1";
    }, 300);
  }
}

async function iniciar() {
  const jaVisitou = localStorage.getItem('jaVisitou');
  const stored = localStorage.getItem('noticias');

  if (stored) {
    allNoticias = JSON.parse(stored);
    mostrarNoticiasInstantaneamente();
  }

  if (!jaVisitou) {
    loadingOverlay.style.display = "flex";
  } else {
    loadingOverlay.style.display = "none";
  }

  await atualizarNoticiasEmSegundoPlano();

  if (!jaVisitou) {
    localStorage.setItem('jaVisitou', 'true');
    setTimeout(() => loadingOverlay.style.display = "none", 800);
  }
}

window.addEventListener('scroll', () => {
  if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 200) {
    carregarMaisNoticias();
  }
});

iniciar();
setInterval(atualizarNoticiasEmSegundoPlano, 86400000); // atualiza 1x por dia
