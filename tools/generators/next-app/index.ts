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
import { applicationGenerator } from '@nrwl/next';
import { join } from 'path';

export default async function (tree: Tree, schema: any) {
  const name = schema.name;

  addDependenciesToPackageJson(
    tree,
    {
      '@heroicons/react': '^1.0.6',
      'next-themes': '^0.2.0',
      autoprefixer: '^10.4.7',
      daisyui: '^2.15.2',
      postcss: '^8.4.14',
      tailwindcss: '^3.0.24',
    },
    {}
  );
  await applicationGenerator(tree, { name, style: 'css' });
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
