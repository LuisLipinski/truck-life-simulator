# Fluxo de branches, publicação e rollback

O projeto usa três tipos de branch:

- branches de trabalho, usadas para desenvolver uma alteração;
- `development`, usada para integração, validação e publicação no GitHub Pages;
- `master`, usada como histórico estável das versões promovidas.

O site público sempre é construído a partir da `development`.

## Validação automática

A workflow **Truck Life delivery** executa instalação, testes e build:

- em todo pull request direcionado para `development` ou `master`;
- em todo push para `development`;
- quando a operação manual `validate-development` é escolhida.

Um push aprovado em `development` também publica a pasta `dist` no GitHub Pages.

## Promoção manual

Na aba **Actions**, abra **Truck Life delivery**, selecione **Run workflow** e escolha uma operação:

| Operação | Resultado |
| --- | --- |
| `promote-source-to-development` | Mescla `source_ref` em `development`, testa, compila e publica no Pages. |
| `promote-development-to-master` | Mescla a versão validada de `development` em `master`. |
| `promote-source-to-development-and-master` | Valida os dois destinos e atualiza `development` e `master` em uma única operação. |

Para as operações que começam em uma branch de trabalho, preencha `source_ref` com o nome exato da branch. A pipeline cria commits de merge e nunca usa push forçado.

Na promoção conjunta, as duas referências são enviadas em um push atômico: se o GitHub não puder atualizar uma delas, nenhuma das duas é alterada.

## Rollback

As operações disponíveis são:

- `rollback-development`: restaura o conteúdo anterior da `development`, testa, compila e republica o Pages;
- `rollback-master`: restaura o conteúdo anterior da `master` e executa toda a validação.

O rollback não apaga commits nem move a branch com `force`. Ele cria um novo commit cujo conteúdo corresponde ao primeiro pai da versão atual. Os arquivos de workflow são preservados para que a pipeline continue disponível depois da reversão.

## Fluxo recomendado

1. desenvolver em uma branch de trabalho;
2. abrir um pull request para `development` e aguardar os testes;
3. mesclar ou usar `promote-source-to-development`;
4. validar o site publicado;
5. usar `promote-development-to-master` quando a versão estiver aprovada;
6. em caso de problema, executar o rollback da branch afetada.
