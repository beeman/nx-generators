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
  updateProjectConfiguration,
} from '@nrwl/devkit';
import { join } from 'path';
import { createEmptyNestApp } from '../lib/helpers/create-empty-nest-app';

export default async function (tree: Tree, schema: any) {
  const app = schema.app;
  const name = schema.name || `${app}-e2e`;

  const { npmScope } = getWorkspaceLayout(tree);

  await createEmptyNestApp(tree, name);

  const project = getProjects(tree).get(name);

  // Create files
  await generateFiles(tree, join(__dirname, 'files'), project.sourceRoot, {
    ...names(name),
    app: names(app),
    npmScope,
    tmpl: '',
  });

  // Update project targets
  updateProjectConfiguration(tree, name, {
    ...project,
    targets: {
      e2e: {
        executor: '@nrwl/jest:jest',
        options: {
          jestConfig: `apps/${name}/jest.config.ts`,
          passWithNoTests: true,
        },
      },
      lint: {
        executor: '@nrwl/linter:eslint',
        outputs: ['{options.outputFile}'],
        options: {
          lintFilePatterns: [`apps/${name}/**/*.ts`],
        },
      },
    },
  });

  addDependenciesToPackageJson(
    tree,
    {},
    { '@types/supertest': '2.0.12', supertest: '6.2.3' }
  );

  // Add path to app in tsconfig.base.json so the api-e2e project can import it
  const appProject = getProjects(tree).get(app);
  const appPackage = `@${npmScope}/${app}-app-module`;
  const appModule = join(appProject.sourceRoot, 'app/app.module.ts');

  updateJson(tree, 'tsconfig.base.json', (source) => {
    return {
      ...source,
      compilerOptions: {
        ...source.compilerOptions,
        paths: {
          [appPackage]: [appModule],
          ...source.compilerOptions.paths,
        },
      },
    };
  });

  // Allow api-e2e to import api
  updateJson(tree, '.eslintrc.json', (source) => {
    return {
      ...source,
      overrides: [
        ...source.overrides.map((override) => {
          if (override.rules['@nrwl/nx/enforce-module-boundaries']) {
            return {
              ...override,
              rules: {
                ...override.rules,
                '@nrwl/nx/enforce-module-boundaries': [
                  'error',
                  {
                    enforceBuildableLibDependency: true,
                    allow: [appPackage],
                    depConstraints: [
                      {
                        sourceTag: '*',
                        onlyDependOnLibsWithTags: ['*'],
                      },
                    ],
                  },
                ],
              },
            };
          }
          return override;
        }),
      ],
    };
  });

  await formatFiles(tree);

  return () => {
    installPackagesTask(tree);
  };
}
