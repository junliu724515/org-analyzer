// import path from 'node:path';
import { Connection } from '@salesforce/core';
import CrawlObjects, { CrawlObjectsOptions } from './crawlObjectRelationships.js';
import { getStandardObjects } from './helper.js';
import ExcelBuilder, { ExcelBuilderOptions } from './excelBuilder.js';
import { getName } from './project.js';

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

export type DictionaryBuilderResult = {
  success: boolean;
  outputFolder?: string;
  objects?: Set<string>;
  error?: Error | string;
};

type CountQueryResult = {
  objectName: string;
  recordCount: number;
};

export class DictionaryGenerator {
  private options: DictionaryBuilderOptions;

  public constructor(options: DictionaryBuilderOptions) {
    this.options = options;
  }

  public async build(): Promise<DictionaryBuilderResult> {
    const objectSet = await this.identifyObjects();
    const projectName = (await getName()) as string;

    // await this.generateExcel(describeMap, metadataMap);

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

  private async identifyObjects(): Promise<Set<string>> {
    const standardObjects = await getStandardObjects(this.options.conn);
    const customObjects = new Set<string>();

    const excludePrefixes = this.options.excludeManagedPrefixes?.split(',');
    const includePrefixes = this.options.includeManagedPrefixes?.split(',');
    const includeStdObjects = this.options.includeStdObjects?.split(',');

    if (this.options.startObject) {
      const opts = {
        conn: this.options.conn,
        startObject: this.options.startObject,
        includedStdObjects: includeStdObjects,
      } as CrawlObjectsOptions;

      const objectList = await new CrawlObjects(opts).crawl();
      return new Set(objectList);
    }

    if (this.options.sobjects) {
      return new Set(this.options.sobjects.split(','));
    }

    const fileProperties = await this.options.conn.metadata.list({ type: 'CustomObject' });
    if (fileProperties.length > 0) {
      for (const object of fileProperties) {
        const isCustomObject = object.fullName.includes('__c');

        if (includePrefixes && object.namespacePrefix) {
          if (includePrefixes.includes(object.namespacePrefix) && isCustomObject) {
            customObjects.add(object.fullName);
          }
          continue;
        }

        if (!this.options.includeManaged && object.namespacePrefix) {
          continue;
        }

        if (this.options.includeManaged && excludePrefixes && object.namespacePrefix) {
          if (excludePrefixes.includes(object.namespacePrefix)) {
            continue;
          }
        }
        if (isCustomObject) {
          customObjects.add(object.fullName);
        }
      }
    }
    // return the standard and custom objects with non zero count
    if (this.options.includeNonEmptyObjects) {
      const stdObejcts = await this.filerOutZeroCountObejcts(standardObjects);
      const custObejcts = await this.filerOutZeroCountObejcts(customObjects);
      return new Set([...Array.from(stdObejcts), ...Array.from(custObejcts)]);
    }
    return new Set([...Array.from(standardObjects), ...Array.from(customObjects)]);
  }

  private async filerOutZeroCountObejcts(standardObjects: Set<string>): Promise<Set<string>> {
    const promises = [];

    for (const name of standardObjects) {
      promises.push(this.getObjectRecordCount(name));
    }
    // assign results to the object
    const results = await Promise.all(promises);

    // filter out objects with no records and return the ordered set
    return new Set(
      results
        .filter((result) => result.recordCount > 0)
        .map((result) => result.objectName)
        .sort() // sort alphabetically
    );
  }

  private async getObjectRecordCount(objectName: string): Promise<CountQueryResult> {
    const query = `SELECT COUNT() FROM ${objectName}`;
    const result = await this.options.conn.query(query);
    return { objectName, recordCount: result.totalSize };
  }
}
