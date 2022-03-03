import { formatFiles, installPackagesTask, readProjectConfiguration, Tree } from '@nrwl/devkit'
import { generateApiLib, updateApiFeature } from '../lib'

interface ApiFeatureSchema {
  app: string
  crud: boolean
  name: string
  plural: string
  skipDataAccess: boolean
  skipFeature: boolean
  skipUtil: boolean
}

export default async function (tree: Tree, schema: ApiFeatureSchema) {
  const app = schema.app
  const name = schema.name
  const plural = schema.plural || `${name}s`

  // Get the CoreDataAccess Project Name
  const coreDataAccessName = `${app}-core-data-access`
  // Get the CoreFeature Project Name
  const coreFeatureName = `${app}-core-feature`

  // Get the CoreDataAccess Project
  let coreDataAccessProject
  try {
    coreDataAccessProject = readProjectConfiguration(tree, coreDataAccessName)
  } catch (e) {}

  // Get the CoreFeature Project
  let coreFeatureProject
  try {
    coreFeatureProject = readProjectConfiguration(tree, coreFeatureName)
  } catch (e) {}

  if (!schema.skipDataAccess) {
    await generateApiLib(tree, app, name, 'data-access')
  }
  if (!schema.skipFeature) {
    await generateApiLib(tree, app, name, 'feature')
  }
  if (!schema.skipUtil) {
    await generateApiLib(tree, app, name, 'util')
  }

  if (!schema.skipDataAccess && !schema.skipFeature) {
    updateApiFeature(tree, {
      app,
      coreDataAccessName,
      coreDataAccessProject,
      coreFeatureName,
      coreFeatureProject,
      crud: schema.crud,
      name,
      plural,
    })
  }
  await formatFiles(tree)

  return () => {
    installPackagesTask(tree)
  }
}
