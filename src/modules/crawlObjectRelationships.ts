import { Connection } from '@salesforce/core';
import { getStandardObjects } from './helper.js';

/**
 * Class representing the functionality to crawl Salesforce objects.
 */
export default class CrawlObjects {
  private standardObjects: Set<string> = new Set<string>();
  private sobjectToTraverse: Set<string> = new Set<string>();
  private crawledObjectTypes: Set<string> = new Set<string>();
  private managedObjects: Set<string> = new Set<string>();

  /**
   * Constructor for the CrawlObjects class.
   */
  public constructor() {}

  /**
   * Traverses a Salesforce object and its dependencies.
   *
   * @param {Connection} conn - The Salesforce connection instance.
   * @param {string} customObjectName - The name of the custom object to traverse.
   * @returns {Promise<Set<string>>} - A promise that resolves to a set of crawled object types.
   */
  public async traverseObject(conn: Connection | undefined, customObjectName: string): Promise<Set<string>> {
    if (conn) {
      // populate managedObjects if it is empty
      if (this.managedObjects.size === 0) {
        const objectList = await conn.metadata.list([{ type: 'CustomObject' }]);
        objectList
          .filter((object) => object.namespacePrefix)
          .forEach((object) => this.managedObjects.add(object.fullName));
      }

      // populate standardObjects if it is empty
      if (this.standardObjects.size === 0) {
        this.standardObjects = await getStandardObjects(conn);
      }

      this.crawledObjectTypes.add(customObjectName);
      this.sobjectToTraverse.add(customObjectName);

      if (this.managedObjects.has(customObjectName)) {
        return this.crawledObjectTypes;
      }

      const childRelationships = await this.retrieveSobjectDependencies(conn, customObjectName);
      for (const childRelationship of this.sobjectToTraverse) {
        // remove the object already traversed
        if (childRelationships.has(childRelationship)) {
          childRelationships.delete(childRelationship);
        }
      }
      // crawl the objects not yet traversed
      if (childRelationships.size > 0) {
        childRelationships.forEach((child) => this.sobjectToTraverse.add(child));
        const promises = [];
        for (const child of childRelationships) {
          promises.push(this.traverseObject(conn, child));
        }
        await Promise.all(promises);
      }
    }
    return this.crawledObjectTypes;
  }

  public async crawl(conn: Connection | undefined, customObjectName: string): Promise<string[]> {
    const customObjectNames = await this.traverseObject(conn, customObjectName);
    // sort custom object names in alphabetical order
    return Array.from(customObjectNames).sort();
  }

  /**
   * Retrieves the dependencies of a Salesforce object.
   *
   * @param {Connection} conn - The Salesforce connection instance.
   * @param {string} customObjectName - The name of the custom object to retrieve dependencies for.
   * @returns {Promise<Set<string>>} - A promise that resolves to a set of dependent object names.
   */
  private async retrieveSobjectDependencies(conn: Connection, customObjectName: string): Promise<Set<string>> {
    const objectDescription = await conn.describe(customObjectName);
    const childRelationships = objectDescription.childRelationships;
    const fields = objectDescription.fields;

    const sobjectToTraverse = new Set<string>();

    for (const field of fields) {
      if (
        field.type === 'reference' &&
        field.custom &&
        field.referenceTo &&
        field.referenceTo.length > 0 &&
        field.referenceTo[0] !== 'User'
      ) {
        sobjectToTraverse.add(field.referenceTo[0]);
      }
    }

    for (const childRelationship of childRelationships) {
      if (
        childRelationship.childSObject.includes('__c') ||
        (objectDescription.custom && this.standardObjects.has(childRelationship.childSObject))
      ) {
        sobjectToTraverse.add(childRelationship.childSObject);
      }
    }

    return sobjectToTraverse;
  }
}
