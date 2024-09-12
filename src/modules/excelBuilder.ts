import * as fs from 'node:fs';
import path from 'node:path';
import { Connection } from '@salesforce/core';
import { Workbook, Worksheet } from 'excel4node';
import { ValidationRule, CustomField, CustomObject } from '@jsforce/jsforce-node/lib/api/metadata/schema.js';
import { DescribeSObjectResult, Field } from '@jsforce/jsforce-node/lib/types/common.js';
import {
  capitalize,
  mapFields,
  generateMermaidChartHtml,
  generateMermaidChart,
  generateSObjectListPage,
  getStandardObjects,
} from './helper.js';

// import { Config } from './utils.js';
// import Utils from './utils.js';

type ExtendedField = {
  // Add new properties or methods here
  description?: string | null | undefined;
  securityClassification?: string | null | undefined;
} & Field;

export type ExcelBuilderOptions = {
  conn: Connection;
  objects: string[];
  columns: Record<string, number>;
  hideTechFields: boolean;
  techFieldPrefix: string;
  outputTime: boolean;
  output: string;
  projectName: string;
  generateCharts: boolean;
  lucidchart: boolean;
  mermaidChart: boolean;
};

export type ExcelBuilderResult = {
  success: boolean;
  error?: Error | string;
};

// const root = path.dirname(fileURLToPath(import.meta.url));
// const FILE_DIR = '../files';
const MAX_PICKLIST_VALUES = 300;

// Styles
const wb: Workbook = new Workbook();

const global = wb.createStyle({
  font: {
    size: 12,
  },
  alignment: {
    wrapText: true,
    vertical: 'center',
  },
  border: {
    left: {
      style: 'thin',
      color: 'b8b6b8',
    },
    right: {
      style: 'thin',
      color: 'b8b6b8',
    },
    top: {
      style: 'thin',
      color: 'b8b6b8',
    },
    bottom: {
      style: 'thin',
      color: 'b8b6b8',
    },
  },
});

const header = wb.createStyle({
  font: {
    bold: true,
    color: 'FFFFFF',
  },
  alignment: {
    horizontal: 'center',
  },
  fill: {
    type: 'pattern',
    patternType: 'solid',
    fgColor: '019cdd',
  },
});

const subHeader = wb.createStyle({
  font: {
    bold: true,
  },
  fill: {
    type: 'pattern',
    patternType: 'solid',
    fgColor: 'F5F4F2', // HTML style hex value. optional. defaults to black
  },
});

const category = wb.createStyle({
  font: {
    // bold: true,
    color: '60809f',
  },
  fill: {
    type: 'pattern',
    patternType: 'solid',
    fgColor: 'dbeaf7',
  },
});

const validationCategory = wb.createStyle({
  font: {
    // bold: true,
    color: '703026',
  },
  fill: {
    type: 'pattern',
    patternType: 'solid',
    fgColor: 'ffa293',
  },
});

const indentLeft = wb.createStyle({
  alignment: {
    indent: 1,
  },
});

const centerAlign = wb.createStyle({
  alignment: {
    horizontal: 'center',
  },
});

const bold = wb.createStyle({
  font: {
    bold: true,
  },
});

const italic = wb.createStyle({
  font: {
    italics: true,
  },
});

const redColor = wb.createStyle({
  font: {
    color: 'FF0000',
  },
});

const rowColor = wb.createStyle({
  fill: {
    type: 'pattern',
    patternType: 'solid',
    fgColor: 'ffffff',
  },
});

const alternateRowColor = wb.createStyle({
  fill: {
    type: 'pattern',
    patternType: 'solid',
    fgColor: 'f2f1f3',
  },
});

//
// const ws = wb.addWorksheet('Sheet 1');
// // var startGeneration;

export default class ExcelBuilder {
  private opts: ExcelBuilderOptions;

  public constructor(opts: ExcelBuilderOptions) {
    this.opts = opts;
  }

