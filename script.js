let socketChat, socketEstoque, socketLogs;
let estoque = [];

const messagesDiv = document.getElementById('messages');
const listaEstoque = document.getElementById('listaEstoque');
const messageInput = document.getElementById('messageInput');
const usernameInput = document.getElementById('username');
const notifSound = document.getElementById('notifSound');

function iniciarSockets() {
  const host = window.location.hostname;

  socketChat = new WebSocket(`ws://${host}:3000/chat`);
  socketChat.onmessage = (event) => {
    const data = JSON.parse(event.data);
    mostrarMensagem(data.username, data.message);
  };

  socketEstoque = new WebSocket(`ws://${host}:3000/estoque`);
  socketEstoque.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.tipo === 'estoque-inicial' || data.tipo === 'estoque-atualizado') {
      estoque = data.estoque;
      atualizarEstoque();
    }
  };

  socketLogs = new WebSocket(`ws://${host}:3000/logs`);
  socketLogs.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log("LOG:", data.log);
  };
}

iniciarSockets();

function mostrarMensagem(username, message) {
  const msgDiv = document.createElement('div');
  msgDiv.innerHTML = `<strong>${username}:</strong> ${message}`;
  messagesDiv.appendChild(msgDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  notifSound.play();
}

function sendMessage() {
  const username = usernameInput.value.trim();
  const message = messageInput.value.trim();

  if (!username || !message) {
    alert("Preencha nome e mensagem.");
    return;
  }

  socketChat.send(JSON.stringify({ username, message }));
  messageInput.value = "";
}

function adicionarItem() {
  const nome = document.getElementById('itemNome').value.trim();
  const categoria = document.getElementById('itemCategoria').value.trim();
  const quantidade = parseInt(document.getElementById('itemQuantidade').value);
  const cor = document.getElementById('itemCor').value.trim();
  const bio = document.getElementById('itemBio').value.trim();

  if (!nome || !categoria || !quantidade || quantidade <= 0) {
    alert("Preencha nome, categoria e quantidade válida.");
    return;
  }

  const item = { nome, quantidade, bio };
  if (categoria.toLowerCase() === "capinhas" && cor) item.cor = cor;

  let categoriaExistente = estoque.find(cat => cat.nome === categoria);
  if (!categoriaExistente) {
    categoriaExistente = { nome: categoria, itens: [] };
    estoque.push(categoriaExistente);
  }

  categoriaExistente.itens.push(item);

  socketEstoque.send(JSON.stringify({
    tipo: "atualizar-estoque",
    estoque,
    acao: `Item adicionado: ${nome} (${categoria})`
  }));

  notifSound.play();

  document.getElementById('itemNome').value = "";
  document.getElementById('itemCategoria').value = "";
  document.getElementById('itemQuantidade').value = "";
  document.getElementById('itemCor').value = "";
  document.getElementById('itemBio').value = "";
}

function atualizarEstoque() {
  listaEstoque.innerHTML = '';

  estoque.forEach(categoria => {
    const div = document.createElement('div');
    div.className = 'categoria';
    const titulo = document.createElement('h3');
    titulo.textContent = categoria.nome;
    div.appendChild(titulo);

    const ul = document.createElement('ul');

    categoria.itens.forEach((item, index) => {
      const li = document.createElement('li');
      let texto = `${item.nome} - Qtd: ${item.quantidade}`;
      if (item.cor) texto += ` - Cor: ${item.cor}`;
      if (item.bio) texto += ` - 📝 ${item.bio}`;
      li.textContent = texto;

      const btnVer = document.createElement('button');
      btnVer.textContent = '🔍 Ver';
      btnVer.onclick = () => verItem(categoria.nome, index);

      const btnEditar = document.createElement('button');
      btnEditar.textContent = '✏️ Editar';
      btnEditar.onclick = () => editarItem(categoria.nome, index);

      const btnApagar = document.createElement('button');
      btnApagar.textContent = '❌ Apagar';
      btnApagar.onclick = () => apagarItem(categoria.nome, index);

      li.appendChild(document.createElement('br'));
      li.appendChild(btnVer);
      li.appendChild(btnEditar);
      li.appendChild(btnApagar);
      ul.appendChild(li);
    });

    div.appendChild(ul);
    listaEstoque.appendChild(div);
  });

  // Botão de limpar tudo
  const btnLimpar = document.createElement('button');
  btnLimpar.textContent = '🗑️ Limpar Tudo';
  btnLimpar.style.backgroundColor = '#dc3545';
  btnLimpar.style.color = '#fff';
  btnLimpar.style.marginTop = '1rem';
  btnLimpar.onclick = limparTudo;

  listaEstoque.appendChild(btnLimpar);
}

function verItem(categoriaNome, index) {
  const cat = estoque.find(c => c.nome === categoriaNome);
  const item = cat.itens[index];
  alert(`📦 ${item.nome}\nQuantidade: ${item.quantidade}\nCor: ${item.cor || "N/A"}\nDescrição: ${item.bio || "N/A"}`);
}

function editarItem(categoriaNome, index) {
  const cat = estoque.find(c => c.nome === categoriaNome);
  const item = cat.itens[index];

  const novoNome = prompt("Novo nome:", item.nome);
  const novaQtd = parseInt(prompt("Nova quantidade:", item.quantidade));
  const novaCor = prompt("Nova cor:", item.cor || "");
  const novaBio = prompt("Nova descrição:", item.bio || "");

  if (novoNome && novaQtd > 0) {
    item.nome = novoNome;
    item.quantidade = novaQtd;
    item.cor = novaCor;
    item.bio = novaBio;

    socketEstoque.send(JSON.stringify({
      tipo: "atualizar-estoque",
      estoque,
      acao: `Item editado: ${novoNome} (${categoriaNome})`
    }));
  }
}

function apagarItem(categoriaNome, index) {
  const cat = estoque.find(c => c.nome === categoriaNome);
  const item = cat.itens[index];

  if (confirm(`Remover "${item.nome}" da categoria "${categoriaNome}"?`)) {
    cat.itens.splice(index, 1);
    socketEstoque.send(JSON.stringify({
      tipo: "atualizar-estoque",
      estoque,
      acao: `Item removido: ${item.nome} (${categoriaNome})`
    }));
  }
}

function limparTudo() {
  if (confirm("Tem certeza que deseja apagar TODO o estoque?")) {
    estoque = [];
    socketEstoque.send(JSON.stringify({
      tipo: "atualizar-estoque",
      estoque,
      acao: "Estoque limpo por um usuário"
    }));
  }
}
