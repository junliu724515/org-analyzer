import { Connection } from '@salesforce/core';

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
