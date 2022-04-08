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

function getPackages(ui: 'chakra' | 'tailwind'): Record<string, string> {
  switch (ui) {
    case 'chakra':
      return {
        '@chakra-ui/react': '^1.8.8',
        '@chakra-ui/icons': '^1.1.7',
        '@emotion/react': '^11.9.0',
        '@emotion/styled': '^11.8.1',
        'framer-motion': '^6.2.9',
      };
    case 'tailwind':
      return {
        '@heroicons/react': '^1.0.6',
        autoprefixer: '^10.4.4',
        daisyui: '^2.13.6',
        postcss: '^8.4.12',
        'react-daisyui': '^1.7.6',
        tailwindcss: '^3.0.23',
      };
  }
}

export default async function (
  tree: Tree,
  schema: { name: string; ui: 'chakra' | 'tailwind' }
) {
  const name = schema.name;

  addDependenciesToPackageJson(tree, getPackages(schema.ui), {});
  await applicationGenerator(tree, {
    name,
    style: 'css',
    e2eTestRunner: 'cypress',
    linter: Linter.EsLint,
    skipFormat: true,
    unitTestRunner: 'jest',
    routing: true,
  });
  const project = getProjects(tree).get(name);

  await generateFiles(
    tree,
    join(__dirname, 'files', schema.ui),
    project.sourceRoot,
    {
      ...names(name),
      tmpl: '',
    }
  );

  updateJson(tree, 'package.json', (val) => ({
    ...val,
    scripts: { [`dev:${name}`]: `nx serve ${name}`, ...val.scripts },
  }));

  tree.delete(join(project.sourceRoot, 'app', 'app.module.css'));
  tree.delete(join(project.sourceRoot, 'app', 'nx-welcome.tsx'));

  await formatFiles(tree);
  return () => {
    installPackagesTask(tree);
  };
}
