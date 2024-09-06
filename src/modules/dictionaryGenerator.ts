// import path from 'node:path';
import { Connection } from '@salesforce/core';
import CrawlObjects from './crawlObjectRelationships.js';
import { getStandardObjects } from './helper.js';
import ExcelBuilder, { ExcelBuilderOptions } from './excelBuilder.js';
import { getName } from './project.js';
// import ExcelJS from 'exceljs';

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

  // public async generateExcel(
  //   describeMap: Map<string, DescribeSObjectResult>,
  //   metadataMap: Map<string, CustomObject>
  // ): Promise<boolean> {
  //   const workbook = new ExcelJS.Workbook();
  //
  //   for (const [key, value] of describeMap) {
  //     const worksheet = workbook.addWorksheet(key);
  //     worksheet.mergeCells(1, 1, 1, 5);
  //     worksheet.getCell('A1').value = 'SALESFORCE';
  //
  //     worksheet.getCell('A1').style = {
  //       font: {
  //         size: 12,
  //       },
  //       alignment: {
  //         wrapText: true,
  //         vertical: 'middle',
  //       },
  //       border: {
  //         left: {
  //           style: 'thin',
  //           color: { argb: 'b8b6b8' },
  //         },
  //         right: {
  //           style: 'thin',
  //           color: { argb: 'b8b6b8' },
  //         },
  //         top: {
  //           style: 'thin',
  //           color: { argb: 'b8b6b8' },
  //         },
  //         bottom: {
  //           style: 'thin',
  //           color: { argb: 'b8b6b8' },
  //         },
  //       },
  //     };
  //
  //     value.fields.sort((a, b) => {
  //       if (!a.name) {
  //         return -1;
  //       }
  //       if (!b.name) {
  //         return 1;
  //       }
  //
  //       if (a.name < b.name) {
  //         return -1;
  //       } else if (a.name > b.name) {
  //         return 1;
  //       }
  //       return 0;
  //     });
  //     metadataMap.get(key)?.fields.sort((a, b) => {
  //       if (!a.fullName) {
  //         return -1;
  //       }
  //       if (!b.fullName) {
  //         return 1;
  //       }
  //
  //       if (a.fullName < b.fullName) {
  //         return -1;
  //       } else if (a.fullName > b.fullName) {
  //         return 1;
  //       }
  //       return 0;
  //     });
  //   }
  //
  //   workbook.addWorksheet('My Sheet', {
  //     headerFooter: { firstHeader: 'Hello Exceljs', firstFooter: 'Hello World' },
  //   });
  //
  //   const filePath = path.join(this.options.dir ?? '.', 'dictionary.xlsx');
  //
  //   // save workbook to disk
  //   await workbook.xlsx.writeFile(filePath);
  //
  //   return true;
  // }

  public async build(): Promise<DictionaryBuilderResult> {
    const objectSet = await this.identifyObjects();
    const projectName = (await getName()) as string;

    // await this.generateExcel(describeMap, metadataMap);

    const excelBuilderOptions: ExcelBuilderOptions = {
      debug: false,
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
      outputTime: true,
      output: this.options.dir ? this.options.dir : '.',
      projectName,
      generateCharts: true,
      lucidchart: true,
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
