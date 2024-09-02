import { SfProject } from '@salesforce/core';
import { Optional } from '@salesforce/ts-types';

export async function getSourceApiVersion(): Promise<Optional<string>> {
  const project = await SfProject.resolve();
  const projectConfig = await project.resolveProjectConfig();
  return projectConfig.sourceApiVersion as Optional<string>;
}

export async function getName(): Promise<Optional<string>> {
  const project = await SfProject.resolve();
  const projectConfig = await project.resolveProjectConfig();
  return projectConfig.name as Optional<string>;
}
