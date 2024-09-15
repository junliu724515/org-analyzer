import { Connection } from '@salesforce/core';
import { getStandardObjects, getManagedObjects } from './helper.js';

/**
 * Options for crawling Salesforce objects.
 */
export type CrawlObjectsOptions = {
  conn: Connection;
  startObject: string;
  includedStdObjects?: string[];
};

/**
 * Class representing the functionality to crawl Salesforce objects.
 */
export default class CrawlObjects {
  private standardObjects: Set<string> = new Set<string>();
  private sobjectToTraverse: Set<string> = new Set<string>();
  private crawledObjectTypes: Set<string> = new Set<string>();
  private managedObjects: Set<string> = new Set<string>();
  // private appObjects: Set<string> = new Set<string>();
  private opts: CrawlObjectsOptions;

  /**
   * Constructor for the CrawlObjects class.
   *
   * @param {CrawlObjectsOptions} opts - The options for crawling objects.
   */
  public constructor(opts: CrawlObjectsOptions) {
    this.opts = opts;
  }

  /**
   * Crawls Salesforce objects starting from the specified object.
   *
   * @returns {Promise<string[]>} - A promise that resolves to an array of crawled object names.
   */
  public async crawl(): Promise<string[]> {
    // Retrieve the list of managed package objects from the Salesforce metadata
    this.managedObjects = await getManagedObjects(this.opts.conn);

    // Retrieve the list of standard objects that have at least one custom field from the Salesforce metadata
    this.standardObjects = await getStandardObjects(this.opts.conn);

    const customObjectNames = await this.traverseObject(this.opts.startObject);
    // Sort custom object names in alphabetical order
    return Array.from(customObjectNames).sort();
  }

  /**
   * Traverses a Salesforce object and its dependencies.
   *
   * @param {string} customObjectName - The name of the custom object to traverse.
   * @returns {Promise<Set<string>>} - A promise that resolves to a set of crawled object types.
   */
  public async traverseObject(customObjectName: string): Promise<Set<string>> {
    this.crawledObjectTypes.add(customObjectName);
    this.sobjectToTraverse.add(customObjectName);

    // Do not traverse managed objects TODO: should we traverse managed objects with custom fields?
    if (this.managedObjects.has(customObjectName)) {
      return this.crawledObjectTypes;
    }

    const childRelationships = await this.retrieveSobjectDependencies(customObjectName);
    for (const childRelationship of this.sobjectToTraverse) {
      // Remove the object already traversed
      if (childRelationships.has(childRelationship)) {
        childRelationships.delete(childRelationship);
      }
    }
    // Crawl the objects not yet traversed
    if (childRelationships.size > 0) {
      childRelationships.forEach((child) => this.sobjectToTraverse.add(child));
      const promises = [];
      for (const child of childRelationships) {
        promises.push(this.traverseObject(child));
      }
      await Promise.all(promises);
    }
    return this.crawledObjectTypes;
  }

  /**
   * Retrieves the dependencies of a Salesforce object.
   *
   * @param {string} customObjectName - The name of the custom object to retrieve dependencies for.
   * @returns {Promise<Set<string>>} - A promise that resolves to a set of dependent object names.
   */
  private async retrieveSobjectDependencies(customObjectName: string): Promise<Set<string>> {
    const objectDescription = await this.opts.conn.describe(customObjectName);
    const childRelationships = objectDescription.childRelationships;
    const fields = objectDescription.fields;

    const sobjectsToTraverse = new Set<string>();

    if (!objectDescription.custom && !this.opts.includedStdObjects?.includes(customObjectName)) {
      return sobjectsToTraverse;
    }

    for (const field of fields) {
      if (
        field.type === 'reference' &&
        field.custom &&
        field.referenceTo &&
        field.referenceTo.length > 0 &&
        field.referenceTo[0] !== 'User'
      ) {
        sobjectsToTraverse.add(field.referenceTo[0]);
      }
    }

    for (const childRelationship of childRelationships) {
      if (
        childRelationship.childSObject.includes('__c') ||
        (objectDescription.custom && this.standardObjects.has(childRelationship.childSObject))
      ) {
        sobjectsToTraverse.add(childRelationship.childSObject);
      }
    }

    return sobjectsToTraverse;
  }
}
