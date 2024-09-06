import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages, Connection, Org } from '@salesforce/core';
import { Optional } from '@salesforce/ts-types';
import { getSourceApiVersion } from '../../modules/project.js';
import { DictionaryGenerator, DictionaryBuilderOptions } from '../../modules/dictionaryGenerator.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('org-analyzer', 'data-dictionary.generate');

export type DataDictionaryGenerateResult = {
  path: string;
  objects?: Set<string>;
};

export default class DataDictionaryGenerate extends SfCommand<DataDictionaryGenerateResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    // name: Flags.string({
    //   summary: messages.getMessage('flags.name.summary'),
    //   description: messages.getMessage('flags.name.description'),
    //   char: 'n',
    //   required: false,
    // }),
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
    };

    const result = await new DictionaryGenerator(dictionaryBuilderOptions).build();

    // this.log(`result: ${result}`);

    // const name = flags.name ?? 'world';
    // this.log(
    //   `hello ${name} from /mnt/c/Users/junli/Workspace/JM/org-analyzer/src/commands/data-dictionary/generate.ts`
    // );
    this.log(`result: ${result.objects?.size}`);
    return {
      path: '/mnt/c/Users/junli/Workspace/JM/org-analyzer/src/commands/data-dictionary/generate.ts',
      objects: result.objects,
    };
  }
}
