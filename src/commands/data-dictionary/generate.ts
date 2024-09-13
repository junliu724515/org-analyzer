import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages, Connection, Org } from '@salesforce/core';
import { Optional } from '@salesforce/ts-types';
import { getSourceApiVersion } from '../../modules/project.js';
import { DictionaryGenerator, DictionaryBuilderOptions } from '../../modules/dictionaryGenerator.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('org-analyzer', 'data-dictionary.generate');

export type DataDictionaryGenerateResult = {
  objects?: Set<string>;
  outputFolder?: string;
};

export default class DataDictionaryGenerate extends SfCommand<DataDictionaryGenerateResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    'include-all-managed': Flags.boolean({
      summary: messages.getMessage('flags.include-all-managed.summary'),
      char: 'm',
    }),
    'api-version': Flags.orgApiVersion(),
    'target-org': Flags.optionalOrg(),
    'exclude-managed-prefixes': Flags.string({
      summary: messages.getMessage('flags.exclude-managed-prefixes.summary'),
      char: 'x',
    }),
    'include-managed-prefixes': Flags.string({
      summary: messages.getMessage('flags.include-managed-prefixes.summary'),
      char: 'l',
    }),
    sobjects: Flags.string({
      summary: messages.getMessage('flags.sobjects.summary'),
      char: 's',
    }),
    dir: Flags.directory({
      summary: messages.getMessage('flags.dir.summary'),
      char: 'd',
    }),
    'start-object': Flags.string({
      summary: messages.getMessage('flags.start-object.summary'),
    }),
    'output-time': Flags.boolean({
      summary: messages.getMessage('flags.output-time.summary'),
    }),
    'skip-charts': Flags.boolean({
      summary: messages.getMessage('flags.skip-charts.summary'),
    }),
    'include-std-objects': Flags.string({
      summary: messages.getMessage('flags.include-std-objects.summary'),
    }),
    verbose: Flags.boolean({
      summary: messages.getMessage('flags.verbose.summary'),
    }),
    'include-non-empty-objects': Flags.boolean({
      summary: messages.getMessage('flags.include-non-empty-objects.summary'),
    }),
  };

  public async run(): Promise<DataDictionaryGenerateResult> {
    const { flags } = await this.parse(DataDictionaryGenerate);
    const apiVersion: Optional<string> = flags['api-version'] ?? (await getSourceApiVersion());
    const targetOrg = flags['target-org'] ?? (await Org.create({}));
    const conn: Connection = targetOrg.getConnection(apiVersion);

    const dictionaryBuilderOptions: DictionaryBuilderOptions = {
      includeManaged: flags['include-all-managed'] ?? false,
      conn,
      excludeManagedPrefixes: flags['exclude-managed-prefixes'],
      includeManagedPrefixes: flags['include-managed-prefixes'],
      sobjects: flags.sobjects,
      dir: flags.dir,
      startObject: flags['start-object'],
      outputTime: flags['output-time'],
      skipCharts: flags['skip-charts'],
      includeStdObjects: flags['include-std-objects'],
      includeNonEmptyObjects: flags['include-non-empty-objects'],
    };

    this.spinner.start(messages.getMessage('spinner.message'));
    const result = await new DictionaryGenerator(dictionaryBuilderOptions).build();
    this.spinner.stop();
    this.log(`success: ${result.success}; outputFolder: ${result.outputFolder}`);
    if (flags.verbose) {
      this.log(`result: ${result.objects?.size}`);
      for (const object of result.objects?.values() ?? []) {
        this.log(object);
      }
    }
    if (!result.success && result.error) {
      this.error(result.error);
      return {};
    }
    return {
      objects: result.objects,
      outputFolder: result.outputFolder,
    };
  }
}
