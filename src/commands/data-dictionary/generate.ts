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

/**
 * Command to generate a data dictionary.
 */
export default class DataDictionaryGenerate extends SfCommand<DataDictionaryGenerateResult> {
  // Command summary, description, and examples
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  // Define the flags for the command
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
  };

  /**
   * Executes the command to generate a data dictionary.
   *
   * @returns {Promise<DataDictionaryGenerateResult>} The result of the data dictionary generation.
   */
  public async run(): Promise<DataDictionaryGenerateResult> {
    // Parse the flags provided by the user
    const { flags } = await this.parse(DataDictionaryGenerate);
    const apiVersion: Optional<string> = flags['api-version'] ?? (await getSourceApiVersion());
    const targetOrg = flags['target-org'] ?? (await Org.create({}));
    const conn: Connection = targetOrg.getConnection(apiVersion);

    // Build the options for the DictionaryGenerator
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
      skipEmptyObjects: flags['skip-empty-objects'],
      excludeObjects: flags['exclude-objects'],
      username: flags.username,
      batchSize: flags['process-batch-size'],
    };

    // Start the spinner to indicate processing
    this.spinner.start(messages.getMessage('spinner.message'));
    // Generate the data dictionary
    const result = await new DictionaryGenerator(dictionaryBuilderOptions).build();
    // Stop the spinner
    this.spinner.stop();
    // Log the success message and output folder
    this.log(`success: ${result.success}; outputFolder: ${result.outputFolder}`);
    // If verbose flag is set, log additional details
    if (flags.verbose) {
      this.log(`result: ${result.objects?.size}`);
      for (const object of result.objects?.values() ?? []) {
        this.log(object);
      }
    }
    // If the generation was not successful, log the error
    if (!result.success && result.error) {
      this.log(messages.getMessage('error.review.message', [apiVersion]));
      for (const object of result.objects?.values() ?? []) {
        this.log(object);
      }
      this.error(result.error);
    }
    // Return the result of the data dictionary generation
    return {
      objects: result.objects,
      outputFolder: result.outputFolder,
    };
  }
}
