import * as fs from 'node:fs';
import { TestContext } from '@salesforce/core/testSetup';
import { expect } from 'chai';
import { stubMethod } from '@salesforce/ts-sinon';
import { Org } from '@salesforce/core';
import { stubSfCommandUx } from '@salesforce/sf-plugins-core';
import { ListMetadataQuery } from '@jsforce/jsforce-node/lib/api/metadata/schema.js';
import DataDictionaryGenerate from '../../../src/commands/data-dictionary/generate.js';
import { DescribeSobjectResult } from '../../testdata/DescribeSobjectResult.js';
import { CustomObjectFileProperties } from '../../testdata/CustomObjectFileProperties.js';
import { CustomFieldFileProperties } from '../../testdata/CustomFieldFileProperties.js';
import { customObjectMetadata } from '../../testdata/CustomObjectMetadata.js';

describe('data-dictionary generate', () => {
  const $$ = new TestContext();
  let sfCommandStubs: ReturnType<typeof stubSfCommandUx>;
  let getOrgStub: sinon.SinonStub;

  beforeEach(() => {
    sfCommandStubs = stubSfCommandUx($$.SANDBOX);

    getOrgStub = stubMethod($$.SANDBOX, Org, 'create').resolves({
      getConnection: () => ({
        metadata: {
          list: async (queries: ListMetadataQuery) => {
            if (queries.type === 'CustomObject') {
              return CustomObjectFileProperties;
            } else {
              return CustomFieldFileProperties;
            }
          },
          read: async (type: string, fullNames: string) => {
            if (type === 'CustomObject' && fullNames !== undefined) {
              return customObjectMetadata;
            }
            return {};
          },
        },
        describe: async (sobject: string) => {
          if (sobject) {
            return DescribeSobjectResult;
          }
          return {};
        },
        // Mock any other methods or properties you need
        getAuthInfoFields: () => ({}),
        getUsername: () => '',
      }),
    });
  });

  afterEach(() => {
    $$.restore();
  });

  after(() => {
    const files = fs.readdirSync('.');
    for (const file of files) {
      if (file.startsWith('DataDictionary-')) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        fs.rm(file, { recursive: true, force: true }, (err) => {});
      }
    }
  });

  it('runs dictionary generation', async () => {
    const result = await DataDictionaryGenerate.run(['--api-version', '61.0', '--output-time']);
    const output = sfCommandStubs.log
      .getCalls()
      .flatMap((c) => c.args)
      .join('\n');
    // expect(getSourceApiVersionStub.calledOnce).to.equal(true);
    expect(getOrgStub.called).to.equal(true);
    // expect(result.objects).not.equal(undefined);
    expect(result.objects?.size).to.equal(3);
    expect(output).to.include('success: true');
  });

  it('runs dictionary generation with specifying objects', async () => {
    const result = await DataDictionaryGenerate.run([
      '--api-version',
      '61.0',
      '-s',
      'Account,Enrolment__c',
      '--output-time',
    ]);
    const output = sfCommandStubs.log
      .getCalls()
      .flatMap((c) => c.args)
      .join('\n');
    expect(getOrgStub.called).to.equal(true);
    expect(result.objects?.size).to.equal(2);
    expect(output).to.include('success: true');
  });

  it('runs dictionary generation with no standard object relationship crawling', async () => {
    const result = await DataDictionaryGenerate.run([
      '--api-version',
      '61.0',
      '--start-object',
      'Enrolment__c',
      '--output-time',
    ]);
    const output = sfCommandStubs.log
      .getCalls()
      .flatMap((c) => c.args)
      .join('\n');
    expect(getOrgStub.called).to.equal(true);
    expect(result.objects?.size).to.equal(1);
    expect(output).to.include('success: true');
  });

  it('runs dictionary generation with standard object relationship crawling', async () => {
    const result = await DataDictionaryGenerate.run([
      '--api-version',
      '61.0',
      '--start-object',
      'Enrolment__c',
      '--include-std-objects',
      'Account',
      '--output-time',
    ]);
    const output = sfCommandStubs.log
      .getCalls()
      .flatMap((c) => c.args)
      .join('\n');
    expect(getOrgStub.called).to.equal(true);
    // expect(result.objects).not.equal(undefined);
    expect(result.objects?.size).to.equal(1);
    expect(output).to.include('success: true');
  });
});
