CATÁLOGO DE PRODUTOS — V2

O site agora possui:
- Botão de câmera na tela Escanear.
- Botão de câmera dentro de Cadastrar produto.
- Solicitação explícita de permissão da câmera.
- Prioridade para a câmera traseira.
- Ao escanear no cadastro, o código é preenchido automaticamente.
- Consulta automática ao Open Food Facts para tentar preencher o nome e a imagem.
- Se o código já estiver cadastrado, mostra:
  produto ja cadastrado "NOME"
- Cadastro manual de código, nome e imagem.
- Catálogo salvo no armazenamento local do navegador.

IMPORTANTE SOBRE A CÂMERA:
A maioria dos navegadores NÃO permite acesso à câmera quando o index.html é aberto diretamente como arquivo (file://).
Para usar a câmera no celular, abra o site por HTTPS ou em localhost.

Exemplo simples para testar no computador:
1. Entre na pasta do site.
2. Rode: python -m http.server 8000
3. Abra http://localhost:8000 no computador.
Para usar no celular, o ideal é publicar em um serviço HTTPS.

O site consulta:
https://world.openfoodfacts.org/

Os produtos cadastrados ficam salvos no navegador via localStorage.
