# Lista de Compras

Aplicação responsiva de lista de compras feita com HTML, CSS e JavaScript no frontend e um backend em Node.js. Os itens são gravados em `data/items.json`, então continuam disponíveis após atualizar ou fechar a página.

## Requisitos

- Node.js 18 ou superior
- Navegador moderno

O projeto não exige dependências npm de terceiros.

## Como executar

1. Abra um terminal na pasta do projeto.
2. Inicie o servidor:

   ```bash
   npm start
   ```

   Ou, sem npm:

   ```bash
   node server.js
   ```

3. Acesse <http://localhost:3000> no navegador. Para escolher outra porta, defina a variável de ambiente `PORT` antes de iniciar o servidor.

## Funcionalidades

- Adicionar produtos com quantidade (de 1 a 999).
- Excluir produtos da lista.
- Editar o nome e a quantidade em uma janela de edição.
- Marcar e desmarcar produtos como comprados. Os comprados aparecem riscados e em itálico.
- Consultar o total de unidades da lista e o total de unidades compradas.
- Alternar entre tema claro e escuro; a preferência fica salva no navegador.
- Layout adaptável para celulares, tablets e computadores.
- Persistência local dos itens no arquivo `data/items.json`, criado automaticamente na primeira alteração.

## API

O servidor entrega o frontend e disponibiliza estes endpoints JSON:

| Método | Caminho | Descrição |
| --- | --- | --- |
| `GET` | `/api/items` | Lista todos os itens |
| `POST` | `/api/items` | Cria um item com `name` e `quantity` |
| `PUT` | `/api/items/:id` | Atualiza nome, quantidade ou estado `completed` |
| `DELETE` | `/api/items/:id` | Exclui o item |

Exemplo de corpo para criar um item:

```json
{
  "name": "Maçãs",
  "quantity": 6
}
```

## Estrutura

```text
├── data/             # Criada automaticamente; armazenamento JSON
├── public/
│   ├── app.js         # Interações e integração com a API
│   ├── index.html     # Interface
│   └── styles.css     # Estilos e responsividade
├── package.json
└── server.js         # Servidor HTTP e API
```

## Observações

O arquivo de dados fica na máquina onde o servidor é executado. Defina `DATA_DIR` para escolher outro diretório gravável. Em runtimes serverless com código em `/var/task`, o servidor usa `/tmp/lista-de-compras` porque a pasta do código é somente leitura. O diretório temporário permite gravar durante a execução, mas a plataforma pode limpá-lo ao reiniciar a instância; para persistência entre reinicializações e instâncias, configure `DATA_DIR` para um volume persistente ou conecte um banco de dados gerenciado. O rodapé exibe: **© 2026 Maycon Rocha. Todos os direitos reservados.**