  public createHeader(worksheet: Worksheet): number {
    const columns = this.opts.columns;
    const columnsKeys = Object.keys(this.opts.columns);

    // Global sizes
    worksheet.row(1).setHeight(40);
    worksheet.row(2).setHeight(20);

    if (columnsKeys.includes('Unique')) {
      worksheet.column(columnsKeys.indexOf('Unique') + 1).setWidth(columns.Unique);
    }
    if (columnsKeys.includes('Mandatory')) {
      worksheet.column(columnsKeys.indexOf('Mandatory') + 1).setWidth(columns.Mandatory);
    }
    if (columnsKeys.includes('Name')) {
      worksheet.column(columnsKeys.indexOf('Name') + 1).setWidth(columns.Name);
    }
    if (columnsKeys.includes('Description')) {
      worksheet.column(columnsKeys.indexOf('Description') + 1).setWidth(columns.Description);
    }
    if (columnsKeys.includes('Helptext')) {
      worksheet.column(columnsKeys.indexOf('Helptext') + 1).setWidth(columns.Helptext);
    }
    if (columnsKeys.includes('APIName')) {
      worksheet.column(columnsKeys.indexOf('APIName') + 1).setWidth(columns.APIName);
    }
    if (columnsKeys.includes('Visibility')) {
      worksheet.column(columnsKeys.indexOf('Visibility') + 1).setWidth(columns.Visibility);
    }
    if (columnsKeys.includes('Type')) {
      worksheet.column(columnsKeys.indexOf('Type') + 1).setWidth(columns.Type);
    }
    if (columnsKeys.includes('Values')) {
      worksheet.column(columnsKeys.indexOf('Values') + 1).setWidth(columns.Values);
    }
    // Build header and subheader
    worksheet.cell(1, 1, 1, columnsKeys.length, true).string('SALESFORCE').style(global).style(header);

    if (columnsKeys.includes('Unique')) {
      worksheet
        .cell(2, columnsKeys.indexOf('Unique') + 1)
        .string('Unique')
        .style(global)
        .style(subHeader)
        .style(centerAlign);
    }
    if (columnsKeys.includes('Mandatory')) {
      worksheet
        .cell(2, columnsKeys.indexOf('Mandatory') + 1)
        .string('M')
        .style(global)
        .style(subHeader)
        .style(centerAlign);
    }
    if (columnsKeys.includes('Name')) {
      worksheet
        .cell(2, columnsKeys.indexOf('Name') + 1)
        .string('Field Name')
        .style(global)
        .style(subHeader)
        .style(indentLeft);
    }
    if (columnsKeys.includes('Description')) {
      worksheet
        .cell(2, columnsKeys.indexOf('Description') + 1)
        .string('Description')
        .style(global)
        .style(subHeader)
        .style(indentLeft);
    }
    if (columnsKeys.includes('Helptext')) {
      worksheet
        .cell(2, columnsKeys.indexOf('Helptext') + 1)
        .string('Helptext')
        .style(global)
        .style(subHeader)
        .style(indentLeft);
    }
    if (columnsKeys.includes('APIName')) {
      worksheet
        .cell(2, columnsKeys.indexOf('APIName') + 1)
        .string('API Name')
        .style(global)
        .style(subHeader)
        .style(indentLeft);
    }
    if (columnsKeys.includes('Visibility')) {
      worksheet
        .cell(2, columnsKeys.indexOf('Visibility') + 1)
        .string('Security Classification')
        .style(global)
        .style(subHeader)
        .style(indentLeft);
    }
    if (columnsKeys.includes('Type')) {
      worksheet
        .cell(2, columnsKeys.indexOf('Type') + 1)
        .string('Type')
        .style(global)
        .style(subHeader)
        .style(centerAlign);
    }
    if (columnsKeys.includes('Values')) {
      worksheet
        .cell(2, columnsKeys.indexOf('Values') + 1)
        .string('Values / Formula')
        .style(global)
        .style(subHeader)
        .style(indentLeft);
    }
    return 3;
  }

  // eslint-disable-next-line class-methods-use-this
  // public mapFields(fields: CustomField[]): Map<string, CustomField> {
  //   const fieldMap = new Map<string, CustomField>();
  //   // use for of loop
  //   for (const field of fields) {
  //     if (field.fullName) {
  //       fieldMap.set(field.fullName, field);
  //     }
  //   }
  //   return fieldMap;
  // }

