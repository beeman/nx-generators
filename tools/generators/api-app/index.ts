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
      'class-validator': '^0.14.0',
      '@nestjs/config': '^2.2.0',
      joi: '^17.7.0',
    },
    {}
  );
  await applicationGenerator(tree, { name, directory: 'apps' });
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
        '@nestjs/apollo': '^10.1.7',
        '@nestjs/graphql': '^10.1.7',
        '@nestjs/passport': '^9.0.0',
        '@prisma/client': '4.8.0',
        'apollo-server-express': '3.8.2',
        'passport-local': '^1.0.0',
        graphql: '16.6.0',
        passport: '^0.6.0',
      },
      {
        '@types/passport-local': '^1.0.34',
        prisma: '4.8.0',
      }
    );

    await generateApiFeature(tree, { app: name, name: 'core', skipUtil: true });

    const coreFeatureName = `${name}-core-feature`;
    await generateFiles(
      tree,
      join(__dirname, 'files/core-feature'),
      getProjects(tree).get(coreFeatureName).sourceRoot,
      {
        ...names(coreFeatureName),
        app: names(name),
        npmScope,
        tmpl: '',
      }
    );

    await generateApiFeature(tree, {
      app: name,
      name: 'config',
      skipUtil: true,
    });
    await generateApiFeature(tree, { app: name, name: 'auth', skipUtil: true });
    await generateApiFeature(tree, {
      app: name,
      name: 'user',
      skipUtil: true,
      crud: true,
    });

    const userDataAccessName = `${name}-user-data-access`;
    await generateFiles(
      tree,
      join(__dirname, 'files/user-data-access'),
      getProjects(tree).get(userDataAccessName).sourceRoot,
      {
        ...names(userDataAccessName),
        npmScope,
        tmpl: '',
      }
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

  // Get the Names
  const appName = app;
  const coreFeatureName = `${app}-core-feature`;

  // Get the Package Names
  const coreFeaturePackage = `@${npmScope}/${app}/core/feature`;

  // Get the Projects
  const appProject = getProjects(tree).get(appName);

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
}
