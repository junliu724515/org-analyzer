import { TestContext } from '@salesforce/core/testSetup';
// import sinon from 'sinon';
import { expect } from 'chai';
import { stubMethod } from '@salesforce/ts-sinon';
import { Org } from '@salesforce/core';
import { stubSfCommandUx } from '@salesforce/sf-plugins-core';
import { ListMetadataQuery } from '@jsforce/jsforce-node/lib/api/metadata/schema.js';
import DataDictionaryGenerate from '../../../src/commands/data-dictionary/generate.js';
import { DescribeSobjectResult } from '../../testdata/DescribeSobjectResult.js';
import { CustomObjectFileProperties } from '../../testdata/CustomObjectFileProperties.js';
import { CustomFieldFileProperties } from '../../testdata/CustomFieldFileProperties.js';
// import { DictionaryBuilder } from '../../../src/modules/dictionaryBuilder.js';
// import * as projectModule from '../../../src/modules/project.js';
// import {getSourceApiVersion} from '../../../src/modules/project.js';

describe('data-dictionary generate', () => {
  const $$ = new TestContext();
  let sfCommandStubs: ReturnType<typeof stubSfCommandUx>;
  // let getSourceApiVersionStub: sinon.SinonStub;

  // let sandbox: sinon.SinonSandbox;
  let getOrgStub: sinon.SinonStub;
  // let metadataListStub: sinon.SinonStub;
  // let getConnectionStub: sinon.SinonStub;

  // let mockConnection: sinon.SinonStubbedInstance<Connection>;

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

    // // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
    // metadataListStub = stubMethod($$.SANDBOX, getOrgStub().getConnection().metadata, 'list').resolves([
    //   {
    //     createdById: '0051I000000XXXX',
    //     createdByName: 'John Doe',
    //     createdDate: '2023-10-01T12:00:00Z',
    //     fileName: 'exampleFile.xml',
    //     fullName: 'Example File',
    //     id: '00D1I000000XXXX',
    //     lastModifiedById: '0051I000000YYYY',
    //     lastModifiedByName: 'Jane Smith',
    //     lastModifiedDate: '2023-10-02T12:00:00Z',
    //     manageableState: 'managed',
    //     namespacePrefix: 'example',
    //     type: 'CustomObject',
    //   },
    // ]);

    // // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
    // getConnectionStub = stubMethod($$.SANDBOX, Org.prototype, 'getConnection').returns({
    //   metadata: {
    //     list: async () => [],
    //   },
    //   // Mock any other methods or properties you need
    //   getAuthInfoFields: () => ({}),
    //   getUsername: () => '',
    // });

    // sandbox = sinon.createSandbox();
    //
    // mockConnection = sandbox.createStubInstance(Connection);
    // mockOrg = sandbox.createStubInstance(Org);
    // mockOrg.getConnection.returns(mockConnection);
    //
    // sandbox.stub(Org, 'create').resolves(mockOrg);
    // // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    // // sandbox.stub(getSourceApiVersion).resolves('50.0');
    // sandbox.stub(DictionaryBuilder.prototype, 'build').resolves({ success: true });
  });

  afterEach(() => {
    $$.restore();
  });

  it('runs dictionary generation', async () => {
    const result = await DataDictionaryGenerate.run(['--api-version', '61.0']);
    const output = sfCommandStubs.log
      .getCalls()
      .flatMap((c) => c.args)
      .join('\n');
    // expect(getSourceApiVersionStub.calledOnce).to.equal(true);
    expect(getOrgStub.called).to.equal(true);
    // expect(result.objects).not.equal(undefined);
    expect(result.objects?.size).to.equal(3);
    expect(output).to.include('result: 3');
    // how to do some assertions?
  });

  it('runs dictionary generation with specifying objects', async () => {
    const result = await DataDictionaryGenerate.run(['--api-version', '61.0', '-s', 'Account,Enrolment__c']);
    const output = sfCommandStubs.log
      .getCalls()
      .flatMap((c) => c.args)
      .join('\n');
    // expect(getSourceApiVersionStub.calledOnce).to.equal(true);
    expect(getOrgStub.called).to.equal(true);
    // expect(result.objects).not.equal(undefined);
    expect(result.objects?.size).to.equal(2);
    expect(output).to.include('result: 2');
    // how to do some assertions?
  });

  it('runs dictionary generation with relationship crawling', async () => {
    const result = await DataDictionaryGenerate.run(['--api-version', '61.0', '--start-object', 'Enrolment__c']);
    const output = sfCommandStubs.log
      .getCalls()
      .flatMap((c) => c.args)
      .join('\n');
    // expect(getSourceApiVersionStub.calledOnce).to.equal(true);
    expect(getOrgStub.called).to.equal(true);
    // expect(result.objects).not.equal(undefined);
    expect(result.objects?.size).to.equal(7);
    expect(output).to.include('result: 7');
    // how to do some assertions?
  });
});
