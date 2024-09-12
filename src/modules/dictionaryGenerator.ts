// import path from 'node:path';
import { Connection } from '@salesforce/core';
import CrawlObjects from './crawlObjectRelationships.js';
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
};

export type DictionaryBuilderResult = {
  success: boolean;
  objects?: Set<string>;
  error?: Error | string;
};

export class DictionaryGenerator {
  private options: DictionaryBuilderOptions;

  public constructor(options: DictionaryBuilderOptions) {
    this.options = options;
  }

  public async identifyObjects(): Promise<Set<string>> {
    const standardObjects = await getStandardObjects(this.options.conn);
    const customObjects = new Set<string>();

    const excludePrefixes = this.options.excludeManagedPrefixes?.split(',');
    const includePrefixes = this.options.includeManagedPrefixes?.split(',');

    if (this.options.startObject) {
      const objectList = await new CrawlObjects().crawl(this.options.conn, this.options.startObject);
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
    return new Set([...Array.from(standardObjects).sort(), ...Array.from(customObjects).sort()]);
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
      outputTime: false,
      output: this.options.dir ? this.options.dir : '.',
      projectName,
      generateCharts: true,
      lucidchart: true,
      mermaidChart: true,
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
      objects: objectSet,
    };
  }
}
