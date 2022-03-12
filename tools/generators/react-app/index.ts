import {
  addDependenciesToPackageJson,
  formatFiles,
  generateFiles,
  getProjects,
  installPackagesTask,
  names,
  Tree,
  updateJson,
} from '@nrwl/devkit';
import { Linter } from '@nrwl/linter';
import { applicationGenerator } from '@nrwl/react';
import { join } from 'path';

export default async function (tree: Tree, schema: any) {
  const name = schema.name;

  addDependenciesToPackageJson(
    tree,
    {
      '@heroicons/react': 'latest',
      autoprefixer: 'latest',
      daisyui: 'latest',
      postcss: 'latest',
      tailwindcss: 'latest',
    },
    {}
  );
  await applicationGenerator(tree, {
    name,
    style: 'css',
    e2eTestRunner: 'cypress',
    linter: Linter.EsLint,
    skipFormat: true,
    unitTestRunner: 'jest',
  });
  const project = getProjects(tree).get(name);

  await generateFiles(tree, join(__dirname, 'files'), project.sourceRoot, {
    ...names(name),
    tmpl: '',
  });

  updateJson(tree, 'package.json', (val) => ({
    ...val,
    scripts: { [`dev:${name}`]: `nx serve ${name}`, ...val.scripts },
  }));

  await formatFiles(tree);
  return () => {
    installPackagesTask(tree);
  };
}
