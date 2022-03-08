import {
  addDependenciesToPackageJson,
  formatFiles,
  generateFiles,
  getProjects,
  getWorkspaceLayout,
  installPackagesTask,
  names,
  Tree,
  updateJson,
} from '@nrwl/devkit';
import { applicationGenerator } from '@nrwl/nest';
import { join } from 'path';
import { generateApiFeature } from '../lib';
import { apiImportModule } from '../lib/api-import-module';
import { updateSourceFile } from '../lib/helpers/update-source-file';

export default async function (tree: Tree, schema: any) {
  const name = schema.name;
  const simple = schema.simple;

  const { npmScope } = getWorkspaceLayout(tree);

  addDependenciesToPackageJson(
    tree,
    {
      'class-transformer': '^0.5.1',
      'class-validator': '^0.13.2',
      '@nestjs/config': '^1.2.0',
      joi: '^17.6.0',
    },
    {}
  );
  await applicationGenerator(tree, { name });
  const project = getProjects(tree).get(name);

  await generateFiles(tree, join(__dirname, 'files/app'), project.sourceRoot, {
    ...names(name),
    app: names(name),
    npmScope,
    tmpl: '',
  });

  updateJson(tree, 'package.json', (val) => ({
    ...val,
    scripts: { [`dev:${name}`]: `nx serve ${name}`, ...val.scripts },
  }));

  if (!simple) {
    addDependenciesToPackageJson(
      tree,
      {
        '@prisma/client': '3.10.0',
      },
      { prisma: '3.10.0' }
    );
    await updateAppImports(tree, name);
    const configDataAccessName = `${name}-config-data-access`;
    await generateFiles(
      tree,
      join(__dirname, 'files/config-data-access'),
      getProjects(tree).get(configDataAccessName).sourceRoot,
      {
        ...names(configDataAccessName),
        npmScope,
        tmpl: '',
      }
    );
    const configFeatureName = `${name}-config-feature`;
    await generateFiles(
      tree,
      join(__dirname, 'files/config-feature'),
      getProjects(tree).get(configFeatureName).sourceRoot,
      {
        ...names(configFeatureName),
        app: names(name),
        npmScope,
        tmpl: '',
      }
    );
    const coreDataAccessName = `${name}-core-data-access`;
    await generateFiles(
      tree,
      join(__dirname, 'files/core-data-access'),
      getProjects(tree).get(coreDataAccessName).sourceRoot,
      {
        ...names(coreDataAccessName),
        npmScope,
        tmpl: '',
      }
    );
    updateJson(tree, './package.json', (content) => {
      return {
        ...content,
        scripts: {
          'dev:services': 'docker compose up',
          ...content.scripts,
        },
        prisma: {
          schema: `libs/${name}/core/data-access/src/prisma/schema.prisma`,
        },
      };
    });
    tree.write(
      '.env',
      `DATABASE_URL="postgresql://prisma:prisma@localhost:5432/prisma?schema=${name}"\n`
    );
    tree.write(
      '.env.example',
      `DATABASE_URL="postgresql://prisma:prisma@localhost:5432/prisma?schema=${name}"\n`
    );
    tree.write(
      '.gitignore',
      tree.read('.gitignore').toString('utf-8') + '\n.env\n'
    );
    tree.write(
      'docker-compose.yml',
      `version: '3'
services:
  postgres:
    image: postgres
    ports:
      - 5432:5432
    environment:
      POSTGRES_DB: prisma
      POSTGRES_USER: prisma
      POSTGRES_PASSWORD: prisma
    volumes:
      - ./tmp/postgres:/var/lib/postgresql/data
`
    );
  }

  await formatFiles(tree);
  return () => {
    installPackagesTask(tree);
  };
}

async function updateAppImports(tree: Tree, app: string) {
  const { npmScope } = getWorkspaceLayout(tree);

  await generateApiFeature(tree, { app, name: 'core', skipUtil: true });
  await generateApiFeature(tree, { app, name: 'config', skipUtil: true });

  // Get the Names
  const appName = app;
  const configDataAccessName = `${app}-config-data-access`;
  const coreFeatureName = `${app}-core-feature`;

  // Get the Package Names
  const appPackage = `@${npmScope}/${app}/core/feature`;
  const configDataAccessPackage = `@${npmScope}/${app}/config/data-access`;
  const coreFeaturePackage = `@${npmScope}/${app}/core/feature`;

  // Get the Projects
  const appProject = getProjects(tree).get(appName);
  const configDataAccessProject = getProjects(tree).get(configDataAccessName);
  const coreFeatureProject = getProjects(tree).get(coreFeatureName);

  // Get Data Access Class Names and Paths
  const configDataAccessModuleClass = `${
    names(configDataAccessName).className
  }Module`;
  const configDataAccessServiceClass = `${
    names(configDataAccessName).className
  }Service`;
  const coreFeatureModulePath = join(
    coreFeatureProject.sourceRoot,
    'lib',
    `${coreFeatureName}.module.ts`
  );
  const dataAccessServicePath = join(
    configDataAccessProject.sourceRoot,
    'lib',
    `${configDataAccessName}.service.ts`
  );

  // Get the FeatureModule Name
  const appModuleClass = `${names('app').className}Module`;
  const coreFeatureModuleClass = `${names(coreFeatureName).className}Module`;
  // Get the FeatureModule Path
  const appModulePath = join(appProject.sourceRoot, 'app', `app.module.ts`);

  updateSourceFile(tree, appModulePath, (source) => {
    tree.delete(join(appProject.sourceRoot, 'app', `.gitkeep`));
    tree.delete(join(appProject.sourceRoot, 'app', `app.controller.spec.ts`));
    tree.delete(join(appProject.sourceRoot, 'app', `app.controller.ts`));
    tree.delete(join(appProject.sourceRoot, 'app', `app.service.spec.ts`));
    tree.delete(join(appProject.sourceRoot, 'app', `app.service.ts`));

    const imports = source.getImportDeclarations();
    for (const item of imports) {
      if (
        item.getText().includes('app.controller') ||
        item.getText().includes('app.service')
      ) {
        console.log('Remove import', item.getText());
        item.remove();
      } else {
        console.log('Keep import', item.getText());
      }
    }
    const sourceClass = source.getClass(appModuleClass);
    sourceClass.getDecorator('Module').remove();
    sourceClass.addDecorator({
      name: 'Module',
      arguments: ['{}'],
    });

    return source;
  });

  // Import the DataAccessModule into the FeatureModule
  apiImportModule(tree, appModulePath, {
    importClass: coreFeatureModuleClass,
    importPackage: coreFeaturePackage,
    targetClass: appModuleClass,
  });

  // const appProject = getProjects(tree).get(app);

  // console.log(appProject.sourceRoot);
  // console.log(configDataAccessProject.sourceRoot);
  // console.log(appProject.sourceRoot);
}
