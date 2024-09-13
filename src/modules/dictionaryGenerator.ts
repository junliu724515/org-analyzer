import { Connection } from '@salesforce/core';
import CrawlObjects, { CrawlObjectsOptions } from './crawlObjectRelationships.js';
import { getStandardObjects } from './helper.js';
import ExcelBuilder, { ExcelBuilderOptions } from './excelBuilder.js';
import { getName } from './project.js';

/**
 * Options for building the data dictionary.
 */
export type DictionaryBuilderOptions = {
  includeManaged: boolean;
  conn: Connection;
  excludeManagedPrefixes?: string;
  includeManagedPrefixes?: string;
  sobjects?: string;
  dir?: string;
  startObject?: string;
  outputTime?: boolean;
  skipCharts?: boolean;
  includeStdObjects?: string;
  includeNonEmptyObjects?: boolean;
};

/**
 * Result of the data dictionary generation.
 */
export type DictionaryBuilderResult = {
  success: boolean;
  outputFolder?: string;
  objects?: Set<string>;
  error?: Error | string;
};

/**
 * Result of the count query.
 */
type CountQueryResult = {
  objectName: string;
  recordCount: number;
};

/**
 * Class responsible for generating the data dictionary.
 */
export class DictionaryGenerator {
  private options: DictionaryBuilderOptions;

  /**
   * Constructor for DictionaryGenerator.
   *
   * @param {DictionaryBuilderOptions} options - The options for building the data dictionary.
   */
  public constructor(options: DictionaryBuilderOptions) {
    this.options = options;
  }

  /**
   * Builds the data dictionary.
   *
   * @returns {Promise<DictionaryBuilderResult>} The result of the data dictionary generation.
   */
  public async build(): Promise<DictionaryBuilderResult> {
    const objectSet = await this.identifyObjects();
    const projectName = (await getName()) as string;

    const excelBuilderOptions: ExcelBuilderOptions = {
      conn: this.options.conn,
      columns: {
        ReadOnly: 5,
        Mandatory: 3,
        Name: 25,
        Description: 90,
        Helptext: 90,
        APIName: 25,
        Type: 27,
        Values: 45,
      },
      objects: Array.from(objectSet),
      hideTechFields: false,
      techFieldPrefix: 'TECH_',
      outputTime: this.options.outputTime ? this.options.outputTime : false,
      output: this.options.dir ? this.options.dir : '.',
      projectName,
      generateCharts: !this.options.skipCharts,
    };

    const excelBuilder = new ExcelBuilder(excelBuilderOptions);
    const result = await excelBuilder.generate();

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }
    return {
      success: result.success,
      outputFolder: result.outputFolder,
      objects: objectSet,
    };
  }

  /**
   * Identifies the objects to be included in the data dictionary.
   *
   * @returns {Promise<Set<string>>} A set of object names.
   */
  private async identifyObjects(): Promise<Set<string>> {
    // Retrieves a set of standard objects that have at least one custom field from the Salesforce metadata .
    const standardObjects = await getStandardObjects(this.options.conn);

    // Initialize a set to store custom objects
    const customObjects = new Set<string>();

    // Split the exclude and include managed prefixes and standard objects into arrays
    const excludePrefixes = this.options.excludeManagedPrefixes?.split(',');
    const includePrefixes = this.options.includeManagedPrefixes?.split(',');
    const includeStdObjects = this.options.includeStdObjects?.split(',');

    // If a start object is specified, crawl its relationships to identify objects
    if (this.options.startObject) {
      const opts = {
        conn: this.options.conn,
        startObject: this.options.startObject,
        includedStdObjects: includeStdObjects,
      } as CrawlObjectsOptions;

      const objectList = await new CrawlObjects(opts).crawl();
      return new Set(objectList);
    }

    // If specific sObjects are provided, return them as a set
    if (this.options.sobjects) {
      return new Set(this.options.sobjects.split(','));
    }

    // Retrieve custom object metadata from Salesforce
    const fileProperties = await this.options.conn.metadata.list({ type: 'CustomObject' });
    if (fileProperties.length > 0) {
      for (const object of fileProperties) {
        const isCustomObject = object.fullName.includes('__c');

        // Include objects based on managed prefixes
        if (includePrefixes && object.namespacePrefix) {
          if (includePrefixes.includes(object.namespacePrefix) && isCustomObject) {
            customObjects.add(object.fullName);
          }
          continue;
        }

        // Exclude managed objects if not included
        if (!this.options.includeManaged && object.namespacePrefix) {
          continue;
        }

        // Exclude objects based on managed prefixes
        if (this.options.includeManaged && excludePrefixes && object.namespacePrefix) {
          if (excludePrefixes.includes(object.namespacePrefix)) {
            continue;
          }
        }

        // Add custom objects to the set
        if (isCustomObject) {
          customObjects.add(object.fullName);
        }
      }
    }

    // Filter out objects with zero record count if specified
    if (this.options.includeNonEmptyObjects) {
      const stdObjects = await this.filerOutZeroCountObjects(standardObjects);
      const custObjects = await this.filerOutZeroCountObjects(customObjects);
      return new Set([...Array.from(stdObjects), ...Array.from(custObjects)]);
    }

    // Return the combined set of standard and custom objects
    return new Set([...Array.from(standardObjects), ...Array.from(customObjects)]);
  }

  /**
   * Filters out objects with zero record count.
   *
   * @param {Set<string>} objects - The set of object names.
   * @returns {Promise<Set<string>>} A set of object names with non-zero record count.
   */
  private async filerOutZeroCountObjects(objects: Set<string>): Promise<Set<string>> {
    const promises = [];

    for (const name of objects) {
      promises.push(this.getObjectRecordCount(name));
    }

    const results = await Promise.all(promises);

    return new Set(
      results
        .filter((result) => result.recordCount > 0)
        .map((result) => result.objectName)
        .sort()
    );
  }

  /**
   * Gets the record count for a given object.
   *
   * @param {string} objectName - The name of the object.
   * @returns {Promise<CountQueryResult>} The result of the count query.
   */
  private async getObjectRecordCount(objectName: string): Promise<CountQueryResult> {
    const query = `SELECT COUNT() FROM ${objectName}`;
    const result = await this.options.conn.query(query);
    return { objectName, recordCount: result.totalSize };
  }
}
