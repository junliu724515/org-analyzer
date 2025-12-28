import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages, Connection, Org } from '@salesforce/core';
import { Optional } from '@salesforce/ts-types';
import { getSourceApiVersion } from '../../modules/project.js';
import { DictionaryGenerator, DictionaryBuilderOptions } from '../../modules/dictionaryGenerator.js';

// Import messages from the 'org-analyzer' package
Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('org-analyzer', 'data-dictionary.generate');

// Define the result type for the DataDictionaryGenerate command
export type DataDictionaryGenerateResult = {
  objects?: Set<string>;
  outputFolder?: string;
};

// Define flags separately to avoid type inference issues with nested dependencies
// Type assertion needed due to nested dependency type references
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
const commandFlags = {
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
    'skip-empty-objects': Flags.boolean({
      summary: messages.getMessage('flags.skip-empty-objects.summary'),
    }),
    'exclude-objects': Flags.string({
      summary: messages.getMessage('flags.exclude-objects.summary'),
    }),
    username: Flags.string({
      summary: messages.getMessage('flags.username.summary'),
    }),
    'process-batch-size': Flags.integer({
      summary: messages.getMessage('flags.process-batch-size.summary'),
      min: 5,
      max: 500,
      default: 100,
    }),
// eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

/**
 * Command to generate a data dictionary.
 */
export default class DataDictionaryGenerate extends SfCommand<DataDictionaryGenerateResult> {
  // Command summary, description, and examples
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  // Define the flags for the command
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  public static readonly flags: typeof commandFlags = commandFlags;

  /**
   * Executes the command to generate a data dictionary.
   *
   * @returns {Promise<DataDictionaryGenerateResult>} The result of the data dictionary generation.
   */
  public async run(): Promise<DataDictionaryGenerateResult> {
    // Parse the flags provided by the user
    const { flags } = await this.parse(DataDictionaryGenerate);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const apiVersion: Optional<string> = flags['api-version'] ?? (await getSourceApiVersion());
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const targetOrg = flags['target-org'] ?? (await Org.create({}));
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const conn = targetOrg.getConnection(apiVersion) as unknown as Connection;

    // Build the options for the DictionaryGenerator
    const dictionaryBuilderOptions: DictionaryBuilderOptions = {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      includeManaged: flags['include-all-managed'] ?? false,
      conn,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      excludeManagedPrefixes: flags['exclude-managed-prefixes'],
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      includeManagedPrefixes: flags['include-managed-prefixes'],
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      sobjects: flags.sobjects,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      dir: flags.dir,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      startObject: flags['start-object'],
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      outputTime: flags['output-time'],
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      skipCharts: flags['skip-charts'],
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      includeStdObjects: flags['include-std-objects'],
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      skipEmptyObjects: flags['skip-empty-objects'],
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      excludeObjects: flags['exclude-objects'],
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      username: flags.username,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      batchSize: flags['process-batch-size'],
    };

    // Start the spinner to indicate processing
    this.spinner.start(messages.getMessage('spinner.message'));
    // Generate the data dictionary
    const result = await new DictionaryGenerator(dictionaryBuilderOptions).build();
    this.spinner.stop();

    if (!result.success && result.error) {
      this.log(messages.getMessage('error.review.message', [apiVersion]));
      result.objects?.forEach((object) => this.log(object));
      this.error(result.error);
    }

    if (result.success && result.outputFolder) {
      this.log(`Success: ${result.success}; Output folder: ${result.outputFolder}`);

      if (flags.verbose) {
        this.log(`Number of objects: ${result.objects?.size ?? 0}`);
        result.objects?.forEach((object) => this.log(object));
      }
    }

    return {
      objects: result.objects,
      outputFolder: result.outputFolder,
    };
  }
}