  // eslint-disable-next-line complexity
  public writeFields(
    worksheet: Worksheet,
    fields: ExtendedField[],
    line: number,
    validationRules: ValidationRule[] | ValidationRule
  ): void {
    const columns = this.opts.columns;
    const columnsKeys = Object.keys(columns);

    let indexRow = 1;
    let rowStyle = rowColor;

    // Foreach field
    for (let j = 0; j < fields.length; j++) {
      const field = fields[j];

      if (!(this.opts.hideTechFields && field.name.startsWith(this.opts.techFieldPrefix))) {
        const isCustom = field.custom;

        if (!isCustom && j === 0) {
          worksheet
            .cell(line, 1, line, columnsKeys.length, true)
            .string('Standard Fields')
            .style(global)
            .style(category)
            .style(indentLeft);
          // Row height
          worksheet.row(line).setHeight(25);
          line++;
          indexRow = 1;
        }
        rowStyle = rowColor;
        if (indexRow % 2 === 0) {
          rowStyle = alternateRowColor;
        }
        if (columnsKeys.includes('Unique')) {
          worksheet
            .cell(line, columnsKeys.indexOf('Unique') + 1)
            .string(field.unique.toString())
            .style(global)
            .style(centerAlign)
            .style(rowStyle);
        }
        if (columnsKeys.includes('Mandatory')) {
          worksheet
            .cell(line, columnsKeys.indexOf('Mandatory') + 1)
            .string(!field.nillable && field.updateable && field.type !== 'boolean' ? '*' : '')
            .style(global)
            .style(centerAlign)
            .style(rowStyle)
            .style(redColor);
        }
        if (columnsKeys.includes('Name')) {
          worksheet
            .cell(line, columnsKeys.indexOf('Name') + 1)
            .string(field.label ?? field.name)
            .style(global)
            .style(bold)
            .style(rowStyle)
            .style(indentLeft);
        }
        if (columnsKeys.includes('Description')) {
          worksheet
            .cell(line, columnsKeys.indexOf('Description') + 1)
            .string(field.description ?? '')
            .style(global)
            .style(rowStyle)
            .style(indentLeft);
        }
        if (columnsKeys.includes('Helptext')) {
          worksheet
            .cell(line, columnsKeys.indexOf('Helptext') + 1)
            .string(field.inlineHelpText ?? '')
            .style(global)
            .style(rowStyle)
            .style(indentLeft);
        }
        if (columnsKeys.includes('APIName')) {
          worksheet
            .cell(line, columnsKeys.indexOf('APIName') + 1)
            .string(field.name)
            .style(global)
            .style(rowStyle)
            .style(indentLeft);
        }
        if (columnsKeys.includes('Visibility')) {
          worksheet
            .cell(line, columnsKeys.indexOf('Visibility') + 1)
            .string(field.securityClassification ?? '')
            .style(global)
            .style(rowStyle)
            .style(indentLeft);
        }

        // tooling
        // worksheet.cell(line, columnsKeys.indexOf('APIName') + 4).string(field.LastModifiedDate != null ? field.LastModifiedDate : '').style(global).style(rowStyle).style(indentLeft);

        // Type property
        let type = capitalize(field.type);

        if (type === 'Int' || type === 'Double') {
          type = 'Number';
        }
        if (type === 'Number' || type === 'Currency') {
          const precision = parseInt(String(field.precision), 10);
          const scale = parseInt(String(field.scale), 10);
          const finalPrecision = precision - scale;

          type = type + '(' + finalPrecision + ',' + field.scale + ')';
        }

        if (type === 'Boolean') {
          type = 'Checkbox';
        }

        if (type === 'Reference' && field.referenceTo != null) {
          type = `Lookup(${field.referenceTo.join(', ')})`;
        }
        if (type === 'MasterDetail' && field.referenceTo != null) {
          type = `Master-Detail(${field.referenceTo.join(', ')})`;
        }
        if ((type === 'Text' || type === 'Textarea' || type === 'String') && field.length != null) {
          type = 'Text(' + field.length + ')';
        }

        if (field.calculatedFormula != null) {
          type = 'Formula(' + field.type + ')';
        }

        if (!field.nillable) {
          type += ' (Unique)';
        }
        if (field.externalId) {
          type += '(External ID)';
        }

        if (columnsKeys.includes('Type'))
          worksheet
            .cell(line, columnsKeys.indexOf('Type') + 1)
            .string(type)
            .style(centerAlign)
            .style(global)
            .style(italic)
            .style(rowStyle)
            .style(indentLeft);

        // Values property
        let value = '';

        if (type === 'Picklist' || type === 'MultiselectPicklist') {
          // if (field.globalPicklist != null) {
          //   value = 'globalPicklist(' + field.globalPicklist + ')';
          // } else {
          if (field.picklistValues != null) {
            const valuesArray = field.picklistValues;
            let k = 0;
            while (k < valuesArray.length && k < MAX_PICKLIST_VALUES) {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              value += valuesArray[k].value + '\n';
              k++;
            }
            if (valuesArray.length > MAX_PICKLIST_VALUES * 2) {
              value += '...\n';
            }
            if (valuesArray.length - MAX_PICKLIST_VALUES >= MAX_PICKLIST_VALUES) {
              k = valuesArray.length - 1;
              while (k >= valuesArray.length - MAX_PICKLIST_VALUES) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                value += valuesArray[k].value + '\n';
                k--;
              }
            }
            if (valuesArray.length > MAX_PICKLIST_VALUES * 2) {
              value += '(Total: ' + valuesArray.length + ' values)';
            }
          }
          // }
        }

        if (field.calculatedFormula != null) {
          value = field.calculatedFormula;
        }

        if (columnsKeys.includes('Values')) {
          worksheet
            .cell(line, columnsKeys.indexOf('Values') + 1)
            .string(value)
            .style(global)
            .style(rowStyle)
            .style(indentLeft);
        }

        if ((field.label.length >= 24 || field.name.length >= 24) && !value.includes('\n')) {
          worksheet.row(line).setHeight(25);
        }
        line++;
        indexRow++;

        if (!isCustom && j + 1 < fields.length && fields[j + 1].custom) {
          worksheet
            .cell(line, 1, line, columnsKeys.length, true)
            .string('Custom Fields')
            .style(global)
            .style(category)
            .style(indentLeft);
          // Row height
          worksheet.row(line).setHeight(25);
          line++;
          indexRow = 1;
        }
      }
    }

