import { SfProject } from '@salesforce/core';
import { Optional } from '@salesforce/ts-types';

/**
 * Retrieves the source API version from the Salesforce project configuration.
 *
 * @returns {Promise<Optional<string>>} A promise that resolves to the source API version.
 */
export async function getSourceApiVersion(): Promise<Optional<string>> {
  const project = await SfProject.resolve();
  const projectConfig = await project.resolveProjectConfig();
  return projectConfig.sourceApiVersion as Optional<string>;
}

/**
 * Retrieves the name of the Salesforce project from the project configuration.
 *
 * @returns {Promise<Optional<string>>} A promise that resolves to the project name.
 */
export async function getName(): Promise<Optional<string>> {
  const project = await SfProject.resolve();
  const projectConfig = await project.resolveProjectConfig();
  return projectConfig.name as Optional<string>;
}
