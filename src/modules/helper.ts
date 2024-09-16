import { Connection } from '@salesforce/core';
import { CustomField, FileProperties } from '@jsforce/jsforce-node/lib/api/metadata/schema.js';
import { DescribeSObjectResult, Field } from '@jsforce/jsforce-node/lib/types/common.js';
import { Optional } from '@jsforce/jsforce-node/lib/types/util.js';

export type ExtendedField = {
  // Add new properties or methods here
  description?: string | null | undefined;
  securityClassification?: string | null | undefined;
} & Field;

/**
 * Retrieves a set of standard objects that have at least one custom field from the Salesforce metadata.
 *
 * @param {Connection} conn - The Salesforce connection object.
 * @returns {Promise<Set<string>>} - A promise that resolves to a set of standard object names.
 */
export async function getStandardObjects(conn: Connection): Promise<Set<string>> {
  const standardObjects = new Set<string>();

  // Retrieve the list of custom fields from the Salesforce metadata
  const fieldList = await conn.metadata.list([{ type: 'CustomField' }]);

  // Filter and process the fields to extract standard object names
  fieldList
    .filter(
      (field) =>
        field.fullName.includes('__c') && // Include only custom fields
        !field.fileName.includes('__c') && // Exclude custom objects
        !field.fileName.includes('__hd') && // Exclude history objects
        !field.fileName.includes('__mdt') && // Exclude metadata objects
        !field.fileName.includes('__x') && // Exclude external objects
        !field.fileName.includes('__b') && // Exclude big objects
        !field.fileName.includes('__e') && // Exclude event objects
        !field.namespacePrefix // Exclude namespaced fields
    )
    .forEach((field) => {
      // Extract the object name from the file path (e.g., "objects/Contact.object")
      const objectName = field.fileName.split('/')[1].split('.')[0];

      // Special handling for Activity object, which maps to Task and Event
      if (objectName === 'Activity') {
        standardObjects.add('Task');
        standardObjects.add('Event');
      } else {
        standardObjects.add(objectName);
      }
    });

  return standardObjects;
}

/**
 * Retrieves a set of managed objects from the Salesforce metadata.
 *
 * @param {Connection} conn - The Salesforce connection object.
 * @returns {Promise<Set<string>>} - A promise that resolves to a set of managed object names.
 */
export async function getManagedObjects(conn: Connection): Promise<Set<string>> {
  const managedObjects = new Set<string>();

  // Retrieve the list of custom objects from the Salesforce metadata
  const objectList: FileProperties[] = await conn.metadata.list([{ type: 'CustomObject' }]);

  // Filter and process the objects to extract managed object names
  objectList
    .filter((object) => object.namespacePrefix) // Include only managed objects
    .forEach((object) => managedObjects.add(object.fullName)); // Add the full name of each managed object to the set

  return managedObjects;
}

/**
 * Capitalizes the first letter of a string.
 *
 * @param {string} string - The string to capitalize.
 * @returns {string} - The capitalized string.
 */
