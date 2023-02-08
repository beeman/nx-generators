# nx-generators

Some shared nx-generators

### Add generators

Run this in your Nx Workspace. It **WILL** delete any existing workspace-generators so make sure to commit any changes you want to store.

```shell
wget -O - https://raw.githubusercontent.com/beeman/nx-generators/main/setup.sh | bash
```

### Install dependencies

```shell
yarn add -D @nrwl/nest @nrwl/react ts-morph
```

### Run generators

#### api-feature

Generate basic feature:

```shell
nx workspace-generator api-feature core
# This will generate:
# - libs/api/core/data-access
# - libs/api/core/feature
```

To delete them use this command:

```shell
nx g remove api-core-feature  && nx g remove api-core-data-access
```

You can generate a feature with `util` lib:

```shell
nx workspace-generator api-feature core --skipUtil fals
# This will generate:
# - libs/api/core/data-access
# - libs/api/core/feature
# - libs/api/core/util
```

You can generate a feature with CRUD (depends on `@prisma/client`):

```shell
nx workspace-generator api-feature company --crud --plural companies
```

# MIT License 2023 beeman
