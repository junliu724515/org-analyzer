import { Connection } from '@salesforce/core';
import { CustomField } from '@jsforce/jsforce-node/lib/api/metadata/schema.js';
import { DescribeSObjectResult } from '@jsforce/jsforce-node/lib/types/common.js';
import { Optional } from '@jsforce/jsforce-node/lib/types/util.js';

/**
 * Retrieves a set of standard objects that have at least one custom field from the Salesforce metadata .
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

export function capitalize(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

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