    if (validationRules !== undefined) {
      rowStyle = rowColor;
      if (indexRow % 2 === 0) {
        rowStyle = alternateRowColor;
      }

      worksheet
        .cell(line, 1, line, columnsKeys.length, true)
        .string('Validation Rules')
        .style(global)
        .style(validationCategory)
        .style(indentLeft);
      // Row height
      worksheet.row(line).setHeight(25);
      line++;

      worksheet
        .cell(line, 1, line, 2, true)
        .string('Active')
        .style(global)
        .style(rowStyle)
        .style(subHeader)
        .style(centerAlign);
      worksheet.cell(line, 3).string('Name').style(global).style(rowStyle).style(subHeader).style(indentLeft);
      worksheet.cell(line, 4).string('Description').style(global).style(rowStyle).style(subHeader).style(indentLeft);
      worksheet
        .cell(line, 5)
        .string('Error display field')
        .style(global)
        .style(rowStyle)
        .style(subHeader)
        .style(centerAlign);
      worksheet.cell(line, 6).string('Error message').style(global).style(rowStyle).style(subHeader).style(indentLeft);
      if (columnsKeys.includes('Helptext')) {
        worksheet
          .cell(line, 7, line, 8, true)
          .string('Condition formula')
          .style(global)
          .style(rowStyle)
          .style(subHeader)
          .style(indentLeft);
      } else {
        worksheet
          .cell(line, 7)
          .string('Condition formula')
          .style(global)
          .style(rowStyle)
          .style(subHeader)
          .style(indentLeft);
      }
      worksheet.row(line).setHeight(20);

      line++;
      indexRow = 1;

      if (Array.isArray(validationRules)) {
        for (const validation of validationRules) {
          rowStyle = rowColor;
          if (indexRow % 2 === 0) {
            rowStyle = alternateRowColor;
          }

          worksheet
            .cell(line, 1, line, 2, true)
            .string(validation.active ? '✓' : '☐')
            .style(global)
            .style(rowStyle)
            .style(centerAlign);
          worksheet
            .cell(line, 3)
            .string(validation.fullName ?? '')
            .style(global)
            .style(rowStyle)
            .style(indentLeft);
          worksheet
            .cell(line, 4)
            .string(validation.description ?? '')
            .style(global)
            .style(rowStyle)
            .style(indentLeft);
          worksheet
            .cell(line, 5)
            .string(validation.errorDisplayField ?? '')
            .style(global)
            .style(rowStyle)
            .style(centerAlign);
          worksheet
            .cell(line, 6)
            .string(validation.errorMessage ?? '')
            .style(global)
            .style(rowStyle)
            .style(indentLeft);
          if (columnsKeys.includes('Helptext')) {
            worksheet
              .cell(line, 7, line, 8, true)
              .string(validation.errorConditionFormula ?? '')
              .style(global)
              .style(rowStyle)
              .style(indentLeft);
          } else {
            worksheet
              .cell(line, 7)
              .string(validation.errorConditionFormula ?? '')
              .style(global)
              .style(rowStyle)
              .style(indentLeft);
          }

          line++;
          indexRow++;
        }
      } else {
        rowStyle = rowColor;
        if (indexRow % 2 === 0) {
          rowStyle = alternateRowColor;
        }
        worksheet
          .cell(line, 1, line, 2, true)
          .string(validationRules.active ? '✓' : '☐')
          .style(global)
          .style(rowStyle)
          .style(centerAlign);
        worksheet
          .cell(line, 3)
          .string(validationRules.fullName ?? '')
          .style(global)
          .style(rowStyle)
          .style(indentLeft);
        worksheet
          .cell(line, 4)
          .string(validationRules.description ?? '')
          .style(global)
          .style(rowStyle)
          .style(indentLeft);
        worksheet
          .cell(line, 5)
          .string(validationRules.errorDisplayField ?? '')
          .style(global)
          .style(rowStyle)
          .style(centerAlign);
        worksheet
          .cell(line, 6)
          .string(validationRules.errorMessage ?? '')
          .style(global)
          .style(rowStyle)
          .style(indentLeft);
        worksheet
          .cell(line, 7)
          .string(validationRules.errorConditionFormula ?? '')
          .style(global)
          .style(rowStyle)
          .style(indentLeft);

        line++;
        indexRow++;
      }
    }
  }

  // eslint-disable-next-line complexity
  public async generate(): Promise<ExcelBuilderResult> {
    try {
      // this.logger('Generating...');
      const sObjects = this.opts.objects;
      const standardObjects = await getStandardObjects(this.opts.conn);
      // let chart: string = '';

      // Generate output Excel file
      const currentDate = new Date(Date.now());
      let currentDateString = currentDate.toISOString();
      if (this.opts.outputTime) {
        currentDateString = currentDateString.replace('T', '_').replace('Z', '').replace(/:/g, '_').replace('.', '_');
      } else {
        currentDateString = currentDateString.substring(0, currentDateString.indexOf('T'));
      }

      const dirpath = path.join(this.opts.output, 'DataDictionary' + '-' + currentDateString);
      if (!fs.existsSync(dirpath)) {
        fs.mkdirSync(dirpath, { recursive: true });
      } else {
        // remove the files and directories in the folder
        fs.rm(dirpath, { recursive: true, force: true }, (err) => ({
          success: false,
          error: err as Error,
        }));
      }

      const describePromises = [];
      const metadataPromises = [];
      for (const object of sObjects) {
        describePromises.push(this.opts.conn.describe(object));
        metadataPromises.push(this.opts.conn.metadata.read('CustomObject', object));
      }
      const describeSObjectResults = await Promise.all(describePromises);
      const metadataResults = await Promise.all(metadataPromises);

      // Create maps for storing results
      const describeMap = new Map<string, DescribeSObjectResult>(); // Map with `name` as key
      const metadataMap = new Map<string, CustomObject>(); // Map with `fullName` as key

      for (const describeSObjectResult of describeSObjectResults) {
        describeMap.set(describeSObjectResult.name, describeSObjectResult);
      }

      for (const metadataResult of metadataResults) {
        if (metadataResult.fullName) {
          metadataMap.set(metadataResult.fullName, metadataResult);
        }
      }

      for (const object of sObjects) {
        // for (let i = 0; i < sObjects.length; i++) {
        // const cur = i + 1;

        const worksheet = wb.addWorksheet(object);
        const line = this.createHeader(worksheet);
        // const describePath = path.join(root, FILE_DIR, '/describe/' + sObjects[i] + '.json');
        // const metadataPath = path.join(root, FILE_DIR, '/metadata/' + sObjects[i] + '.json');
        let fieldsMap = new Map<string, CustomField>();

        if (describeMap.get(object) !== undefined) {
          const currentObjectFieldsDescribe = describeMap.get(object)?.fields as ExtendedField[];
          let currentObjectFieldsMetadata;
          if (metadataMap.get(object) !== undefined) {
            currentObjectFieldsMetadata = metadataMap.get(object);
            if (currentObjectFieldsMetadata?.fields != null) {
              fieldsMap = mapFields(currentObjectFieldsMetadata.fields);
            }
          }

          for (const field of currentObjectFieldsDescribe) {
            const fieldName = field.name;

            if (fieldsMap.get(fieldName) != null) {
              const correspondingField = fieldsMap.get(fieldName);
              if (correspondingField?.description != null) {
                field.description = correspondingField.description;
              }
              if (correspondingField?.type === 'MasterDetail') {
                field.type = correspondingField.type;
              }
              if (correspondingField?.securityClassification != null) {
                field.securityClassification = correspondingField.securityClassification;
              }

              if (correspondingField?.unique != null) {
                field.unique = correspondingField.unique;
              }
            }
          }
          // currentObjectFieldsDescribe.sort(Utils.sortByTwoProperty('custom', 'name'));
          if (currentObjectFieldsMetadata) {
            this.writeFields(
              worksheet,
              currentObjectFieldsDescribe,
              line,
              currentObjectFieldsMetadata?.validationRules
            );
          }
          if (this.opts.mermaidChart) {
            const mermaidChart = generateMermaidChart(
              object,
              standardObjects,
              describeMap.get(object) as DescribeSObjectResult
            );
            const chartContent = generateMermaidChartHtml(object, mermaidChart);
            const chartDirpath = path.join(dirpath, 'ERDCharts');
            if (!fs.existsSync(chartDirpath)) {
              fs.mkdirSync(chartDirpath, { recursive: true });
            }
            const filePath = path.join(chartDirpath, object + '.html');
            fs.writeFileSync(filePath, chartContent, 'utf-8');
          }
        }
      }

      if (this.opts.mermaidChart) {
        const chartContent = generateSObjectListPage(sObjects);
        const filePath = path.join(dirpath, 'ERDObjectList.html');
        fs.writeFileSync(filePath, chartContent, 'utf-8');
      }

      // if (this.opts.generateCharts) {
      //   // Generate chart file (Lucidchart)
      //   // this.logger('Saving lucidchart file...');
      //   const chartContent = this.generateMermaidChartHtml(chart);
      //   const filePath = path.join(this.opts.output, 'chart.html');
      //   fs.writeFileSync(filePath, chartContent, 'utf-8');
      //   // this.logger('Lucidchart.txt file successfully saved!');
      // }

      // Generate output Excel file
      const fileName = this.opts.projectName + '-' + currentDateString + '.xlsx';
      const outputFile = path.join(dirpath, fileName);
      wb.write(outputFile);
    } catch (error) {
      return {
        success: false,
        error: error as Error,
      };
    }
    return {
      success: true,
    };
  }
}
