import { Connection } from '@salesforce/core';

export type DictionaryBuilderOptions = {
  includeManaged: boolean;
  conn: Connection;
  excludeManagedPrefixes?: string;
  includeManagedPrefixes?: string;
  sobjects?: string;
};

export type DictionaryBuilderResult = {
  success: boolean;
  objects?: Set<string>;
};

export class DictionaryBuilder {
  private options: DictionaryBuilderOptions;

  public constructor(options: DictionaryBuilderOptions) {
    this.options = options;
  }

  public async identifyObjects(): Promise<Set<string>> {
    const customObjects = new Set<string>();
    const standardObjects = new Set<string>();

    const excludePrefixes = this.options.excludeManagedPrefixes?.split(',');
    const includePrefixes = this.options.includeManagedPrefixes?.split(',');

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

    const fieldList = await this.options.conn.metadata.list([{ type: 'CustomField' }]);
    fieldList
      .filter(
        (field) =>
          field.fullName.includes('__c') &&
          !field.fileName.includes('__c') &&
          !field.fileName.includes('__hd') &&
          !field.fileName.includes('__mdt') &&
          !field.namespacePrefix
      )
      .forEach((field) => {
        const objectName = field.fileName.split('/')[1].split('.')[0];
        if (objectName === 'Activity') {
          standardObjects.add('Task');
          standardObjects.add('Event');
        } else {
          standardObjects.add(objectName);
        }
      });

    // how to add standardObjectList and customObjectList
    return new Set([...standardObjects, ...customObjects]);
  }

  public async build(): Promise<DictionaryBuilderResult> {
    const objects = await this.identifyObjects();
    // for (const object of objects) {
    //   object.toLowerCase();
    // }

    return {
      success: true,
      objects,
    };
  }
}