export function capitalize(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Maps an array of custom fields to a Map with the field full name as the key.
 *
 * @param {CustomField[]} fields - The array of custom fields.
 * @returns {Map<string, CustomField>} - A map of custom fields.
 */
export function mapFields(fields: CustomField[]): Map<string, CustomField> {
  const fieldMap = new Map<string, CustomField>();
  // use for of loop
  for (const field of fields) {
    if (field.fullName) {
      fieldMap.set(field.fullName, field);
    }
  }
  return fieldMap;
}

/**
 * Generates an HTML page listing SObject ERD links.
 *
 * @param {string[]} sObjects - The array of SObject names.
 * @returns {string} - The generated HTML string.
 */
export function generateSObjectListPage(sObjects: string[]): string {
  const links = sObjects
    .sort()
    .map((sObject) => `<li><a href="ERDCharts/${sObject}.html">${sObject} ERD</a></li>`)
    .join('\n');

  return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>SObject ERD List</title>
            </head>
            <body>
              <h1>SObject ERD Pages</h1>
              <ul>
                ${links}
              </ul>
            </body>
            </html>
              `;
}

/**
 * Generates an HTML page containing a Mermaid chart for a given SObject.
 *
 * @param {string} sobjectName - The name of the SObject.
 * @param {string} mermaidContent - The Mermaid chart content.
 * @returns {string} - The generated HTML string.
 */
export function generateMermaidChartHtml(sobjectName: string, mermaidContent: string): string {
  return `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Program ERD</title>
            <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
            <style>
                .mermaid {
                    /*font-family: "Arial", sans-serif;*/
                    height: 100%;
                    width: 200%;
                }
            </style>
          </head>
          <body>
          <h3>${sobjectName} ERD</h3>
          <div class="mermaid">
            ${mermaidContent}
          </div>

          <!-- add a link to back to object list -->
          <a href="../ERDObjectList.html">Back to SObject List</a>

          <script>
            mermaid.initialize({ startOnLoad: true });
          </script>
          </body>
          </html>
  `;
}

/**
 * Generates a Mermaid chart for a given SObject and its relationships.
 *
 * @param {string} objectName - The name of the SObject.
 * @param {Set<string>} standardObjects - A set of standard object names.
 * @param {DescribeSObjectResult} describeSObjectResult - The result of the SObject describe call.
 * @returns {string} - The generated Mermaid chart string.
 */
export function generateMermaidChart(
  objectName: string,
  standardObjects: Set<string>,
  describeSObjectResult: DescribeSObjectResult
): string {
  let chart = 'erDiagram\n';
  const refObjects: string[] = [];
  let ref = '';
  for (const field of describeSObjectResult.fields) {
    // Type property
    const type = capitalize(field.type);
    let add = false;
    let relationObject: Optional<string[]>;

    if (type === 'Reference' && field.referenceTo != null) {
      add = true;
      relationObject = field.referenceTo;
    }
    if (type === 'MasterDetail') {
      add = true;
      relationObject = field.referenceTo;
    }
    if (add) {
      if (type === 'Reference') {
        ref = ' o|--o{ ';
      } else {
        ref = ' ||--o{ ';
      }
      if (relationObject) {
        for (const refObj of relationObject) {
          if (!refObjects.includes(refObj) && (field.name.includes('__c') || refObj === objectName)) {
            refObjects.push(refObj);
            chart += refObj + ref + objectName + ' : belongs' + '\n';
          }
        }
      }
    }
  }

  for (const childRelationship of describeSObjectResult.childRelationships) {
    if (
      childRelationship.childSObject.includes('__c') ||
      (describeSObjectResult.custom && standardObjects.has(childRelationship.childSObject))
    ) {
      if (!refObjects.includes(childRelationship.childSObject)) {
        if (!childRelationship.cascadeDelete) {
          ref = ' o|--o{ ';
        } else {
          ref = ' ||--o{ ';
        }
        refObjects.push(childRelationship.childSObject);
        chart += objectName + ref + childRelationship.childSObject + ' : has' + '\n';
      }
    }
  }
  chart += objectName + '{}';
  return chart;
}

/**
 * Generates a Lucidchart representation for a given SObject and its fields.
 *
 * @param {string} objectName - The name of the SObject.
 * @param {ExtendedField[]} fields - The array of extended fields.
 * @returns {string} - The generated Lucidchart string.
 */
export function generateLucidChart(objectName: string, fields: ExtendedField[]): string {
  let chart = '<html>' + '\n' + '<div>';
  let cpt = 0;
  for (const field of fields) {
    // Type property
    const type = capitalize(field.type);
    let add = false;
    // const attribute = null;
    const fieldLength = field.length ?? '';
    let relationObject: Optional<string[]>;
    let attributeKey = '';
    let attributeType = '';

    if (type === 'Reference' && field.referenceTo != null) {
      add = true;
      attributeKey = 'FOREIGN KEY';
      attributeType = 'LOOKUP';
      relationObject = field.referenceTo;
    }
    if (type === 'MasterDetail') {
      add = true;
      attributeKey = 'FOREIGN KEY';
      attributeType = 'MASTER DETAIL';
      relationObject = field.referenceTo;
    }
    if (type === 'Id') {
      add = true;
      attributeKey = 'PRIMARY KEY';
      attributeType = 'ID';
    }

    if (add) {
      const fieldLabel = field.label ?? field.name;
      const fieldName = field.name;

      if (type === 'Id') {
        chart +=
          'postgresql;ELSA;Salesforce;&quot;' +
          objectName +
          ' (' +
          objectName +
          ')&quot;;&quot;' +
          objectName +
          ' ID (' +
          fieldName +
          ')&quot;;' +
          cpt +
          ';&quot;' +
          attributeType +
          '&quot;;' +
          fieldLength +
          ';&quot;' +
          attributeKey +
          '&quot;;;' +
          '\n';
      } else {
        chart +=
          'postgresql;ELSA;Salesforce;&quot;' +
          objectName +
          ' (' +
          objectName +
          ')&quot;;&quot;' +
          fieldLabel +
          ' (' +
          fieldName +
          ')&quot;;' +
          cpt +
          ';&quot;' +
          attributeType +
          '&quot;;' +
          fieldLength +
          ';&quot;' +
          attributeKey +
          '&quot;;&quot;Salesforce&quot;;&quot;' +
          relationObject?.join(',') +
          ' (' +
          relationObject?.join(',') +
          ')&quot;;&quot;' +
          relationObject?.join(',') +
          ' ID (Id)&quot;' +
          '\n';
      }

      cpt++;
    }
  }
  chart += '</div>' + '\n' + '</html>';
  return chart;
}

/**
 * Processes an array of items in batches, applying an asynchronous function to each item.
 *
 * @template T - The type of the items being processed.
 * @param {string[]} items - The array of items to be processed.
 * @param {number} batchSize - The number of items to process in each batch.
 * @param {(item: string) => Promise<T>} processFn - The asynchronous function to apply to each item.
 * @returns {Promise<T[]>} - A promise that resolves to an array of results from the processed items.
 */
export async function batchProcess<T>(
  items: string[],
  batchSize: number,
  processFn: (item: string) => Promise<T>
): Promise<T[]> {
  /**
   * Processes a single batch of items.
   *
   * @param {string[]} batch - The batch of items to be processed.
   * @returns {Promise<T[]>} - A promise that resolves to an array of results from the processed batch.
   */
  const processBatch = (batch: string[]): Promise<T[]> => Promise.all(batch.map(processFn));

  // Split the items into batches
  const batches = Array.from({ length: Math.ceil(items.length / batchSize) }, (_, i) =>
    items.slice(i * batchSize, (i + 1) * batchSize)
  );

  // Process each batch sequentially and accumulate the results
  return batches.reduce(
    (acc: Promise<T[]>, batch: string[]) =>
      acc.then(async (results) => {
        const batchResults = await processBatch(batch);
        return [...results, ...batchResults];
      }),
    Promise.resolve([] as T[])
  );
}
